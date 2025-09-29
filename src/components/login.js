/* Login component: handles authentication and state management */

class LoginManager {
  constructor() {
    this.loginOverlay = null;
    this.loginForm = null;
    this.loginMessage = null;
    this.accountInfo = null;
    this.isLoggedIn = false;
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.checkLoginState();
  }

  cacheElements() {
    this.loginOverlay = document.getElementById('login-overlay');
    this.loginForm = document.getElementById('login-form');
    this.loginMessage = document.getElementById('login-message');
    this.accountInfo = document.getElementById('account-info');
  }

  bindEvents() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
    
    // Password toggle functionality
    const passwordToggle = document.getElementById('password-toggle');
    const passwordInput = document.getElementById('password');
    if (passwordToggle && passwordInput) {
      passwordToggle.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        const icon = passwordToggle.querySelector('i');
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    }
  }

  checkLoginState() {
    // Check if user is already logged in
    const loginState = localStorage.getItem('gbis_login_state');
    if (loginState === 'logged_in') {
      this.setLoggedInState();
    } else {
      this.showLoginScreen();
    }
  }

  showLoginScreen() {
    if (this.loginOverlay) {
      this.loginOverlay.style.display = 'flex';
    }
    // Hide main content
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.style.display = 'none';
    }
  }

  hideLoginScreen() {
    if (this.loginOverlay) {
      this.loginOverlay.style.display = 'none';
    }
    // Show main content
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
      mainContainer.style.display = 'flex';
    }
  }

  async handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      this.showMessage('Please enter both username and password', 'error');
      return;
    }

    try {
      // Show loading state
      const submitBtn = this.loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
      submitBtn.disabled = true;

      // Call login API
      const response = await window.dataService.login(username, password);
      
      // Check if response contains "Login Successful"
      const responseText = typeof response === 'string' ? response : JSON.stringify(response);
      
      if (responseText.includes('Login Successful')) {
        this.showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          this.setLoggedInState();
          localStorage.setItem('gbis_login_state', 'logged_in');
        }, 1000);
      } else {
        // Show the actual response for debugging if it's not a login success
        console.log('Login response:', response);
        
        // Handle specific error messages from the webhook
        if (responseText.includes('Authorization data is wrong!')) {
          this.showMessage('Invalid username or password. Please try again.', 'error');
        } else {
          this.showMessage('Please check your username or password to login', 'error');
        }
      }

    } catch (error) {
      console.error('Login error:', error);
      
      // More specific error messages
      if (error.message.includes('403')) {
        this.showMessage('Access denied. Please check your credentials or contact administrator.', 'error');
      } else if (error.message.includes('timeout')) {
        this.showMessage('Login request timed out. Please try again.', 'error');
      } else if (error.message.includes('Network error')) {
        this.showMessage('Network error. Please check your connection and try again.', 'error');
      } else {
        this.showMessage('Please check your username or password to login', 'error');
      }
    } finally {
      // Reset button state
      const submitBtn = this.loginForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      submitBtn.disabled = false;
    }
  }

  setLoggedInState() {
    this.isLoggedIn = true;
    this.hideLoginScreen();
    
    // Show account info in header (already updated in HTML)
    if (this.accountInfo) {
      this.accountInfo.style.display = 'flex';
    }
  }

  showMessage(message, type = 'info') {
    if (!this.loginMessage) return;
    
    this.loginMessage.textContent = message;
    this.loginMessage.className = `login-message ${type}`;
    this.loginMessage.style.display = 'block';
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        this.loginMessage.style.display = 'none';
      }, 3000);
    }
  }

  logout() {
    this.isLoggedIn = false;
    localStorage.removeItem('gbis_login_state');
    this.showLoginScreen();
    
    // Clear form
    if (this.loginForm) {
      this.loginForm.reset();
    }
    
    // Hide account info
    if (this.accountInfo) {
      this.accountInfo.style.display = 'none';
    }
  }
}

// Initialize login manager when DOM is ready
(function initLogin() {
  const start = () => {
    if (!window.loginManager) {
      window.loginManager = new LoginManager();
    }
  };
  
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => setTimeout(start, 50));
  } else {
    setTimeout(start, 0);
  }
})();