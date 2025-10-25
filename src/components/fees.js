/* Fees component: populates class/roll, fetches details on roll select, submits fees */
// Deployed
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



      // Set default date range (last 30 days)
      const rangeFromSel = document.getElementById('fees-range-from');
      const rangeToSel = document.getElementById('fees-range-to');
      if (rangeFromSel && rangeToSel) {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        rangeFromSel.value = thirtyDaysAgo.toISOString().split('T')[0];
        rangeToSel.value = today.toISOString().split('T')[0];
      }

      // Fetch analytics data (no dummy fallback)
      if (window.dataService && typeof window.dataService.fetchFeesAnalytics === 'function') {
        this.feesAnalytics = await window.dataService.fetchFeesAnalytics();
      } else {
        this.feesAnalytics = [];
      }

      // Normalize array
      if (!Array.isArray(this.feesAnalytics)) {
        this.feesAnalytics = this.feesAnalytics && this.feesAnalytics.data ? this.feesAnalytics.data : [];
      }
      
      // Render all sections
      this.renderTransactions();
      this.populateSessions();
      this.renderYearly();
      this.renderMonthly();
    } catch (err) {
      console.error('Failed to init fees analytics:', err);
      // Ensure sections render placeholders instead of wiping the analytics root
      this.feesAnalytics = [];
      this.renderTransactions();
      this.populateSessions();
      this.renderYearly();
      this.renderMonthly();
    }
  }

  populateSessions() {
    const sessionSel = document.getElementById('fees-session-select');
    if (!sessionSel) return;
    sessionSel.innerHTML = '';
    
    // Collect fiscal years from analytics data using the new JSON structure
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    const fiscalYears = new Set();
    
    data.forEach(item => {
      const dateStr = this.getTransactionDate(item);
      const transactionDate = this.parseDateFromIST(dateStr);
      if (!transactionDate) return;
      
      const fy = this.getFiscalYear(transactionDate.getFullYear(), transactionDate.getMonth());
      fiscalYears.add(fy);
    });
    
    const sessions = Array.from(fiscalYears).sort((a, b) => a.localeCompare(b));
    
    // Populate dropdown with available sessions
    sessions.forEach(fy => {
      const opt = document.createElement('option');
      opt.value = fy; 
      opt.textContent = fy;
      sessionSel.appendChild(opt);
    });
    
    // Default to current fiscal year if available
    const now = new Date();
    const currentFY = this.getFiscalYear(now.getFullYear(), now.getMonth());
    
    if (sessions.length > 0) {
      sessionSel.value = sessions.includes(currentFY) ? currentFY : sessions[sessions.length - 1];
    }
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

    // Get selected session/fiscal year
    const sessionSel = document.getElementById('fees-session-select');
    const selectedFY = sessionSel?.value;
    if (!selectedFY) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-chart-line"></i><p>No session selected</p></div>`;
      return;
    }

    // Use centralized filtering method
    const yearlyTransactions = this.filterTransactionsByDate(data, 'yearly', selectedFY);
    const summary = this.calculateSummary(yearlyTransactions);

    container.innerHTML = `
      <table class="analytics-summary-table">
        <tr>
          <td><strong>Session:</strong></td>
          <td>${selectedFY}</td>
        </tr>
        <tr>
          <td><strong>Total Collection:</strong></td>
          <td class="amount">₹${summary.total.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Transactions:</strong></td>
          <td>${summary.count}</td>
        </tr>
      </table>
    `;
  }

  renderMonthly() {
    const container = document.getElementById('fees-monthly-content');
    const monthSel = document.getElementById('fees-month-select');
    if (!container || !monthSel) return;
    
    const selectedMonth = monthSel.value;
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    
    if (data.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-calendar"></i><p>No monthly data</p></div>`;
      return;
    }

    // Use centralized filtering method
    const monthlyTransactions = this.filterTransactionsByDate(data, 'monthly', selectedMonth);
    
    if (monthlyTransactions.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-calendar"></i><p>No records in ${selectedMonth}</p></div>`;
      return;
    }

    const summary = this.calculateSummary(monthlyTransactions);

    container.innerHTML = `
      <table class="analytics-summary-table">
        <tr>
          <td><strong>Month:</strong></td>
          <td>${selectedMonth}</td>
        </tr>
        <tr>
          <td><strong>Total Collection:</strong></td>
          <td class="amount">₹${summary.total.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Transactions:</strong></td>
          <td>${summary.count}</td>
        </tr>
      </table>
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
  this.showBannerMessage(err.message || 'Failed to fetch fees details', 'error');
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
    // Always use current live date and time for submission
    const currentDateTime = new Date();
    const formattedDate = this.formatDateOnly(currentDateTime); // Date only format
    const formattedDateTime = this.formatDateToIST(currentDateTime); // Full datetime for submission time
    
    // Generate receipt number
    const receiptNumber = this.generateReceiptNumber();
    
    // Build category/remarks field
    let categoryValue = '';
    if (this.inputs.category && this.inputs.category.value) {
      if (this.inputs.category.value === 'Miscellaneous' && this.inputs.miscDetail && this.inputs.miscDetail.value) {
        categoryValue = this.inputs.miscDetail.value;
      } else {
        categoryValue = this.inputs.category.value;
      }
    }
    
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
    // Determine last receipt number from analytics data to avoid conflicts
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    let maxNum = 0;
    let maxDigits = 5;
    data.forEach(item => {
      const r = this.getReceiptNumber(item);
      if (!r) return;
      const m = String(r).match(/(\d+)/);
      if (!m) return;
      const num = parseInt(m[1], 10);
      if (!Number.isFinite(num)) return;
      if (num > maxNum) {
        maxNum = num;
        maxDigits = Math.max(m[1].length, 5);
      }
    });

    if (maxNum > 0) {
      const padded = String(maxNum).padStart(maxDigits, '0');
      return `GBIS-${padded}`;
    }
    // No data in analytics -> start series at GBIS-00000 so increment yields GBIS-00001
    return 'GBIS-00000';
  }

  incrementReceiptNumber(receiptNumber) {
    // Extract number part from formats like "GBIS-00001" or "GBIS-10026"
    const match = String(receiptNumber).match(/GBIS-(\d+)/);
    const currentNumber = match ? parseInt(match[1], 10) : 0;
    const width = match ? Math.max(match[1].length, 5) : 5;
    const nextNumber = (Number.isFinite(currentNumber) ? currentNumber : 0) + 1;
    const padded = String(nextNumber).padStart(width, '0');
    const newReceiptNumber = `GBIS-${padded}`;
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
  this.showSubmitStatus(`Please fill in ${name}.`, 'error');
        if (field && field.focus) field.focus();
        return;
      }
    }
    
    const payload = this.buildPayload();
    if (!payload.Class || !payload.Roll_No) {
  this.showSubmitStatus('Please select Class and Roll No.', 'error');
      return;
    }
    try {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      
      // Log the live timestamp being sent
      console.log('Submitting fees with live timestamp:', payload.Date);
      
  await window.dataService.submitFees(payload);
      
      // Save the receipt number after successful submission
      this.saveReceiptNumber(payload.Receipt_Number);
      
      // Clear input fields after successful submission
      this.clearInputFields();
      
      // Show success message with receipt number
      this.showSubmitStatus(`Fees submitted successfully! Receipt: ${payload.Receipt_Number}`, 'success');

      // Seamlessly append the new transaction locally without refetching the whole analytics
      try {
        if (!Array.isArray(this.feesAnalytics)) this.feesAnalytics = [];
        const newTxn = {
          row_number: this.feesAnalytics.length + 1,
          "Serial_No.": payload.Sr_No,
          Name: payload.Name,
          Date: payload.Date, // DD-MM-YYYY
          Submission_Time: payload.Submission_Time, // Full timestamp for precise ordering
          Mode: payload.Payment_Mode,
          Deposit_amount: payload.Deposit_Amount,
          Transaction_ID: payload.Ref_No || (Math.floor(Math.random() * 9000000000000) + 1000000000000),
          "Reff. No.": payload.Ref_No || '',
          Remark: payload.Remarks || 'Fee Payment',
          Link: null,
          "Reciept_no.": payload.Receipt_Number
        };
        // Add to the front so it appears in recent transactions immediately
        this.feesAnalytics.unshift(newTxn);

        // Re-render analytics sections incrementally
        this.renderTransactions();
        this.renderDateRange();
        this.renderMonthly();

        // Recompute sessions safely and keep user selection if possible
        const sessionSel = document.getElementById('fees-session-select');
        const prevFY = sessionSel ? sessionSel.value : null;
        this.populateSessions();
        if (sessionSel && prevFY) {
          const hasPrev = Array.from(sessionSel.options).some(o => o.value === prevFY);
          if (hasPrev) sessionSel.value = prevFY;
        }
        this.renderYearly();

        // After submit, refresh analytics after 2.5 seconds (as requested)
        try {
          clearTimeout(this._silentRefreshTimer);
          this._silentRefreshTimer = setTimeout(async () => {
            try {
              this.showTinyRefreshOverlay();
              await this.refreshAnalytics(true);
            } catch (refreshErr) {
              console.warn('Post-submit analytics refresh failed:', refreshErr);
            } finally {
              this.hideTinyRefreshOverlay();
            }
          }, 2500);
        } catch (timerErr) {
          console.warn('Failed to schedule post-submit analytics refresh:', timerErr);
        }
      } catch (analyticsError) {
        console.warn('Failed to update analytics after submission:', analyticsError);
      }
    } catch (err) {
      console.error('Submit fees failed:', err);
  this.showSubmitStatus(err.message || 'Failed to submit fees', 'error');
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

  // Inline status below the Submit button (green/red) shown for 5 seconds
  showSubmitStatus(message, type = 'success') {
    const el = this.successEl;
    if (!el) return;
    el.textContent = message;
    // Reset base class, then apply variant and show
    el.className = 'success-message';
    if (type === 'error') {
      el.classList.add('error');
    }
    el.classList.add('show');
    // Auto-hide after 5 seconds
    clearTimeout(this._submitStatusTimer);
    this._submitStatusTimer = setTimeout(() => {
      el.classList.remove('show');
      el.classList.remove('error');
    }, 5000);
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

  // Generate sample fees data for development/testing
  generateSampleFeesData() {
    const data = [];
    const today = new Date();
    const students = ['Garvit Sunda', 'AAHIL KHAN', 'SARA ALI', 'AMIT SINGH', 'RIYA PATEL', 'RAJESH KUMAR', 'PRIYA SHARMA', 'ARJUN VERMA', 'ANAYA GUPTA'];
  const paymentModes = ['UPI SBI Bank', 'Cash', 'Card', 'Bank Transfer'];
    const remarks = ['Tution', 'Transport', 'Books', 'Exam Fee', 'Annual Fee', 'Sports Fee'];
    
    // Generate data for last 90 days to cover multiple months
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Random number of transactions per day (0-8 for more variety)
      const numTransactions = Math.floor(Math.random() * 9);
      
      for (let j = 0; j < numTransactions; j++) {
        // Add random hours/minutes/seconds to make it more realistic
        const transactionDate = new Date(date);
        transactionDate.setHours(Math.floor(Math.random() * 10) + 8); // 8 AM to 6 PM
        transactionDate.setMinutes(Math.floor(Math.random() * 60));
        transactionDate.setSeconds(Math.floor(Math.random() * 60));
        
        const receiptNumber = `GBIS-${10001 + data.length}`;
        const hasLink = Math.random() > 0.3; // 70% chance of having a receipt link
        
        data.push({
          row_number: i * 10 + j + 1,
          "Serial_No.": Math.floor(Math.random() * 9000) + 1000,
          Name: students[Math.floor(Math.random() * students.length)],
          Date: this.formatDateOnly(transactionDate), // Use date-only format
          Mode: paymentModes[Math.floor(Math.random() * paymentModes.length)],
          Deposit_amount: Math.floor(Math.random() * 15000) + 1000,
          Transaction_ID: Math.floor(Math.random() * 9000000000000) + 1000000000000,
          Remark: remarks[Math.floor(Math.random() * remarks.length)],
          Link: hasLink ? "https://drive.google.com/file/d/1ZucL8foUJHUGHEY4ZSVyZELVsPVfJWZ8/view?usp=drivesdk" : null,
          "Reciept_no.": receiptNumber
        });
      }
    }
    
    // Sort by date descending (newest first)
    return data.sort((a, b) => {
      const dateA = this.parseDateFromIST(a.Date);
      const dateB = this.parseDateFromIST(b.Date);
      return dateB - dateA;
    });
  }

  // Format date to DD/MM/YYYY (for display purposes)
  formatDateToDDMMYYYY(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Format date to DD-MM-YYYYTHH:mm:ss IST (for JSON data)
  formatDateToIST(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year}T${hours}:${minutes}:${seconds} IST`;
  }

  // Format date only (DD-MM-YYYY) without time
  formatDateOnly(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Parse DD/MM/YYYY to Date object
  parseDateFromDDMMYYYY(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  }

  // Parse DD-MM-YYYYTHH:mm:ss IST to Date object
  parseDateFromIST(dateStr) {
    if (!dateStr) return null;
    
    // Handle the new IST format: "02-10-2025T05:30:00 IST"
    if (dateStr.includes('T') && dateStr.includes('IST')) {
      const [datePart, timePart] = dateStr.split('T');
      const [day, month, year] = datePart.split('-');
      const [time] = timePart.split(' IST');
      const [hours, minutes, seconds] = time.split(':');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
    } 
    // Handle ISO format without IST suffix
    else if (dateStr.includes('T') && !dateStr.includes('IST')) {
      const [datePart, timePart] = dateStr.split('T');
      const [day, month, year] = datePart.split('-');
      const [hours, minutes, seconds] = timePart.split(':');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));
    }
    // Handle new date-only format: "14-10-2025"
    else if (dateStr.includes('-') && dateStr.split('-').length === 3) {
      const [day, month, year] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    // Fallback for old DD/MM/YYYY format
    else if (dateStr.includes('/')) {
      return this.parseDateFromDDMMYYYY(dateStr);
    }
    
    return new Date(dateStr);
  }

  // Get deposit amount from the new JSON structure
  getDepositAmount(item) {
    return Number(
      item?.Deposit_amount ??
      item?.deposit_amount ??
      item?.Amount ?? item?.amount ??
      item?.Deposited_fees ?? item?.Fees_Paid ?? item?.Paid ?? 0
    ) || 0;
  }

  // Get transaction date from the updated JSON structure (prefer precise Submission_Time)
  getTransactionDate(item) {
    return item?.Submission_Time ??
           item?.Date ?? 
           item?.date ?? 
           item?.Transaction_Date ?? 
           item?.txn_date ?? 
           item?.transaction_date;
  }

  // Get student name from the updated JSON structure
  getStudentName(item) {
    return item?.Name ?? 
           item?.name ?? 
           item?.Student_Name ?? 
           item?.student_name ?? 
           'N/A';
  }

  // Get payment mode from the updated JSON structure
  getPaymentMode(item) {
    return item?.Mode ?? 
           item?.mode ?? 
           item?.Payment_Mode ?? 
           item?.payment_mode ?? 
           'N/A';
  }

  // Get receipt number from the updated JSON structure
  getReceiptNumber(item) {
    return item?.['Reciept_no.'] ?? 
           item?.Receipt_Number ?? 
           item?.receipt_number ?? 
           item?.Receipt_No ??
           'N/A';
  }

  // Get receipt link from the updated JSON structure
  getReceiptLink(item) {
    return item?.Link ?? 
           item?.link ?? 
           item?.Receipt_Link ?? 
           item?.receipt_link ?? 
           null;
  }

  // Get transaction ID/reference from the updated JSON structure
  getTransactionRef(item) {
    return item?.Transaction_ID ?? 
           item?.transaction_id ?? 
           item?.Ref_No ?? 
           item?.['Reff. No.'] ?? 
           item?.ref_no ?? 
           item?.Reference ?? 
           'N/A';
  }

  // Extract numeric part of receipt number for sorting
  getReceiptNumberValue(item) {
    const r = this.getReceiptNumber(item);
    if (!r) return -Infinity;
    const m = String(r).match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : -Infinity;
  }

  // Centralized data filtering method for all analytics
  filterTransactionsByDate(data, filterType, filterValue) {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
      const dateStr = this.getTransactionDate(item);
      if (!dateStr) return false;
      
      const transactionDate = this.parseDateFromIST(dateStr);
      if (!transactionDate) return false;
      
      switch (filterType) {
        case 'range':
          // filterValue is {from: "YYYY-MM-DD", to: "YYYY-MM-DD"}
          if (!filterValue.from || !filterValue.to) return false;
          const fromDate = new Date(filterValue.from);
          const toDate = new Date(filterValue.to);
          toDate.setHours(23, 59, 59, 999); // Include full end day
          return transactionDate >= fromDate && transactionDate <= toDate;
          
        case 'monthly':
          // filterValue is month name like "October"
          if (!filterValue) return false;
          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const monthIndex = monthNames.indexOf(filterValue);
          if (monthIndex === -1) return false;
          return transactionDate.getMonth() === monthIndex;
          
        case 'yearly':
          // filterValue is fiscal year like "2024-2025"
          if (!filterValue) return false;
          const fiscalYear = this.getFiscalYear(transactionDate.getFullYear(), transactionDate.getMonth());
          return fiscalYear === filterValue;
          
        default:
          return true;
      }
    });
  }

  // Calculate summary statistics for filtered transactions
  calculateSummary(transactions) {
    if (!Array.isArray(transactions)) return { total: 0, count: 0, average: 0 };
    
    const total = this.sumSafe(transactions.map(t => this.getDepositAmount(t)));
    const count = transactions.length;
    const average = count > 0 ? Math.round(total / count) : 0;
    
    return { total, count, average };
  }

  // Render recent transactions
  renderTransactions() {
    const container = document.getElementById('fees-transactions-content');
    if (!container) return;
    
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    if (data.length === 0) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-receipt"></i><p>No transactions found</p></div>`;
      return;
    }

    // Sort all transactions by receipt number (numeric suffix) descending
    const sortedTransactions = data
      .filter(item => this.getReceiptNumber(item))
      .sort((a, b) => {
        const nb = this.getReceiptNumberValue(b);
        const na = this.getReceiptNumberValue(a);
        if (nb !== na) return nb - na;
        // Fallback to time when receipt numbers equal or missing
        const dateA = this.parseDateFromIST(this.getTransactionDate(a));
        const dateB = this.parseDateFromIST(this.getTransactionDate(b));
        return (dateB || 0) - (dateA || 0);
      });
    
    // Desktop table view
    const tableHTML = `
      <div class="transactions-desktop" style="max-height: 340px; overflow-y: auto;">
        <table class="fees-transactions-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Date</th>
              <th>Fee Submit</th>
              <th>Payment Mode</th>
              <th>Receipt No.</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTransactions.map(transaction => {
              const receiptLink = this.getReceiptLink(transaction);
              const receiptNumber = this.getReceiptNumber(transaction);
              const txnDateRaw = this.getTransactionDate(transaction);
              const txnDateObj = this.parseDateFromIST(txnDateRaw);
              const dateDisplay = txnDateObj ? this.formatDateToDDMMYYYY(txnDateObj) : (txnDateRaw || '—');
              return `
              <tr>
                <td>${this.getStudentName(transaction)}</td>
                <td>${dateDisplay}</td>
                <td>₹${this.getDepositAmount(transaction)}</td>
                <td>${this.getPaymentMode(transaction)}</td>
                <td>${receiptNumber}</td>
                <td>
                  ${receiptLink ? 
                    `<button class="receipt-btn" onclick="window.feesManager.openReceiptLink('${receiptLink}', '${receiptNumber}')">
                      <i class="fas fa-external-link-alt"></i> Receipt
                    </button>` :
                    `<button class="receipt-btn disabled" title="Receipt not available">
                      <i class="fas fa-file-alt"></i> N/A
                    </button>`
                  }
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="transactions-mobile" style="max-height: 340px; overflow-y: auto;">
        ${sortedTransactions.map(transaction => {
          const receiptLink = this.getReceiptLink(transaction);
          const receiptNumber = this.getReceiptNumber(transaction);
          const txnDateRaw = this.getTransactionDate(transaction);
          const txnDateObj = this.parseDateFromIST(txnDateRaw);
          const dateDisplay = txnDateObj ? this.formatDateToDDMMYYYY(txnDateObj) : (txnDateRaw || '—');
          return `
          <div class="transaction-card">
            <div class="transaction-header">
              <strong>${this.getStudentName(transaction)}</strong>
              <span class="transaction-amount">₹${this.getDepositAmount(transaction)}</span>
            </div>
            <div class="transaction-details">
              <span class="transaction-mode">${this.getPaymentMode(transaction)}</span>
              <span class="transaction-date">${dateDisplay}</span>
              <span class="transaction-receipt">${receiptNumber !== 'N/A' ? `Receipt: ${receiptNumber}` : 'Receipt: N/A'}</span>
              ${receiptLink ? 
                `<button class="receipt-btn" onclick="window.feesManager.openReceiptLink('${receiptLink}', '${receiptNumber}')">
                  <i class="fas fa-external-link-alt"></i> Receipt
                </button>` :
                `<button class="receipt-btn disabled" title="Receipt not available">
                  <i class="fas fa-file-alt"></i> N/A
                </button>`
              }
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
    
    container.innerHTML = tableHTML;
  }



  // Render date range collection
  renderDateRange() {
    const container = document.getElementById('fees-range-content');
    const fromInput = document.getElementById('fees-range-from');
    const toInput = document.getElementById('fees-range-to');
    if (!container || !fromInput || !toInput) return;
    
    const fromDate = fromInput.value;
    const toDate = toInput.value;
    
    if (!fromDate || !toDate) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-calendar-alt"></i><p>Please select both from and to dates</p></div>`;
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      container.innerHTML = `<div class="analytics-placeholder"><i class="fas fa-exclamation-triangle"></i><p>From date cannot be later than to date</p></div>`;
      return;
    }

    // Use centralized filtering method
    const data = Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [];
    const rangeTransactions = this.filterTransactionsByDate(data, 'range', { from: fromDate, to: toDate });
    const summary = this.calculateSummary(rangeTransactions);

    // Calculate number of days in range
    const daysDiff = Math.ceil((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1;
    const avgDaily = summary.count > 0 ? Math.round(summary.total / daysDiff) : 0;

    // Format dates for display
    const fromDisplay = new Date(fromDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const toDisplay = new Date(toDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    container.innerHTML = `
      <table class="analytics-summary-table">
        <tr>
          <td><strong>Date Range:</strong></td>
          <td>${fromDisplay} - ${toDisplay}</td>
        </tr>
        <tr>
          <td><strong>Total Collection:</strong></td>
          <td class="amount">₹${summary.total.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Transactions:</strong></td>
          <td>${summary.count}</td>
        </tr>
        <tr>
          <td><strong>Average Daily:</strong></td>
          <td class="amount">₹${avgDaily.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    `;
  }

  // Refresh analytics data and re-render all sections
  async refreshAnalytics(silent = false) {
    const refreshBtn = document.getElementById('fees-analytics-refresh');
    // Preserve currently selected session (if any) to avoid jarring UX
    const sessionSel = document.getElementById('fees-session-select');
    const prevFY = sessionSel ? sessionSel.value : null;

    try {
      // Show loading state only when not silent
      if (!silent && refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
      }

      // Fetch fresh analytics data
      if (window.dataService && typeof window.dataService.fetchFeesAnalytics === 'function') {
        this.feesAnalytics = await window.dataService.fetchFeesAnalytics();
      } else {
        this.feesAnalytics = [];
      }

      // Normalize array
      if (!Array.isArray(this.feesAnalytics)) {
        this.feesAnalytics = this.feesAnalytics && this.feesAnalytics.data ? this.feesAnalytics.data : [];
      }
      
      // Re-render all analytics sections
      this.renderTransactions();
      this.renderDateRange();
      this.populateSessions();

      // Restore previous session selection if still available
      const sessionSel2 = document.getElementById('fees-session-select');
      if (prevFY && sessionSel2) {
        const hasPrev = Array.from(sessionSel2.options).some(o => o.value === prevFY);
        if (hasPrev) sessionSel2.value = prevFY;
      }

      this.renderMonthly();
      this.renderYearly();
      
      // Show success feedback only when not silent
      if (!silent) {
        this.showBannerMessage('Analytics refreshed successfully', 'success');
      }
      
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      if (!silent) {
        this.showBannerMessage('Unable to refresh analytics', 'error');
      }
      throw error; // propagate when silent callers want to handle
    } finally {
      // Remove loading state only when not silent
      if (!silent && refreshBtn) {
        refreshBtn.classList.remove('refreshing');
        refreshBtn.disabled = false;
      }
    }
  }

  // Show top-of-panel banner feedback messages (e.g., refresh status)
  showBannerMessage(message, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('fees-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'fees-message';
      messageEl.className = 'fees-message';
      
      // Insert at top of the Fees action panel
      const feesActionPanel = document.querySelector('#fees-tab .action-section');
      if (feesActionPanel) {
        feesActionPanel.insertBefore(messageEl, feesActionPanel.firstChild);
      }
    }
    
    messageEl.textContent = message;
    messageEl.className = `fees-message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => {
      if (messageEl) {
        messageEl.style.display = 'none';
      }
          }, 2000);
  }

  // Tiny overlay indicator during delayed silent refresh
  showTinyRefreshOverlay() {
    try {
      const root = document.getElementById('fees-analytics');
      if (!root) return;
      // ensure parent can host an absolute child
      if (!root.style.position) root.style.position = 'relative';
      let badge = document.getElementById('fees-refresh-overlay');
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'fees-refresh-overlay';
        badge.setAttribute('aria-live', 'polite');
        Object.assign(badge.style, {
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '6px 10px',
          background: 'rgba(15, 23, 42, 0.85)',
          color: '#fff',
          borderRadius: '999px',
          fontSize: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: '1000'
        });
        badge.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> Updating…`;
        root.appendChild(badge);
      } else {
        badge.style.display = 'flex';
      }
    } catch {}
  }

  hideTinyRefreshOverlay() {
    try {
      const badge = document.getElementById('fees-refresh-overlay');
      if (badge) badge.style.display = 'none';
    } catch {}
  }

  // Retry silent refresh after a delay until the target receipt gets a link
  async refreshUntilReceiptLink(targetReceipt, maxAttempts = 3, intervalMs = 2500) {
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    let attempt = 0;
    while (attempt < maxAttempts) {
      // wait first so the server has time to create the receipt link
      await sleep(intervalMs);
      try {
        await this.refreshAnalytics(true);
      } catch (err) {
        // continue retries even if one refresh fails
        console.warn('Silent refresh attempt failed:', err);
      }
      const found = (Array.isArray(this.feesAnalytics) ? this.feesAnalytics : [])
        .find(item => this.getReceiptNumber(item) === targetReceipt);
      if (found && this.getReceiptLink(found)) {
        // make sure transactions reflect the new link immediately
        this.renderTransactions();
        return true;
      }
      attempt++;
    }
    return false;
  }

  // Download receipt function
  // Open receipt link in new tab
  openReceiptLink(receiptLink, receiptNumber) {
    if (!receiptLink) {
      alert('Receipt link not available');
      return;
    }
    
    console.log(`📄 Opening receipt ${receiptNumber}:`, receiptLink);
    
    // Open the receipt link in a new tab
    try {
      window.open(receiptLink, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open receipt link:', error);
      alert(`Failed to open receipt ${receiptNumber}. Please try again later.`);
    }
  }

  downloadReceipt(refNo) {
    // Kept for backward compatibility
    alert(`Receipt download for transaction ${refNo} would be implemented here.\n\nIn a real implementation, this would:\n- Fetch receipt details from server\n- Generate PDF receipt\n- Trigger download`);
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
