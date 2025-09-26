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
  }

  cacheEls() {
    this.classSel = document.getElementById('fees-class');
    this.rollSel = document.getElementById('fees-roll');
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
    if (this.submitBtn) {
      this.submitBtn.addEventListener('click', () => this.submit());
    }
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
      // Prefill fields based on webhook response keys
      // Try common keys: Sr_No, Serial_No, Name, Total, Fees_Paid, Deposit_Amount, Remarks, Payment_Mode, Ref_No, Date
  this.inputs.srno.value = d.Sr_No ?? d.Serial_No ?? this.inputs.srno.value;
  this.inputs.name.value = d.Name ?? this.inputs.name.value;
  this.inputs.total.value = d.Total ?? d.Total_Fees ?? d.Total_fees ?? this.inputs.total.value;
  this.inputs.paid.value = d.Fees_Paid ?? d.Paid ?? this.inputs.paid.value;
      this.inputs.deposit.value = d.Deposit_Amount ?? d.Deposit ?? this.inputs.deposit.value;
      // New fields from webhook
      if (this.inputs.remaining) {
        const rem = d.Remaining_Fees ?? d.Remaining ?? '';
        this.inputs.remaining.value = typeof rem === 'number' ? rem : (rem || '');
      }
      if (this.inputs.status) {
        this.inputs.status.value = d.Fees_Status ?? d.Status ?? '';
      }
      this.inputs.remarks.value = d.Remarks ?? this.inputs.remarks.value;
      if (d.Payment_Mode && this.inputs.mode.querySelector(`option[value="${d.Payment_Mode}"]`)) {
        this.inputs.mode.value = d.Payment_Mode;
      }
      this.inputs.reff.value = d.Ref_No ?? d.Reff_No ?? this.inputs.reff.value;
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
      // Always set class and roll in the visible controls
      this.classSel.value = cls;
      this.rollSel.value = String(roll);
      // Derive name from contacts if missing
      if (!this.inputs.name.value) {
        const st = window.dataService.getStudentByRollAndClass(roll, cls);
        if (st) this.inputs.name.value = st.Name;
      }

      // Update summary card text
      this.updateSummaryFromInputs();
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
  updateSummaryFromInputs() {
    const s = {
      srno: this.inputs.srno?.value ?? '—',
      name: this.inputs.name?.value ?? '—',
      total: this.inputs.total?.value ?? '—',
      paid: this.inputs.paid?.value ?? '—',
      remaining: this.inputs.remaining?.value ?? '—',
      status: this.inputs.status?.value ?? '—',
    };
    this.setSummaryText(s);
  }

  setSummaryText(s) {
    if (this.summary.srno) this.summary.srno.textContent = s.srno || '—';
    if (this.summary.name) this.summary.name.textContent = s.name || '—';
    if (this.summary.total) this.summary.total.textContent = s.total || '—';
    if (this.summary.paid) this.summary.paid.textContent = s.paid || '—';
    if (this.summary.remaining) this.summary.remaining.textContent = s.remaining || '—';
    if (this.summary.status) this.summary.status.textContent = s.status || '—';
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
