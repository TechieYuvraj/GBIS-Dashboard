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
            return;
        }

        // Get students for selected class
        this.availableStudents = window.dataService.getClassRollNumbers(this.selectedClass);
        this.absentStudents = []; // Reset absent students

        // Populate dropdown
        dropdown.innerHTML = this.availableStudents.map(student => `
            <div class="multi-select-option">
                <input type="checkbox" id="roll-${student.rollNo}" value="${student.rollNo}">
                <label for="roll-${student.rollNo}">
                    Roll No. ${student.rollNo} - ${student.name}
                </label>
            </div>
        `).join('');

        // Bind checkbox events
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleRollSelection(e.target.value, e.target.checked);
            });
        });

        this.updateDisplay();
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
        this.validateForm();
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
        this.validateForm();
    }

    toggleDropdown() {
        const dropdown = document.getElementById('rollno-dropdown');
        if (dropdown) {
            if (this.selectedClass) {
                dropdown.classList.toggle('show');
            }
        }
    }

    hideDropdown() {
        const dropdown = document.getElementById('rollno-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

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

        } catch (error) {
            console.error('Error marking attendance:', error);
            this.showMessage('Failed to mark attendance. Please try again.', 'error');
        } finally {
            // Reset button state
            markBtn.disabled = false;
            markBtn.innerHTML = '<i class="fas fa-check"></i> Mark Attendance';
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
                <div class="chart-label">Attendance: ${attendancePercentage}%</div>
            </div>
            <div class="analytics-details">
                <h5>Last Attendance Record:</h5>
                <p><strong>Class:</strong> ${attendanceData.class}</p>
                <p><strong>Date:</strong> ${attendanceData.date}</p>
                <p><strong>Absent Students:</strong> ${absentCount > 0 ? attendanceData.absent_records.join(', ') : 'None'}</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Response:</strong> ${JSON.stringify(response, null, 2)}</p>
            </div>
        `;
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