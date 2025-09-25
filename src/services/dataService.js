/**
 * Data Service for GBIS Dashboard
 * Handles API calls, localStorage management, and data caching
 */

class DataService {
    constructor() {
        this.baseURL = 'https://primary-production-4a6d8.up.railway.app/webhook';
        this.apiKey = '2025@urikaDeep@km@lik$$'; // n8n API Key for authentication
        this.students = [];
        this.classes = [];
        this.isInitialized = false;
        this.isFetching = false; // Add fetching state
        this.fetchPromise = null; // Store ongoing fetch promise
        // Remove automatic init() call from constructor
    }

    /**
     * Get default headers for API requests
     * Includes the n8n API key for authentication
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-n8n-apiKey': this.apiKey
        };
    }

    /**
     * Initialize the service and fetch initial data
     */
    async init() {
        if (this.isInitialized) {
            console.log('DataService already initialized');
            return;
        }
        
        await this.fetchContacts();
        this.isInitialized = true;
    }

    /**
     * Fetch student contacts from the API
     */
    async fetchContacts() {
        console.log(`🔍 fetchContacts called - isFetching: ${this.isFetching}, hasData: ${this.hasData()}, isInitialized: ${this.isInitialized}`);
        
        // If already fetching, return the existing promise
        if (this.isFetching && this.fetchPromise) {
            console.log('⏳ Fetch already in progress, waiting for existing request...');
            return this.fetchPromise;
        }

        // If we already have data and not explicitly refreshing, don't fetch again
        if (this.students.length > 0 && this.isInitialized) {
            console.log('📚 Data already available, skipping fetch');
            return this.students;
        }

        console.log('🚀 Starting new fetch operation...');
        this.isFetching = true;
        
        this.fetchPromise = this._performFetch();
        
        try {
            const result = await this.fetchPromise;
            return result;
        } finally {
            this.isFetching = false;
            this.fetchPromise = null;
        }
    }

