/**
 * Contacts Component for GBIS Dashboard
 * Handles student contact display, search, and filtering
 */

class ContactsManager {
    constructor() {
        this.students = [];
        this.filteredStudents = [];
        this.currentFilters = {
            search: '',
            class: ''
        };
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadStudents();
        this.renderStudents();
        this.updateStats();
    }

    bindEvents() {
        // Search input
        const searchInput = document.getElementById('contacts-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            });
        }

        // Class filter
        const classFilter = document.getElementById('class-filter');
        if (classFilter) {
            classFilter.addEventListener('change', (e) => {
                this.currentFilters.class = e.target.value;
                this.applyFilters();
            });
        }
    }

    async loadStudents() {
        try {
            this.showLoading(true);
            
            // Wait for data service to be ready
            if (window.dataService) {
                // First try to get existing students
                this.students = window.dataService.getStudents();
                
                // Only fetch if no students are available and dataService is not initialized
                if (this.students.length === 0 && !window.dataService.isInitialized) {
                    console.log('No students found and service not initialized, fetching...');
                    await window.dataService.fetchContacts();
                    this.students = window.dataService.getStudents();
                } else if (this.students.length === 0) {
                    // If initialized but no students, something went wrong - try again
                    console.log('Service initialized but no students found, attempting fetch...');
                    await window.dataService.fetchContacts();
                    this.students = window.dataService.getStudents();
                } else {
                    console.log('Students already available, skipping fetch');
                }
                
                // Initialize filtered students with all students
                this.filteredStudents = [...this.students];
                
                this.populateClassFilter();
            }
        } catch (error) {
            console.error('Error loading students:', error);
            this.showError('Failed to load student data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    populateClassFilter() {
        const classFilter = document.getElementById('class-filter');
        if (!classFilter || !window.dataService) return;

        // Clear existing options except "All Classes"
        classFilter.innerHTML = '<option value="">All Classes</option>';
        
        const classes = window.dataService.getClasses();
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classFilter.appendChild(option);
        });
    }

    applyFilters() {
        if (!window.dataService) {
            // Fallback to show all students if data service not ready
            this.filteredStudents = [...this.students];
        } else {
            this.filteredStudents = window.dataService.filterStudents(this.currentFilters);
        }
        
        this.renderStudents();
        this.updateStats();
    }

