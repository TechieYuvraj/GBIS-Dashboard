/**
 * Attendance Component for GBIS Dashboard
 * Handles attendance marking with date selection, class dropdown, and multi-select roll numbers
 */

class AttendanceManager {
    constructor() {
        this.selectedClass = '';
        this.absentStudents = [];
        this.availableStudents = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.initializeDropdowns();
        this.setDefaultDate();
        // Fetch and render today's analytics on load
        this.loadTodayAnalytics();
    }

    bindEvents() {
        // Date input
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.validateForm();
                // Also refresh analytics for the selected date
                if (window.dataService && dateInput.value) {
                    const d = new Date(dateInput.value);
                    const dateStr = window.dataService.formatDate(d);
                    this.loadTodayAnalytics(dateStr);
                }
            });
        }

        // Class dropdown
        const classSelect = document.getElementById('attendance-class');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                console.log('Class selection changed to:', e.target.value);
                this.selectedClass = e.target.value;
                this.populateRollNumbers();
                this.validateForm();
            });
        } else {
            console.error('Class select element not found during event binding');
        }

        // Multi-select display
        const multiSelectDisplay = document.getElementById('rollno-display');
        if (multiSelectDisplay) {
            multiSelectDisplay.addEventListener('click', () => {
                this.toggleDropdown();
            });
        }

        // Mark attendance button
        const markBtn = document.getElementById('mark-attendance');
        if (markBtn) {
            markBtn.addEventListener('click', () => {
                this.markAttendance();
            });
        }

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.multi-select-container')) {
                this.hideDropdown();
            }
        });

        // Inline dropdown no longer needs scroll/resize listeners
    }

    setDefaultDate() {
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateInput.value = formattedDate;
        }
    }

    async initializeDropdowns() {
        await this.populateClassDropdown();
    }

    async populateClassDropdown() {
        const classSelect = document.getElementById('attendance-class');
        if (!classSelect) {
            console.error('Class select element not found');
            return;
        }

        if (!window.dataService) {
            console.error('Data service not available');
            return;
        }

        // Clear existing options
        classSelect.innerHTML = '<option value="">Select Class</option>';

        // Ensure data is loaded
        try {
            if (!window.dataService.hasData || !window.dataService.hasData()) {
                console.log('Fetching contacts data for attendance...');
                await window.dataService.fetchContacts();
            }
        } catch (error) {
            console.error('Failed to fetch contacts data:', error);
        }

        const classes = window.dataService.getClasses();
        console.log('Available classes for attendance:', classes);

        if (classes && classes.length > 0) {
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classSelect.appendChild(option);
            });
        } else {
            console.warn('No classes available for attendance dropdown');
        }
    }

    populateRollNumbers() {
        const dropdown = document.getElementById('rollno-dropdown');
        
        if (!dropdown) {
            console.error('Roll number dropdown element not found');
            return;
        }

        if (!this.selectedClass) {
            console.log('No class selected, clearing roll numbers');
            this.availableStudents = [];
            this.absentStudents = [];
            this.updateDisplay();
            this.updateStatPills();
            return;
        }

        if (!window.dataService) {
            console.error('Data service not available');
            this.availableStudents = [];
            this.absentStudents = [];
            this.updateDisplay();
            this.updateStatPills();
            return;
        }

        // Get students for selected class
        console.log('Getting students for class:', this.selectedClass);
        this.availableStudents = window.dataService.getClassRollNumbers(this.selectedClass);
        console.log('Available students:', this.availableStudents);
        
        if (!this.availableStudents || this.availableStudents.length === 0) {
            console.warn('No students found for class:', this.selectedClass);
        }
        
        this.absentStudents = []; // Reset absent students

        // Create dropdown content with search bar
        dropdown.innerHTML = `
            <div class="dropdown-search-container">
                <input type="text" 
                       class="dropdown-search" 
                       placeholder="Search by name or roll number..." 
                       id="attendance-student-search">
                <i class="fas fa-search"></i>
            </div>
            <div class="dropdown-options" id="attendance-dropdown-options">
                ${this.availableStudents.map(student => `
                    <div class="multi-select-option" data-student-name="${student.name.toLowerCase()}" data-roll-no="${student.rollNo}">
                        <input type="checkbox" id="roll-${student.rollNo}" value="${student.rollNo}">
                        <label for="roll-${student.rollNo}">
                            Roll No. ${student.rollNo} - ${student.name}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind search functionality
        const searchInput = dropdown.querySelector('#attendance-student-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterStudentOptions(e.target.value);
            });
        }

        // Bind checkbox events
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleRollSelection(e.target.value, e.target.checked);
            });
        });

        this.updateDisplay();
        this.updateStatPills();
    }

    handleRollSelection(rollNo, isSelected) {
        if (isSelected) {
            // Add to absent list if not already present
            if (!this.absentStudents.includes(rollNo)) {
                this.absentStudents.push(rollNo);
            }
        } else {
            // Remove from absent list
            this.absentStudents = this.absentStudents.filter(roll => roll !== rollNo);
        }

        this.updateDisplay();
        this.updateStatPills();
        this.validateForm();
    }

    filterStudentOptions(searchTerm) {
        const options = document.querySelectorAll('#attendance-dropdown-options .multi-select-option');
        const lowercaseSearch = searchTerm.toLowerCase().trim();

        options.forEach(option => {
            const studentName = option.getAttribute('data-student-name');
            const rollNo = option.getAttribute('data-roll-no');
            
            // Check if search term matches name or roll number
            const nameMatch = studentName.includes(lowercaseSearch);
            const rollMatch = rollNo.toString().includes(lowercaseSearch);
            
            if (nameMatch || rollMatch || lowercaseSearch === '') {
                option.style.display = 'flex';
            } else {
                option.style.display = 'none';
            }
        });
    }

    updateDisplay() {
        const display = document.getElementById('rollno-display');
        if (!display) return;

        if (this.absentStudents.length === 0) {
            display.innerHTML = '<span class="placeholder">Select absent students</span>';
        } else {
            const absentNames = this.absentStudents.map(rollNo => {
                const student = this.availableStudents.find(s => s.rollNo == rollNo);
                return student ? `${student.name} (${rollNo})` : rollNo;
            });

            display.innerHTML = `
                <div class="selected-tags">
                    ${absentNames.map(name => `
                        <span class="selected-tag">
                            ${name}
                            <span class="remove" onclick="window.attendanceManager.removeAbsentStudent('${this.absentStudents[absentNames.indexOf(name)]}')">×</span>
                        </span>
                    `).join('')}
                </div>
            `;
        }
    }

    removeAbsentStudent(rollNo) {
        // Remove from absent list
        this.absentStudents = this.absentStudents.filter(roll => roll !== rollNo);
        
        // Uncheck corresponding checkbox
        const checkbox = document.getElementById(`roll-${rollNo}`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        this.updateDisplay();
        this.updateStatPills();
        this.validateForm();
    }

    toggleDropdown() {
        const dropdown = document.getElementById('rollno-dropdown');
        if (!dropdown) {
            console.error('Dropdown element not found');
            return;
        }

        if (!this.selectedClass) {
            console.warn('No class selected, cannot open dropdown');
            return;
        }

        console.log('Toggling dropdown, current state:', dropdown.classList.contains('show'));
        dropdown.classList.toggle('show');

        // Focus on search input when opening dropdown
        if (dropdown.classList.contains('show')) {
            console.log('Dropdown opened, focusing search input');
            setTimeout(() => {
                const searchInput = dropdown.querySelector('#attendance-student-search');
                if (searchInput) {
                    searchInput.focus();
                } else {
                    console.warn('Search input not found in dropdown');
                }
            }, 50);
        }
    }

    hideDropdown() {
        const dropdown = document.getElementById('rollno-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');

            // Clear search when hiding dropdown
            const searchInput = dropdown.querySelector('#attendance-student-search');
            if (searchInput) {
                searchInput.value = '';
                this.filterStudentOptions(''); // Show all options
            }
        }
    }

    // No repositioning needed in inline layout
    repositionDropdown() { /* noop */ }

    validateForm() {
        const markBtn = document.getElementById('mark-attendance');
        const dateInput = document.getElementById('attendance-date');
        
        if (!markBtn || !dateInput) return;

        const isValid = dateInput.value && this.selectedClass;
        markBtn.disabled = !isValid;
        
        if (isValid) {
            markBtn.style.opacity = '1';
            markBtn.style.cursor = 'pointer';
        } else {
            markBtn.style.opacity = '0.6';
            markBtn.style.cursor = 'not-allowed';
        }
    }

    async markAttendance() {
        const dateInput = document.getElementById('attendance-date');
        const markBtn = document.getElementById('mark-attendance');
        const successMsg = document.getElementById('attendance-success');

        if (!dateInput || !markBtn || !successMsg) return;

        // Validation
        if (!dateInput.value) {
            this.showMessage('Please select a date', 'error');
            return;
        }

        if (!this.selectedClass) {
            this.showMessage('Please select a class', 'error');
            return;
        }

        try {
            // Show loading state
            markBtn.disabled = true;
            markBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';

            // Format date to IST format
            const selectedDate = new Date(dateInput.value);
            const formattedDate = window.dataService.formatDateToIST(selectedDate);

            // Prepare attendance data
            const attendanceData = [{
                class: this.selectedClass,
                date: formattedDate,
                absent_records: this.absentStudents.map(roll => roll.toString())
            }];

            console.log('Submitting attendance:', attendanceData);

            // Submit attendance
            const response = await window.dataService.submitAttendance(attendanceData);

            // Show success message
            this.showMessage('Attendance marked successfully!', 'success');

            // Update analytics
            this.updateAnalytics(attendanceData[0], response);

            // Reset form
            this.resetForm();
            this.updateStatPills();

        } catch (error) {
            console.error('Error marking attendance:', error);
            this.showMessage('Failed to mark attendance. Please try again.', 'error');
        } finally {
            // Reset button state
            markBtn.disabled = false;
            markBtn.innerHTML = '<i class="fas fa-check"></i> Submit';
        }
    }

    showMessage(message, type = 'success') {
        const successMsg = document.getElementById('attendance-success');
        if (successMsg) {
            successMsg.textContent = message;
            successMsg.className = `success-message show ${type}`;
            
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);
        }
    }

    updateAnalytics(attendanceData, response) {
        // After submitting attendance, refresh analytics from server for the selected date
        this.loadTodayAnalytics(attendanceData.date);
    }

    /**
     * Load analytics for given date (DD/MM/YYYY). If not provided, use today's date.
     * Renders a list of class bars with Class, Total, Present, Absent and Present %.
     * Bars are green for the classes returned by Attendance_fetch.
     */
    async loadTodayAnalytics(dateDDMMYYYY) {
        const analyticsContainer = document.getElementById('attendance-analytics');
        if (!analyticsContainer || !window.dataService) return;

        // Derive today's date if not provided
        let dateStr = dateDDMMYYYY;
        if (!dateStr) {
            const today = new Date();
            dateStr = window.dataService.formatDate(today);
        }

        // Show loading state
        analyticsContainer.innerHTML = `
            <div class="analytics-loading">Loading analytics for ${dateStr}...</div>
        `;

        try {
            // Ensure class list is available so blank bars render at initial load
            if (!window.dataService.hasData && window.dataService.getClasses && window.dataService.getClasses().length === 0) {
                // Fallback check if hasData is not present or returns false
                try { await window.dataService.fetchContacts(); } catch (e) { /* ignore */ }
            } else if (window.dataService.hasData && !window.dataService.hasData()) {
                try { await window.dataService.fetchContacts(); } catch (e) { /* ignore */ }
            }

            // Try to fetch attendance summary, but continue with fallback if it fails
            let summary = [];
            try {
                summary = await window.dataService.fetchAttendanceSummary(dateStr);
            } catch (webhookError) {
                console.warn('Attendance webhook failed, showing classes without data:', webhookError.message);
                // Continue with empty summary - fallback logic will handle it
                summary = [];
            }

            // Map summary by class
            const summaryMap = new Map();
            (summary || []).forEach(s => {
                if (s && s.class) summaryMap.set(String(s.class), s);
            });

            // Build union of all classes (dataService classes + any from summary)
            const classes = (window.dataService.getClasses ? window.dataService.getClasses() : []) || [];
            const classSet = new Set(classes);
            (summary || []).forEach(s => { if (s && s.class && !classSet.has(String(s.class))) classSet.add(String(s.class)); });
            let allClasses = Array.from(classSet);
            if (window.dataService && typeof window.dataService.sortClasses === 'function') {
                allClasses = window.dataService.sortClasses(allClasses);
            }

            // Build bars list for all classes with individual send notification buttons
            const barsHtml = allClasses.length > 0
                ? allClasses.map(cls => {
                    const item = summaryMap.get(cls);
                    const totalFromRoster = (window.dataService.getStudentsByClass) ? window.dataService.getStudentsByClass(cls).length : (item?.total || 0);
                    const hasAttendanceData = !!item; // Class has attendance marked
                    
                    if (item) {
                        const present = Number(item.present ?? 0);
                        const absentFromWebhook = item.absent;
                        const absent = Number(absentFromWebhook ?? 0);
                        const computedTotal = present + absent;
                        const total = (typeof item.total === 'number') ? Number(item.total) : computedTotal;
                        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                        return `
                            <div class="class-bar fetched">
                                <div class="class-bar-header">
                                    <div class="class-info">
                                        <span class="class-name">${cls}</span>
                                        <span class="class-ratio">${pct}%</span>
                                    </div>
                                    <button class="class-notification-btn btn-primary-glass" 
                                            data-class="${cls}" 
                                            data-date="${dateStr}"
                                            ${hasAttendanceData ? '' : 'disabled'}>
                                        <i class="fas fa-paper-plane"></i>
                                        Send Alert
                                    </button>
                                </div>
                                <div class="class-bar-track" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" role="progressbar">
                                    <div class="class-bar-fill" style="width:${pct}%"></div>
                                </div>
                                <div class="class-bar-details">
                                    <span>Total: ${total}</span>
                                    <span>Present: ${present}</span>
                                    <span>Absent: ${absent}</span>
                                </div>
                            </div>
                        `;
                    } else {
                        // No data fetched for this class
                        const total = totalFromRoster || 0;
                        return `
                            <div class="class-bar no-data">
                                <div class="class-bar-header">
                                    <div class="class-info">
                                        <span class="class-name">${cls}</span>
                                        <span class="class-ratio">—</span>
                                    </div>
                                    <button class="class-notification-btn btn-primary-glass" 
                                            data-class="${cls}" 
                                            data-date="${dateStr}"
                                            disabled>
                                        <i class="fas fa-paper-plane"></i>
                                        Send Alert
                                    </button>
                                </div>
                                <div class="class-bar-track" aria-valuemin="0" aria-valuemax="100" role="progressbar">
                                    <div class="class-bar-fill" style="width:0%"></div>
                                </div>
                                <div class="class-bar-details">
                                    <span>Total: ${total}</span>
                                    <span>Present: —</span>
                                    <span>Absent: —</span>
                                </div>
                            </div>
                        `;
                    }
                }).join('')
                : `<div class="analytics-empty">No classes available.</div>`;

            analyticsContainer.innerHTML = `
                <div class="analytics-header-row">
                    <div>
                        <div class="analytics-title">Attendance Analytics</div>
                        <div class="analytics-subtitle">Date: ${dateStr}</div>
                    </div>
                </div>
                <div class="class-bars-list">${barsHtml}</div>
            `;

            // Bind click handlers for individual class notification buttons
            const classNotificationBtns = analyticsContainer.querySelectorAll('.class-notification-btn');
            classNotificationBtns.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (btn.disabled) return;
                    
                    const className = btn.getAttribute('data-class');
                    const date = btn.getAttribute('data-date');
                    const originalHtml = btn.innerHTML;
                    
                    try {
                        btn.disabled = true;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                        
                        // Convert date format from DD/MM/YYYY to DD-MM-YYYY if needed
                        const formattedDate = date.includes('/') ? date.replace(/\//g, '-') : date;
                        
                        console.log(`Sending notification for class ${className} on ${formattedDate}`);
                        
                        // Call data service to send notification for specific class
                        await window.dataService.sendClassAbsentNotification(className, formattedDate);
                        
                        if (window.Helpers && typeof window.Helpers.showToast === 'function') {
                            window.Helpers.showToast(`Notification sent for ${className}`, 'success');
                        } else {
                            alert(`Notification sent for ${className}`);
                        }
                        
                        // Show permanent success state and keep button disabled
                        btn.innerHTML = '<i class="fas fa-check"></i> Notification Sent';
                        btn.disabled = true;
                        btn.style.opacity = '0.6';
                        btn.style.cursor = 'not-allowed';
                        
                    } catch (err) {
                        console.error(`Failed to send notification for class ${className}:`, err);
                        if (window.Helpers && typeof window.Helpers.showToast === 'function') {
                            window.Helpers.showToast(`Failed to send notification for ${className}`, 'error');
                        } else {
                            alert(`Failed to send notification for ${className}`);
                        }
                        
                        // Reset button state
                        btn.innerHTML = originalHtml;
                        btn.disabled = false;
                    }
                });
            });
        } catch (err) {
            console.error('Failed to load analytics:', err);
            analyticsContainer.innerHTML = `
                <div class="analytics-error">Failed to load analytics. ${err.message || ''}</div>
            `;
        }
    }

    updateStatPills() {
        const totalEl = document.getElementById('attendance-total-students');
        const absentEl = document.getElementById('attendance-absent-count');
        if (totalEl) totalEl.textContent = this.availableStudents.length;
        if (absentEl) absentEl.textContent = this.absentStudents.length;
    }

    resetForm() {
        // Reset class selection
        const classSelect = document.getElementById('attendance-class');
        if (classSelect) {
            classSelect.value = '';
        }

        // Reset selected data
        this.selectedClass = '';
        this.absentStudents = [];
        this.availableStudents = [];

        // Update display
        this.updateDisplay();
        this.hideDropdown();

        // Clear roll number dropdown
        const dropdown = document.getElementById('rollno-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
        }

        // Validate form
        this.validateForm();
    }

    // Method to get attendance data
    getAttendanceData() {
        const dateInput = document.getElementById('attendance-date');
        if (!dateInput || !this.selectedClass) return null;

        const selectedDate = new Date(dateInput.value);
        // Format date to simple DD-MM-YYYY format for consistency with attendance submission
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        return {
            class: this.selectedClass,
            date: formattedDate,
            absent_records: this.absentStudents,
            total_students: this.availableStudents.length,
            present_count: this.availableStudents.length - this.absentStudents.length
        };
    }

    // Method to set date programmatically
    setDate(date) {
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            if (typeof date === 'string') {
                dateInput.value = date;
            } else {
                dateInput.value = date.toISOString().split('T')[0];
            }
            this.validateForm();
        }
    }

    // Method to set class programmatically
    setClass(className) {
        const classSelect = document.getElementById('attendance-class');
        if (classSelect) {
            classSelect.value = className;
            this.selectedClass = className;
            this.populateRollNumbers();
            this.validateForm();
        }
    }

    // Method to mark specific students as absent
    markStudentsAbsent(rollNumbers) {
        this.absentStudents = rollNumbers.map(roll => roll.toString());
        
        // Update checkboxes
        this.availableStudents.forEach(student => {
            const checkbox = document.getElementById(`roll-${student.rollNo}`);
            if (checkbox) {
                checkbox.checked = this.absentStudents.includes(student.rollNo.toString());
            }
        });
        
        this.updateDisplay();
        this.validateForm();
    }
}

// Initialize attendance manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for other components to initialize first
    setTimeout(() => {
        if (document.getElementById('attendance-tab')) {
            console.log('Initializing attendance manager...');
            window.attendanceManager = new AttendanceManager();
        }
    }, 200);
});