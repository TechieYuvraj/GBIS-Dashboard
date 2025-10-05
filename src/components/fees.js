/* Fees component: populates class/roll, fetches details on roll select, submits fees */

class FeesManager {
  constructor() {
    this.init();
  }

  init() {
    this.cacheEls();
    // Disable non-key fields until data is fetched
    this.resetFields(true);
    // Enforce read-only fields that are data-only
    this.enforceReadOnly();
    this.bindEvents();
    this.setDefaultDate();
    this.populateClasses();
    this.initAnalytics();
  }

  cacheEls() {
    this.classSel = document.getElementById('fees-class');
    this.rollSel = document.getElementById('fees-roll');
    this.searchInput = document.getElementById('fees-search');
    this.searchResults = document.getElementById('fees-search-results');
    this.loader = document.getElementById('fees-fetch-loader');
    this.inputs = {
      srno: document.getElementById('fees-srno'),
      name: document.getElementById('fees-name'),
      total: document.getElementById('fees-total'),
      paid: document.getElementById('fees-paid'),
      deposit: document.getElementById('fees-deposit'),
      remaining: document.getElementById('fees-remaining'),
      status: document.getElementById('fees-status'),
      remarks: document.getElementById('fees-remarks'),
      mode: document.getElementById('fees-mode'),
      reff: document.getElementById('fees-reff'),
      date: document.getElementById('fees-date'),
    };
    // Summary display nodes
    this.summary = {
      srno: document.getElementById('fees-summary-srno'),
      name: document.getElementById('fees-summary-name'),
      total: document.getElementById('fees-summary-total'),
      paid: document.getElementById('fees-summary-paid'),
      remaining: document.getElementById('fees-summary-remaining'),
      status: document.getElementById('fees-summary-status'),
    };
    this.submitBtn = document.getElementById('fees-submit');
    this.successEl = document.getElementById('fees-success');
  }

  bindEvents() {
    if (this.classSel) {
      this.classSel.addEventListener('change', () => this.onClassChange());
    }
    if (this.rollSel) {
      this.rollSel.addEventListener('change', () => this.onRollChange());
    }
    // Search handlers
    if (this.searchInput) {
      const debounced = this.debounce(() => this.onSearchInput(), 200);
      this.searchInput.addEventListener('input', debounced);
      this.searchInput.addEventListener('focus', () => this.onSearchInput());
      document.addEventListener('click', (e) => {
        if (!this.searchResults) return;
        if (!this.searchResults.contains(e.target) && e.target !== this.searchInput) {
          this.searchResults.classList.remove('show');
        }
      });
    }
    if (this.submitBtn) {
      this.submitBtn.addEventListener('click', () => this.submit());
    }
    // Month selector
    const monthSel = document.getElementById('fees-month-select');
    if (monthSel) {
      monthSel.addEventListener('change', () => this.renderMonthly());
    }
    const sessionSel = document.getElementById('fees-session-select');
    if (sessionSel) {
      sessionSel.addEventListener('change', () => this.renderYearly());
    }
  }

  // ---- Search by name ----
  onSearchInput() {
    if (!this.searchInput || !this.searchResults) return;
    const q = this.searchInput.value.trim().toLowerCase();
    if (!q) {
      this.searchResults.innerHTML = '';
      this.searchResults.classList.remove('show');
      return;
    }
    const students = (window.dataService?.students || []).filter(s => {
      const name = String(s.Name || '').toLowerCase();
      return name.includes(q);
    }).slice(0, 20);
    if (students.length === 0) {
      this.searchResults.innerHTML = '<div class="search-result-item">No results</div>';
      this.searchResults.classList.add('show');
      return;
    }
    this.searchResults.innerHTML = students.map(s => `
      <div class="search-result-item" data-class="${s.Class}" data-roll="${s.Roll_No}" data-name="${s.Name}">
        <div class="name">${s.Name}</div>
        <div class="meta">Class ${s.Class} · Roll ${s.Roll_No}</div>
      </div>
    `).join('');
    this.searchResults.classList.add('show');
    // Attach click handlers
    Array.from(this.searchResults.querySelectorAll('.search-result-item')).forEach(el => {
      el.addEventListener('click', () => {
        const cls = el.getAttribute('data-class');
        const roll = el.getAttribute('data-roll');
        const name = el.getAttribute('data-name');
        if (this.searchInput && name) this.searchInput.value = name;
        this.applyStudentSelection(cls, roll);
        this.searchResults.classList.remove('show');
      });
    });
  }

