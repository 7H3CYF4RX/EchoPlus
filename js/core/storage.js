/**
 * rep+ Storage Manager
 * Handle Chrome Storage API and data persistence
 */

const StorageManager = {
  // Save requests to storage
  async saveRequests(requests) {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.warn('[Storage] Chrome storage not available, using localStorage fallback');
        localStorage.setItem('repplus_requests', JSON.stringify(requests));
        return true;
      }
      await chrome.storage.local.set({ requests });
      return true;
    } catch (e) {
      console.error('Save requests error:', e);
      // Fallback to localStorage
      try {
        localStorage.setItem('repplus_requests', JSON.stringify(requests));
        return true;
      } catch (e2) {
        console.error('localStorage fallback failed:', e2);
        return false;
      }
    }
  },

  // Load requests from storage
  async loadRequests() {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.warn('[Storage] Chrome storage not available, using localStorage fallback');
        const stored = localStorage.getItem('repplus_requests');
        return stored ? JSON.parse(stored) : [];
      }
      const result = await chrome.storage.local.get('requests');
      return result.requests || [];
    } catch (e) {
      console.error('Load requests error:', e);
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('repplus_requests');
        return stored ? JSON.parse(stored) : [];
      } catch (e2) {
        console.error('localStorage fallback failed:', e2);
        return [];
      }
    }
  },

  // Save settings
  async saveSettings(settings) {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.warn('[Storage] Chrome storage not available, using localStorage fallback');
        localStorage.setItem('repplus_settings', JSON.stringify(settings));
        return true;
      }
      await chrome.storage.local.set({ settings });
      return true;
    } catch (e) {
      console.error('Save settings error:', e);
      // Fallback to localStorage
      try {
        localStorage.setItem('repplus_settings', JSON.stringify(settings));
        return true;
      } catch (e2) {
        console.error('localStorage fallback failed:', e2);
        return false;
      }
    }
  },

  // Load settings
  async loadSettings() {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.warn('[Storage] Chrome storage not available, using localStorage fallback');
        const stored = localStorage.getItem('repplus_settings');
        return stored ? JSON.parse(stored) : {
          aiProvider: 'claude',
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          model: 'claude-3-5-sonnet-20241022',
          theme: 'auto'
        };
      }
      const result = await chrome.storage.local.get('settings');
      return result.settings || {
        aiProvider: 'claude',
        apiKey: '',
        apiEndpoint: 'http://localhost:11434',
        model: 'claude-3-5-sonnet-20241022',
        theme: 'auto'
      };
    } catch (e) {
      console.error('Load settings error:', e);
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('repplus_settings');
        return stored ? JSON.parse(stored) : {
          aiProvider: 'claude',
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          model: 'claude-3-5-sonnet-20241022',
          theme: 'auto'
        };
      } catch (e2) {
        console.error('localStorage fallback failed:', e2);
        return {
          aiProvider: 'claude',
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          model: 'claude-3-5-sonnet-20241022',
          theme: 'auto'
        };
      }
    }
  },

  // Save history
  async saveHistory(history) {
    try {
      await chrome.storage.local.set({ history });
      return true;
    } catch (e) {
      console.error('Save history error:', e);
      return false;
    }
  },

  // Load history
  async loadHistory() {
    try {
      const result = await chrome.storage.local.get('history');
      return result.history || [];
    } catch (e) {
      console.error('Load history error:', e);
      return [];
    }
  },

  // Clear all data
  async clearAll() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (e) {
      console.error('Clear storage error:', e);
      return false;
    }
  },

  // Export data to JSON
  exportData(requests, settings) {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      requests,
      settings
    }, null, 2);
  },

  // Import data from JSON
  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return {
        success: true,
        requests: data.requests || [],
        settings: data.settings || {}
      };
    } catch (e) {
      console.error('Import error:', e);
      return { success: false, error: e.message };
    }
  }
};

window.StorageManager = StorageManager;
