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
        
        card.innerHTML = `
            <div class="student-header">
                <h4 class="student-name">${student.Name || 'N/A'}</h4>
                <span class="student-class">${student.Class || 'N/A'}</span>
            </div>
            <div class="student-details">
                <div class="detail-item">
                    <span class="detail-label">Roll No.</span>
                    <span class="detail-value">${student.Roll_No || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Serial No.</span>
                    <span class="detail-value">${student.Serial_No || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Father's Name</span>
                    <span class="detail-value">${student.Father_Name || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Mother's Name</span>
                    <span class="detail-value">${student.Mother_Name || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date of Birth</span>
                    <span class="detail-value">${student.DOB || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Admission Date</span>
                    <span class="detail-value">${student.Admission_Date || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Address</span>
                    <span class="detail-value">${student.Address || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Contact No.</span>
                    <span class="detail-value">${student.Contact_No || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Transportation Fees</span>
                    <span class="detail-value">${student.Transportaion_Fees || 'N/A'}</span>
                </div>
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
}

// Initialize contacts manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for data service to initialize
    setTimeout(() => {
        window.contactsManager = new ContactsManager();
    }, 100);
});