    renderStudents() {
        const container = document.getElementById('students-container');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        if (this.filteredStudents.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No students found matching your criteria.</p>
                </div>
            `;
            return;
        }

        // Render student cards
        this.filteredStudents.forEach(student => {
            const studentCard = this.createStudentCard(student);
            container.appendChild(studentCard);
        });
    }

    createStudentCard(student) {
        const card = document.createElement('div');
        card.className = 'student-card';

        const safe = (v) => v || '—';
        const formatCurrency = (amount) => {
            if (!amount || amount === 0) return '₹0';
            return `₹${Number(amount).toLocaleString('en-IN')}`;
        };
        const formatContactNumber = (contact) => {
            if (!contact) return '—';
            const str = String(contact);
            return str.length === 10 ? str.replace(/(\d{5})(\d{5})/, '$1-$2') : str;
        };

        card.innerHTML = `
            <div class="student-header">
                <h4 class="student-name">${safe(student.Name)}</h4>
                <span class="student-class">${safe(student.Class)}</span>
            </div>
            <div class="student-meta">
                <div class="meta"><span class="meta-label">Roll</span><span class="meta-value">${safe(student.Roll_No)}</span></div>
                <div class="meta"><span class="meta-label">Serial</span><span class="meta-value">${safe(student.Serial_No)}</span></div>
                <div class="meta"><span class="meta-label">Father</span><span class="meta-value">${safe(student.Father_Name)}</span></div>
                <div class="meta"><span class="meta-label">Mother</span><span class="meta-value">${safe(student.Mother_Name)}</span></div>
                <div class="meta"><span class="meta-label">DOB</span><span class="meta-value">${safe(student.DOB)}</span></div>
                <div class="meta"><span class="meta-label">Admission</span><span class="meta-value">${safe(student.Admission_Date)}</span></div>
                <div class="meta" style="grid-column: span 2"><span class="meta-label">Address</span><span class="meta-value">${safe(student.Address)}</span></div>
                <div class="meta"><span class="meta-label">Contact</span><span class="meta-value em">${formatContactNumber(student.Contact_No)}</span></div>
            </div>
            
            <div class="student-fees-section">
                <h5 class="fees-section-title">
                    <i class="fas fa-money-bill-wave"></i>
                    Fee Details
                </h5>
                <div class="fees-grid">
                    <div class="fee-item">
                        <span class="fee-label">Transportation</span>
                        <span class="fee-value">${formatCurrency(student.Transportaion_fees || student.Transportaion_Fees)}</span>
                    </div>
                    <div class="fee-item">
                        <span class="fee-label">Tuition</span>
                        <span class="fee-value">${formatCurrency(student.Tution_fees || student['Tution_fees '])}</span>
                    </div>
                    <div class="fee-item total-fee">
                        <span class="fee-label">Total Fees</span>
                        <span class="fee-value">${formatCurrency(student.Total_fees)}</span>
                    </div>
                    <div class="fee-item deposited-fee">
                        <span class="fee-label">Deposited</span>
                        <span class="fee-value">${formatCurrency(student.Deposited_fees)}</span>
                    </div>
                    <div class="fee-item pending-fee">
                        <span class="fee-label">Pending</span>
                        <span class="fee-value">${formatCurrency(student.Pending_fees || student['Pending_fees '])}</span>
                    </div>
                    <div class="fee-item discount-fee">
                        <span class="fee-label">Discount</span>
                        <span class="fee-value">${formatCurrency(student.Discount_Amt)}</span>
                    </div>
                </div>
                ${student.Disc_reason && student.Disc_reason !== 'NA' ? `
                    <div class="discount-reason">
                        <span class="discount-label">Discount Reason:</span>
                        <span class="discount-text">${student.Disc_reason}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="student-actions">
                <button class="action-btn view-details-btn" onclick="window.contactsManager.showStudentDetails('${student.Serial_No || student.row_number}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
                <button class="action-btn send-notification-btn" onclick="window.contactsManager.sendNotificationToStudent('${student.Serial_No || student.row_number}')">
                    <i class="fas fa-bell"></i>
                    Send Notice
                </button>
            </div>
        `;

        return card;
    }

    updateStats() {
        const totalClassesElement = document.getElementById('total-classes');
        const totalStudentsElement = document.getElementById('total-students');

        if (totalClassesElement) {
            totalClassesElement.textContent = window.dataService ? window.dataService.getClasses().length : 0;
        }

        if (totalStudentsElement) {
            totalStudentsElement.textContent = this.filteredStudents.length;
        }
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        const container = document.getElementById('students-container');
        
        if (loadingElement && container) {
            if (show) {
                loadingElement.style.display = 'block';
                container.style.display = 'none';
            } else {
                loadingElement.style.display = 'none';
                container.style.display = 'grid';
            }
        }
    }

    showError(message) {
        const container = document.getElementById('students-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                    <button onclick="window.contactsManager.refresh()" class="retry-btn">
                        <i class="fas fa-refresh"></i>
                        Retry
                    </button>
                </div>
            `;
        }
    }

    async refresh() {
        try {
            this.showLoading(true);
            if (window.dataService) {
                await window.dataService.refreshData();
                this.students = window.dataService.getStudents();
                this.populateClassFilter();
                this.applyFilters();
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError('Failed to refresh data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    refreshIfNeeded() {
        // Check if we need to refresh data
        if (this.students.length === 0) {
            this.loadStudents();
        }
    }

    // Method to get selected students (for other components)
    getStudents() {
        return this.filteredStudents;
    }

    // Method to search for a specific student
    findStudent(query) {
        if (!window.dataService) return [];
        return window.dataService.searchStudents(query);
    }

    // Method to get student by ID
    getStudentById(id) {
        return this.students.find(student => 
            student.Serial_No == id || student.row_number == id
        );
    }

    // Method to clear filters
    clearFilters() {
        const searchInput = document.getElementById('contacts-search');
        const classFilter = document.getElementById('class-filter');
        
        if (searchInput) searchInput.value = '';
        if (classFilter) classFilter.value = '';
        
        this.currentFilters = { search: '', class: '' };
        this.applyFilters();
    }

    // Method to set search query programmatically
    setSearchQuery(query) {
        const searchInput = document.getElementById('contacts-search');
        if (searchInput) {
            searchInput.value = query;
            this.currentFilters.search = query;
            this.applyFilters();
        }
    }

    // Method to set class filter programmatically
    setClassFilter(className) {
        const classFilter = document.getElementById('class-filter');
        if (classFilter) {
            classFilter.value = className;
            this.currentFilters.class = className;
            this.applyFilters();
        }
    }

    // Method to show detailed student information in a modal/popup
    showStudentDetails(studentId) {
        const student = this.getStudentById(studentId);
        if (!student) {
            console.error('Student not found:', studentId);
            return;
        }

        // Create and show popup with all student details
        this.showStudentPopup(student);
    }

    // Method to send notification to a specific student
    sendNotificationToStudent(studentId) {
        const student = this.getStudentById(studentId);
        if (!student) {
            console.error('Student not found:', studentId);
            return;
        }

        // If notification manager is available, pre-fill the form
        if (window.notificationManager) {
            // Switch to notification tab
            if (window.navigation) {
                window.navigation.goToTab('notification');
            }

            // Pre-fill with student details
            setTimeout(() => {
                const recipientInput = document.getElementById('notification-recipient');
                if (recipientInput) {
                    recipientInput.value = student.Name;
                }
                
                // If there's a contact field, fill it
                const contactInput = document.getElementById('notification-contact');
                if (contactInput) {
                    contactInput.value = student.Contact_No || '';
                }
            }, 300);
        } else {
            alert(`Send notification to: ${student.Name}\nContact: ${student.Contact_No || 'N/A'}`);
        }
    }

    // Method to create and show student details popup
    showStudentPopup(student) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.student-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        const safe = (v) => v || '—';
        const formatCurrency = (amount) => {
            if (!amount || amount === 0) return '₹0';
            return `₹${Number(amount).toLocaleString('en-IN')}`;
        };
        const formatContactNumber = (contact) => {
            if (!contact) return '—';
            const str = String(contact);
            return str.length === 10 ? str.replace(/(\d{5})(\d{5})/, '$1-$2') : str;
        };

        // Create popup overlay
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'student-popup-overlay';
        popupOverlay.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>
                        <i class="fas fa-user-graduate"></i>
                        Student Details
                    </h3>
                    <button class="popup-close" onclick="this.closest('.student-popup-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="popup-body">
                    <div class="student-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-user"></i> Personal Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Full Name</span>
                                    <span class="info-value">${safe(student.Name)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Class</span>
                                    <span class="info-value class-badge">${safe(student.Class)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Roll Number</span>
                                    <span class="info-value">${safe(student.Roll_No)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Serial Number</span>
                                    <span class="info-value">${safe(student.Serial_No)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Date of Birth</span>
                                    <span class="info-value">${safe(student.DOB)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Admission Date</span>
                                    <span class="info-value">${safe(student.Admission_Date)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h4><i class="fas fa-users"></i> Family Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Father's Name</span>
                                    <span class="info-value">${safe(student.Father_Name)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Mother's Name</span>
                                    <span class="info-value">${safe(student.Mother_Name)}</span>
                                </div>
                                <div class="info-item full-width">
                                    <span class="info-label">Address</span>
                                    <span class="info-value">${safe(student.Address)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Contact Number</span>
                                    <span class="info-value contact-number">${formatContactNumber(student.Contact_No)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section fees-section">
                            <h4><i class="fas fa-money-bill-wave"></i> Fee Details</h4>
                            <div class="fees-summary">
                                <div class="fee-breakdown">
                                    <div class="fee-row">
                                        <span class="fee-type">Transportation Fees</span>
                                        <span class="fee-amount">${formatCurrency(student.Transportaion_fees || student.Transportaion_Fees)}</span>
                                    </div>
                                    <div class="fee-row">
                                        <span class="fee-type">Tuition Fees</span>
                                        <span class="fee-amount">${formatCurrency(student.Tution_fees || student['Tution_fees '])}</span>
                                    </div>
                                    <div class="fee-row total-row">
                                        <span class="fee-type">Total Fees</span>
                                        <span class="fee-amount total-amount">${formatCurrency(student.Total_fees)}</span>
                                    </div>
                                    <div class="fee-row deposited-row">
                                        <span class="fee-type">Deposited Amount</span>
                                        <span class="fee-amount deposited-amount">${formatCurrency(student.Deposited_fees)}</span>
                                    </div>
                                    <div class="fee-row pending-row">
                                        <span class="fee-type">Pending Amount</span>
                                        <span class="fee-amount pending-amount">${formatCurrency(student.Pending_fees || student['Pending_fees '])}</span>
                                    </div>
                                    ${student.Discount_Amt && student.Discount_Amt > 0 ? `
                                        <div class="fee-row discount-row">
                                            <span class="fee-type">Discount Applied</span>
                                            <span class="fee-amount discount-amount">${formatCurrency(student.Discount_Amt)}</span>
                                        </div>
                                        ${student.Disc_reason && student.Disc_reason !== 'NA' ? `
                                            <div class="discount-reason-row">
                                                <span class="fee-type">Discount Reason</span>
                                                <span class="discount-reason">${student.Disc_reason}</span>
                                            </div>
                                        ` : ''}
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="popup-footer">
                    <button class="action-btn primary-btn" onclick="window.contactsManager.sendNotificationToStudent('${student.Serial_No || student.row_number}')">
                        <i class="fas fa-bell"></i>
                        Send Notification
                    </button>
                    <button class="action-btn secondary-btn" onclick="this.closest('.student-popup-overlay').remove()">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        `;

        // Add to document
        document.body.appendChild(popupOverlay);

        // Add click outside to close
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                popupOverlay.remove();
            }
        });

        // Add escape key to close
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                popupOverlay.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Animate in
        setTimeout(() => {
            popupOverlay.classList.add('show');
        }, 10);
    }
}

// Initialize contacts manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for data service to initialize
    setTimeout(() => {
        window.contactsManager = new ContactsManager();
    }, 100);
});