/**
 * EchoPlus Intercept UI
 * Real-time request interception and modification (like Burp Suite Proxy)
 */

const InterceptUI = {
  isIntercepting: false,
  interceptQueue: [],
  currentIndex: 0,
  interceptRequests: true,
  interceptResponses: false,
  scopeFilter: 'all',
  
  init() {
    console.log('[InterceptUI] Initializing...');
    
    // Initialize options from checkbox states
    const requestsCheckbox = document.getElementById('intercept-requests');
    const responsesCheckbox = document.getElementById('intercept-responses');
    const scopeFilter = document.getElementById('intercept-scope-filter');
    
    if (requestsCheckbox) this.interceptRequests = requestsCheckbox.checked;
    if (responsesCheckbox) this.interceptResponses = responsesCheckbox.checked;
    if (scopeFilter) this.scopeFilter = scopeFilter.value;
    
    this.bindEvents();
    this.updateUI();
  },

  bindEvents() {
    // Toggle intercept on/off
    document.getElementById('intercept-toggle')?.addEventListener('click', () => {
      this.toggleIntercept();
    });

    // Forward current request
    document.getElementById('intercept-forward')?.addEventListener('click', () => {
      this.forwardCurrent();
    });

    // Drop current request
    document.getElementById('intercept-drop')?.addEventListener('click', () => {
      this.dropCurrent();
    });

    // Send to Repeater
    document.getElementById('intercept-send-to-repeater')?.addEventListener('click', () => {
      this.sendToRepeater();
    });

    // Forward all requests
    document.getElementById('intercept-forward-all')?.addEventListener('click', () => {
      this.forwardAll();
    });

    // Clear queue
    document.getElementById('intercept-clear-queue')?.addEventListener('click', () => {
      this.clearQueue();
    });

    // Navigation
    document.getElementById('intercept-prev')?.addEventListener('click', () => {
      this.navigatePrev();
    });

    document.getElementById('intercept-next')?.addEventListener('click', () => {
      this.navigateNext();
    });

    // Options
    document.getElementById('intercept-requests')?.addEventListener('change', (e) => {
      this.interceptRequests = e.target.checked;
      this.updateInterceptOptions();
    });

    document.getElementById('intercept-responses')?.addEventListener('change', (e) => {
      this.interceptResponses = e.target.checked;
      this.updateInterceptOptions();
    });

    document.getElementById('intercept-scope-filter')?.addEventListener('change', (e) => {
      this.scopeFilter = e.target.value;
      this.updateInterceptOptions();
    });

    // Editor tabs
    document.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchEditorTab(e.target.dataset.editorTab);
      });
    });

    // Listen for intercepted requests and responses from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'REQUEST_INTERCEPTED') {
        this.handleInterceptedRequest(message.data);
        sendResponse({ received: true });
        return false; // Response sent synchronously
      } else if (message.type === 'RESPONSE_INTERCEPTED') {
        this.handleInterceptedResponse(message.data);
        sendResponse({ received: true });
        return false; // Response sent synchronously
      }
      return false;
    });
  },

  toggleIntercept() {
    this.isIntercepting = !this.isIntercepting;
    
    // Clear queue and UI when turning OFF to prevent stale requests
    if (!this.isIntercepting) {
      this.interceptQueue = [];
      this.currentIndex = 0;
      
      // Clear the visual display
      this.clearDisplay();
    }
    
    // Get the inspected tab ID
    const tabId = chrome.devtools.inspectedWindow.tabId;
    
    const options = {
      interceptRequests: this.interceptRequests,
      interceptResponses: this.interceptResponses,
      scopeFilter: this.scopeFilter
    };
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TOGGLE_INTERCEPT',
      enabled: this.isIntercepting,
      tabId: tabId,
      options: options
    });

    this.updateUI();
    console.log('[InterceptUI] Intercept:', this.isIntercepting ? 'ON' : 'OFF', 'TabId:', tabId, 'Options:', options);
  },

  updateInterceptOptions() {
    // Only update if intercept is already ON
    if (!this.isIntercepting) return;
    
    const tabId = chrome.devtools.inspectedWindow.tabId;
    
    // Send updated options to background
    chrome.runtime.sendMessage({
      type: 'UPDATE_INTERCEPT_OPTIONS',
      options: {
        interceptRequests: this.interceptRequests,
        interceptResponses: this.interceptResponses,
        scopeFilter: this.scopeFilter
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[InterceptUI] Error updating options:', chrome.runtime.lastError);
      }
    });
    
    console.log('[InterceptUI] Options updated:', {
      requests: this.interceptRequests,
      responses: this.interceptResponses,
      scope: this.scopeFilter
    });
  },

  handleInterceptedRequest(request) {
    console.log('[InterceptUI] 📥 Request intercepted:', {
      url: request.url,
      method: request.method,
      queueLength: this.interceptQueue.length
    });
    
    // Check if should intercept based on settings
    if (!this.shouldIntercept(request)) {
      console.log('[InterceptUI] ⏭️ Auto-forwarding (out of scope)');
      // Auto-forward if doesn't match criteria
      this.forwardRequest(request);
      return;
    }

    console.log('[InterceptUI] ✅ Adding to queue');
    
    // Add to queue
    this.interceptQueue.push({
      ...request,
      timestamp: Date.now(),
      modified: false
    });

    // Always show the latest item (most recent intercept)
    this.currentIndex = this.interceptQueue.length - 1;
    this.displayCurrent();
    this.updateUI();
    
    console.log('[InterceptUI] Queue now has', this.interceptQueue.length, 'items');
  },

  handleInterceptedResponse(response) {
    console.log('[InterceptUI] 📨 Response intercepted:', {
      url: response.url,
      status: response.statusCode,
      queueLength: this.interceptQueue.length
    });
    
    // Check if should intercept based on settings
    if (!this.shouldIntercept(response)) {
      console.log('[InterceptUI] ⏭️ Auto-forwarding response (out of scope)');
      // Auto-forward if doesn't match criteria
      this.forwardRequest(response);
      return;
    }

    console.log('[InterceptUI] ✅ Adding response to queue');
    
    // Add to queue
    this.interceptQueue.push({
      ...response,
      timestamp: Date.now(),
      modified: false
    });

    // Always show the latest item (most recent intercept)
    this.currentIndex = this.interceptQueue.length - 1;
    this.displayCurrent();
    this.updateUI();
    
    console.log('[InterceptUI] Queue now has', this.interceptQueue.length, 'items');
  },

  shouldIntercept(request) {
    // Check scope filter
    if (this.scopeFilter === 'in-scope') {
      if (!ScopeSettings.isInScope(request.url)) {
        return false;
      }
    } else if (this.scopeFilter === 'out-scope') {
      if (ScopeSettings.isInScope(request.url)) {
        return false;
      }
    }

    return true;
  },

  renderRequestList() {
    const listContainer = document.getElementById('intercept-request-list');
    const listEmpty = document.getElementById('list-empty');
    const listCount = document.getElementById('list-count');
    
    // Always clear existing items first
    const existingItems = listContainer.querySelectorAll('.request-list-item');
    existingItems.forEach(item => item.remove());
    
    if (this.interceptQueue.length === 0) {
      listEmpty.style.display = 'flex';
      listCount.textContent = '0 requests';
      return;
    }
    
    listEmpty.style.display = 'none';
    listCount.textContent = `${this.interceptQueue.length} request${this.interceptQueue.length !== 1 ? 's' : ''}`;
    
    // Render each request/response
    this.interceptQueue.forEach((item, index) => {
      const listItem = document.createElement('div');
      listItem.className = `request-list-item ${index === this.currentIndex ? 'active' : ''}`;
      listItem.dataset.index = index;
      
      const timeDiff = Date.now() - item.timestamp;
      const timeStr = timeDiff < 1000 ? 'just now' : `${Math.floor(timeDiff / 1000)}s ago`;
      
      const isResponse = item.type === 'response';
      const badge = isResponse 
        ? `<span class="request-item-method status-badge status-${Math.floor(item.statusCode / 100)}xx">${item.statusCode}</span>`
        : `<span class="request-item-method method-badge method-${item.method.toLowerCase()}">${item.method}</span>`;
      
      const typeIndicator = isResponse 
        ? `<span class="type-badge type-response">RES</span>` 
        : `<span class="type-badge type-request">REQ</span>`;
      
      listItem.innerHTML = `
        <div class="request-item-header">
          ${typeIndicator}
          ${badge}
          <span class="request-item-url" title="${this.escapeHtml(item.url)}">${this.truncateUrl(item.url)}</span>
        </div>
        <div class="request-item-meta">
          <span class="request-item-time">⏱ ${timeStr}</span>
        </div>
      `;
      
      listItem.addEventListener('click', () => {
        this.currentIndex = index;
        this.displayCurrent();
      });
      
      listContainer.appendChild(listItem);
    });
  },
  
  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      if (path.length > 50) {
        return path.substring(0, 47) + '...';
      }
      return path;
    } catch {
      return url.length > 50 ? url.substring(0, 47) + '...' : url;
    }
  },

  displayCurrent() {
    // Render the list
    this.renderRequestList();
    
    const request = this.interceptQueue[this.currentIndex];
    if (!request) {
      this.showEmptyState();
      return;
    }

    // Hide empty state, show editor
    document.getElementById('intercept-empty').style.display = 'none';
    document.getElementById('intercept-editor').style.display = 'block';

    const isResponse = request.type === 'response';
    console.log('[InterceptUI] Displaying:', isResponse ? 'response' : 'request', request.url);
    
    // Update request/response info
    const methodEl = document.getElementById('intercept-method');
    const urlEl = document.getElementById('intercept-url');
    const rawTextEl = document.getElementById('intercept-raw-text');
    
    if (methodEl) {
      if (isResponse) {
        methodEl.textContent = request.statusCode;
        methodEl.className = `method-badge status-badge status-${Math.floor(request.statusCode / 100)}xx`;
      } else {
        methodEl.textContent = request.method;
        methodEl.className = `method-badge method-${request.method.toLowerCase()}`;
      }
    }
    if (urlEl) {
      urlEl.textContent = request.url;
    }

    // Build raw request or response
    const rawData = isResponse ? this.buildRawResponse(request) : this.buildRawRequest(request);
    if (rawTextEl) {
      rawTextEl.value = rawData;
    }

    // Update headers list
    this.displayHeaders(request.headers || {});

    // Update params
    this.displayParams(request);

    // Update body
    const bodyTextEl = document.getElementById('intercept-body-text');
    if (bodyTextEl) {
      bodyTextEl.value = request.body || '';
    }

    // Enable action buttons
    const forwardBtn = document.getElementById('intercept-forward');
    const dropBtn = document.getElementById('intercept-drop');
    const forwardAllBtn = document.getElementById('intercept-forward-all');
    
    if (forwardBtn) forwardBtn.disabled = false;
    if (dropBtn) dropBtn.disabled = false;
    if (forwardAllBtn) forwardAllBtn.disabled = this.interceptQueue.length === 0;
    
    console.log('[InterceptUI] Request displayed successfully');
  },

  buildRawRequest(request) {
    const url = new URL(request.url);
    let raw = `${request.method} ${url.pathname}${url.search} HTTP/1.1\r\n`;
    raw += `Host: ${url.host}\r\n`;
    
    // Add headers
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (key.toLowerCase() !== 'host') {
          raw += `${key}: ${value}\r\n`;
        }
      }
    }
    
    raw += '\r\n';
    
    // Add body
    if (request.body) {
      raw += request.body;
    }
    
    return raw;
  },

  buildRawResponse(response) {
    let raw = `HTTP/1.1 ${response.statusCode} ${response.statusText || 'OK'}\r\n`;
    
    // Add headers
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        raw += `${key}: ${value}\r\n`;
      }
    }
    
    raw += '\r\n';
    
    // Add body
    if (response.body) {
      raw += response.body;
    }
    
    return raw;
  },

  displayHeaders(headers) {
    const container = document.getElementById('intercept-headers-list');
    container.innerHTML = '';
    
    for (const [key, value] of Object.entries(headers)) {
      const row = document.createElement('div');
      row.className = 'header-row';
      row.innerHTML = `
        <input type="text" class="header-key" value="${this.escapeHtml(key)}">
        <input type="text" class="header-value" value="${this.escapeHtml(value)}">
        <button class="btn-icon btn-remove" title="Remove">✕</button>
      `;
      container.appendChild(row);
    }

    // Add new header button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = '+ Add Header';
    addBtn.onclick = () => this.addHeader();
    container.appendChild(addBtn);
  },

  displayParams(request) {
    const container = document.getElementById('intercept-params-list');
    container.innerHTML = '';
    
    const url = new URL(request.url);
    const params = url.searchParams;
    
    params.forEach((value, key) => {
      const row = document.createElement('div');
      row.className = 'param-row';
      row.innerHTML = `
        <input type="text" class="param-key" value="${this.escapeHtml(key)}">
        <input type="text" class="param-value" value="${this.escapeHtml(value)}">
        <button class="btn-icon btn-remove" title="Remove">✕</button>
      `;
      container.appendChild(row);
    });

    // Add new param button
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-secondary';
    addBtn.textContent = '+ Add Parameter';
    addBtn.onclick = () => this.addParam();
    container.appendChild(addBtn);
  },

  addHeader() {
    const container = document.getElementById('intercept-headers-list');
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
      <input type="text" class="header-key" placeholder="Header name">
      <input type="text" class="header-value" placeholder="Header value">
      <button class="btn-icon btn-remove" title="Remove">✕</button>
    `;
    container.insertBefore(row, container.lastChild);
  },

  addParam() {
    const container = document.getElementById('intercept-params-list');
    const row = document.createElement('div');
    row.className = 'param-row';
    row.innerHTML = `
      <input type="text" class="param-key" placeholder="Parameter name">
      <input type="text" class="param-value" placeholder="Parameter value">
      <button class="btn-icon btn-remove" title="Remove">✕</button>
    `;
    container.insertBefore(row, container.lastChild);
  },

  switchEditorTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.editor-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.editorTab === tabName);
    });

    // Update panels
    document.querySelectorAll('.editor-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`intercept-${tabName}-editor`).classList.add('active');
  },

  forwardCurrent() {
    const request = this.interceptQueue[this.currentIndex];
    if (!request) return;

    // Get modified request from editor
    const modifiedRequest = this.getModifiedRequest();
    
    // Forward to background
    this.forwardRequest(modifiedRequest);

    // Remove from queue
    this.interceptQueue.splice(this.currentIndex, 1);

    // Show next or previous
    if (this.interceptQueue.length > 0) {
      if (this.currentIndex >= this.interceptQueue.length) {
        this.currentIndex = this.interceptQueue.length - 1;
      }
      this.displayCurrent();
    } else {
      this.showEmptyState();
    }

    this.updateUI();
  },

  getModifiedRequest() {
    const request = this.interceptQueue[this.currentIndex];
    
    // Parse raw request text
    const rawText = document.getElementById('intercept-raw-text').value;
    
    // Split by \r\n or \n (handle different line endings)
    const lines = rawText.split(/\r?\n/);
    
    // Parse first line (method, path, version)
    const [method, path] = lines[0].split(' ');
    
    // Parse headers
    const headers = {};
    let i = 1;
    for (; i < lines.length; i++) {
      if (lines[i] === '') break;
      const colonIndex = lines[i].indexOf(':');
      if (colonIndex > 0) {
        const key = lines[i].substring(0, colonIndex).trim();
        const value = lines[i].substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
    
    // Get body (join with \n since we split with \n)
    const body = lines.slice(i + 1).join('\n');
    
    // Reconstruct URL
    const url = new URL(request.url);
    const newUrl = `${url.protocol}//${headers['Host'] || url.host}${path}`;
    
    return {
      ...request,
      method,
      url: newUrl,
      headers,
      body: body || request.body,
      modified: true
    };
  },

  forwardRequest(request) {
    console.log('[InterceptUI] Forwarding request:', request.url);
    
    // Send to background to forward
    chrome.runtime.sendMessage({
      type: 'FORWARD_REQUEST',
      request: request
    });
  },

  sendToRepeater() {
    const request = this.interceptQueue[this.currentIndex];
    if (!request) return;

    console.log('[InterceptUI] Sending to Repeater:', request.url);

    // Get modified request from editor
    const modifiedRequest = this.getModifiedRequest();

    // Send to Repeater tab
    if (window.RepeaterUI && typeof window.RepeaterUI.loadRequest === 'function') {
      // Switch to Repeater tab
      document.querySelector('[data-tab="repeater"]')?.click();
      
      // Load request in Repeater
      setTimeout(() => {
        window.RepeaterUI.loadRequest({
          method: modifiedRequest.method,
          url: modifiedRequest.url,
          headers: modifiedRequest.headers,
          body: modifiedRequest.body || ''
        });
      }, 100);

      console.log('[InterceptUI] Request sent to Repeater');
    } else {
      console.error('[InterceptUI] RepeaterUI not available');
    }
  },

  dropCurrent() {
    const request = this.interceptQueue[this.currentIndex];
    if (!request) return;

    console.log('[InterceptUI] Dropping request:', request.url);

    // Notify background to drop
    chrome.runtime.sendMessage({
      type: 'DROP_REQUEST',
      requestId: request.id
    });

    // Remove from queue
    this.interceptQueue.splice(this.currentIndex, 1);

    // Show next or previous
    if (this.interceptQueue.length > 0) {
      if (this.currentIndex >= this.interceptQueue.length) {
        this.currentIndex = this.interceptQueue.length - 1;
      }
      this.displayCurrent();
    } else {
      this.showEmptyState();
    }

    this.updateUI();
  },

  forwardAll() {
    console.log('[InterceptUI] Forwarding all requests:', this.interceptQueue.length);
    
    // Forward all without modification
    this.interceptQueue.forEach(request => {
      this.forwardRequest(request);
    });

    // Clear queue
    this.interceptQueue = [];
    this.currentIndex = 0;
    
    // Update UI
    this.renderRequestList();
    this.showEmptyState();
    this.updateUI();
  },

  clearQueue() {
    if (this.interceptQueue.length === 0) return;
    
    if (confirm(`Clear ${this.interceptQueue.length} intercepted requests?`)) {
      this.interceptQueue = [];
      this.currentIndex = 0;
      this.showEmptyState();
      this.updateUI();
    }
  },

  clearDisplay() {
    // Clear the visual display without confirmation
    this.showEmptyState();
    this.renderRequestList();
  },

  navigatePrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.displayCurrent();
    }
  },

  navigateNext() {
    if (this.currentIndex < this.interceptQueue.length - 1) {
      this.currentIndex++;
      this.displayCurrent();
    }
  },

  showEmptyState() {
    document.getElementById('intercept-empty').style.display = 'flex';
    document.getElementById('intercept-editor').style.display = 'none';
    document.getElementById('intercept-forward').disabled = true;
    document.getElementById('intercept-drop').disabled = true;
    document.getElementById('intercept-forward-all').disabled = true;
  },

  updateUI() {
    const toggleBtn = document.getElementById('intercept-toggle');
    const statusText = document.getElementById('intercept-status-text');
    const queueCount = document.getElementById('intercept-queue-count');
    const icon = document.querySelector('.intercept-icon');

    if (this.isIntercepting) {
      toggleBtn.className = 'btn btn-success';
      statusText.textContent = 'Intercept is ON';
      icon.textContent = '🟢';
    } else {
      toggleBtn.className = 'btn btn-danger';
      statusText.textContent = 'Intercept is OFF';
      icon.textContent = '🔴';
    }

    queueCount.textContent = this.interceptQueue.length;
    
    // Update action buttons
    const hasItems = this.interceptQueue.length > 0;
    document.getElementById('intercept-forward-all').disabled = !hasItems;
    document.getElementById('intercept-send-to-repeater').disabled = !hasItems;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.InterceptUI = InterceptUI;
