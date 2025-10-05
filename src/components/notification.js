/**
 * Notification Component for GBIS Dashboard
 * Handles notification sending with student search and analytics
 */

class NotificationManager {
    constructor() {
        this.selectedStudents = [];
        this.attachedFile = null;
        this.searchTimeout = null;
        this.selectedClass = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeSearch();
        this.initializeClassDropdown();
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

            // Clear search results when clicking outside (but keep selected students visible)
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-results') && 
                    !e.target.closest('#notification-search') && 
                    !e.target.closest('#notification-class')) {
                    // Only hide if no students are selected, otherwise keep showing selected students
                    if (this.selectedStudents.length === 0) {
                        this.hideSearchResults();
                    }
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

        // Class dropdown
        const classSelect = document.getElementById('notification-class');
        if (classSelect) {
            classSelect.addEventListener('change', (e) => {
                this.selectedClass = e.target.value;
                console.log('Selected class:', this.selectedClass);
                
                // Refresh search results if there's an active search
                const searchInput = document.getElementById('notification-search');
                if (searchInput && searchInput.value.trim()) {
                    this.handleSearch(searchInput.value.trim());
                }
            });
        }

        // Select by class button
        const selectByClassBtn = document.getElementById('select-by-class');
        if (selectByClassBtn) {
            selectByClassBtn.addEventListener('click', () => {
                this.selectStudentsByClass();
            });
        }

        // Select all students button
        const selectAllBtn = document.getElementById('select-all-students');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                this.selectAllStudents();
            });
        }

        // Clear all students button
        const clearAllBtn = document.getElementById('clear-all-students');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                this.clearAllStudents();
            });
        }
    }

    initializeSearch() {
        // Initialize search functionality
        this.hideSearchResults();
    }

    async initializeClassDropdown() {
        const classSelect = document.getElementById('notification-class');
        if (!classSelect || !window.dataService) return;

        try {
            // Ensure data service is initialized
            await window.dataService.init();
            
            // Get classes from data service
            const classes = window.dataService.getClasses();
            
            // Clear existing options (except "All Classes")
            classSelect.innerHTML = '<option value="">All Classes</option>';
            
            // Add class options
            classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                classSelect.appendChild(option);
            });
            
            console.log('Class dropdown initialized with classes:', classes);
        } catch (error) {
            console.error('Error initializing class dropdown:', error);
        }
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

        let results = window.dataService.searchStudents(query);
        
        // Filter results by selected class if a specific class is selected
        if (this.selectedClass && this.selectedClass !== '') {
            results = results.filter(student => student.Class === this.selectedClass);
        }
        
        this.displaySearchResults(results, query);
    }

    displaySearchResults(students, query) {
        const resultsContainer = document.getElementById('notification-search-results');
        if (!resultsContainer) return;

        if (students.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <div class="student-info">
                        <strong>No students found</strong>
                        <div class="student-details">No results for "${query}"</div>
                    </div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = students.map(student => {
                const isSelected = this.selectedStudents.some(s => 
                    (s.Serial_No && s.Serial_No == student.Serial_No) || 
                    (s.row_number && s.row_number == student.row_number)
                );
                
                return `
                    <div class="search-result-item ${isSelected ? 'selected' : ''}" data-student-id="${student.Serial_No || student.row_number}">
                        <div class="student-info">
                            <strong>${student.Name}</strong>
                            <div class="student-details">
                                Class: ${student.Class} | Roll No: ${student.Roll_No} | Contact: ${student.Contact_No}
                            </div>
                        </div>
                        ${isSelected ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : '<i class="fas fa-plus-circle" style="color: rgba(167, 139, 250, 0.6);"></i>'}
                    </div>
                `;
            }).join('');

            // Bind click events to search results
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                if (!item.classList.contains('selected')) {
                    item.addEventListener('click', (e) => {
                        const studentId = e.currentTarget.getAttribute('data-student-id');
                        this.selectStudent(studentId);
                    });
                }
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
                
                // Refresh search results to show updated selection status
                const searchInput = document.getElementById('notification-search');
                if (searchInput && searchInput.value.trim()) {
                    this.handleSearch(searchInput.value.trim());
                }
                
                this.showMessage(`Added ${student.Name} to notification list`, 'success');
            }
        }
    }

    updateSelectedStudentsDisplay() {
        const countEl = document.getElementById('notification-selected-count');
        const displayContainer = document.getElementById('selected-students-display');
        
        if (countEl) countEl.textContent = this.selectedStudents.length;
        if (!displayContainer) return;

        if (this.selectedStudents.length > 0) {
            displayContainer.innerHTML = this.selectedStudents.map(student => `
                <div class="student-item" title="Class: ${student.Class} | Roll No: ${student.Roll_No} | Contact: ${student.Contact_No}">
                    <div class="student-info">
                        <div class="student-name">${student.Name}</div>
                        <div class="student-details">${student.Class} • ${student.Roll_No}</div>
                    </div>
                    <button class="remove-student" onclick="window.notificationManager.removeStudent('${student.Serial_No || student.row_number}')" title="Remove ${student.Name}">
                        ×
                    </button>
                </div>
            `).join('');
        } else {
            displayContainer.innerHTML = `
                <div class="no-students-selected">
                    <i class="fas fa-user-plus"></i>
                    <p>No students selected. Search and click students to add them.</p>
                </div>
            `;
        }
    }

    removeStudent(studentId) {
        const removedStudent = this.selectedStudents.find(student => 
            (student.Serial_No == studentId) || (student.row_number == studentId)
        );
        
        this.selectedStudents = this.selectedStudents.filter(student => 
            (student.Serial_No != studentId) && (student.row_number != studentId)
        );
        
        this.updateSelectedStudentsDisplay();
        
        // Refresh search results to show updated selection status
        const searchInput = document.getElementById('notification-search');
        if (searchInput && searchInput.value.trim()) {
            this.handleSearch(searchInput.value.trim());
        }
        
        if (removedStudent) {
            this.showMessage(`Removed ${removedStudent.Name} from notification list`, 'success');
        }
    }

    clearAllStudents() {
        this.selectedStudents = [];
        this.updateSelectedStudentsDisplay();
        this.hideSearchResults();
    }

    selectStudentsByClass() {
        if (!window.dataService || !this.selectedClass) {
            if (!this.selectedClass) {
                this.showMessage('Please select a class first', 'error');
            }
            return;
        }

        const classStudents = window.dataService.getStudentsByClass(this.selectedClass);
        
        // Add students that aren't already selected
        classStudents.forEach(student => {
            const isAlreadySelected = this.selectedStudents.some(s => 
                (s.Serial_No && s.Serial_No == student.Serial_No) || 
                (s.row_number && s.row_number == student.row_number)
            );
            
            if (!isAlreadySelected) {
                this.selectedStudents.push(student);
            }
        });

        this.updateSelectedStudentsDisplay();
        this.showMessage(`Added ${classStudents.length} students from ${this.selectedClass}`, 'success');
    }

    selectAllStudents() {
        if (!window.dataService) {
            console.error('Data service not available');
            return;
        }

        const allStudents = window.dataService.getStudents();
        
        // Add students that aren't already selected
        let addedCount = 0;
        allStudents.forEach(student => {
            const isAlreadySelected = this.selectedStudents.some(s => 
                (s.Serial_No && s.Serial_No == student.Serial_No) || 
                (s.row_number && s.row_number == student.row_number)
            );
            
            if (!isAlreadySelected) {
                this.selectedStudents.push(student);
                addedCount++;
            }
        });

        this.updateSelectedStudentsDisplay();
        this.showMessage(`Added ${addedCount} students. Total selected: ${this.selectedStudents.length}`, 'success');
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
            // File size validation (25MB limit)
            const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
            if (file.size > maxSizeInBytes) {
                this.showMessage(`File size too large. Maximum allowed size is 25MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`, 'error');
                return;
            }

            // File type validation (basic check)
            const allowedTypes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'video/mp4',
                'audio/mp3',
                'audio/mpeg',
                'application/zip',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ];

            if (!allowedTypes.includes(file.type) && file.type !== '') {
                console.warn('File type not in allowed list, but proceeding:', file.type);
            }

            this.attachedFile = file;
            const attachmentBtn = document.querySelector('.attachment-btn');
            if (attachmentBtn) {
                const sizeText = file.size < 1024 ? `${file.size}B` : 
                                file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)}KB` :
                                `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
                                
                attachmentBtn.innerHTML = `
                    <i class="fas fa-paperclip"></i>
                    ${file.name} (${sizeText})
                `;
                attachmentBtn.style.background = 'rgba(139, 195, 250, 0.8)';
            }
            
            console.log('File attached successfully:', {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified).toISOString()
            });
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
            const hasAttachment = this.attachedFile !== null;
            const loadingText = hasAttachment ? 
                '<i class="fas fa-spinner fa-spin"></i> Uploading file...' : 
                '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendBtn.innerHTML = loadingText;

            // Prepare notification data
            const notificationData = {
                message: message,
                selectedClass: this.selectedClass || 'All Classes',
                students: this.selectedStudents.map(student => ({
                    name: student.Name,
                    class: student.Class,
                    rollNo: student.Roll_No,
                    contact: student.Contact_No,
                    id: student.Serial_No || student.row_number
                })),
                timestamp: new Date().toISOString()
            };

            // Send notification with file attachment if present
            if (this.attachedFile) {
                console.log('Sending notification with file attachment:', {
                    fileName: this.attachedFile.name,
                    fileSize: this.attachedFile.size,
                    fileType: this.attachedFile.type,
                    studentsCount: this.selectedStudents.length
                });
            } else {
                console.log('Sending text-only notification to', this.selectedStudents.length, 'students');
            }
            
            const response = await window.dataService.sendNotification(notificationData, this.attachedFile);

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
                errorMessage = 'Request timed out. Please check your connection and try again.' + 
                              (this.attachedFile ? ' Large files may take longer to upload.' : '');
            } else if (error.message.includes('File too large')) {
                errorMessage = error.message;
            } else if (error.message.includes('Unsupported file type')) {
                errorMessage = error.message;
            } else if (error.message.includes('forbidden')) {
                errorMessage = 'Access denied. Please contact administrator.';
            } else if (error.message.includes('not found')) {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = error.message;
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