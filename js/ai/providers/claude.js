/**
 * Anthropic Claude Provider
 */

const ClaudeProvider = {
  name: 'claude',
  apiEndpoint: 'https://api.anthropic.com/v1/messages',

  async sendMessage(prompt, apiKey, model = 'claude-3-5-sonnet-20241022', onChunk = null) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          stream: !!onChunk
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      if (onChunk) {
        // Streaming response
        return this.handleStream(response, onChunk);
      } else {
        // Non-streaming response
        const data = await response.json();
        return data.content[0].text;
      }
    } catch (error) {
      console.error('Claude API error:', error);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const json = JSON.parse(data);
              if (json.type === 'content_block_delta' && json.delta?.text) {
                const text = json.delta.text;
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
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ];
  }
};

window.ClaudeProvider = ClaudeProvider;
