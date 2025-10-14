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
      category: document.getElementById('fees-category'),
      miscDetail: document.getElementById('fees-misc-detail'),
      mode: document.getElementById('fees-mode'),
      reff: document.getElementById('fees-reff'),
      date: document.getElementById('fees-date'),
    };
    // Summary display nodes
    this.summary = {
      srno: document.getElementById('fees-summary-srno'),
      name: document.getElementById('fees-summary-name'),
      total: document.getElementById('fees-summary-total'),
      remaining: document.getElementById('fees-summary-remaining'),
    };
    // Category breakdown display nodes
    this.categoryBreakdown = {
      transportation: document.getElementById('fees-breakdown-transportation'),
      tuition: document.getElementById('fees-breakdown-tuition'),
      miscellaneous: document.getElementById('fees-breakdown-miscellaneous'),
      total: document.getElementById('fees-breakdown-total'),
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
    // Fee category handler - normal handling
    if (this.inputs.category) {
      this.inputs.category.addEventListener('change', () => this.onCategoryChange());
    }
    // Deposit amount handler - simple handling without restrictions
    if (this.inputs.deposit) {
      this.inputs.deposit.addEventListener('input', () => this.onDepositChange());
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

    // Date range apply button
    const rangeApplyBtn = document.getElementById('fees-range-apply');
    if (rangeApplyBtn) {
      rangeApplyBtn.addEventListener('click', () => this.renderDateRange());
    }
    // Analytics refresh button
    const refreshBtn = document.getElementById('fees-analytics-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshAnalytics());
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

  onCategoryChange() {
    if (!this.inputs.category) return;
    const miscGroup = document.getElementById('fees-misc-group');
    if (!miscGroup) return;
    
    if (this.inputs.category.value === 'Miscellaneous') {
      miscGroup.style.display = 'block';
      if (this.inputs.miscDetail) {
        this.inputs.miscDetail.setAttribute('required', '');
      }
    } else {
      miscGroup.style.display = 'none';
      if (this.inputs.miscDetail) {
        this.inputs.miscDetail.removeAttribute('required');
        this.inputs.miscDetail.value = ''; // Clear the field when hidden
      }
    }
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
    
    // Remove duplicates by creating a unique set of roll numbers
    const uniqueRolls = [...new Set(students.map(s => s.Roll_No))];
    
    uniqueRolls
      .sort((a,b) => Number(a) - Number(b))
      .forEach(rollNo => {
        const opt = document.createElement('option');
        opt.value = rollNo; 
        opt.textContent = rollNo; 
        this.rollSel.appendChild(opt);
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
      
      // Handle dynamic webhook response - expect array format
      let d = {};
      if (Array.isArray(res) && res.length > 0) {
        // Find matching record by Class and Roll_No
        d = res.find(record => 
          String(record.Class).toLowerCase() === String(cls).toLowerCase() && 
          Number(record.Roll_No) === Number(roll)
        ) || res[0] || {};
      } else if (res && typeof res === 'object') {
        d = res;
      }
      
      // Log the dynamic webhook response for debugging
      console.log('📋 Raw webhook response:', res);
      console.log('📋 Processed student data:', d);
      console.log('📋 Dynamic webhook fields:');
      console.log('  Class:', d.Class, '(searching for:', cls, ')');
      console.log('  Roll_No:', d.Roll_No, '(searching for:', roll, ')');
      console.log('  Serial_No:', d.Serial_No);
      console.log('  Name:', d.Name);
      console.log('  Total_fees:', d.Total_fees);
      console.log('  Pending_fees :', d['Pending_fees ']);
      console.log('  Deposited_fees:', d.Deposited_fees);
      console.log('  Transportation_Fees_Total:', d.Transportation_Fees_Total);
      console.log('  Tuition_Fees_Total:', d.Tuition_Fees_Total);
      console.log('  Miscellaneous_Fees_Total:', d.Miscellaneous_Fees_Total);
      
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

      // Map dynamic webhook fields exactly as they come from the JSON
      if (this.inputs.srno) {
        const serialValue = d.Serial_No || '';
        this.inputs.srno.value = serialValue;
        console.log('📝 Serial No (dynamic):', serialValue);
      }
      
      if (this.inputs.name) {
        const nameValue = d.Name || '';
        this.inputs.name.value = nameValue;
        console.log('📝 Name (dynamic):', nameValue);
      }
      
      if (this.inputs.total) {
        const totalValue = d.Total_fees || 0;
        this.inputs.total.value = totalValue;
        console.log('📝 Total fees (dynamic):', totalValue);
      }
      
      if (this.inputs.paid) {
        const paidValue = d.Deposited_fees || 0;
        this.inputs.paid.value = paidValue;
        console.log('📝 Deposited fees (dynamic):', paidValue);
      }
      
      if (this.inputs.deposit) {
        // For new deposits, start with empty value (user will enter)
        this.inputs.deposit.value = '';
        console.log('📝 Deposit amount (for new entry): empty');
      }
      
      if (this.inputs.remaining) {
        const remValue = d['Pending_fees '] || 0;
        this.inputs.remaining.value = remValue;
        console.log('📝 Pending fees (dynamic):', remValue);
      }
      // Fees status
      if (this.inputs.status) {
        let statusVal = getN(['Fees_Status', 'Fees_status', 'Status']);
        if (!statusVal && this.inputs.total && this.inputs.paid) {
          const totalNum = Number(this.inputs.total.value || 0);
          const paidNum = Number(this.inputs.paid.value || 0);
          if (totalNum > 0) {
            if (paidNum === 0) statusVal = 'Not Paid';
            else if (paidNum >= totalNum) statusVal = 'Paid';
            else statusVal = 'Partially Paid';
          }
        }
        if (this.inputs.status) {
          this.inputs.status.value = statusVal || '';
        }
      }
      // Handle fee category from API data - normal logic without restrictions
      if (d.Fee_Category || d.Remarks) {
        const categoryValue = d.Fee_Category || d.Remarks;
        if (this.inputs.category) {
          // Try to match with predefined categories first
          if (categoryValue.includes('Transportation')) {
            this.inputs.category.value = 'Transportation Fees';
          } else if (categoryValue.includes('Tuition')) {
            this.inputs.category.value = 'Tuition Fees';
          } else {
            // Default to Miscellaneous for any other category
            this.inputs.category.value = 'Miscellaneous';
            if (this.inputs.miscDetail) {
              this.inputs.miscDetail.value = categoryValue;
              this.onCategoryChange(); // Show the miscellaneous field
            }
          }
        }
      }
      if (d.Payment_Mode && this.inputs.mode && this.inputs.mode.querySelector(`option[value="${d.Payment_Mode}"]`)) {
        this.inputs.mode.value = d.Payment_Mode;
      }
      if (this.inputs.reff) {
        this.inputs.reff.value = getN(['Ref_No', 'Reff_No']) ?? this.inputs.reff.value;
      }
      if (d.Date && this.inputs.date) {
        // normalize DD/MM/YYYY to YYYY-MM-DD
        const parts = String(d.Date).includes('-') ? String(d.Date).split('-') : String(d.Date).split('/');
        if (parts.length === 3 && this.inputs.date) {
          let [a,b,c] = parts.map(p=>p.padStart(2,'0'));
          // Heuristic: if first part length 2 => DD/MM/YYYY
          if (a.length === 2) { this.inputs.date.value = `${c}-${b}-${a}`; }
          else { this.inputs.date.value = `${a}-${b}-${c}`; }
        }
      }
      // If remaining not provided, derive as Total - Paid when possible (after inputs set)
      if (this.inputs.remaining && (this.inputs.remaining.value === '' || this.inputs.remaining.value === undefined)) {
        const totalNum = Number((this.inputs.total && this.inputs.total.value) || 0);
        const paidNum = Number((this.inputs.paid && this.inputs.paid.value) || 0);
        if (!Number.isNaN(totalNum) && !Number.isNaN(paidNum) && (totalNum !== 0 || paidNum !== 0)) {
          this.inputs.remaining.value = Math.max(0, totalNum - paidNum);
        }
      }

      // Always set class and roll in the visible controls
      if (this.classSel) this.classSel.value = cls;
      if (this.rollSel) this.rollSel.value = String(roll);
      // Derive name from contacts if missing
      if (this.inputs.name && !this.inputs.name.value) {
        const st = window.dataService.getStudentByRollAndClass(roll, cls);
        if (st && this.inputs.name) this.inputs.name.value = st.Name;
      }

      // Update summary card text
      // Extract dynamic category breakdown from webhook response
      const transportationFees = Number(d.Transportation_Fees_Total || 0);
      const tuitionFees = Number(d.Tuition_Fees_Total || 0);
      const miscellaneousFees = Number(d.Miscellaneous_Fees_Total || 0);
      
      const summaryOverrides = {
        // Use dynamic remaining fees with space in field name
        remaining: d['Pending_fees '] || 0,
        // Dynamic category breakdown from real-time webhook data
        categoryBreakdown: {
          transportation: transportationFees,
          tuition: tuitionFees,
          miscellaneous: miscellaneousFees,
        }
      };
      
      // Log dynamic category breakdown values
      console.log('📊 Dynamic Category Breakdown:');
      console.log('  Transportation_Fees_Total:', d.Transportation_Fees_Total, '→', transportationFees);
      console.log('  Tuition_Fees_Total:', d.Tuition_Fees_Total, '→', tuitionFees);
      console.log('  Miscellaneous_Fees_Total:', d.Miscellaneous_Fees_Total, '→', miscellaneousFees);
      console.log('  Pending_fees (with space):', d['Pending_fees ']);
      console.log('  Final breakdown object:', summaryOverrides.categoryBreakdown);
      
      // Log additional dynamic fields for reference
      console.log('📋 Additional Dynamic Fields:');
      console.log('  Father_Name:', d.Father_Name);
      console.log('  Mother_Name:', d.Mother_Name);
      console.log('  DOB:', d.DOB);
      console.log('  Admission_Date:', d.Admission_Date);
      console.log('  Address:', d.Address);
      console.log('  Contact_No:', d.Contact_No);
      console.log('  Transportaion_fees (raw):', d.Transportaion_fees);
      console.log('  Tution_fees (with space):', d['Tution_fees ']);
      console.log('  Discount_Amt:', d.Discount_Amt);
      console.log('  Disc_reason:', d.Disc_reason);
      
      this.updateSummaryFromInputs(summaryOverrides);
    } catch (err) {
      console.error('Fees detail fetch failed:', err);
      this.showMessage(err.message || 'Failed to fetch fees details', 'error');
    } finally {
      // enable fields and hide loader
      this.setFetching(false);
    }
  }

  updateCategoryOptions(depositedAmount) {
    // Category options are now normal - no special logic
    if (!this.inputs.category) return;
    
    // Reset any previous styling or restrictions
    this.inputs.category.disabled = false;
    this.inputs.category.readOnly = false;
    this.inputs.category.style.backgroundColor = '';
    this.inputs.category.style.color = '';
    this.inputs.category.style.cursor = '';
    this.inputs.category.style.pointerEvents = '';
    this.inputs.category.title = '';
    this.inputs.category.classList.remove('category-locked');
  }

  onDepositChange() {
    // Simple deposit change handler - no special restrictions
    const depositedAmount = Number(this.inputs.paid?.value || 0);
    
    // Update category options (now just resets any restrictions)
    this.updateCategoryOptions(depositedAmount);
    
    // Hide/show miscDetail field if category changes
    if (this.inputs.category && this.inputs.category.value !== 'Miscellaneous') {
      this.onCategoryChange();
    }
  }

  onCategoryChangeWrapper(event) {
    // Normal category change handling - no restrictions
    this.onCategoryChange();
  }

  preventCategoryChange(event) {
    // No prevention logic - allow all category changes
    return true;
  }

  validateDepositLimit(depositedAmount, currentDeposit) {
    // No deposit limits - removed all restrictions
    if (!this.inputs.deposit) return;
    
    // Remove any deposit limits
    this.inputs.deposit.removeAttribute('max');
    this.inputs.deposit.title = '';
    this.inputs.deposit.placeholder = 'Enter deposit amount';
  }

  validateDepositOnBlur() {
    // No validation restrictions - allow any deposit amount
    return;
  }

  ensureTransportationFeesOption() {
    // No longer needed - Transportation Fees is treated like any other option
    return;
  }

  setDefaultDate() {
    if (this.inputs.date) {
      const today = new Date();
      this.inputs.date.value = today.toISOString().split('T')[0];
      // Make the date field read-only since we use live timestamp for submission
      this.inputs.date.readOnly = true;
      this.inputs.date.title = 'Date is automatically set to current date/time during submission';
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
      Fee_Category: categoryValue,
      Remarks: categoryValue, // Keep for backward compatibility
      Payment_Mode: this.inputs.mode?.value || '',
      Ref_No: this.inputs.reff?.value || '',
      Receipt_Number: receiptNumber, // Auto-generated receipt number starting from GBIS-10001
      Date: formattedDate, // Date only in DD-MM-YYYY format
      Submission_Time: formattedDateTime, // Full timestamp with time for tracking
    };
  }

  // Receipt number management methods
  generateReceiptNumber() {
    const lastReceiptNumber = this.getLastReceiptNumber();
    const nextNumber = this.incrementReceiptNumber(lastReceiptNumber);
    console.log('📄 Generated receipt number:', nextNumber);
    return nextNumber;
  }

  getLastReceiptNumber() {
    // Try to get from localStorage first
    const stored = localStorage.getItem('gbis_last_receipt_number');
    if (stored) {
      console.log('📄 Retrieved stored receipt number:', stored);
      return stored;
    }
    
    // If no stored number, start with GBIS-10000 (will be incremented to GBIS-10001)
    const initialNumber = 'GBIS-10000';
    console.log('📄 No stored receipt number, starting with:', initialNumber);
    return initialNumber;
  }

  incrementReceiptNumber(receiptNumber) {
    // Extract number part from format like "GBIS-10001"
    const match = receiptNumber.match(/GBIS-(\d+)/);
    if (!match) {
      // If format doesn't match, start fresh
      return 'GBIS-10001';
    }
    
    const currentNumber = parseInt(match[1], 10);
    const nextNumber = currentNumber + 1;
    const newReceiptNumber = `GBIS-${nextNumber}`;
    
    console.log('📄 Incremented receipt number:', receiptNumber, '→', newReceiptNumber);
    return newReceiptNumber;
  }

  saveReceiptNumber(receiptNumber) {
    localStorage.setItem('gbis_last_receipt_number', receiptNumber);
    console.log('📄 Saved receipt number to localStorage:', receiptNumber);
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
      this.inputs.category,
      this.inputs.miscDetail,
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
      this.inputs.category,
      this.inputs.miscDetail,
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
    // Reset category selection and hide miscellaneous field
    if (this.inputs.category) {
      this.inputs.category.value = '';
    }
    const miscGroup = document.getElementById('fees-misc-group');
    if (miscGroup) {
      miscGroup.style.display = 'none';
    }
    // Reset summary display
    this.setSummaryText({ srno:'—', name:'—', total:'—', remaining:'—' });
    // Reset category breakdown
    this.setCategoryBreakdown({ transportation: 0, tuition: 0, miscellaneous: 0 });
  }

  // Sync summary card from hidden inputs
  updateSummaryFromInputs(overrides = {}) {
    const s = {
      srno: this.inputs.srno?.value ?? '—',
      name: this.inputs.name?.value ?? '—',
      total: this.inputs.total?.value ?? '—',
      remaining: overrides.remaining ?? (this.inputs.remaining?.value ?? '—'),
    };
    this.setSummaryText(s);
    
    // Update category breakdown if overrides provided
    if (overrides.categoryBreakdown) {
      this.setCategoryBreakdown(overrides.categoryBreakdown);
    }
  }

  setSummaryText(s) {
    const display = (v) => {
      if (v === null || v === undefined) return '—';
      if (typeof v === 'string' && v.trim() === '') return '—';
      return String(v);
    };
    const displayCurrency = (v) => {
      if (v === null || v === undefined || v === '—') return '—';
      const num = Number(v);
      return isNaN(num) ? display(v) : `₹${num}`;
    };
    if (this.summary.srno) this.summary.srno.textContent = display(s.srno);
    if (this.summary.name) this.summary.name.textContent = display(s.name);
    if (this.summary.total) this.summary.total.textContent = displayCurrency(s.total);
    if (this.summary.remaining) this.summary.remaining.textContent = displayCurrency(s.remaining);
  }

  setCategoryBreakdown(breakdown) {
    console.log('🎯 setCategoryBreakdown called with:', breakdown);
    
    const displayCurrency = (v) => {
      if (v === null || v === undefined || v === '—') return '₹0';
      const num = Number(v);
      return isNaN(num) ? '₹0' : `₹${num}`;
    };
    
    const transportation = Number(breakdown.transportation ?? 0);
    const tuition = Number(breakdown.tuition ?? 0);
    const miscellaneous = Number(breakdown.miscellaneous ?? 0);
    const total = transportation + tuition + miscellaneous;
    
    console.log('🎯 Calculated values:');
    console.log('  Transportation:', transportation, '→', displayCurrency(transportation));
    console.log('  Tuition:', tuition, '→', displayCurrency(tuition));
    console.log('  Miscellaneous:', miscellaneous, '→', displayCurrency(miscellaneous));
    console.log('  Total:', total, '→', displayCurrency(total));
    
    console.log('🎯 DOM Elements check:');
    console.log('  Transportation element:', this.categoryBreakdown.transportation);
    console.log('  Tuition element:', this.categoryBreakdown.tuition);
    console.log('  Miscellaneous element:', this.categoryBreakdown.miscellaneous);
    console.log('  Total element:', this.categoryBreakdown.total);
    
    if (this.categoryBreakdown.transportation) {
      this.categoryBreakdown.transportation.textContent = displayCurrency(transportation);
      console.log('✅ Transportation updated to:', displayCurrency(transportation));
    } else {
      console.error('❌ Transportation element not found!');
    }
    if (this.categoryBreakdown.tuition) {
      this.categoryBreakdown.tuition.textContent = displayCurrency(tuition);
      console.log('✅ Tuition updated to:', displayCurrency(tuition));
    } else {
      console.error('❌ Tuition element not found!');
    }
    if (this.categoryBreakdown.miscellaneous) {
      this.categoryBreakdown.miscellaneous.textContent = displayCurrency(miscellaneous);
      console.log('✅ Miscellaneous updated to:', displayCurrency(miscellaneous));
    } else {
      console.error('❌ Miscellaneous element not found!');
    }
    if (this.categoryBreakdown.total) {
      this.categoryBreakdown.total.textContent = displayCurrency(total);
      console.log('✅ Total updated to:', displayCurrency(total));
    } else {
      console.error('❌ Total element not found!');
    }
  }

  async submit() {
    // Validate required fields
    const requiredFields = [
      { field: this.classSel, name: 'Class' },
      { field: this.rollSel, name: 'Roll No' },
      { field: this.inputs.deposit, name: 'Deposit Amount' },
      { field: this.inputs.category, name: 'Fee Category' },
      { field: this.inputs.mode, name: 'Payment Mode' },
      { field: this.inputs.reff, name: 'Reference No' },
      // Date field removed from validation since we use live timestamp
    ];
    
    // Check if Miscellaneous is selected and misc detail is required
    if (this.inputs.category && this.inputs.category.value === 'Miscellaneous') {
      requiredFields.push({ field: this.inputs.miscDetail, name: 'Specify Category' });
    }
    
    for (const { field, name } of requiredFields) {
      if (!field || !field.value || field.value.trim() === '') {
        this.showMessage(`Please fill in ${name}.`, 'error');
        if (field && field.focus) field.focus();
        return;
      }
    }
    
    const payload = this.buildPayload();
    if (!payload.Class || !payload.Roll_No) {
      this.showMessage('Please select Class and Roll No.', 'error');
      return;
    }
    try {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      
      // Log the live timestamp being sent
      console.log('Submitting fees with live timestamp:', payload.Date);
      
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

  clearInputFields() {
    // Clear user input fields only (not the fetched data fields)
    if (this.inputs.deposit) this.inputs.deposit.value = '';
    if (this.inputs.category) this.inputs.category.value = '';
    if (this.inputs.miscDetail) this.inputs.miscDetail.value = '';
    if (this.inputs.mode) this.inputs.mode.value = '';
    if (this.inputs.reff) this.inputs.reff.value = '';
    
    // Hide miscellaneous detail field
    const miscGroup = document.getElementById('fees-misc-group');
    if (miscGroup) {
      miscGroup.style.display = 'none';
    }
    
    // Reset dropdown selections to default
    if (this.classSel) this.classSel.value = '';
    if (this.rollSel) {
      this.rollSel.innerHTML = '<option value="">Choose roll no</option>';
      this.rollSel.value = '';
    }
    
    // Clear search input
    if (this.searchInput) this.searchInput.value = '';
    
    // Reset summary display to empty state
    this.setSummaryText({ srno: '—', name: '—', total: '—', remaining: '—' });
    this.setCategoryBreakdown({ transportation: 0, tuition: 0, miscellaneous: 0 });
    
    // Reset hidden fields
    if (this.inputs.srno) this.inputs.srno.value = '';
    if (this.inputs.name) this.inputs.name.value = '';
    if (this.inputs.total) this.inputs.total.value = '';
    if (this.inputs.paid) this.inputs.paid.value = '';
    if (this.inputs.remaining) this.inputs.remaining.value = '';
    if (this.inputs.status) this.inputs.status.value = '';
    
    console.log('✅ Input fields cleared after successful submission');
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
