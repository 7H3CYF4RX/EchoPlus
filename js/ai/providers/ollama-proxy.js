/**
 * Ollama Provider with Background Script Proxy
 * Fixes CORS issues by routing through background script
 */

const OllamaProxyProvider = {
  name: 'ollama',
  defaultEndpoint: 'http://localhost:11434',

  async sendMessage(prompt, apiEndpoint, model = 'llama2', onChunk = null) {
    
    // Validation
    if (!apiEndpoint) {
      const error = 'Ollama endpoint not configured. Please set endpoint in Settings.';
      console.error('[Ollama]', error);
      throw new Error(error);
    }
    
    if (!model) {
      const error = 'Ollama model not specified. Please select a model in Settings.';
      console.error('[Ollama]', error);
      throw new Error(error);
    }
    
    if (!prompt) {
      const error = 'Empty prompt provided';
      console.error('[Ollama]', error);
      throw new Error(error);
    }

    try {
      
      // Route through background script to avoid CORS issues
      return new Promise((resolve, reject) => {
        const messagePayload = {
          type: 'OLLAMA_REQUEST',
          data: {
            endpoint: apiEndpoint,
            model: model,
            prompt: prompt,
            stream: false
          }
        };
        
        
        chrome.runtime.sendMessage(messagePayload, (response) => {

          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;
            console.error('[Ollama] Chrome runtime error:', errorMsg);
            
            if (errorMsg.includes('Receiving end does not exist')) {
              reject(new Error('Background script not responding. Please reload the extension.'));
            } else {
              reject(new Error(`Extension error: ${errorMsg}`));
            }
            return;
          }

          if (!response) {
            console.error('[Ollama] No response received from background');
            reject(new Error('No response from background script. Extension may need reload.'));
            return;
          }

          if (!response.success) {
            console.error('[Ollama] Background returned error:', response.error);
            reject(new Error(response.error || 'Request failed'));
            return;
          }

          const responseText = response.data;
          
          if (onChunk && responseText) {
            onChunk(responseText);
          }
          
          resolve(responseText || '');
        });
      });
      
    } catch (error) {
      console.error('[Ollama] Request failed:', error);
      
      // Provide helpful error messages
      if (error.message.includes('Could not establish connection')) {
        throw new Error('Extension error: Background script not responding. Please reload the extension.');
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Cannot connect to Ollama. Please ensure:\n1. Ollama is running (run "ollama serve" in terminal)\n2. Ollama is accessible at ' + apiEndpoint);
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Ollama is not running. Please start it:\n  ollama serve');
      }
      
      throw error;
    }
  },

  async handleStream(response, onChunk) {
    // Streaming implementation (not currently used)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                fullText += json.response;
                onChunk(json.response);
              }
              if (json.done) break;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  },

  async getModels(apiEndpoint) {
    try {
      
      // Use background script for model list too
      const response = await chrome.runtime.sendMessage({
        type: 'OLLAMA_MODELS',
        data: { endpoint: apiEndpoint }
      });
      
      if (response.success && response.data) {
        return response.data.map(model => ({
          value: model.name,
          label: model.name
        }));
      }
      
      throw new Error('Failed to fetch models');
    } catch (error) {
      console.error('[Ollama] Failed to get models:', error);
      // Return default models based on what we know is installed
      return [
        { value: 'IHA089/drana-infinity-v1:latest', label: 'Drana Infinity V1 (Recommended)' },
        { value: 'llama2:latest', label: 'Llama 2' },
        { value: 'llama3', label: 'Llama 3' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'codellama', label: 'Code Llama' }
      ];
    }
  },

  // Test connection
  async testConnection(apiEndpoint) {
    try {
      const response = await fetch(`${apiEndpoint}/api/tags`);
      return response.ok;
    } catch (e) {
      return false;
    }
  }
};

// Export as OllamaProvider (replaces old ollama.js)
window.OllamaProvider = OllamaProxyProvider;
