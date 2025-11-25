/**
 * rep+ Settings UI
 */

const SettingsUI = {
  settings: null,

  init() {
    this.bindEvents();
    this.loadSettings();
  },

  bindEvents() {
    document.getElementById('ai-provider')?.addEventListener('change', (e) => {
      this.handleProviderChange(e.target.value);
    });

    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });
  },

  async loadSettings() {
    this.settings = await StorageManager.loadSettings();
    this.renderSettings();
    
    // Initialize AI Manager
    await AIManager.initialize(this.settings);
  },

  renderSettings() {
    const providerSelect = document.getElementById('ai-provider');
    const apiKeyInput = document.getElementById('api-key');
    const apiEndpointInput = document.getElementById('api-endpoint');
    const modelSelect = document.getElementById('model-select');

    if (providerSelect) {
      providerSelect.value = this.settings.aiProvider || 'claude';
    }

    if (apiKeyInput) {
      apiKeyInput.value = this.settings.apiKey || '';
      apiKeyInput.type = 'password';
    }

    if (apiEndpointInput) {
      apiEndpointInput.value = this.settings.apiEndpoint || 'http://localhost:11434';
    }

    // Update field visibility based on provider
    this.handleProviderChange(this.settings.aiProvider);

    // Update model options based on provider
    this.updateModelOptions(this.settings.aiProvider);

    if (modelSelect) {
      modelSelect.value = this.settings.model || 'claude-3-5-sonnet-20241022';
    }
  },

  handleProviderChange(provider) {
    const apiEndpointInput = document.getElementById('api-endpoint');
    const apiKeyInput = document.getElementById('api-key');

    // Show/hide appropriate fields based on provider
    if (provider === 'ollama') {
      // Ollama uses endpoint, not API key
      if (apiKeyInput) {
        apiKeyInput.style.display = 'none';
        const keyLabel = apiKeyInput.previousElementSibling;
        if (keyLabel) keyLabel.style.display = 'none';
      }
      if (apiEndpointInput) {
        apiEndpointInput.style.display = 'block';
        const endpointLabel = apiEndpointInput.previousElementSibling;
        if (endpointLabel) {
          endpointLabel.style.display = 'block';
          endpointLabel.textContent = 'Ollama Endpoint:';
        }
      }
    } else {
      // Cloud providers use API key
      if (apiKeyInput) {
        apiKeyInput.style.display = 'block';
        const keyLabel = apiKeyInput.previousElementSibling;
        if (keyLabel) {
          keyLabel.style.display = 'block';
          keyLabel.textContent = 'API Key:';
        }
      }
      if (apiEndpointInput) {
        apiEndpointInput.style.display = 'none';
        const endpointLabel = apiEndpointInput.previousElementSibling;
        if (endpointLabel) endpointLabel.style.display = 'none';
      }
    }

    this.updateModelOptions(provider);
  },

  updateModelOptions(provider) {
    const modelSelect = document.getElementById('model-select');
    if (!modelSelect) return;

    let models = [];
    
    switch (provider) {
      case 'claude':
        models = ClaudeProvider.getModels();
        break;
      case 'openai':
        models = OpenAIProvider.getModels();
        break;
      case 'gemini':
        models = GeminiProvider.getModels();
        break;
      case 'ollama':
        models = [
          { value: 'IHA089/drana-infinity-v1:latest', label: 'Drana Infinity V1' },
          { value: 'llama2', label: 'Llama 2' },
          { value: 'llama3', label: 'Llama 3' },
          { value: 'mistral', label: 'Mistral' },
          { value: 'codellama', label: 'Code Llama' }
        ];
        break;
    }

    modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      modelSelect.appendChild(option);
    });
  },

  async saveSettings() {
    const providerSelect = document.getElementById('ai-provider');
    const apiKeyInput = document.getElementById('api-key');
    const apiEndpointInput = document.getElementById('api-endpoint');
    const modelSelect = document.getElementById('model-select');

    this.settings = {
      aiProvider: providerSelect?.value || 'claude',
      apiKey: apiKeyInput?.value || '',
      apiEndpoint: apiEndpointInput?.value || 'http://localhost:11434',
      model: modelSelect?.value || 'claude-3-5-sonnet-20241022',
      theme: this.settings?.theme || 'auto'
    };

    const success = await StorageManager.saveSettings(this.settings);
    
    if (success) {
      // Reinitialize AI Manager
      await AIManager.initialize(this.settings);
      
      // Show success message
      const btn = document.getElementById('save-settings');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Saved!';
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 2000);
      }
    } else {
      alert('Failed to save settings');
    }
  },

  getSettings() {
    return this.settings;
  }
};

window.SettingsUI = SettingsUI;
