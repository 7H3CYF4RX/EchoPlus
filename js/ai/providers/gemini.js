/**
 * Google Gemini Provider
 */

const GeminiProvider = {
  name: 'gemini',
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',

  async sendMessage(prompt, apiKey, model = 'gemini-2.0-flash-exp', onChunk = null) {
    try {
      const endpoint = `${this.apiEndpoint}/${model}:${onChunk ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      if (onChunk) {
        return this.handleStream(response, onChunk);
      } else {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  },

  async handleStream(response, onChunk) {
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
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                onChunk(text);
              }
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

  getModels() {
    return [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-pro', label: 'Gemini Pro' }
    ];
  }
};

window.GeminiProvider = GeminiProvider;