    async _performFetch() {
        const fetchId = Date.now(); // Unique ID for this fetch
        try {
            console.log(`🔄 [${fetchId}] Starting contact fetch operation...`);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.baseURL}/contact`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    chatInput: "Fetch Contacts"
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle specific HTTP status codes
                if (response.status === 403) {
                    console.warn('API access forbidden (403) - using sample data for development');
                    this.students = this.getSampleStudentData();
                    this.extractClasses();
                    this.saveToLocalStorage();
                    return this.students;
                } else if (response.status === 404) {
                    console.warn('API endpoint not found (404) - using sample data for development');
                    this.students = this.getSampleStudentData();
                    this.extractClasses();
                    this.saveToLocalStorage();
                    return this.students;
                } else if (response.status >= 500) {
                    console.warn(`Server error (${response.status}) - using sample data for development`);
                    this.students = this.getSampleStudentData();
                    this.extractClasses();
                    this.saveToLocalStorage();
                    return this.students;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const data = await response.json();
            console.log(`✅ [${fetchId}] Contacts fetched successfully:`, data);

            // Process the data
            this.students = Array.isArray(data) ? data : [data];
            this.extractClasses();
            this.saveToLocalStorage();
            
            return this.students;
        } catch (error) {
            console.error(`❌ [${fetchId}] Error fetching contacts:`, error);
            
            // Try to load from localStorage if API fails
            this.loadFromLocalStorage();
            
            // Don't throw error if we have cached data
            if (this.students.length > 0) {
                console.log('Using cached student data');
                return this.students;
            }
            
            // If no cached data, provide some sample data for development
            if (error.name === 'AbortError') {
                console.warn('Request timeout - using sample data for development');
                this.students = this.getSampleStudentData();
                this.extractClasses();
                this.saveToLocalStorage();
                return this.students;
            }
            
            // For network errors, use sample data
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.warn('Network error - using sample data for development');
                this.students = this.getSampleStudentData();
                this.extractClasses();
                this.saveToLocalStorage();
                return this.students;
            }
            
            // For HTTP errors, use sample data
            if (error.message.includes('HTTP error')) {
                console.warn('HTTP error - using sample data for development');
                this.students = this.getSampleStudentData();
                this.extractClasses();
                this.saveToLocalStorage();
                return this.students;
            }
            
            // Only throw error if it's a critical issue and we have no fallback
            console.warn('Unknown error - using sample data for development');
            this.students = this.getSampleStudentData();
            this.extractClasses();
            this.saveToLocalStorage();
            return this.students;
        }
    }

    /**
     * Get sample student data for development/testing
     */
    getSampleStudentData() {
        return [
            {
                "row_number": 1,
                "Class": "NURSERY",
                "Roll_No": 1,
                "Serial_No": 2254,
                "Name": "AAHIL KHAN",
                "Father_Name": "ARSAD KHAN",
                "Mother_Name": "REHANA BANO",
                "DOB": "14-08-2020",
                "Admission_Date": "02-04-2025",
                "Address": "HODSAR",
                "Contact_No": 7398226246,
                "Transportaion_Fees": ""
            },
            {
                "row_number": 2,
                "Class": "NURSERY",
                "Roll_No": 2,
                "Serial_No": 2255,
                "Name": "SARA ALI",
                "Father_Name": "MOHAMMED ALI",
                "Mother_Name": "FATIMA ALI",
                "DOB": "22-05-2020",
                "Admission_Date": "15-04-2025",
                "Address": "CIVIL LINES",
                "Contact_No": 9876543210,
                "Transportaion_Fees": "300"
            },
            {
                "row_number": 3,
                "Class": "5TH",
                "Roll_No": 5,
                "Serial_No": 2256,
                "Name": "AMIT SINGH",
                "Father_Name": "VIJAY SINGH",
                "Mother_Name": "KAVITA SINGH",
                "DOB": "10-11-2014",
                "Admission_Date": "20-03-2021",
                "Address": "NEHRU NAGAR",
                "Contact_No": 7654321098,
                "Transportaion_Fees": "400"
            },
            {
                "row_number": 4,
                "Class": "5TH",
                "Roll_No": 8,
                "Serial_No": 2257,
                "Name": "RIYA PATEL",
                "Father_Name": "KIRAN PATEL",
                "Mother_Name": "NISHA PATEL",
                "DOB": "18-09-2014",
                "Admission_Date": "10-05-2021",
                "Address": "GANDHI ROAD",
                "Contact_No": 8765432109,
                "Transportaion_Fees": "450"
            },
            {
                "row_number": 5,
                "Class": "10TH",
                "Roll_No": 10,
                "Serial_No": 2258,
                "Name": "RAJESH KUMAR",
                "Father_Name": "SURESH KUMAR",
                "Mother_Name": "SUNITA DEVI",
                "DOB": "15-03-2010",
                "Admission_Date": "01-04-2022",
                "Address": "MAIN STREET",
                "Contact_No": 9876543210,
                "Transportaion_Fees": "500"
            },
            {
                "row_number": 6,
                "Class": "10TH",
                "Roll_No": 12,
                "Serial_No": 2259,
                "Name": "PRIYA SHARMA",
                "Father_Name": "RAKESH SHARMA",
                "Mother_Name": "MEENA SHARMA",
                "DOB": "22-07-2009",
                "Admission_Date": "15-04-2022",
                "Address": "CIVIL LINES",
                "Contact_No": 8765432109,
                "Transportaion_Fees": "600"
            },
            {
                "row_number": 7,
                "Class": "10TH",
                "Roll_No": 15,
                "Serial_No": 2260,
                "Name": "ARJUN VERMA",
                "Father_Name": "MANOJ VERMA",
                "Mother_Name": "POOJA VERMA",
                "DOB": "05-12-2009",
                "Admission_Date": "25-03-2022",
                "Address": "PARK AVENUE",
                "Contact_No": 7654321098,
                "Transportaion_Fees": "550"
            },
            {
                "row_number": 8,
                "Class": "8TH",
                "Roll_No": 3,
                "Serial_No": 2261,
                "Name": "ANAYA GUPTA",
                "Father_Name": "ROHIT GUPTA",
                "Mother_Name": "PRIYANKA GUPTA",
                "DOB": "30-01-2012",
                "Admission_Date": "12-04-2020",
                "Address": "SECTOR 15",
                "Contact_No": 9988776655,
                "Transportaion_Fees": "480"
            }
        ];
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

    async sendNotification(notificationData, attachmentFile = null) {
        try {
            console.log('Sending notification with API authentication:', notificationData);
            console.log('Attachment file:', attachmentFile ? `${attachmentFile.name} (${attachmentFile.size} bytes, ${attachmentFile.type})` : 'None');
            
            if (attachmentFile) {
                console.log('File will be sent as binary data with separate JSON fields');
            }
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased timeout for file uploads
            
            let requestOptions;
            
            if (attachmentFile) {
                // Use FormData for file uploads with proper JSON data and binary file
                const formData = new FormData();
                
                // Add each field from notificationData as separate form fields for proper JSON structure
                formData.append('message', notificationData.message);
                formData.append('selectedClass', notificationData.selectedClass || 'All Classes');
                formData.append('students', JSON.stringify(notificationData.students));
                formData.append('timestamp', notificationData.timestamp);
                
                // Add the file as binary data
                formData.append('attachment', attachmentFile, attachmentFile.name);
                
                // Add individual file metadata fields instead of stringified JSON
                formData.append('fileName', attachmentFile.name);
                formData.append('fileSize', attachmentFile.size.toString());
                formData.append('fileType', attachmentFile.type);
                formData.append('fileLastModified', attachmentFile.lastModified.toString());
                
                requestOptions = {
                    method: 'POST',
                    headers: {
                        // Remove Content-Type header to let browser set it with boundary for FormData
                        'x-n8n-apiKey': this.apiKey
                    },
                    body: formData,
                    signal: controller.signal
                };
            } else {
                // Use JSON for text-only notifications
                requestOptions = {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(notificationData),
                    signal: controller.signal
                };
            }

            const response = await fetch(`${this.baseURL}/sendWAMessage`, requestOptions);

            clearTimeout(timeoutId);

            console.log('Notification response status:', response.status);
            console.log('Notification response headers:', Object.fromEntries(response.headers.entries()));
            
            // Log additional info for file uploads
            if (attachmentFile) {
                console.log('File upload completed - Status:', response.status, 'File:', attachmentFile.name);
            }

            if (!response.ok) {
                // Handle specific HTTP status codes for notifications
                if (response.status === 413) {
                    throw new Error('File too large. Please try a smaller file.');
                } else if (response.status === 415) {
                    throw new Error('Unsupported file type. Please try a different file format.');
                } else if (response.status === 403) {
                    throw new Error('Access forbidden. Please check your API permissions.');
                } else if (response.status === 404) {
                    throw new Error('Notification service not found. Please contact administrator.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            // Check if response has content before trying to parse JSON
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    console.warn('Response claimed to be JSON but parsing failed:', jsonError);
                    result = { success: true, message: 'Notification sent successfully (non-JSON response)' };
                }
            } else {
                // Handle non-JSON responses (like plain text or empty responses)
                const text = await response.text();
                result = { 
                    success: true, 
                    message: text || 'Notification sent successfully',
                    rawResponse: text
                };
            }
            
            console.log('Notification sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Error sending notification:', error);
            
            // Handle different types of errors
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection and try again.');
            }
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Unable to connect to notification service. Please check your internet connection.');
            }
            
            throw new Error(`Failed to send notification: ${error.message}`);
        }
    }

    /**
     * Submit attendance data
     */
    async submitAttendance(attendanceData) {
        try {
            console.log('Submitting attendance with API authentication:', attendanceData);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(`${this.baseURL}/Attendance`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(attendanceData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('Attendance response status:', response.status);
            console.log('Attendance response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Handle specific HTTP status codes for attendance
                if (response.status === 403) {
                    throw new Error('Access forbidden. Please check your API permissions.');
                } else if (response.status === 404) {
                    throw new Error('Attendance service not found. Please contact administrator.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            // Check if response has content before trying to parse JSON
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    console.warn('Response claimed to be JSON but parsing failed:', jsonError);
                    result = { success: true, message: 'Attendance submitted successfully (non-JSON response)' };
                }
            } else {
                // Handle non-JSON responses (like plain text or empty responses)
                const text = await response.text();
                result = { 
                    success: true, 
                    message: text || 'Attendance submitted successfully',
                    rawResponse: text
                };
            }
            
            console.log('Attendance submitted successfully:', result);
            return result;
        } catch (error) {
            console.error('Error submitting attendance:', error);
            
            // Handle different types of errors
            if (error.name === 'AbortError') {
                throw new Error('Request timeout. Please check your connection and try again.');
            }
            
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Unable to connect to attendance service. Please check your internet connection.');
            }
            
            throw new Error(`Failed to submit attendance: ${error.message}`);
        }
    }

    /**
     * Fetch attendance summary for a given date (DD/MM/YYYY)
     * Expected to return a list of classes with present/absent counts
     * Example normalized item: { class: '5TH', present: 25, absent: 5, total: 30 }
     */
    async fetchAttendanceSummary(dateDDMMYYYY) {
        const endpoint = `${this.baseURL}/Attendance_fetch`;
        const payload = { date: dateDDMMYYYY };
        console.log('Fetching attendance summary for date:', dateDDMMYYYY);

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Handle specific HTTP status codes
                if (response.status === 403) {
                    throw new Error('Access forbidden for attendance summary');
                } else if (response.status === 404) {
                    throw new Error('Attendance summary endpoint not found');
                } else if (response.status >= 500) {
                    throw new Error('Server error while fetching attendance summary');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            // Try to parse JSON; fallback to text if needed
            const contentType = response.headers.get('content-type');
            let raw = null;
            if (contentType && contentType.includes('application/json')) {
                raw = await response.json();
            } else {
                const text = await response.text();
                try { raw = JSON.parse(text); } catch { raw = text; }
            }

            // Normalize into a list of { class, present, absent, total }
            const normalized = this._normalizeAttendanceSummary(raw);
            console.log('Attendance summary (normalized):', normalized);
            return normalized;
        } catch (error) {
            console.error('Error fetching attendance summary:', error);
            if (error.name === 'AbortError') {
                throw new Error('Attendance summary request timeout');
            }
            throw error;
        }
    }

    /**
     * Normalize various possible response shapes to unified items
     */
    _normalizeAttendanceSummary(raw) {
        // If server already returns array of objects
        const arr = Array.isArray(raw) ? raw : (raw && raw.data ? raw.data : []);
        const out = [];
        arr.forEach(item => {
            if (!item) return;
            const className = item.class || item.Class || item.className || item.ClassName;
            const present =
                item.present ?? item.present_count ?? item.Present ?? item.presentStudents ?? 0;
            const absent =
                item.absent ?? item.absent_count ?? item.Absent ?? item.absentStudents ?? 0;
            let total = item.total ?? item.total_students ?? item.Total ?? 0;
            if (!total && (present || absent)) total = Number(present) + Number(absent);
            if (!className) return;
            out.push({
                class: String(className),
                present: Number(present) || 0,
                absent: Number(absent) || 0,
                total: Number(total) || (Number(present) + Number(absent)) || 0
            });
        });
        return out;
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
     * Send Absent Notification trigger to webhook with given date (DD/MM/YYYY)
     */
    async sendAbsentNotification(dateDDMMYYYY) {
        const endpoint = `${this.baseURL}/Absent_notification`;
        const payload = {
            chatInput: 'send absent notification',
            date: dateDDMMYYYY
        };

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access forbidden for absent notification');
                } else if (response.status === 404) {
                    throw new Error('Absent notification endpoint not found');
                } else if (response.status >= 500) {
                    throw new Error('Server error while sending absent notification');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return { success: true, message: text || 'Absent notification triggered' };
        } catch (err) {
            if (err.name === 'AbortError') throw new Error('Absent notification request timeout');
            throw err;
        }
    }

    /**
     * Validate student data
     */
    validateStudentData(student) {
        const requiredFields = ['Name', 'Class', 'Roll_No'];
        return requiredFields.every(field => student[field] !== undefined && student[field] !== '');
    }

    /**
     * Submit marks update to webhook
     * payload example:
     * {
     *   date: '25/09/2025',
     *   class: '5TH',
     *   examName: 'Midterm',
     *   maxMarks: 100,
     *   marks: [ { rollNo: 1, name: 'Alice', obtained: 96 } ]
     * }
     */
    async submitMarksUpdate(payload) {
        const endpoint = `${this.baseURL}/Marks_update`;

        // Timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Access forbidden. Please check API permissions.');
                } else if (response.status === 404) {
                    throw new Error('Marks update endpoint not found.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return { success: true, message: text || 'Marks updated successfully' };
        } catch (err) {
            if (err.name === 'AbortError') throw new Error('Marks update request timeout');
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Network error while submitting marks');
            }
            throw err;
        }
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
        console.log('Refreshing data - clearing cache and fetching fresh data');
        this.clearLocalStorage();
        this.students = []; // Clear existing data
        this.classes = [];
        this.isInitialized = false; // Reset initialization state
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

    /**
     * Check if currently fetching data
     */
    isFetchingData() {
        return this.isFetching;
    }
}

// Create global instance
window.dataService = new DataService();