  applyStudentSelection(cls, roll) {
    if (!cls || !roll) return;
    // Set class and repopulate rolls
    if (this.classSel) this.classSel.value = cls;
    this.populateRolls(cls);
    // Set roll and trigger details fetch
    if (this.rollSel) this.rollSel.value = String(roll);
    this.onRollChange();
  }

  debounce(fn, wait=200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---------------- Fees Analytics ----------------
  async initAnalytics() {
    try {
      // Populate month dropdown in Apr–Mar fiscal order
      this.monthOrder = [
        'April','May','June','July','August','September','October','November','December','January','February','March'
      ];
      const monthSel = document.getElementById('fees-month-select');
      if (monthSel) {
        monthSel.innerHTML = '';
        this.monthOrder.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          monthSel.appendChild(opt);
        });
        // Default to current month label (map from Date)
        const now = new Date();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const currentLabel = monthNames[now.getMonth()];
        // If currentLabel exists in our fiscal order, select it; else default to April
        monthSel.value = this.monthOrder.includes(currentLabel) ? currentLabel : 'April';
      }

      // Fetch analytics data
      if (window.dataService && typeof window.dataService.fetchFeesAnalytics === 'function') {
        this.feesAnalytics = await window.dataService.fetchFeesAnalytics();
      } else {
        this.feesAnalytics = [];
      }

      // Normalize array
      if (!Array.isArray(this.feesAnalytics)) {
        this.feesAnalytics = this.feesAnalytics && this.feesAnalytics.data ? this.feesAnalytics.data : [];
      }

      // Render both sections
      this.populateSessions();
      this.renderYearly();
      this.renderMonthly();
    } catch (err) {
      console.error('Failed to init fees analytics:', err);
      const root = document.getElementById('fees-analytics');
      if (root) root.innerHTML = `<div class="analytics-error">Failed to load fees analytics. ${err.message || ''}</div>`;
    }
  }

  populateSessions() {
    const sessionSel = document.getElementById('fees-session-select');
    if (!sessionSel) return;
    sessionSel.innerHTML = '';
    // Collect FYs from analytics data
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    const set = new Set();
    data.forEach(item => {
      const dateStr = item.Date || item.date || item.Transaction_Date || item.txn_date;
      const d = this.parseDateToObj(dateStr);
      if (!d) return;
      set.add(this.getFiscalYear(d.year, d.monthIdx));
    });
    const sessions = Array.from(set).sort((a,b)=>a.localeCompare(b));
    // Default to current FY
    const now = new Date();
    const currentFY = this.getFiscalYear(now.getFullYear(), now.getMonth());
    sessions.forEach(fy => {
      const opt = document.createElement('option');
      opt.value = fy; opt.textContent = fy;
      sessionSel.appendChild(opt);
    });
    if (sessions.length) sessionSel.value = sessions.includes(currentFY) ? currentFY : sessions[sessions.length-1];
  }

  parseDateToObj(d) {
    // Accept formats like DD/MM/YYYY or YYYY-MM-DD
    if (!d) return null;
    const s = String(d);
    let year, monthIdx, day;
    if (s.includes('/')) {
      const [dd, mm, yyyy] = s.split('/');
      day = parseInt(dd, 10); monthIdx = parseInt(mm, 10) - 1; year = parseInt(yyyy, 10);
    } else if (s.includes('-')) {
      const [yyyy, mm, dd] = s.split('-');
      year = parseInt(yyyy, 10); monthIdx = parseInt(mm, 10) - 1; day = parseInt(dd, 10);
    }
    if (isNaN(year) || isNaN(monthIdx) || isNaN(day)) return null;
    return { year, monthIdx, day };
  }

  getFiscalYear(y, mIdx) {
    // Fiscal year Apr–Mar; if month >= Apr (3), FY is `${y}-${y+1}` else `${y-1}-${y}`
    if (mIdx >= 3) return `${y}-${y+1}`;
    return `${y-1}-${y}`;
  }

  sumSafe(values) { return values.reduce((a,b) => a + (Number(b) || 0), 0); }

  // Get deposit amount from a record, preferring Deposit_amount
  depositAmount(item) {
    return Number(
      item?.Deposit_amount ??
      item?.Deposit_Amount ??
      item?.deposit_amount ??
      item?.Deposit ??
      item?.Amount ?? item?.amount ??
      item?.Deposited_fees ?? item?.Fees_Paid ?? item?.Paid ?? 0
    ) || 0;
  }

  renderYearly() {
    const container = document.getElementById('fees-yearly-content');
    if (!container) return;
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    if (data.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-chart-line"></i><p>No yearly data</p></div>`;
      return;
    }

    // Compute total for selected session only
    const sessionSel = document.getElementById('fees-session-select');
    const selectedFY = sessionSel?.value;
    if (!selectedFY) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-chart-line"></i><p>No session selected</p></div>`;
      return;
    }
    let totalDep = 0;
    data.forEach(item => {
      const dateStr = item.Date || item.date || item.Transaction_Date || item.txn_date;
      const d = this.parseDateToObj(dateStr);
      if (!d) return;
      const fy = this.getFiscalYear(d.year, d.monthIdx);
      if (fy === selectedFY) totalDep += this.depositAmount(item);
    });

    container.innerHTML = `
      <div class="analytics-cards">
        <div class="analytics-card present"><div class="analytics-number">${totalDep}</div><div class="analytics-label">Total Collection</div></div>
      </div>
    `;
  }

  renderMonthly() {
    const container = document.getElementById('fees-monthly-content');
    const monthSel = document.getElementById('fees-month-select');
    if (!container || !monthSel) return;
    const sel = monthSel.value;
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    if (data.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class=\"fas fa-calendar\"></i><p>No monthly data</p></div>`;
      return;
    }

    // Filter by selected calendar month name using parsed date
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const filtered = data.filter(item => {
      const dateStr = item.Date || item.date || item.Transaction_Date || item.txn_date;
      const d = this.parseDateToObj(dateStr);
      if (!d) return false;
      return monthNames[d.monthIdx] === sel;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class=\"fas fa-calendar\"></i><p>No records in ${sel}</p></div>`;
      return;
    }

    // Aggregate monthly total collection from Deposit_amount
    const totalCollection = this.sumSafe(filtered.map(i => this.depositAmount(i)));

    container.innerHTML = `
      <div class="analytics-cards">
        <div class="analytics-card present"><div class="analytics-number">${totalCollection}</div><div class="analytics-label">Total Collection</div></div>
      </div>
    `;
  }

  async populateClasses() {
    if (!window.dataService) return;
    let classes = window.dataService.getClasses();
    if (!classes || classes.length === 0) {
      try { await window.dataService.fetchContacts(); classes = window.dataService.getClasses(); } catch {}
    }
    if (!this.classSel) return;
    this.classSel.innerHTML = '<option value="">Choose class</option>';
    (classes || []).forEach((cls) => {
      const opt = document.createElement('option');
      opt.value = cls; opt.textContent = cls; this.classSel.appendChild(opt);
    });
  }

  onClassChange() {
    const cls = this.classSel.value;
    this.populateRolls(cls);
    // Clear and disable fields until roll is chosen and data fetched
    this.resetFields(true);
    // Keep date populated with today's date (disabled until fetch completes)
    this.setDefaultDate();
  }

  populateRolls(cls) {
    if (!this.rollSel) return;
    this.rollSel.innerHTML = '<option value="">Choose roll no</option>';
    if (!cls || !window.dataService) return;
    const students = window.dataService.getStudentsByClass(cls) || [];
    students
      .sort((a,b) => Number(a.Roll_No) - Number(b.Roll_No))
      .forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.Roll_No; opt.textContent = s.Roll_No; this.rollSel.appendChild(opt);
      });
  }

  async onRollChange() {
    const cls = this.classSel.value;
    const roll = this.rollSel.value;
    if (!cls || !roll) return;
    // show loader and disable fields while fetching
    this.setFetching(true);
    try {
      const res = await window.dataService.fetchFeesDetails(cls, roll);
      const d = Array.isArray(res) ? (res[0]||{}) : (res || {});
      // Normalize keys for robust lookups (trim, lowercase, replace spaces and hyphens with underscores)
      const normalizeKey = (k) => String(k).trim().toLowerCase().replace(/[\s\-\.]+/g, '_');
      const normMap = (() => {
        const m = {};
        Object.keys(d || {}).forEach((k) => {
          m[normalizeKey(k)] = d[k];
        });
        return m;
      })();
      const getN = (keys, fallback = undefined) => {
        for (const k of keys) {
          const nk = normalizeKey(k);
          if (nk in normMap) return normMap[nk];
        }
        return fallback;
      };

      // Serial / Sr No
  this.inputs.srno.value = getN(['Sr_No', 'Serial_No', 'SrNo', 'Sr no']) ?? this.inputs.srno.value;
      // Name
  this.inputs.name.value = getN(['Name', 'Student_Name']) ?? this.inputs.name.value;
      // Total fees
  this.inputs.total.value = getN(['Total', 'Total_Fees', 'Total_fees', 'Total_fees ', 'Tution_fees', 'Tution_fees ', 'Tuition_Fees']) ?? this.inputs.total.value;
      // Fees Paid (hidden input used for submission) from deposited/paid keys
  this.inputs.paid.value = getN(['Fees_Paid', 'Paid', 'Deposited_fees', 'Deposited_Fees']) ?? this.inputs.paid.value;
      // Deposit amount (current input default from webhook if present)
  this.inputs.deposit.value = getN(['Deposit_Amount', 'Deposit']) ?? this.inputs.deposit.value;
      // Remaining / Pending fees
      if (this.inputs.remaining) {
        const rem = getN(['Remaining_Fees', 'Remaining', 'Pending_fees', 'Pending_fees '], '');
        this.inputs.remaining.value = typeof rem === 'number' ? rem : (rem || '');
      }
      // Fees status
      if (this.inputs.status) {
        let statusVal = getN(['Fees_Status', 'Fees_status', 'Status']);
        if (!statusVal) {
          const totalNum = Number(this.inputs.total.value || 0);
          const paidNum = Number(this.inputs.paid.value || 0);
          if (totalNum > 0) {
            if (paidNum === 0) statusVal = 'Not Paid';
            else if (paidNum >= totalNum) statusVal = 'Paid';
            else statusVal = 'Partially Paid';
          }
        }
        this.inputs.status.value = statusVal || '';
      }
      this.inputs.remarks.value = d.Remarks ?? this.inputs.remarks.value;
      if (d.Payment_Mode && this.inputs.mode.querySelector(`option[value="${d.Payment_Mode}"]`)) {
        this.inputs.mode.value = d.Payment_Mode;
      }
      this.inputs.reff.value = getN(['Ref_No', 'Reff_No']) ?? this.inputs.reff.value;
      if (d.Date) {
        // normalize DD/MM/YYYY to YYYY-MM-DD
        const parts = String(d.Date).includes('-') ? String(d.Date).split('-') : String(d.Date).split('/');
        if (parts.length === 3) {
          let [a,b,c] = parts.map(p=>p.padStart(2,'0'));
          // Heuristic: if first part length 2 => DD/MM/YYYY
          if (a.length === 2) { this.inputs.date.value = `${c}-${b}-${a}`; }
          else { this.inputs.date.value = `${a}-${b}-${c}`; }
        }
      }
      // If remaining not provided, derive as Total - Paid when possible (after inputs set)
      if (this.inputs.remaining && (this.inputs.remaining.value === '' || this.inputs.remaining.value === undefined)) {
        const totalNum = Number(this.inputs.total.value || 0);
        const paidNum = Number(this.inputs.paid.value || 0);
        if (!Number.isNaN(totalNum) && !Number.isNaN(paidNum) && (totalNum !== 0 || paidNum !== 0)) {
          this.inputs.remaining.value = Math.max(0, totalNum - paidNum);
        }
      }

      // Always set class and roll in the visible controls
      this.classSel.value = cls;
      this.rollSel.value = String(roll);
      // Derive name from contacts if missing
      if (!this.inputs.name.value) {
        const st = window.dataService.getStudentByRollAndClass(roll, cls);
        if (st) this.inputs.name.value = st.Name;
      }

      // Update summary card text
      // Build summary overrides based on API mapping requirements
      const summaryOverrides = {
        // Show Deposited_fees in Deposited Amount slot (display only)
        paid: getN(['Deposited_fees', 'Deposited_Fees', 'Fees_Paid', 'Paid']) ?? this.inputs.paid?.value,
        // Show Pending_fees in Remaining Fees slot (display only)
        remaining: getN(['Pending_fees', 'Pending_fees ', 'Remaining_Fees', 'Remaining']) ?? this.inputs.remaining?.value,
        // Show Fees_status in Fees Status slot (display only)
        status: getN(['Fees_status', 'Fees_Status', 'Status']) ?? this.inputs.status?.value,
      };
      this.updateSummaryFromInputs(summaryOverrides);
    } catch (err) {
      console.error('Fees detail fetch failed:', err);
      this.showMessage(err.message || 'Failed to fetch fees details', 'error');
    } finally {
      // enable fields and hide loader
      this.setFetching(false);
    }
  }

  setDefaultDate() {
    if (this.inputs.date) {
      const today = new Date();
      this.inputs.date.value = today.toISOString().split('T')[0];
    }
  }

  buildPayload() {
    const cls = this.classSel?.value || '';
    const roll = this.rollSel?.value || '';
    const dateStr = this.inputs.date?.value;
    const formattedDate = dateStr ? window.dataService.formatDate(new Date(dateStr)) : window.dataService.formatDate(new Date());
    return {
      Sr_No: Number(this.inputs.srno?.value || 0),
      Name: this.inputs.name?.value || '',
      Class: cls,
      Roll_No: roll ? Number(roll) : null,
  total_fees: Number(this.inputs.total?.value || 0),
      Fees_Paid: Number(this.inputs.paid?.value || 0),
      Deposit_Amount: Number(this.inputs.deposit?.value || 0),
      Remaining_Fees: this.inputs.remaining ? Number(this.inputs.remaining.value || 0) : undefined,
      Fees_Status: this.inputs.status ? (this.inputs.status.value || '') : undefined,
      Remarks: this.inputs.remarks?.value || '',
      Payment_Mode: this.inputs.mode?.value || '',
      Ref_No: this.inputs.reff?.value || '',
      Date: formattedDate,
    };
  }

  // Helpers to manage fetching state and input enabling
  setFetching(isFetching) {
    if (this.loader) this.loader.style.display = isFetching ? 'inline-flex' : 'none';
    const toToggle = [
      this.inputs.srno,
      this.inputs.name,
      this.inputs.total,
      this.inputs.paid,
      this.inputs.deposit,
      this.inputs.remaining,
      this.inputs.status,
      this.inputs.remarks,
      this.inputs.mode,
      this.inputs.reff,
      this.inputs.date,
      this.submitBtn,
    ].filter(Boolean);
    toToggle.forEach(el => {
      if (!el) return;
      el.disabled = !!isFetching;
    });
  }

  resetFields(disable=false) {
    const fields = [
      this.inputs.srno,
      this.inputs.name,
      this.inputs.total,
      this.inputs.paid,
      this.inputs.deposit,
      this.inputs.remaining,
      this.inputs.status,
      this.inputs.remarks,
      this.inputs.mode,
      this.inputs.reff,
      this.inputs.date,
    ].filter(Boolean);
    fields.forEach(el => { if ('value' in el) el.value = ''; });
    if (disable) {
      fields.forEach(el => { el.disabled = true; });
      if (this.submitBtn) this.submitBtn.disabled = true;
    } else {
      fields.forEach(el => { el.disabled = false; });
      if (this.submitBtn) this.submitBtn.disabled = false;
    }
    // Reset summary display
    this.setSummaryText({ srno:'—', name:'—', total:'—', paid:'—', remaining:'—', status:'—' });
  }

  // Sync summary card from hidden inputs
  updateSummaryFromInputs(overrides = {}) {
    const s = {
      srno: this.inputs.srno?.value ?? '—',
      name: this.inputs.name?.value ?? '—',
      total: this.inputs.total?.value ?? '—',
      paid: overrides.paid ?? (this.inputs.paid?.value ?? '—'),
      remaining: overrides.remaining ?? (this.inputs.remaining?.value ?? '—'),
      status: overrides.status ?? (this.inputs.status?.value ?? '—'),
    };
    this.setSummaryText(s);
  }

  setSummaryText(s) {
    const display = (v) => {
      if (v === null || v === undefined) return '—';
      if (typeof v === 'string' && v.trim() === '') return '—';
      return String(v);
    };
    if (this.summary.srno) this.summary.srno.textContent = display(s.srno);
    if (this.summary.name) this.summary.name.textContent = display(s.name);
    if (this.summary.total) this.summary.total.textContent = display(s.total);
    if (this.summary.paid) this.summary.paid.textContent = display(s.paid);
    if (this.summary.remaining) this.summary.remaining.textContent = display(s.remaining);
    if (this.summary.status) this.summary.status.textContent = display(s.status);
  }

  async submit() {
    const payload = this.buildPayload();
    if (!payload.Class || !payload.Roll_No) {
      this.showMessage('Please select Class and Roll No.', 'error');
      return;
    }
    try {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      await window.dataService.submitFees(payload);
      this.showMessage('Fees submitted successfully', 'success');
    } catch (err) {
      console.error('Submit fees failed:', err);
      this.showMessage(err.message || 'Failed to submit fees', 'error');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
    }
  }

  showMessage(message, type='success') {
    const el = this.successEl;
    if (!el) return;
    el.textContent = message;
    el.className = `success-message show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  enforceReadOnly() {
    const ro = [
      this.inputs.srno,
      this.inputs.name,
      this.inputs.total,
      this.inputs.paid,
      this.inputs.remaining,
      this.inputs.status,
    ].filter(Boolean);
    ro.forEach(el => { el.readOnly = true; });
  }
}

(function initFees(){
  const start = () => {
    if (document.getElementById('fees-tab') && !window.feesManager) {
      window.feesManager = new FeesManager();
    }
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(start, 50));
  } else {
    setTimeout(start, 0);
  }
})();
