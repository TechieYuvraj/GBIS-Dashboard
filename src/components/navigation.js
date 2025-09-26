/**
 * Navigation Component for GBIS Dashboard
 * Handles tab switching and active state management
 */

class Navigation {
    constructor() {
        this.currentTab = 'notification';
        this.init();
    }

    init() {
        this.bindEvents();
        this.showTab(this.currentTab);
    }

    bindEvents() {
        // Bind sidebar navigation
        const sidebarNavItems = document.querySelectorAll('.sidebar .nav-item');
        sidebarNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Bind bottom navigation (mobile)
        const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
        bottomNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        if (tabName === this.currentTab) return;

        const prevTab = this.currentTab;

        // Hide current tab
        this.hideTab(this.currentTab);
        
        // Show new tab
        this.showTab(tabName);
        
        // Update current tab
        this.currentTab = tabName;
        
        // Update active states
        this.updateActiveStates(tabName);

        // Trigger tab-specific initialization
        this.onTabSwitch(tabName);

        // Notify external listeners (e.g., GBISApp) about the change
        this.triggerTabChange(prevTab, tabName);
    }

    showTab(tabName) {
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }

    hideTab(tabName) {
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.remove('active');
        }
    }

    updateActiveStates(activeTab) {
        // Update sidebar navigation
        const sidebarNavItems = document.querySelectorAll('.sidebar .nav-item');
        sidebarNavItems.forEach(item => {
            const tab = item.getAttribute('data-tab');
            if (tab === activeTab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update bottom navigation
        const bottomNavItems = document.querySelectorAll('.bottom-nav .nav-item');
        bottomNavItems.forEach(item => {
            const tab = item.getAttribute('data-tab');
            if (tab === activeTab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    onTabSwitch(tabName) {
        // Trigger specific actions when switching tabs
        switch (tabName) {
            case 'contacts':
                // Refresh contacts if needed
                if (window.contactsManager) {
                    window.contactsManager.refreshIfNeeded();
                }
                break;
            case 'notification':
                // Initialize notification components if needed
                if (window.notificationManager) {
                    window.notificationManager.initializeSearch();
                    window.notificationManager.initializeClassDropdown();
                }
                break;
            case 'attendance':
                // Initialize attendance dropdowns if needed
                if (window.attendanceManager) {
                    window.attendanceManager.initializeDropdowns();
                }
                break;
            case 'marks':
                // Future implementation
                break;
            case 'fees':
                // Placeholder for future fees logic
                break;
            case 'add-students':
                // Placeholder for future add-students logic
                break;
        }
    }

    getCurrentTab() {
        return this.currentTab;
    }

    // Method to programmatically switch tabs
    goToTab(tabName) {
        this.switchTab(tabName);
    }

    // Method to get tab element
    getTabElement(tabName) {
        return document.getElementById(`${tabName}-tab`);
    }

    // Method to check if tab exists
    tabExists(tabName) {
        return document.getElementById(`${tabName}-tab`) !== null;
    }

    // Method to add tab change listener
    onTabChange(callback) {
        if (typeof callback === 'function') {
            this.tabChangeCallback = callback;
        }
    }

    // Method to trigger tab change callback
    triggerTabChange(from, to) {
        if (this.tabChangeCallback) {
            this.tabChangeCallback(from, to);
        }
    }
}

// Initialize navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
});