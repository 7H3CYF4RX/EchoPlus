/**
 * rep+ Main Panel Controller
 */

class RepPlusApp {
  constructor() {
    this.currentTab = 'repeater';
    this.requests = [];
    this.filteredRequests = [];
    this.selectedRequest = null;
    this.theme = 'auto';
  }

  async init() {
    console.log('rep+ initializing...');
    console.log('DevTools API available:', typeof chrome !== 'undefined' && !!chrome?.devtools);

    // Load saved data
    await this.loadData();
    
    // Initialize UI components
    this.initializeComponents();
    
    // Setup event listeners
    this.bindEvents();
    
    // Initialize smooth scrolling
    this.initScrolls();
    
    // Start request capture
    console.log('Starting request capture...');
    RequestCapture.start();
    RequestCapture.addListener((event, data) => {
      console.log('Request capture event:', event, data?.url);
      this.handleCaptureEvent(event, data);
    });

    // Apply theme
    this.applyTheme();
    
    console.log('rep+ initialized successfully');
  }

  initializeComponents() {
    // Initialize all UI components
    console.log('[App] Initializing UI components...');
    RepeaterUI.init();
    IntruderUI.init();
    ScannerUI.init();
    ManipulationUI.init();
    if (window.ChatUI) ChatUI.init();
    SettingsUI.init();
    
    // Initialize Scope Settings
    if (window.ScopeSettings) {
      ScopeSettings.init();
      console.log('[App] ScopeSettings initialized');
    } else {
      console.error('[App] ScopeSettings not available!');
    }
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab-btn').dataset.tab;
        this.switchTab(tab);
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.dropdown.active').forEach(dropdown => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });

    // Header buttons
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    document.getElementById('clear-all-requests')?.addEventListener('click', () => {
      this.clearAllRequests();
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('import-btn')?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });

    document.getElementById('import-file')?.addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });

    // Search and filters
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    document.getElementById('regex-toggle')?.addEventListener('change', (e) => {
      this.handleSearch(document.getElementById('search-input')?.value || '');
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleFilterClick(e.target);
      });
    });

    // Context menu from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'contextMenuClicked') {
        this.handleContextMenu(message.menuItemId, message.selectedText);
      }
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });
  }

  handleCaptureEvent(event, data) {
    if (event === 'requestCaptured') {
      this.requests.push(data);
      this.applyFiltersAndRender();
    } else if (event === 'requestsCleared') {
      this.requests = [];
      this.applyFiltersAndRender();
    }
  }

  handleSearch(query) {
    const isRegex = document.getElementById('regex-toggle')?.checked || false;
    this.applyFiltersAndRender();
  }

  handleFilterClick(button) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    this.applyFiltersAndRender();
  }

  applyFiltersAndRender() {
    const query = document.getElementById('search-input')?.value || '';
    const isRegex = document.getElementById('regex-toggle')?.checked || false;
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    this.filteredRequests = Filters.applyFilters(this.requests, {
      query,
      isRegex,
      method: activeFilter === 'starred' ? 'all' : activeFilter,
      starredOnly: activeFilter === 'starred'
    });

    this.renderRequestList();
    this.updateRequestCount();
  }

  renderRequestList() {
    const container = document.getElementById('request-list');
    if (!container) return;

    if (this.filteredRequests.length === 0) {
      SafeDOM.clear(container);
      const p = SafeDOM.createElement('p', { className: 'text-muted p-2' }, ['No requests captured']);
      SafeDOM.append(container, p);
      return;
    }

    SafeDOM.clear(container);

    this.filteredRequests.forEach(req => {
      const div = SafeDOM.createElement('div', { className: 'list-item' });

      if (this.selectedRequest?.id === req.id) {
        SafeDOM.addClass(div, 'active');
      }

      // Create header
      const header = SafeDOM.createElement('div', { className: 'request-item-header' });

      // Method badge
      const methodBadge = SafeDOM.createElement('span', {
        className: 'method-badge'
      }, [req.method]);
      SafeDOM.addClass(methodBadge, `method-${req.method.toLowerCase()}`);
      SafeDOM.append(header, methodBadge);

      // Star if starred
      if (req.starred) {
        const star = SafeDOM.createElement('span', { className: 'star' }, ['⭐']);
        SafeDOM.append(header, star);
      }

      // Status badge if response exists
      if (req.response) {
        const statusCode = Math.floor(req.response.status / 100);
        const statusBadge = SafeDOM.createElement('span', {
          className: 'status-badge'
        }, [req.response.status.toString()]);
        SafeDOM.addClass(statusBadge, `status-${statusCode}xx`);
        SafeDOM.append(header, statusBadge);
      }

      SafeDOM.append(div, header);

      // URL
      const urlDiv = SafeDOM.createElement('div', { className: 'request-url' }, [this.truncateUrl(req.url)]);
      SafeDOM.append(div, urlDiv);

      // Meta
      const metaDiv = SafeDOM.createElement('div', { className: 'request-meta' });
      const small = SafeDOM.createElement('small');
      SafeDOM.append(small, SafeDOM.createText(new Date(req.timestamp).toLocaleTimeString()));
      SafeDOM.append(metaDiv, small);
      SafeDOM.append(div, metaDiv);

      // Click handler
      SafeDOM.addEventListener(div, 'click', () => {
        this.selectRequest(req);
      });

      SafeDOM.append(container, div);
    });
  }

  selectRequest(request) {
    console.log('[App] selectRequest called:', {
      url: request.url,
      method: request.method,
      hasResponse: !!request.response,
      currentTab: this.currentTab
    });
    
    this.selectedRequest = request;
    this.renderRequestList();
    
    // Load request in repeater
    if (this.currentTab === 'repeater') {
      console.log('[App] Loading request into Repeater...');
      RepeaterUI.loadRequest(request);
    } else {
      console.log('[App] Not on Repeater tab, skipping load. Current tab:', this.currentTab);
    }
  }

  updateRequestCount() {
    const badge = document.getElementById('request-count');
    if (badge) {
      badge.textContent = this.filteredRequests.length;
    }
  }

  clearAllRequests() {
    if (this.requests.length === 0) {
      return;
    }
    
    if (confirm(`Clear all ${this.requests.length} requests? This cannot be undone.`)) {
      this.requests = [];
      this.filteredRequests = [];
      this.selectedRequest = null;
      
      // Clear RequestCapture
      if (window.RequestCapture) {
        window.RequestCapture.capturedRequests = [];
        window.RequestCapture.requestMap.clear();
      }
      
      // Clear Response Manipulation captured responses
      if (window.ResponseManipulationUI) {
        window.ResponseManipulationUI.capturedResponses = [];
        window.ResponseManipulationUI.renderCapturedResponses();
      }
      
      this.renderRequestList();
      this.saveData();
      
    }
  }

  async exportData() {
    const settings = await StorageManager.loadSettings();
    const data = StorageManager.exportData(this.requests, settings);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repplus-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const result = StorageManager.importData(text);
      
      if (!result.success) {
        alert(`Import failed: ${result.error}`);
        return;
      }

      this.requests = result.requests || [];
      this.applyFiltersAndRender();
      
      alert(`Imported ${this.requests.length} requests successfully`);
    } catch (e) {
      alert(`Import failed: ${e.message}`);
    }
  }

  handleContextMenu(menuItemId, selectedText) {
    if (menuItemId.startsWith('ai-')) {
      this.handleAIContextMenu(menuItemId, selectedText);
    } else {
      this.handleConverterContextMenu(menuItemId, selectedText);
    }
  }

  async handleAIContextMenu(menuItemId, text) {
    if (menuItemId === 'ai-explain') {
      const panel = document.getElementById('ai-panel');
      const content = document.getElementById('ai-content');
      
      if (panel && content) {
        content.innerHTML = '<div class="spinner"></div> Analyzing...';
        
        try {
          await AIManager.explainText(text).then(response => {
            content.innerHTML = this.formatAIResponse(response);
          });
        } catch (error) {
          content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
      }
    }
  }

  async handleAIAction(action) {
    const panel = document.getElementById('ai-panel');
    const content = document.getElementById('ai-content');
    
    if (!panel || !content) return;

    content.innerHTML = '<div class="spinner"></div> Analyzing...';

    try {
      let prompt;
      
      switch (action) {
        case 'suggest-attacks':
          if (!RepeaterUI.currentRequest) {
            content.innerHTML = '<div class="error">No request selected. Please select a request first.</div>';
            return;
          }
          prompt = AIManager.generateAttackVectorsPrompt(RepeaterUI.currentRequest);
          break;
          
        case 'analyze-response':
          if (!RepeaterUI.currentRequest?.response) {
            content.innerHTML = '<div class="error">No response available. Please send a request first.</div>';
            return;
          }
          prompt = AIManager.generateResponseAnalysisPrompt(
            RepeaterUI.currentRequest,
            RepeaterUI.currentRequest.response
          );
          break;
          
        case 'map-attack-surface':
          if (this.requests.length === 0) {
            content.innerHTML = '<div class="error">No requests captured. Please browse a website first.</div>';
            return;
          }
          prompt = AIManager.generateAttackSurfaceMappingPrompt(this.requests);
          break;
          
        default:
          content.innerHTML = '<div class="error">Unknown AI action</div>';
          return;
      }

      content.innerHTML = '';
      await AIManager.sendMessage(prompt, (chunk) => {
        content.innerHTML += chunk;
      });

      // Format the final response
      content.innerHTML = this.formatAIResponse(content.textContent);
      
      // Save to cache
      if (RepeaterUI.currentRequest && RepeaterUI.currentRequest.id) {
        RepeaterUI.aiContentCache.set(RepeaterUI.currentRequest.id, content.innerHTML);
      }

    } catch (error) {
      content.innerHTML = `<div class="error">AI Error: ${error.message}<br><small>Please check your API key in Settings.</small></div>`;
      
      // Save error to cache too
      if (RepeaterUI.currentRequest && RepeaterUI.currentRequest.id) {
        RepeaterUI.aiContentCache.set(RepeaterUI.currentRequest.id, content.innerHTML);
      }
    }
  }

  formatAIResponse(text) {
    // Simple markdown-like formatting for AI responses
    let formatted = text
      // Headers
      .replace(/^### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^## (.*$)/gm, '<h3>$1</h3>')
      .replace(/^# (.*$)/gm, '<h2>$1</h2>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li>$1</li>')
      .replace(/^• (.*$)/gm, '<li>$1</li>')
      // Checkboxes
      .replace(/\[ \]/g, '☐')
      .replace(/\[x\]/gi, '☑')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      // Emojis highlighting
      .replace(/(🎯|🔍|⚠️|✅|❌|🛡️|💡|📊|🗺️|⚔️|🔐|📋)/g, '<span class="emoji">$1</span>');

    return '<div class="ai-formatted">' + formatted + '</div>';
  }

  handleConverterContextMenu(menuItemId, text) {
    const result = Converters.convert(menuItemId, text);
    
    if (result) {
      // Copy to clipboard
      navigator.clipboard.writeText(result);
      
      // Show notification
      this.showNotification(`Converted and copied to clipboard`);
    } else {
      this.showNotification('Conversion failed', 'error');
    }
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.theme);
    this.theme = themes[(currentIndex + 1) % themes.length];
    
    this.applyTheme();
    this.saveTheme();
  }

  applyTheme() {
    const root = document.documentElement;
    const themeIcon = document.querySelector('.theme-icon');
    
    if (this.theme === 'auto') {
      root.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌓';
    } else {
      root.setAttribute('data-theme', this.theme);
      if (themeIcon) themeIcon.textContent = this.theme === 'dark' ? '🌙' : '☀️';
    }
  }

  async saveTheme() {
    const settings = await StorageManager.loadSettings();
    settings.theme = this.theme;
    await StorageManager.saveSettings(settings);
  }

  async loadData() {
    // Load requests from storage
    const storedRequests = await StorageManager.loadRequests();
    if (storedRequests.length > 0) {
      this.requests = storedRequests;
      this.applyFiltersAndRender();
    }

    // Load theme
    const settings = await StorageManager.loadSettings();
    this.theme = settings.theme || 'auto';
  }

  showNotification(message, type = 'success') {
    // Simple notification - could be enhanced with a toast library
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: var(--${type === 'error' ? 'danger' : 'success'});
      color: white;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: var(--shadow-lg);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  initScrolls() {
    document.querySelectorAll('.scrollable').forEach(el => {
      el.style.scrollBehavior = 'smooth';
      el.addEventListener('scroll', () => {
        el.classList.add('scrolling');
        clearTimeout(el._scrollTimer);
        el._scrollTimer = setTimeout(() => {
          el.classList.remove('scrolling');
        }, 300);
      }, { passive: true });
    });
  }

  truncateUrl(url) {
    if (url.length > 60) {
      return url.substring(0, 57) + '...';
    }
    return url;
  }

  async saveData() {
    await StorageManager.saveRequests(this.requests);
  }
}

// Initialize app when panel loads
const app = new RepPlusApp();
window.app = app;

// Initialize Intercept UI
if (window.InterceptUI) {
  InterceptUI.init();
}

// Diagnostic function for troubleshooting
window.repPlusDiagnostics = function() {
  console.log('=== rep+ Diagnostics ===');
  console.log('Chrome available:', typeof chrome !== 'undefined');
  console.log('DevTools available:', !!chrome?.devtools);
  console.log('Network API available:', !!chrome?.devtools?.network);
  console.log('RequestCapture available:', !!window.RequestCapture);
  console.log('App initialized:', !!window.app);
  console.log('Current requests:', window.app?.requests?.length || 0);
  console.log('Scroll initialized:', !!document.querySelector('.scrollable'));
  console.log('Tab panels:', document.querySelectorAll('.tab-panel').length);

  // Test request capture
  if (window.RequestCapture) {
    console.log('RequestCapture.isCapturing:', window.RequestCapture.isCapturing);
    console.log('RequestCapture.listeners:', window.RequestCapture.listeners.length);
  }

  console.log('=== End Diagnostics ===');
};

// Panel shown event
window.onPanelShown = () => {
  console.log('Panel shown');
  // Run diagnostics after panel is shown
  setTimeout(() => window.repPlusDiagnostics(), 1000);
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
