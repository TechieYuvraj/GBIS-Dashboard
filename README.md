# Gyan Bharti International School Dashboard

A comprehensive web-based dashboard for managing school operations including notifications, attendance tracking, and student contact management.

## Features

### 🏫 Main Dashboard
- **Fixed Header**: School name with login functionality
- **Responsive Navigation**: Vertical sidebar for desktop, bottom navigation for mobile
- **Tabbed Interface**: Notification, Attendance, Marks, and Contacts sections

### 📢 Notification System
- **Student Search**: Search across all student details
- **Message Composition**: Rich text input with attachment support
- **Bulk Notifications**: Send to multiple students simultaneously
- **Analytics**: Real-time notification delivery tracking
- **Webhook Integration**: Sends data to `https://primary-production-4a6d8.up.railway.app/webhook/sendWAMessage`

### 📅 Attendance Management
- **Date Selection**: DD/MM/YYYY format with date picker
- **Class Filtering**: Dynamic class dropdown from student data
- **Multi-Select**: Choose absent students via checkboxes
- **Attendance Analytics**: Visual charts and statistics
- **Webhook Integration**: Submits to `https://primary-production-4a6d8.up.railway.app/webhook/Attendance`

### 📚 Marks Management
- **Placeholder**: Ready for future implementation
- **Split Layout**: Action and Analytics sections prepared

### 👥 Student Contacts
- **Search & Filter**: Real-time search and class-based filtering
- **Statistics**: Total classes and students count
- **Student Cards**: Detailed information display
- **Data Management**: Automatic refresh and localStorage caching
- **Webhook Integration**: Fetches from `https://primary-production-4a6d8.up.railway.app/webhook/contact`

## Technical Architecture

### 📁 Project Structure
```
GBIS-Dashboard/
├── index.html                 # Main HTML file
├── assets/                    # Static assets
└── src/
    ├── app.js                # Main application entry point
    ├── components/           # UI components
    │   ├── attendance.js     # Attendance management
    │   ├── contacts.js       # Student contacts
    │   ├── navigation.js     # Tab navigation
    │   └── notification.js   # Notification system
    ├── services/            # Business logic
    │   └── dataService.js   # API calls and data management
    ├── styles/              # CSS styling
    │   ├── main.css         # Main styles
    │   └── responsive.css   # Mobile responsiveness
    └── utils/               # Utility functions
        └── helpers.js       # Helper utilities
```

### 🛠 Technologies Used
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **Icons**: Font Awesome 6.0
- **Storage**: localStorage for data caching
- **APIs**: RESTful webhook integrations

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Breakpoints**: 
  - Mobile: ≤768px (bottom navigation)
  - Tablet: 769px-1024px
  - Desktop: >1024px (sidebar navigation)
- **Progressive Enhancement**: Works without JavaScript for basic functionality

## Data Format

### Student Data Structure
```json
{
  "row_number": 2,
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
}
```

### Attendance Submission Format
```json
[
  {
    "class": "10TH",
    "date": "21/09/2025",
    "absent_records": ["10", "12", "2", "13"]
  }
]
```

## Setup Instructions

### 1. Basic Setup
1. Clone or download the project files
2. Ensure all files are in the correct directory structure
3. Open `index.html` in a modern web browser

### 2. Local Development Server (Recommended)
```bash
# Using Python
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using Live Server extension in VS Code
# Right-click index.html and select "Open with Live Server"
```

### 3. Configuration
- **Webhook URLs**: Pre-configured in `src/services/dataService.js`
- **School Name**: Change in `index.html` header section
- **Styling**: Modify CSS files in `src/styles/`

## Browser Compatibility
- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile Browsers**: iOS Safari 12+, Chrome Mobile 60+
- **Required Features**: ES6, Fetch API, CSS Grid, Flexbox

## Performance Features
- **Lazy Loading**: Components initialize only when needed
- **Data Caching**: localStorage for offline functionality
- **Debounced Search**: Optimized search performance
- **Responsive Images**: Optimized for different screen sizes

## Security Features
- **Input Sanitization**: XSS prevention
- **Data Validation**: Client-side validation with server-side backup
- **Local Storage**: Automatic cleanup on page reload

## Future Enhancements
- **Authentication System**: User login and role management
- **Marks Management**: Complete grading system
- **Advanced Analytics**: Charts and reporting
- **Push Notifications**: Real-time updates
- **Export Features**: PDF and Excel export
- **Multi-language Support**: Hindi and English

## Troubleshooting

### Common Issues
1. **Data Not Loading**: Check network connection and webhook URLs
2. **Search Not Working**: Ensure student data is loaded first
3. **Mobile Layout Issues**: Check viewport meta tag and CSS
4. **LocalStorage Errors**: Check browser privacy settings

### Debug Mode
Open browser console and check for:
- Network errors in Console tab
- Failed API calls in Network tab
- JavaScript errors in Console tab

### Emergency Reset
If the application gets stuck, call:
```javascript
emergencyReset(); // Clears all data and reloads
```

## License
This project is developed for Gyan Bharti International School. All rights reserved.

## Support
For technical support or feature requests, please contact the development team.

---
**Gyan Bharti International School Dashboard v1.0**  
*Building the future of education through technology*