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
                // Wait for data service to be initialized
                let attempts = 0;
                while (!window.dataService.isInitialized && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                // Get students from data service
                this.students = window.dataService.getStudents();
                
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
            
            <div class="student-actions-center">
                <button class="action-btn view-details-btn" onclick="window.contactsManager.showStudentDetails('${student.Serial_No || student.row_number}')">
                    <i class="fas fa-eye"></i>
                    View Details
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



    // Method to create and show student details popup with edit functionality
    showStudentPopup(student) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.student-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        const safe = (v) => v || '';
        const formatCurrency = (amount) => {
            if (!amount || amount === 0) return '0';
            return Number(amount).toString();
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
                    <form id="student-edit-form" class="student-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-user"></i> Personal Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Full Name</span>
                                    <span class="info-value" data-field="Name">${safe(student.Name)}</span>
                                    <input type="text" class="info-input" data-field="Name" value="${safe(student.Name)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Class</span>
                                    <span class="info-value class-badge" data-field="Class">${safe(student.Class)}</span>
                                    <input type="text" class="info-input" data-field="Class" value="${safe(student.Class)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Roll Number</span>
                                    <span class="info-value" data-field="Roll_No">${safe(student.Roll_No)}</span>
                                    <input type="number" class="info-input" data-field="Roll_No" value="${safe(student.Roll_No)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Serial Number</span>
                                    <span class="info-value" data-field="Serial_No">${safe(student.Serial_No)}</span>
                                    <input type="number" class="info-input" data-field="Serial_No" value="${safe(student.Serial_No)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Date of Birth</span>
                                    <span class="info-value" data-field="DOB">${safe(student.DOB)}</span>
                                    <input type="text" class="info-input" data-field="DOB" value="${safe(student.DOB)}" placeholder="DD-MM-YYYY" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Admission Date</span>
                                    <span class="info-value" data-field="Admission_Date">${safe(student.Admission_Date)}</span>
                                    <input type="text" class="info-input" data-field="Admission_Date" value="${safe(student.Admission_Date)}" placeholder="DD-MM-YYYY" style="display: none;">
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h4><i class="fas fa-users"></i> Family Information</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Father's Name</span>
                                    <span class="info-value" data-field="Father_Name">${safe(student.Father_Name)}</span>
                                    <input type="text" class="info-input" data-field="Father_Name" value="${safe(student.Father_Name)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Mother's Name</span>
                                    <span class="info-value" data-field="Mother_Name">${safe(student.Mother_Name)}</span>
                                    <input type="text" class="info-input" data-field="Mother_Name" value="${safe(student.Mother_Name)}" style="display: none;">
                                </div>
                                <div class="info-item full-width">
                                    <span class="info-label">Address</span>
                                    <span class="info-value" data-field="Address">${safe(student.Address)}</span>
                                    <textarea class="info-textarea" data-field="Address" style="display: none;">${safe(student.Address)}</textarea>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Contact Number</span>
                                    <span class="info-value contact-number" data-field="Contact_No">${safe(student.Contact_No)}</span>
                                    <input type="tel" class="info-input" data-field="Contact_No" value="${safe(student.Contact_No)}" style="display: none;">
                                </div>
                            </div>
                        </div>

                        <div class="info-section fees-section">
                            <h4><i class="fas fa-money-bill-wave"></i> Fee Details</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Transportation Fees</span>
                                    <span class="info-value" data-field="Transportaion_fees">₹${formatCurrency(student.Transportaion_fees || student.Transportaion_Fees)}</span>
                                    <input type="number" class="info-input" data-field="Transportaion_fees" value="${formatCurrency(student.Transportaion_fees || student.Transportaion_Fees)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Tuition Fees</span>
                                    <span class="info-value" data-field="Tution_fees">₹${formatCurrency(student.Tution_fees || student['Tution_fees '])}</span>
                                    <input type="number" class="info-input" data-field="Tution_fees" value="${formatCurrency(student.Tution_fees || student['Tution_fees '])}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Total Fees</span>
                                    <span class="info-value" data-field="Total_fees">₹${formatCurrency(student.Total_fees)}</span>
                                    <input type="number" class="info-input" data-field="Total_fees" value="${formatCurrency(student.Total_fees)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Deposited Amount</span>
                                    <span class="info-value read-only-field" data-field="Deposited_fees">₹${formatCurrency(student.Deposited_fees)}</span>
                                    <input type="number" class="info-input" data-field="Deposited_fees" value="${formatCurrency(student.Deposited_fees)}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Pending Amount</span>
                                    <span class="info-value read-only-field" data-field="Pending_fees">₹${formatCurrency(student.Pending_fees || student['Pending_fees '])}</span>
                                    <input type="number" class="info-input" data-field="Pending_fees" value="${formatCurrency(student.Pending_fees || student['Pending_fees '])}" style="display: none;">
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Discount Amount</span>
                                    <span class="info-value" data-field="Discount_Amt">₹${formatCurrency(student.Discount_Amt)}</span>
                                    <input type="number" class="info-input" data-field="Discount_Amt" value="${formatCurrency(student.Discount_Amt)}" style="display: none;">
                                </div>
                                <div class="info-item discount-reason-item full-width" style="display: none;">
                                    <span class="info-label">Discount Reason</span>
                                    <input type="text" class="info-input" data-field="Disc_reason" value="${safe(student.Disc_reason !== 'NA' ? student.Disc_reason : '')}" placeholder="Enter discount reason">
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div class="popup-footer">
                    <button class="action-btn edit-btn" id="edit-student-btn" onclick="window.contactsManager.toggleEditMode()">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="action-btn primary-btn" id="submit-student-btn" onclick="window.contactsManager.submitStudentEdit('${student.Serial_No || student.row_number}')" style="display: none;">
                        <i class="fas fa-save"></i>
                        Submit
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

        // Store original student data for reference
        this.editingStudent = { ...student };

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

    // Method to toggle edit mode
    toggleEditMode() {
        const popup = document.querySelector('.student-popup-overlay');
        if (!popup) return;

        const isEditing = popup.classList.contains('editing');
        
        if (isEditing) {
            // Cancel edit mode
            popup.classList.remove('editing');
            this.showEditFields(false);
            document.getElementById('edit-student-btn').style.display = 'inline-flex';
            document.getElementById('submit-student-btn').style.display = 'none';
            document.querySelector('.discount-reason-item').style.display = 'none';
        } else {
            // Enter edit mode
            popup.classList.add('editing');
            this.showEditFields(true);
            document.getElementById('edit-student-btn').style.display = 'none';
            document.getElementById('submit-student-btn').style.display = 'inline-flex';
            document.querySelector('.discount-reason-item').style.display = 'block';
        }
    }

    // Method to show/hide edit fields
    showEditFields(show) {
        const popup = document.querySelector('.student-popup-overlay');
        if (!popup) return;

        const values = popup.querySelectorAll('.info-value');
        const inputs = popup.querySelectorAll('.info-input, .info-textarea');

        values.forEach(value => {
            const field = value.getAttribute('data-field');
            // Keep deposited amount and pending amount fields always visible (read-only)
            if (field === 'Deposited_fees' || field === 'Pending_fees') {
                value.style.display = 'block';
            } else {
                value.style.display = show ? 'none' : 'block';
            }
        });

        inputs.forEach(input => {
            const field = input.getAttribute('data-field');
            // Never show edit inputs for deposited amount and pending amount
            if (field === 'Deposited_fees' || field === 'Pending_fees') {
                input.style.display = 'none';
            } else {
                input.style.display = show ? 'block' : 'none';
            }
        });
    }

    // Method to submit student edit
    async submitStudentEdit(studentId) {
        const popup = document.querySelector('.student-popup-overlay');
        if (!popup) return;

        const submitBtn = document.getElementById('submit-student-btn');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            // Collect form data
            const formData = {};
            const inputs = popup.querySelectorAll('.info-input, .info-textarea');
            
            inputs.forEach(input => {
                const field = input.getAttribute('data-field');
                
                // Skip deposited amount and pending amount fields - they should not be editable
                if (field === 'Deposited_fees' || field === 'Pending_fees') {
                    return;
                }
                
                let value = input.value.trim();
                
                // Convert numeric fields
                if (['Roll_No', 'Serial_No', 'Transportaion_fees', 'Tution_fees', 'Total_fees', 'Discount_Amt'].includes(field)) {
                    value = value ? Number(value) : 0;
                }
                
                formData[field] = value;
            });

            // Add original student ID for reference
            formData.row_number = this.editingStudent.row_number;
            formData.original_Serial_No = this.editingStudent.Serial_No;

            console.log('Submitting student edit:', formData);

            // Send to webhook
            const response = await fetch('https://primary-production-4a6d8.up.railway.app/webhook/contact_edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-n8n-apiKey': '2025@urikaDeep@km@lik$$'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response has content before parsing JSON
            let result = null;
            const responseText = await response.text();
            
            if (responseText && responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                    console.log('Edit response:', result);
                } catch (parseError) {
                    console.log('✅ Student edit submitted successfully (invalid JSON response)');
                }
            } else {
                console.log('✅ Student edit submitted successfully (empty response)');
            }

            // Show success message
            this.showMessage('Student details updated successfully!', 'success');
            
            // Close popup
            popup.remove();
            
            // Refresh student list
            await this.refresh();

        } catch (error) {
            console.error('Error submitting student edit:', error);
            this.showMessage('Failed to update student details. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Method to show success/error messages
    showMessage(message, type = 'success') {
        // Create or update message element
        let messageEl = document.getElementById('student-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'student-message';
            messageEl.className = 'student-message';
            
            // Insert at top of contacts section
            const contactsSection = document.getElementById('contacts-tab');
            if (contactsSection && contactsSection.firstChild) {
                contactsSection.insertBefore(messageEl, contactsSection.firstChild);
            }
        }
        
        messageEl.textContent = message;
        messageEl.className = `student-message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.display = 'none';
            }
        }, 3000);
    }
}

// Initialize contacts manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for data service to initialize
    setTimeout(() => {
        window.contactsManager = new ContactsManager();
    }, 100);
});