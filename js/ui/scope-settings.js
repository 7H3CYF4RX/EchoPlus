/**
 * rep+ Scope Settings
 * Configure which URLs/hosts to capture and analyze
 */

const ScopeSettings = {
  scopeRules: [],
  includeMode: true, // true = whitelist, false = blacklist

  init() {
    this.loadScope();
    this.bindEvents();
    this.renderScope();
  },

  bindEvents() {
    console.log('[ScopeSettings] Binding events...');
    
    // Add scope rule
    const addRuleBtn = document.getElementById('add-scope-rule');
    if (addRuleBtn) {
      addRuleBtn.addEventListener('click', () => {
        console.log('[ScopeSettings] Add rule button clicked');
        this.addScopeRule();
      });
      console.log('[ScopeSettings] add-scope-rule button bound');
    } else {
      console.error('[ScopeSettings] add-scope-rule button not found!');
    }

    // Toggle mode
    const scopeMode = document.getElementById('scope-mode');
    if (scopeMode) {
      scopeMode.addEventListener('change', (e) => {
        console.log('[ScopeSettings] Mode changed to:', e.target.value);
        this.includeMode = e.target.value === 'include';
        this.saveScope();
        this.renderScope();
      });
    }

    // Import scope
    const importBtn = document.getElementById('import-scope');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        console.log('[ScopeSettings] Import button clicked');
        this.importScope();
      });
    }

    // Export scope
    const exportBtn = document.getElementById('export-scope');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        console.log('[ScopeSettings] Export button clicked');
        this.exportScope();
      });
    }

    // Quick add current domain
    const addDomainBtn = document.getElementById('add-current-domain');
    if (addDomainBtn) {
      addDomainBtn.addEventListener('click', () => {
        console.log('[ScopeSettings] Add current domain button clicked');
        this.addCurrentDomain();
      });
      console.log('[ScopeSettings] add-current-domain button bound');
    } else {
      console.error('[ScopeSettings] add-current-domain button not found!');
    }
    
    console.log('[ScopeSettings] All events bound');
  },

  async addCurrentDomain() {
    try {
      if (!chrome.tabs || !chrome.tabs.query) {
        console.error('[ScopeSettings] chrome.tabs.query not available');
        this.showNotification('Chrome tabs API not available', 'error');
        return;
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[ScopeSettings] Tabs query result:', tabs);
      
      if (tabs && tabs[0]) {
        try {
          const url = new URL(tabs[0].url);
          const domain = url.hostname;
          
          this.scopeRules.push({
            id: Date.now(),
            pattern: `*${domain}*`,
            type: 'domain',
            enabled: true,
            description: `Current domain: ${domain}`
          });
          
          this.saveScope();
          this.renderScope();
          
          this.showNotification(`Added ${domain} to scope`, 'success');
        } catch (e) {
          console.error('[ScopeSettings] URL parse error:', e);
          this.showNotification('Failed to parse current URL', 'error');
        }
      } else {
        console.error('[ScopeSettings] No active tab found');
        this.showNotification('No active tab found', 'error');
      }
    } catch (e) {
      console.error('[ScopeSettings] addCurrentDomain error:', e);
      this.showNotification('Failed to get current domain: ' + e.message, 'error');
    }
  },

  addScopeRule() {
    const input = document.getElementById('scope-pattern');
    const desc = document.getElementById('scope-description');
    
    if (!input || !input.value.trim()) {
      this.showNotification('Please enter a pattern', 'error');
      return;
    }

    const pattern = input.value.trim();
    const description = desc ? desc.value.trim() : '';

    // Detect type
    let type = 'pattern';
    try {
      const testUrl = pattern.replace(/\*/g, 'test');
      new URL(testUrl);
      type = 'url';
    } catch (e) {
      if (pattern.includes('*')) {
        type = 'wildcard';
      }
    }

    this.scopeRules.push({
      id: Date.now(),
      pattern: pattern,
      type: type,
      enabled: true,
      description: description
    });

    this.saveScope();
    this.renderScope();

    // Clear inputs
    input.value = '';
    if (desc) desc.value = '';
    
    this.showNotification('Scope rule added', 'success');
  },

  removeScopeRule(id) {
    this.scopeRules = this.scopeRules.filter(r => r.id !== id);
    this.saveScope();
    this.renderScope();
  },

  toggleScopeRule(id) {
    const rule = this.scopeRules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.saveScope();
      this.renderScope();
    }
  },

  renderScope() {
    const container = document.getElementById('scope-rules-list');
    if (!container) return;

    if (this.scopeRules.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No scope rules defined</p>
          <p class="help-text">Add patterns to control which requests are captured</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.scopeRules.map(rule => `
      <div class="scope-rule ${rule.enabled ? 'enabled' : 'disabled'}">
        <div class="scope-rule-header">
          <label class="checkbox-label">
            <input type="checkbox" 
                   ${rule.enabled ? 'checked' : ''} 
                   data-toggle-rule-id="${rule.id}">
            <span class="scope-pattern">${this.escapeHtml(rule.pattern)}</span>
          </label>
          <span class="scope-type">${rule.type}</span>
        </div>
        ${rule.description ? `<div class="scope-description">${this.escapeHtml(rule.description)}</div>` : ''}
        <div class="scope-actions">
          <button class="btn-sm btn-danger" data-rule-id="${rule.id}">Remove</button>
        </div>
      </div>
    `).join('');

    // Bind toggle checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const ruleId = parseInt(e.target.dataset.toggleRuleId);
        this.toggleScopeRule(ruleId);
      });
    });
    
    // Bind remove buttons
    container.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleId = parseInt(e.target.dataset.ruleId);
        this.removeScopeRule(ruleId);
      });
    });

    // Update stats
    const enabled = this.scopeRules.filter(r => r.enabled).length;
    const total = this.scopeRules.length;
    const stats = document.getElementById('scope-stats');
    if (stats) {
      stats.textContent = `${enabled} active / ${total} total rules`;
    }
  },

  isInScope(url) {
    // If no rules, everything is in scope
    if (this.scopeRules.length === 0) {
      return true;
    }

    const enabledRules = this.scopeRules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      return true;
    }

    const matchesAny = enabledRules.some(rule => {
      try {
        const pattern = rule.pattern.replace(/\*/g, '.*');
        const regex = new RegExp(pattern);
        return regex.test(url);
      } catch (e) {
        return false;
      }
    });

    // Include mode: must match at least one rule
    // Exclude mode: must NOT match any rule
    return this.includeMode ? matchesAny : !matchesAny;
  },

  loadScope() {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        // Fallback to localStorage
        const stored = localStorage.getItem('repplus_scope');
        if (stored) {
          const data = JSON.parse(stored);
          this.scopeRules = data.scopeRules || [];
          this.includeMode = data.scopeMode !== 'exclude';
        }
        
        const modeSelect = document.getElementById('scope-mode');
        if (modeSelect) {
          modeSelect.value = this.includeMode ? 'include' : 'exclude';
        }
        
        this.renderScope();
        return;
      }
      
      chrome.storage.local.get(['scopeRules', 'scopeMode'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[ScopeSettings] Load error:', chrome.runtime.lastError);
          // Fallback to localStorage
          const stored = localStorage.getItem('repplus_scope');
          if (stored) {
            const data = JSON.parse(stored);
            this.scopeRules = data.scopeRules || [];
            this.includeMode = data.scopeMode !== 'exclude';
          }
        } else {
          this.scopeRules = result.scopeRules || [];
          this.includeMode = result.scopeMode !== 'exclude';
        }
        
        // Update UI
        const modeSelect = document.getElementById('scope-mode');
        if (modeSelect) {
          modeSelect.value = this.includeMode ? 'include' : 'exclude';
        }
        
        this.renderScope();
      });
    } catch (e) {
      console.error('[ScopeSettings] loadScope error:', e);
      this.renderScope();
    }
  },

  saveScope() {
    try {
      const data = {
        scopeRules: this.scopeRules,
        scopeMode: this.includeMode ? 'include' : 'exclude'
      };
      
      // Always save to localStorage as backup
      localStorage.setItem('repplus_scope', JSON.stringify(data));
      
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            console.error('[ScopeSettings] Save error:', chrome.runtime.lastError);
          }
        });
      }
    } catch (e) {
      console.error('[ScopeSettings] saveScope error:', e);
    }
  },

  importScope() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          
          // Try JSON first
          try {
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
              this.scopeRules = data;
            } else if (data.rules) {
              this.scopeRules = data.rules;
            }
          } catch (e) {
            // Try text format (one pattern per line)
            const lines = content.split('\n')
              .map(l => l.trim())
              .filter(l => l && !l.startsWith('#'));
            
            this.scopeRules = lines.map((pattern, i) => ({
              id: Date.now() + i,
              pattern: pattern,
              type: 'wildcard',
              enabled: true,
              description: ''
            }));
          }
          
          this.saveScope();
          this.renderScope();
          this.showNotification(`Imported ${this.scopeRules.length} rules`, 'success');
        } catch (error) {
          this.showNotification('Failed to import scope', 'error');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  },

  exportScope() {
    const data = {
      version: '1.0',
      mode: this.includeMode ? 'include' : 'exclude',
      rules: this.scopeRules,
      exported: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rep-plus-scope-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Scope exported', 'success');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

window.ScopeSettings = ScopeSettings;

// Don't auto-initialize - let panel.js do it
// Initialize when DOM is ready (fallback)
if (document.readyState !== 'loading') {
  // DOM already loaded, but wait for panel.js to call init
  console.log('[ScopeSettings] Ready for initialization');
}
