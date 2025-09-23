/**
 * Main Application Entry Point for GBIS Dashboard
 * Initializes all components and handles global application state
 */

class GBISApp {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.state = {
            isLoading: true,
            currentUser: null,
            lastDataUpdate: null,
            networkStatus: 'online'
        };
        this.init();
    }

    async init() {
        try {
            console.log('Initializing GBIS Dashboard...');
            
            // Show loading state
            this.showGlobalLoading();

            // Check network status
            this.setupNetworkMonitoring();

            // Initialize data service first
            await this.initializeDataService();

            // Initialize components
            await this.initializeComponents();

            // Set up global event listeners
            this.setupGlobalEvents();

            // Hide loading state
            this.hideGlobalLoading();

            // Mark as initialized
            this.initialized = true;
            this.state.isLoading = false;

            console.log('GBIS Dashboard initialized successfully!');

            // Show welcome message
            this.showWelcomeMessage();

        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    async initializeDataService() {
        try {
            console.log('Initializing data service...');
            
            if (!window.dataService) {
                throw new Error('Data service not available');
            }

            // Wait for data service to load initial data
            await window.dataService.init();
            
            this.state.lastDataUpdate = new Date();
            console.log('Data service initialized successfully');

        } catch (error) {
            console.error('Error initializing data service:', error);
            throw error;
        }
    }

    async initializeComponents() {
        console.log('Initializing components...');

        // Wait for components to be available
        await this.waitForComponents();

        // Store component references
        this.components = {
            navigation: window.navigation,
            contactsManager: window.contactsManager,
            notificationManager: window.notificationManager,
            attendanceManager: window.attendanceManager
        };

        // Set up component communication
        this.setupComponentCommunication();

        console.log('Components initialized successfully');
    }

    async waitForComponents() {
        const maxAttempts = 50;
        let attempts = 0;

        while (attempts < maxAttempts) {
            if (window.navigation && 
                window.contactsManager && 
                window.notificationManager && 
                window.attendanceManager) {
                break;
            }
            
            await Helpers.sleep(100);
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('Components failed to initialize within timeout');
        }
    }

    setupComponentCommunication() {
        // Set up navigation tab change handler
        if (this.components.navigation) {
            this.components.navigation.onTabChange((from, to) => {
                this.handleTabChange(from, to);
            });
        }

        // Add cross-component functionality
        this.setupCrossComponentFeatures();
    }

    setupCrossComponentFeatures() {
        // Example: Add "Send Notification" buttons to student cards in contacts
        this.addNotificationButtons();

        // Example: Quick attendance marking from contacts
        this.addQuickAttendanceButtons();
    }

    addNotificationButtons() {
        // This would be called when contacts are rendered
        // Implementation can be added to contacts component
    }

    addQuickAttendanceButtons() {
        // This would be called when contacts are rendered
        // Implementation can be added to contacts component
    }

    setupGlobalEvents() {
        // Handle window resize
        window.addEventListener('resize', Helpers.debounce(() => {
            this.handleResize();
        }, 250));

        // Handle visibility change (tab focus/blur)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.shouldRefreshData()) {
                this.refreshData();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Handle login button
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                this.handleLogin();
            });
        }

        // Handle beforeunload (page refresh/close)
        window.addEventListener('beforeunload', (e) => {
            // Could save draft data here
            console.log('Page is being unloaded');
        });
    }

    setupNetworkMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.state.networkStatus = 'online';
            Helpers.showToast('Connection restored', 'success');
            this.refreshData();
        });

        window.addEventListener('offline', () => {
            this.state.networkStatus = 'offline';
            Helpers.showToast('No internet connection', 'warning');
        });
    }

    handleTabChange(from, to) {
        console.log(`Tab changed from ${from} to ${to}`);
        
        // Track tab usage
        this.trackTabUsage(to);

        // Refresh data if needed
        if (this.shouldRefreshDataForTab(to)) {
            this.refreshData();
        }
    }

    handleResize() {
        // Handle responsive behavior
        const isMobile = Helpers.isMobile();
        const isTablet = Helpers.isTablet();
        
        console.log(`Window resized - Mobile: ${isMobile}, Tablet: ${isTablet}`);
        
        // Could trigger responsive adjustments here
    }

    handleKeyboardShortcuts(e) {
        // Ctrl+1, Ctrl+2, etc. for tab switching
        if (e.ctrlKey && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const tabs = ['notification', 'attendance', 'marks', 'contacts'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex] && this.components.navigation) {
                this.components.navigation.goToTab(tabs[tabIndex]);
            }
        }

        // Ctrl+R for refresh
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            this.refreshData();
        }

        // Escape to close modals/dropdowns
        if (e.key === 'Escape') {
            this.closeAllDropdowns();
        }
    }

    handleLogin() {
        // Placeholder for login functionality
        Helpers.showToast('Login functionality will be implemented here', 'info');
    }

    closeAllDropdowns() {
        // Close all open dropdowns
        document.querySelectorAll('.multi-select-dropdown.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });

        document.querySelectorAll('.search-results.show').forEach(results => {
            results.classList.remove('show');
        });
    }

    shouldRefreshData() {
        if (!this.state.lastDataUpdate) return true;
        
        // Refresh if data is older than 5 minutes
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() - this.state.lastDataUpdate.getTime() > fiveMinutes;
    }

    shouldRefreshDataForTab(tab) {
        // Refresh contacts data when switching to contacts tab
        return tab === 'contacts' && this.shouldRefreshData();
    }

    async refreshData() {
        if (this.state.networkStatus === 'offline') {
            Helpers.showToast('Cannot refresh data while offline', 'warning');
            return;
        }

        try {
            console.log('Refreshing data...');
            Helpers.showToast('Refreshing data...', 'info', 1000);

            if (window.dataService) {
                await window.dataService.refreshData();
                this.state.lastDataUpdate = new Date();
                
                // Trigger component updates
                if (this.components.contactsManager) {
                    this.components.contactsManager.loadStudents();
                }
                
                Helpers.showToast('Data refreshed successfully', 'success');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            Helpers.showToast('Failed to refresh data', 'error');
        }
    }

    trackTabUsage(tab) {
        // Simple usage tracking (could be extended)
        const usage = Helpers.getFromStorage('gbis_tab_usage', {});
        usage[tab] = (usage[tab] || 0) + 1;
        usage.lastUsed = tab;
        usage.lastTimestamp = new Date().toISOString();
        Helpers.saveToStorage('gbis_tab_usage', usage);
    }

    showGlobalLoading() {
        const body = document.body;
        if (!document.querySelector('.global-loading')) {
            const loader = document.createElement('div');
            loader.className = 'global-loading';
            loader.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <h3>Gyan Bharti International School</h3>
                    <p>Loading Dashboard...</p>
                </div>
            `;
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .global-loading {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    color: white;
                }
                .loading-content {
                    text-align: center;
                }
                .loading-spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            
            document.head.appendChild(style);
            body.appendChild(loader);
        }
    }

    hideGlobalLoading() {
        const loader = document.querySelector('.global-loading');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.remove();
            }, 300);
        }
    }

    showError(message) {
        Helpers.showToast(message, 'error', 5000);
        console.error('Application Error:', message);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            Helpers.showToast('Welcome to GBIS Dashboard!', 'success', 2000);
        }, 500);
    }

    // Public API methods
    getState() {
        return this.state;
    }

    getComponent(name) {
        return this.components[name];
    }

    isInitialized() {
        return this.initialized;
    }

    async restart() {
        console.log('Restarting application...');
        this.initialized = false;
        this.state.isLoading = true;
        await this.init();
    }

    // Emergency reset function
    emergencyReset() {
        console.log('Emergency reset triggered');
        localStorage.clear();
        location.reload();
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.gbisApp = new GBISApp();
    
    // Expose helpful global functions
    window.refreshData = () => window.gbisApp.refreshData();
    window.getAppState = () => window.gbisApp.getState();
    window.emergencyReset = () => window.gbisApp.emergencyReset();
});

// Handle any uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    if (window.gbisApp) {
        window.gbisApp.showError('An unexpected error occurred. Please refresh the page.');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.gbisApp) {
        window.gbisApp.showError('A network error occurred. Please check your connection.');
    }
    event.preventDefault();
});