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

    init() {
        this.bindEvents();
        this.initializeDropdowns();
        this.setDefaultDate();
    }

    bindEvents() {
        // Date input
        const dateInput = document.getElementById('attendance-date');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                this.validateForm();
            });
        }

        // Class dropdown
        const classSelect = document.getElementById('attendance-class');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectedClass = e.target.value;
                this.populateRollNumbers();
                this.validateForm();
            });
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

    initializeDropdowns() {
        this.populateClassDropdown();
    }

    populateClassDropdown() {
        const classSelect = document.getElementById('attendance-class');
        if (!classSelect || !window.dataService) return;

        // Clear existing options
        classSelect.innerHTML = '<option value="">Select Class</option>';

        const classes = window.dataService.getClasses();
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
    }

    populateRollNumbers() {
        const dropdown = document.getElementById('rollno-dropdown');
        if (!dropdown || !this.selectedClass || !window.dataService) {
            this.availableStudents = [];
            this.absentStudents = [];
            this.updateDisplay();
            this.updateStatPills();
            return;
        }

        // Get students for selected class
        this.availableStudents = window.dataService.getClassRollNumbers(this.selectedClass);
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
        if (dropdown) {
            if (this.selectedClass) {
                dropdown.classList.toggle('show');

                // Focus on search input when opening dropdown
                if (dropdown.classList.contains('show')) {
                    setTimeout(() => {
                        const searchInput = dropdown.querySelector('#attendance-student-search');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }, 50);
                }
            }
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

            // Format date to DD/MM/YYYY
            const selectedDate = new Date(dateInput.value);
            const formattedDate = window.dataService.formatDate(selectedDate);

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
        const analyticsContainer = document.getElementById('attendance-analytics');
        if (!analyticsContainer) return;

        const totalStudents = this.availableStudents.length;
        const absentCount = this.absentStudents.length;
        const presentCount = totalStudents - absentCount;
        const attendancePercentage = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

        // Update stat pills too
        this.updateStatPills();

        analyticsContainer.innerHTML = `
            <div class="analytics-cards">
                <div class="analytics-card">
                    <div class="analytics-number">${totalStudents}</div>
                    <div class="analytics-label">Total Students</div>
                </div>
                <div class="analytics-card present">
                    <div class="analytics-number">${presentCount}</div>
                    <div class="analytics-label">Present</div>
                </div>
                <div class="analytics-card absent">
                    <div class="analytics-number">${absentCount}</div>
                    <div class="analytics-label">Absent</div>
                </div>
                <div class="analytics-card percentage">
                    <div class="analytics-number">${attendancePercentage}%</div>
                    <div class="analytics-label">Attendance Rate</div>
                </div>
            </div>
            <div class="attendance-chart">
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${attendancePercentage}%"></div>
                </div>
                <div class="chart-label">Class Attendance: ${attendancePercentage}%</div>
            </div>
            <div class="analytics-details">
                <h5>Latest Attendance Record</h5>
                <div class="analytics-info-grid">
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Class</div>
                        <div class="analytics-info-value">${attendanceData.class}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Date</div>
                        <div class="analytics-info-value">${attendanceData.date}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Present Students</div>
                        <div class="analytics-info-value">${presentCount} out of ${totalStudents}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Submitted At</div>
                        <div class="analytics-info-value">${new Date().toLocaleString()}</div>
                    </div>
                    ${absentCount > 0 ? `
                    <div class="analytics-info-item" style="grid-column: 1 / -1;">
                        <div class="analytics-info-label">Absent Students</div>
                        <div class="analytics-info-value">${attendanceData.absent_records.join(', ')}</div>
                    </div>
                    ` : `
                    <div class="analytics-info-item" style="grid-column: 1 / -1;">
                        <div class="analytics-info-label">Attendance Status</div>
                        <div class="analytics-info-value">🎉 Perfect Attendance - All students present!</div>
                    </div>
                    `}
                </div>
                <div class="analytics-response">
                    <div class="analytics-response-header">Webhook Response</div>
                    <pre>${JSON.stringify(response, null, 2)}</pre>
                </div>
            </div>
        `;
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
        const formattedDate = window.dataService.formatDate(selectedDate);

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
    setTimeout(() => {
        window.attendanceManager = new AttendanceManager();
    }, 100);
});