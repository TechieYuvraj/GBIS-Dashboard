/**
 * Notification Component for GBIS Dashboard
 * Handles notification sending with student search and analytics
 */

class NotificationManager {
    constructor() {
        this.selectedStudents = [];
        this.attachedFile = null;
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeSearch();
    }

    bindEvents() {
        // Search input
        const searchInput = document.getElementById('notification-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });

            // Clear search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    this.hideSearchResults();
                }
            });
        }

        // Attachment button
        const attachmentBtn = document.querySelector('.attachment-btn');
        const attachmentInput = document.getElementById('attachment-input');
        
        if (attachmentBtn && attachmentInput) {
            attachmentBtn.addEventListener('click', () => {
                attachmentInput.click();
            });

            attachmentInput.addEventListener('change', (e) => {
                this.handleFileAttachment(e.target.files[0]);
            });
        }

        // Send notification button
        const sendBtn = document.getElementById('send-notification');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendNotification();
            });
        }
    }

    initializeSearch() {
        // Initialize search functionality
        this.hideSearchResults();
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }

        if (!window.dataService) {
            console.error('Data service not available');
            return;
        }

        const results = window.dataService.searchStudents(query);
        this.displaySearchResults(results, query);
    }

    displaySearchResults(students, query) {
        const resultsContainer = document.getElementById('notification-search-results');
        if (!resultsContainer) return;

        if (students.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <i class="fas fa-search"></i>
                    No students found for "${query}"
                </div>
            `;
        } else {
            resultsContainer.innerHTML = students.map(student => `
                <div class="search-result-item" data-student-id="${student.Serial_No || student.row_number}">
                    <div class="student-info">
                        <strong>${student.Name}</strong>
                        <span class="student-details">
                            Class: ${student.Class} | Roll No: ${student.Roll_No} | Contact: ${student.Contact_No}
                        </span>
                    </div>
                </div>
            `).join('');

            // Bind click events to search results
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const studentId = e.currentTarget.getAttribute('data-student-id');
                    this.selectStudent(studentId);
                });
            });
        }

        this.showSearchResults();
    }

    selectStudent(studentId) {
        if (!window.dataService) return;

        const student = window.dataService.getStudents().find(s => 
            (s.Serial_No && s.Serial_No == studentId) || (s.row_number && s.row_number == studentId)
        );

        if (student) {
            // Add to selected students if not already selected
            const isAlreadySelected = this.selectedStudents.some(s => 
                (s.Serial_No && s.Serial_No == studentId) || (s.row_number && s.row_number == studentId)
            );

            if (!isAlreadySelected) {
                this.selectedStudents.push(student);
                this.updateSelectedStudentsDisplay();
            }

            // Clear search
            const searchInput = document.getElementById('notification-search');
            if (searchInput) {
                searchInput.value = '';
            }
            this.hideSearchResults();
        }
    }

    updateSelectedStudentsDisplay() {
        const resultsContainer = document.getElementById('notification-search-results');
        if (!resultsContainer) return;

        if (this.selectedStudents.length > 0) {
            resultsContainer.innerHTML = `
                <div class="selected-students">
                    <h5>Selected Students (${this.selectedStudents.length}):</h5>
                    <div class="selected-tags">
                        ${this.selectedStudents.map(student => `
                            <div class="selected-tag">
                                ${student.Name} (${student.Class})
                                <span class="remove" onclick="window.notificationManager.removeStudent('${student.Serial_No || student.row_number}')">×</span>
                            </div>
                        `).join('')}
                    </div>
                    <button class="clear-all-btn" onclick="window.notificationManager.clearAllStudents()">
                        Clear All
                    </button>
                </div>
            `;
            this.showSearchResults();
        } else {
            this.hideSearchResults();
        }
    }

    removeStudent(studentId) {
        this.selectedStudents = this.selectedStudents.filter(student => 
            (student.Serial_No != studentId) && (student.row_number != studentId)
        );
        this.updateSelectedStudentsDisplay();
    }

    clearAllStudents() {
        this.selectedStudents = [];
        this.hideSearchResults();
    }

    showSearchResults() {
        const resultsContainer = document.getElementById('notification-search-results');
        if (resultsContainer) {
            resultsContainer.classList.add('show');
        }
    }

    hideSearchResults() {
        const resultsContainer = document.getElementById('notification-search-results');
        if (resultsContainer) {
            resultsContainer.classList.remove('show');
        }
    }

    handleFileAttachment(file) {
        if (file) {
            this.attachedFile = file;
            const attachmentBtn = document.querySelector('.attachment-btn');
            if (attachmentBtn) {
                attachmentBtn.innerHTML = `
                    <i class="fas fa-paperclip"></i>
                    ${file.name} (${(file.size / 1024).toFixed(1)}KB)
                `;
                attachmentBtn.style.background = '#28a745';
            }
        }
    }

    async sendNotification() {
        const messageInput = document.getElementById('notification-message');
        const sendBtn = document.getElementById('send-notification');
        const successMsg = document.getElementById('notification-success');

        if (!messageInput || !sendBtn || !successMsg) return;

        const message = messageInput.value.trim();

        // Validation
        if (!message) {
            this.showMessage('Please enter a message', 'error');
            return;
        }

        if (this.selectedStudents.length === 0) {
            this.showMessage('Please select at least one student', 'error');
            return;
        }

        try {
            // Show loading state
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Prepare notification data
            const notificationData = {
                message: message,
                students: this.selectedStudents.map(student => ({
                    name: student.Name,
                    class: student.Class,
                    rollNo: student.Roll_No,
                    contact: student.Contact_No,
                    id: student.Serial_No || student.row_number
                })),
                attachment: this.attachedFile ? {
                    name: this.attachedFile.name,
                    size: this.attachedFile.size,
                    type: this.attachedFile.type
                } : null,
                timestamp: new Date().toISOString()
            };

            // Send notification
            const response = await window.dataService.sendNotification(notificationData);

            // Show success message
            this.showMessage('Notification sent successfully!', 'success');

            // Update analytics
            this.updateAnalytics(response);

            // Reset form
            this.resetForm();

        } catch (error) {
            console.error('Error sending notification:', error);
            
            // Provide more specific error messages to users
            let errorMessage = 'Failed to send notification. Please try again.';
            
            if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            } else if (error.message.includes('forbidden')) {
                errorMessage = 'Access denied. Please contact administrator.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            }
            
            this.showMessage(errorMessage, 'error');
        } finally {
            // Reset button state
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Notification';
        }
    }

    showMessage(message, type = 'success') {
        const successMsg = document.getElementById('notification-success');
        if (successMsg) {
            successMsg.textContent = message;
            successMsg.className = `success-message show ${type}`;
            
            setTimeout(() => {
                successMsg.classList.remove('show');
            }, 3000);
        }
    }

    updateAnalytics(response) {
        const analyticsContainer = document.getElementById('notification-analytics');
        if (!analyticsContainer) return;

        // Create analytics display
        const analytics = {
            totalSent: this.selectedStudents.length,
            timestamp: new Date().toLocaleString(),
            status: response.success ? 'SUCCESS' : 'COMPLETED',
            messageLength: document.getElementById('notification-message').value.length,
            students: this.selectedStudents.map(s => s.Name).join(', ')
        };

        analyticsContainer.innerHTML = `
            <div class="analytics-cards">
                <div class="analytics-card">
                    <div class="analytics-number">${analytics.totalSent}</div>
                    <div class="analytics-label">Students Notified</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-number">${analytics.messageLength}</div>
                    <div class="analytics-label">Message Length</div>
                </div>
                <div class="analytics-card present">
                    <div class="analytics-number">${analytics.status}</div>
                    <div class="analytics-label">Status</div>
                </div>
            </div>
            <div class="analytics-details">
                <h5>Latest Notification Details</h5>
                <div class="analytics-info-grid">
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Recipients</div>
                        <div class="analytics-info-value">${analytics.students || 'No students selected'}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Sent At</div>
                        <div class="analytics-info-value">${analytics.timestamp}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Message Preview</div>
                        <div class="analytics-info-value">${document.getElementById('notification-message').value.substring(0, 50)}${analytics.messageLength > 50 ? '...' : ''}</div>
                    </div>
                    <div class="analytics-info-item">
                        <div class="analytics-info-label">Delivery Status</div>
                        <div class="analytics-info-value">${response.success ? '✅ Delivered Successfully' : '✅ Processing Complete'}</div>
                    </div>
                </div>
                <div class="analytics-response">
                    <div class="analytics-response-header">Webhook Response</div>
                    <pre>${JSON.stringify(response, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    resetForm() {
        // Clear message
        const messageInput = document.getElementById('notification-message');
        if (messageInput) {
            messageInput.value = '';
        }

        // Clear selected students
        this.clearAllStudents();

        // Clear attachment
        this.attachedFile = null;
        const attachmentBtn = document.querySelector('.attachment-btn');
        if (attachmentBtn) {
            attachmentBtn.innerHTML = '<i class="fas fa-paperclip"></i> Add Attachment';
            attachmentBtn.style.background = '';
        }

        // Clear file input
        const attachmentInput = document.getElementById('attachment-input');
        if (attachmentInput) {
            attachmentInput.value = '';
        }
    }

    // Method to programmatically add students (used by other components)
    addStudent(student) {
        const isAlreadySelected = this.selectedStudents.some(s => 
            (s.Serial_No && s.Serial_No == student.Serial_No) || 
            (s.row_number && s.row_number == student.row_number)
        );

        if (!isAlreadySelected) {
            this.selectedStudents.push(student);
            this.updateSelectedStudentsDisplay();
        }
    }

    // Method to get current selected students
    getSelectedStudents() {
        return this.selectedStudents;
    }

    // Method to set message programmatically
    setMessage(message) {
        const messageInput = document.getElementById('notification-message');
        if (messageInput) {
            messageInput.value = message;
        }
    }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.notificationManager = new NotificationManager();
    }, 100);
});