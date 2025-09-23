/**
 * Data Service for GBIS Dashboard
 * Handles API calls, localStorage management, and data caching
 */

class DataService {
    constructor() {
        this.baseURL = 'https://primary-production-4a6d8.up.railway.app/webhook';
        this.students = [];
        this.classes = [];
        this.init();
    }

    /**
     * Initialize the service and fetch initial data
     */
    async init() {
        await this.fetchContacts();
    }

    /**
     * Fetch student contacts from the API
     */
    async fetchContacts() {
        try {
            console.log('Fetching contacts...');
            
            const response = await fetch(`${this.baseURL}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatInput: "Fetch Contacts"
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Contacts fetched:', data);

            // Process the data
            this.students = Array.isArray(data) ? data : [data];
            this.extractClasses();
            this.saveToLocalStorage();
            
            return this.students;
        } catch (error) {
            console.error('Error fetching contacts:', error);
            // Try to load from localStorage if API fails
            this.loadFromLocalStorage();
            throw error;
        }
    }

    /**
     * Extract unique classes from student data
     */
    extractClasses() {
        const classSet = new Set();
        this.students.forEach(student => {
            if (student.Class) {
                classSet.add(student.Class);
            }
        });
        this.classes = Array.from(classSet).sort();
    }

    /**
     * Save student data to localStorage
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('gbis_students', JSON.stringify(this.students));
            localStorage.setItem('gbis_classes', JSON.stringify(this.classes));
            localStorage.setItem('gbis_last_updated', new Date().toISOString());
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    /**
     * Load student data from localStorage
     */
    loadFromLocalStorage() {
        try {
            const studentsData = localStorage.getItem('gbis_students');
            const classesData = localStorage.getItem('gbis_classes');
            
            if (studentsData) {
                this.students = JSON.parse(studentsData);
            }
            if (classesData) {
                this.classes = JSON.parse(classesData);
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            this.students = [];
            this.classes = [];
        }
    }

    /**
     * Clear localStorage data
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem('gbis_students');
            localStorage.removeItem('gbis_classes');
            localStorage.removeItem('gbis_last_updated');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    /**
     * Get all students
     */
    getStudents() {
        return this.students;
    }

    /**
     * Get all classes
     */
    getClasses() {
        return this.classes;
    }

    /**
     * Get students by class
     */
    getStudentsByClass(className) {
        return this.students.filter(student => student.Class === className);
    }

    /**
     * Search students by any field
     */
    searchStudents(query) {
        if (!query) return this.students;
        
        const searchTerm = query.toLowerCase();
        return this.students.filter(student => {
            return Object.values(student).some(value => 
                value && value.toString().toLowerCase().includes(searchTerm)
            );
        });
    }

    /**
     * Get student statistics
     */
    getStats() {
        return {
            totalStudents: this.students.length,
            totalClasses: this.classes.length,
            lastUpdated: localStorage.getItem('gbis_last_updated')
        };
    }

    /**
     * Send notification via webhook
     */
    async sendNotification(notificationData) {
        try {
            console.log('Sending notification:', notificationData);
            
            const response = await fetch(`${this.baseURL}/sendWAMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Notification sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Submit attendance data
     */
    async submitAttendance(attendanceData) {
        try {
            console.log('Submitting attendance:', attendanceData);
            
            const response = await fetch(`${this.baseURL}/Attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(attendanceData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Attendance submitted successfully:', result);
            return result;
        } catch (error) {
            console.error('Error submitting attendance:', error);
            throw error;
        }
    }

    /**
     * Format date to DD/MM/YYYY
     */
    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Validate student data
     */
    validateStudentData(student) {
        const requiredFields = ['Name', 'Class', 'Roll_No'];
        return requiredFields.every(field => student[field] !== undefined && student[field] !== '');
    }

    /**
     * Get students for a specific class with roll numbers
     */
    getClassRollNumbers(className) {
        return this.getStudentsByClass(className)
            .map(student => ({
                rollNo: student.Roll_No,
                name: student.Name,
                id: student.Serial_No || student.row_number
            }))
            .sort((a, b) => parseInt(a.rollNo) - parseInt(b.rollNo));
    }

    /**
     * Refresh data from server
     */
    async refreshData() {
        this.clearLocalStorage();
        return await this.fetchContacts();
    }

    /**
     * Get student by roll number and class
     */
    getStudentByRollAndClass(rollNo, className) {
        return this.students.find(student => 
            student.Roll_No == rollNo && student.Class === className
        );
    }

    /**
     * Filter students by multiple criteria
     */
    filterStudents(filters) {
        let filteredStudents = this.students;

        if (filters.class) {
            filteredStudents = filteredStudents.filter(student => student.Class === filters.class);
        }

        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredStudents = filteredStudents.filter(student =>
                Object.values(student).some(value =>
                    value && value.toString().toLowerCase().includes(searchTerm)
                )
            );
        }

        return filteredStudents;
    }

    /**
     * Check if data is available
     */
    hasData() {
        return this.students.length > 0;
    }

    /**
     * Get data loading status
     */
    isLoading() {
        return this.students.length === 0;
    }
}

// Create global instance
window.dataService = new DataService();