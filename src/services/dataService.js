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
     * Canonical class order required across the app
     * Order: PREP, NURSERY, KG, 1ST, 2ND, 3RD, 4TH, 5TH, 6TH, 7TH, 8TH, 9TH, 10TH
     */
    getPreferredClassOrder() {
        return [
            'PREP', 'NURSERY', 'KG',
            '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'
        ];
    }

    /**
     * Sort a class list by the preferred fixed order. Unknown classes are appended alphabetically.
     */
    sortClasses(classList) {
        const order = this.getPreferredClassOrder();
        // Deduplicate case-insensitively while preserving first-seen original casing
        const seenUpper = new Set();
        const unique = [];
        (classList || []).forEach((c) => {
            const original = (c ?? '').toString().trim();
            if (!original) return;
            const upper = original.toUpperCase();
            if (seenUpper.has(upper)) return;
            seenUpper.add(upper);
            unique.push(original);
        });

        return unique.sort((a, b) => {
            const A = a.toUpperCase();
            const B = b.toUpperCase();
            const ia = order.indexOf(A);
            const ib = order.indexOf(B);
            if (ia !== -1 && ib !== -1) return ia - ib; // both known
            if (ia !== -1) return -1; // a known, b unknown -> a first
            if (ib !== -1) return 1;  // b known, a unknown -> b first
            // both unknown: fallback to alphabetical
            return A.localeCompare(B);
        });
    }

    /**
     * Get default headers for API requests
     * Includes the n8n API key for authentication
     */
    getHeaders(extraHeaders = {}) {
        return {
            'Content-Type': 'application/json',
            'x-n8n-apiKey': this.apiKey,
            ...extraHeaders
        };
    }

    /**
     * Login to the dashboard
     * Uses hardcoded credentials - no webhook required
     */
    async login(username, password) {
        // Hardcoded credentials
        const validUsername = 'gbis.admin';
        const validPassword = 'admin@2025';
        
        // Simple validation against hardcoded credentials
        if (username === validUsername && password === validPassword) {
            return { success: true, message: 'Login successful' };
        } else {
            throw new Error('Invalid username or password');
        }
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
        // If already fetching, return the existing promise
        if (this.isFetching && this.fetchPromise) {
            return this.fetchPromise;
        }

        // Always fetch fresh; no caching

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
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Contacts fetched successfully: ${Array.isArray(data) ? data.length : 1} records`);

            // Process the data
            this.students = Array.isArray(data) ? data : [data];
            this.extractClasses();
            
            return this.students;
        } catch (error) {
            console.error('❌ Error fetching contacts:', error.message);
            // No cache, no dummy. Show global warning and return empty list
            this.students = [];
            this.classes = [];
            return this.students;
        }
    }

    /**
     * Get sample student data for development/testing
     */
    getSampleStudentData() { return []; }

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
        // Keep raw unique list; ordering will be applied when retrieved via getClasses()
        this.classes = Array.from(classSet);
    }

    /**
     * Save student data to localStorage
     */
    saveToLocalStorage() { /* caching disabled */ }

    /**
     * Load student data from localStorage
     */
    loadFromLocalStorage() { /* caching disabled */ }

    /**
     * Clear localStorage data
     */
    clearLocalStorage() { /* caching disabled */ }

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
        return this.sortClasses(this.classes);
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
        // Convert DD/MM/YYYY to DD-MM-YYYY format for webhook
        const webhookDate = dateDDMMYYYY.replace(/\//g, '-');
        const payload = { date: webhookDate };
        console.log('Fetching attendance summary for date:', dateDDMMYYYY, '-> webhook format:', webhookDate);

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
            try {
                const text = await response.text();
                if (text.trim() === '') {
                    // Empty response, return empty array
                    console.warn('Empty response from attendance API');
                    return [];
                }
                
                if (contentType && contentType.includes('application/json')) {
                    raw = JSON.parse(text);
                } else {
                    try { 
                        raw = JSON.parse(text); 
                    } catch { 
                        console.warn('Non-JSON response from attendance API:', text);
                        return []; 
                    }
                }
            } catch (parseError) {
                console.error('Error parsing attendance response:', parseError);
                return [];
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
            // Normalize list of absent students if provided
            const absentRaw = item.Absent_Students || item.absent_students || item.AbsentStudents || item.absentStudents || [];
            const absentStudents = Array.isArray(absentRaw)
                ? absentRaw.map(s => ({
                    rollNo: Number(s?.Roll_No ?? s?.rollNo ?? s?.roll ?? s?.['Roll No'] ?? 0) || 0,
                    name: String(s?.Name ?? s?.name ?? '').trim()
                })).sort((a,b) => (a.rollNo||0) - (b.rollNo||0))
                : [];
            let total = item.total ?? item.total_students ?? item.Total ?? 0;
            if (!total && (present || absent)) total = Number(present) + Number(absent);
            if (!className) return;
            out.push({
                class: String(className),
                present: Number(present) || 0,
                absent: Number(absent) || 0,
                total: Number(total) || (Number(present) + Number(absent)) || 0,
                absentStudents
            });
        });
        return out;
    }

    /**
     * Format date to DD/MM/YYYY (legacy format for display)
     */
    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Format date to DD-MM-YYYYTHH:mm:ss IST (for JSON data)
     */
    formatDateToIST(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${day}-${month}-${year}T${hours}:${minutes}:${seconds} IST`;
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
     * Send absent notification for a specific class
     */
    async sendClassAbsentNotification(className, dateDDMMYYYY) {
        const endpoint = `${this.baseURL}/Absent_notification`;
        const payload = {
            chatInput: 'send absent notification',
            class: className,
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
                    throw new Error(`Access forbidden for ${className} absent notification`);
                } else if (response.status === 404) {
                    throw new Error('Absent notification endpoint not found');
                } else if (response.status >= 500) {
                    throw new Error(`Server error while sending ${className} absent notification`);
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return { success: true, message: text || `${className} absent notification sent` };
        } catch (err) {
            if (err.name === 'AbortError') throw new Error(`${className} absent notification request timeout`);
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
     * Submit fees details to webhook
     * Endpoint: /Fees_submit
     */
    async submitFees(payload) {
        const endpoint = `${this.baseURL}/Fees_submit`;
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
                if (response.status === 403) throw new Error('Access forbidden for fees submit');
                if (response.status === 404) throw new Error('Fees submit endpoint not found');
                if (response.status >= 500) throw new Error('Server error while submitting fees');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const ct = response.headers.get('content-type');
            if (ct && ct.includes('application/json')) return await response.json();
            const text = await response.text();
            return { success: true, message: text || 'Fees submitted successfully' };
        } catch (err) {
            if (err.name === 'AbortError') throw new Error('Fees submit request timeout');
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Network error while submitting fees');
            }
            throw err;
        }
    }

    /**
     * Fetch fees details by class and roll no
     * Endpoint: /fees_detail_fetch
     */
    async fetchFeesDetails(className, rollNo) {
        const endpoint = `${this.baseURL}/fees_detail_fetch`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const payload = { Class: className, Roll_No: rollNo };
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 403) throw new Error('Access forbidden for fees detail fetch');
                if (response.status === 404) throw new Error('Fees detail fetch endpoint not found');
                if (response.status >= 500) throw new Error('Server error while fetching fees details');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Check if response has content
            const text = await response.text();
            if (!text || text.trim() === '') {
                console.log('📝 Empty response from fees detail fetch - returning empty object');
                return {};
            }
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                console.warn('⚠️ Failed to parse fees detail response as JSON:', parseError);
                return { raw: text };
            }
        } catch (err) {
            if (err.name === 'AbortError') throw new Error('Fees detail fetch timeout');
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Network error while fetching fees details');
            }
            throw err;
        }
    }

    /**
     * Fetch fees analytics (monthly/yearly) from webhook
     * Endpoint: /Fees_Analytics with body { chatInput: 'Fetch Fees Analytics' }
     */
    async fetchFeesAnalytics() {
        const endpoint = `${this.baseURL}/Fees_Analytics`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ chatInput: 'Fetch Fees Analytics' }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                if (response.status === 403) throw new Error('Access forbidden for fees analytics');
                if (response.status === 404) throw new Error('Fees analytics endpoint not found');
                if (response.status >= 500) throw new Error('Server error while fetching fees analytics');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const ct = response.headers.get('content-type');
            if (ct && ct.includes('application/json')) return await response.json();
            const text = await response.text();
            try { return JSON.parse(text); } catch { return { raw: text }; }
        } catch (err) {
            if (err.name === 'AbortError') {
                throw new Error('Fees analytics request timeout');
            }
            if (err instanceof TypeError && err.message.includes('fetch')) {
                throw new Error('Network error while fetching fees analytics');
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

    /**
     * Show a global warning banner at the top of the UI
     */
    showGlobalWarning(message = '') {
        // No-op: global warning banner has been removed from the UI.
        // Intentionally left blank to avoid displaying deprecated warnings.
    }
}

// Create global instance
window.dataService = new DataService();