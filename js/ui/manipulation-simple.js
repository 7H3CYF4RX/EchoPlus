/**
 * rep+ Simple Response Manipulation
 * Capture current page response and modify it before sending to browser
 */

const ManipulationUI = {
  currentResponse: null,

  init() {
    console.log('[Manipulation] Initializing...');
    this.bindEvents();
  },

  bindEvents() {
    const captureBtn = document.getElementById('capture-page-btn');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.capturePage());
    }

    const editBtn = document.getElementById('edit-response-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => this.openEditor());
    }

    const sendBtn = document.getElementById('send-to-browser-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendToBrowser());
    }

    const clearBtn = document.getElementById('clear-response-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearResponse());
    }
  },

  async capturePage() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        this.showMessage('❌ No active tab found', 'error');
        return;
      }

      const tab = tabs[0];
      const url = tab.url;

      this.showMessage('⏳ Capturing page...', 'info');

      // Fetch the current page
      const response = await fetch(url);
      const body = await response.text();
      
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      this.currentResponse = {
        url: url,
        status: response.status,
        statusText: response.statusText,
        headers: headers,
        body: body,
        tabId: tab.id
      };

      this.displayResponse();
      this.showMessage('✅ Page captured successfully!', 'success');

    } catch (error) {
      console.error('[Manipulation] Capture error:', error);
      this.showMessage(`❌ Failed to capture: ${error.message}`, 'error');
    }
  },

  displayResponse() {
    if (!this.currentResponse) return;

    const container = document.getElementById('response-preview');
    if (!container) return;

    container.innerHTML = `
      <div class="response-info">
        <div class="info-row">
          <strong>URL:</strong>
          <span class="url-text">${this.currentResponse.url}</span>
        </div>
        <div class="info-row">
          <strong>Status:</strong>
          <span class="status-badge status-${Math.floor(this.currentResponse.status / 100)}xx">
            ${this.currentResponse.status} ${this.currentResponse.statusText}
          </span>
        </div>
        <div class="info-row">
          <strong>Body Length:</strong>
          <span>${this.currentResponse.body.length} characters</span>
        </div>
      </div>
      <div class="response-preview-body">
        <pre><code>${this.escapeHtml(this.currentResponse.body.substring(0, 500))}...</code></pre>
      </div>
    `;

    // Enable edit button
    document.getElementById('edit-response-btn').disabled = false;
    document.getElementById('send-to-browser-btn').disabled = false;
    document.getElementById('clear-response-btn').disabled = false;
  },

  openEditor() {
    if (!this.currentResponse) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content manipulation-editor">
        <div class="modal-header">
          <h3>✏️ Edit Response</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="editor-group">
            <label>Status Code</label>
            <input type="number" id="edit-status" value="${this.currentResponse.status}" min="100" max="599" class="status-input">
          </div>
          
          <div class="editor-group">
            <label>Response Headers <span class="hint">(one per line: Header-Name: value)</span></label>
            <textarea id="edit-headers" class="code-editor">${this.formatHeaders(this.currentResponse.headers)}</textarea>
          </div>
          
          <div class="editor-group">
            <label>Response Body <span class="hint">(full HTML/JSON/text)</span></label>
            <textarea id="edit-body" class="code-editor large">${this.escapeHtml(this.currentResponse.body)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button id="save-changes" class="btn btn-primary">💾 Save Changes</button>
          <button class="modal-cancel btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind events
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.querySelector('.modal-cancel').onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    modal.querySelector('#save-changes').onclick = () => {
      const newStatus = parseInt(document.getElementById('edit-status').value);
      const newHeaders = this.parseHeaders(document.getElementById('edit-headers').value);
      const newBody = document.getElementById('edit-body').value;

      this.currentResponse.status = newStatus;
      this.currentResponse.headers = newHeaders;
      this.currentResponse.body = newBody;

      this.displayResponse();
      this.showMessage('✅ Changes saved!', 'success');
      modal.remove();
    };
  },

  async sendToBrowser() {
    if (!this.currentResponse) return;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) return;

      const tabId = tabs[0].id;

      // Inject the modified response into the browser
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (body, status) => {
          // Replace page content
          document.open();
          document.write(body);
          document.close();

          // Show notification
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 16px;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
          `;
          notification.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:24px;">✅</span>
              <div>
                <div>Response Manipulated!</div>
                <div style="font-size:13px;font-weight:400;opacity:0.9;margin-top:4px;">
                  Status: ${status}
                </div>
              </div>
            </div>
          `;
          
          const style = document.createElement('style');
          style.textContent = `
            @keyframes slideIn {
              from { transform: translateX(400px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `;
          document.head.appendChild(style);
          
          document.body.appendChild(notification);
          setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
          }, 4000);
        },
        args: [this.currentResponse.body, this.currentResponse.status]
      });

      this.showMessage('✅ Response sent to browser!', 'success');

    } catch (error) {
      console.error('[Manipulation] Send error:', error);
      this.showMessage(`❌ Failed to send: ${error.message}`, 'error');
    }
  },

  clearResponse() {
    this.currentResponse = null;
    const container = document.getElementById('response-preview');
    if (container) {
      container.innerHTML = '<p class="empty-state">No response captured yet. Click "Capture Current Page" to start.</p>';
    }
    document.getElementById('edit-response-btn').disabled = true;
    document.getElementById('send-to-browser-btn').disabled = true;
    document.getElementById('clear-response-btn').disabled = true;
    this.showMessage('Response cleared', 'info');
  },

  formatHeaders(headers) {
    return Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\n');
  },

  parseHeaders(text) {
    const headers = {};
    text.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    });
    return headers;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showMessage(message, type) {
    const messageEl = document.getElementById('manipulation-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
};

window.ManipulationUI = ManipulationUI;
