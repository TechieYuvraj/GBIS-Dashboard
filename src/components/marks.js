/**
 * Marks Component for GBIS Dashboard
 * Handles class selection, marks entry, validation, and submission
 */

class MarksManager {
  constructor() {
    this.selectedClass = '';
    this.maxMarks = 0;
    this.rows = []; // { rollNo, name, obtained }
    this.init();
  }

  init() {
    // Ensure the marks tab has the expected markup (compat with older layouts)
    this.ensureMarkup();
    this.bindEvents();
    this.populateClassDropdown();
    this.setDefaultDate();
  }

  ensureMarkup() {
    const tab = document.getElementById('marks-tab');
    if (!tab) return;
    // If our inputs already exist, do nothing
    if (document.getElementById('marks-date') && document.getElementById('marks-class')) return;

    tab.innerHTML = `
      <div class="single-layout">
        <h3>Marks</h3>
        <div class="split-layout">
          <div class="action-section depth-card panel-card" data-tilt>
            <h3>Marks Entry</h3>
            <div class="form-group">
              <label for="marks-date"><i class="fas fa-calendar"></i> Select Date:</label>
              <input type="date" id="marks-date" class="form-input" aria-label="Marks date">
            </div>
            <div class="form-group">
              <label for="marks-class"><i class="fas fa-users"></i> Select Class:</label>
              <select id="marks-class" class="form-input" aria-label="Select class for marks">
                <option value="">Choose a class</option>
              </select>
            </div>
            <div class="form-group">
              <label for="marks-exam"><i class="fas fa-book"></i> Exam Name:</label>
              <input type="text" id="marks-exam" class="form-input" placeholder="e.g., Midterm" aria-label="Exam name">
            </div>
            <div class="form-group">
              <label for="marks-subject"><i class="fas fa-book-open"></i> Subject:</label>
              <input type="text" id="marks-subject" class="form-input" placeholder="e.g., Mathematics" aria-label="Subject">
            </div>
            <div class="form-group">
              <label for="marks-topic"><i class="fas fa-tags"></i> Topic:</label>
              <input type="text" id="marks-topic" class="form-input" placeholder="e.g., Algebra (Linear Equations)" aria-label="Topic">
            </div>
            <div class="form-group">
              <label for="marks-mm"><i class="fas fa-list-ol"></i> Maximum Marks (MM):</label>
              <input type="number" id="marks-mm" class="form-input" placeholder="e.g., 100" min="0" step="1" aria-label="Maximum marks">
            </div>
            <div class="form-group">
              <div id="marks-students-container" class="marks-table-container">
                <div class="analytics-placeholder">
                  <i class="fas fa-users"></i>
                  <p>Select a class to load students</p>
                </div>
              </div>
            </div>
            <div class="form-group">
              <button class="send-btn btn-primary-glass" id="submit-marks">
                <i class="fas fa-paper-plane"></i>
                Submit Marks
              </button>
              <div class="success-message" id="marks-success"></div>
            </div>
          </div>
          <div class="analytics-section depth-card panel-card" data-tilt>
            <h3>Analytics</h3>
            <div id="marks-analytics">
              <div class="analytics-placeholder">
                <i class="fas fa-chart-bar"></i>
                <p>Fill marks to see analytics here</p>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  setDefaultDate() {
    const dateInput = document.getElementById('marks-date');
    if (dateInput) {
      const today = new Date();
      dateInput.value = today.toISOString().split('T')[0];
    }
  }

  bindEvents() {
    const classSelect = document.getElementById('marks-class');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        this.selectedClass = e.target.value;
        this.loadStudents();
      });
    }

    const mmInput = document.getElementById('marks-mm');
    if (mmInput) {
      mmInput.addEventListener('input', (e) => {
        this.maxMarks = parseInt(e.target.value || '0', 10);
        this.enforceMaxMarks();
      });
    }

    const submitBtn = document.getElementById('submit-marks');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submit());
    }
  }

  async populateClassDropdown() {
    const classSelect = document.getElementById('marks-class');
    if (!classSelect || !window.dataService) return;

    // Attempt to ensure classes are available
    let classes = window.dataService.getClasses();
    if (!classes || classes.length === 0) {
      try {
        // fetchContacts will populate classes internally
        await window.dataService.fetchContacts();
        classes = window.dataService.getClasses();
      } catch (e) {
        console.warn('Could not fetch contacts to populate classes for marks:', e);
      }
    }

    // Clear existing options
    classSelect.innerHTML = '<option value="">Choose a class</option>';

    (classes || []).forEach((cls) => {
      const option = document.createElement('option');
      option.value = cls;
      option.textContent = cls;
      classSelect.appendChild(option);
    });

    // Auto-select first class if none selected yet
    if (!this.selectedClass && classes && classes.length > 0) {
      this.selectedClass = classes[0];
      classSelect.value = this.selectedClass;
      this.loadStudents();
    }
  }

  loadStudents() {
    const container = document.getElementById('marks-students-container');
    if (!container) return;

    if (!this.selectedClass) {
      container.innerHTML = `
        <div class="analytics-placeholder">
          <i class="fas fa-users"></i>
          <p>Select a class to load students</p>
        </div>
      `;
      return;
    }

    const students = (window.dataService && typeof window.dataService.getStudentsByClass === 'function')
      ? (window.dataService.getStudentsByClass(this.selectedClass) || [])
      : [];
    this.rows = students.map((s) => ({ rollNo: s.Roll_No, name: s.Name, obtained: '' }));

    container.innerHTML = `
      <table class="marks-table" aria-label="Marks entry table">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th style="width:120px; text-align:right;">Obtained</th>
          </tr>
        </thead>
        <tbody>
          ${this.rows
            .map(
              (r, idx) => `
            <tr>
              <td>${r.rollNo}</td>
              <td>${r.name}</td>
              <td style="text-align:right;">
                <input type="number" class="marks-input" min="0" step="1" data-index="${idx}" placeholder="0">
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    // Bind inputs
    container.querySelectorAll('.marks-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        let val = e.target.value;
        // Normalize
        if (val === '') {
          this.rows[idx].obtained = '';
          return;
        }
        let num = parseInt(val, 10);
        if (isNaN(num) || num < 0) num = 0;
        if (this.maxMarks > 0 && num > this.maxMarks) {
          num = this.maxMarks;
          e.target.value = String(num);
        }
        this.rows[idx].obtained = num;
      });
    });
  }

  enforceMaxMarks() {
    const container = document.getElementById('marks-students-container');
    if (!container) return;
    container.querySelectorAll('.marks-input').forEach((inp) => {
      const val = inp.value;
      if (val === '') return;
      let num = parseInt(val, 10);
      if (isNaN(num)) return;
      if (this.maxMarks > 0 && num > this.maxMarks) {
        inp.value = String(this.maxMarks);
        const idx = parseInt(inp.getAttribute('data-index'), 10);
        this.rows[idx].obtained = this.maxMarks;
      }
    });
  }

  buildPayload() {
    const dateInput = document.getElementById('marks-date');
    const examInput = document.getElementById('marks-exam');
    const subjectInput = document.getElementById('marks-subject');
    const topicInput = document.getElementById('marks-topic');
    const mmInput = document.getElementById('marks-mm');

    if (!dateInput || !examInput || !mmInput) return null;
    if (!this.selectedClass) return null;

    const formattedDate = (dateInput && dateInput.value)
      ? window.dataService.formatDateToIST(new Date(dateInput.value))
      : window.dataService.formatDateToIST(new Date());

    const marksList = this.rows
      .filter((r) => r.obtained !== '')
      .map((r) => ({ rollNo: r.rollNo, name: r.name, obtained: Number(r.obtained) }));

    return {
      date: formattedDate,
      class: this.selectedClass,
      examName: examInput.value.trim(),
      subject: subjectInput ? subjectInput.value.trim() : '',
      topic: topicInput ? topicInput.value.trim() : '',
      maxMarks: Number(mmInput.value || 0),
      marks: marksList,
    };
  }

  async submit() {
    const submitBtn = document.getElementById('submit-marks');
    const successMsg = document.getElementById('marks-success');

    const payload = this.buildPayload();
    if (!payload) {
      this.showMessage('Please fill Date, Class, Exam Name, and MM', 'error');
      return;
    }

    if (!payload.examName) {
      this.showMessage('Please enter Exam Name', 'error');
      return;
    }

    if (!(payload.maxMarks > 0)) {
      this.showMessage('Please enter a valid Maximum Marks (MM)', 'error');
      return;
    }

    if (!payload.marks || payload.marks.length === 0) {
      this.showMessage('Enter marks for at least one student', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

      const resp = await window.dataService.submitMarksUpdate(payload);

      this.showMessage('Marks submitted successfully', 'success');
      if (window.Helpers && typeof window.Helpers.showToast === 'function') {
        window.Helpers.showToast('Marks submitted successfully', 'success');
      }

      // Optional: simple analytics
      const analytics = document.getElementById('marks-analytics');
      if (analytics) {
        const totalEntered = payload.marks.length;
        const avg = totalEntered > 0 ? Math.round(payload.marks.reduce((a, b) => a + b.obtained, 0) / totalEntered) : 0;
        analytics.innerHTML = `
          <div class="analytics-cards">
            <div class="analytics-card"><div class="analytics-number">${totalEntered}</div><div class="analytics-label">Entries</div></div>
            <div class="analytics-card"><div class="analytics-number">${avg}</div><div class="analytics-label">Avg</div></div>
            <div class="analytics-card present"><div class="analytics-number">${payload.maxMarks}</div><div class="analytics-label">MM</div></div>
          </div>`;
      }

    } catch (err) {
      console.error('Failed to submit marks:', err);
      this.showMessage(err.message || 'Failed to submit marks', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Marks';
    }
  }

  showMessage(message, type = 'success') {
    const el = document.getElementById('marks-success');
    if (!el) return;
    el.textContent = message;
    el.className = `success-message show ${type}`;
    setTimeout(() => el.classList.remove('show'), 3000);
  }
}

// Initialize MarksManager even if DOMContentLoaded already fired
(function initMarks() {
  const start = () => {
    if (!window.marksManager) {
      window.marksManager = new MarksManager();
    }
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(start, 50));
  } else {
    // DOM is already ready
    setTimeout(start, 0);
  }
})();
