/**
 * rep+ Request Capture
 * Capture HTTP requests from Chrome DevTools Network panel
 */

const RequestCapture = {
  isCapturing: false,
  capturedRequests: [],
  requestMap: new Map(),
  listeners: [],

  // Start capturing requests
  start() {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.setupNetworkListener();
  },

  // Stop capturing
  stop() {
    this.isCapturing = false;
  },

  // Setup network listener via Chrome DevTools API
  setupNetworkListener() {
    // Check if DevTools API is available
    if (typeof chrome === 'undefined' || !chrome.devtools || !chrome.devtools.network) {
      console.error('[RequestCapture] Chrome DevTools API not available');
      console.error('[RequestCapture] chrome:', typeof chrome);
      console.error('[RequestCapture] chrome.devtools:', chrome?.devtools);
      console.error('[RequestCapture] chrome.devtools.network:', chrome?.devtools?.network);
      return;
    }

    console.log('[RequestCapture] Setting up network listener');

    try {
      chrome.devtools.network.onRequestFinished.addListener((request) => {
        console.log('[RequestCapture] Request captured:', request.request.url);
        this.handleRequest(request);
      });

      console.log('[RequestCapture] Network listener attached successfully');
    } catch (error) {
      console.error('[RequestCapture] Failed to attach network listener:', error);
    }
  },

  // Handle captured request
  async handleRequest(request) {
    try {
      console.log('[RequestCapture] Handling request:', {
        url: request.request?.url,
        method: request.request?.method,
        type: request._resourceType,
        fromCache: request.fromCache,
        status: request.response?.status,
        responseSize: request.response?.bodySize
      });
      
      if (!request || !request.request) {
        console.error('[RequestCapture] Invalid request object:', request);
        return;
      }
      
      if (this.shouldIgnoreRequest(request)) {
        console.log('[RequestCapture] Request ignored by filter:', request.request.url);
        return;
      }

      console.log('[RequestCapture] Processing request:', request.request.url);
      const parsedRequest = await this.parseRequest(request);
      
      if (!parsedRequest) {
        console.error('[RequestCapture] Failed to parse request:', request.request.url);
        return;
      }

      const requestId = this.generateId();
      const timestamp = Date.now();
      
      const requestData = {
        id: requestId,
        timestamp,
        ...parsedRequest,
        starred: false,
        notes: ''
      };

      console.log('[RequestCapture] Adding request to storage:', {
        id: requestId,
        url: requestData.url,
        method: requestData.method,
        status: requestData.response?.status
      });
      
      this.capturedRequests.unshift(requestData);
      this.requestMap.set(requestId, requestData);
      
      this.notifyListeners('requestCaptured', requestData);
      
    } catch (error) {
      console.error('[RequestCapture] Error handling request:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  },

  // Parse request from DevTools format
  async parseRequest(request) {
    const reqId = this.generateId();
    const url = new URL(request.request.url);
    
    // Get request body
    let requestBody = '';
    if (request.request.postData) {
      requestBody = request.request.postData.text || '';
    }

    // Get response body
    let responseBody = '';
    let responseSize = 0;
    try {
      const content = await this.getResponseBody(request);
      responseBody = content.body || '';
      responseSize = content.size || 0;
      console.log('[RequestCapture] Response body retrieved:', {
        url: request.request.url,
        bodyLength: responseBody.length,
        size: responseSize,
        encoding: content.encoding
      });
    } catch (e) {
      console.error('[RequestCapture] Get response body error:', e);
    }

    return {
      id: reqId,
      url: request.request.url,
      method: request.request.method,
      path: url.pathname + url.search,
      host: url.host,
      protocol: url.protocol,
      headers: this.parseHeaders(request.request.headers),
      body: requestBody,
      response: {
        status: request.response.status,
        statusText: request.response.statusText,
        headers: this.parseHeaders(request.response.headers),
        body: responseBody,
        size: responseSize,
        time: request.time,
        mimeType: request.response.content.mimeType
      },
      timestamp: Date.now(),
      starred: false
    };
  },

  // Get response body content
  getResponseBody(request) {
    return new Promise((resolve) => {
      try {
        request.getContent((content, encoding) => {
          resolve({
            body: content || '',
            encoding: encoding,
            size: content ? content.length : 0
          });
        });
      } catch (e) {
        resolve({ body: '', size: 0 });
      }
    });
  },

  // Parse headers array to object
  parseHeaders(headersArray) {
    const headers = {};
    headersArray.forEach(header => {
      headers[header.name] = header.value;
    });
    return headers;
  },

  // Check if request should be ignored
  shouldIgnoreRequest(request) {
    if (!request || !request.request) {
      console.log('[RequestCapture] Ignoring invalid request object:', request);
      return true;
    }
    
    const url = request.request.url || '';
    const requestType = request._resourceType || 'unknown';
    const method = request.request.method || 'GET';
    
    // Log all requests for debugging
    console.log('[RequestCapture] Checking request:', {
      url,
      method,
      type: requestType,
      status: request.response?.status,
      fromCache: request.fromCache
    });
    
    // Ignore extension URLs and browser internal requests
    const ignoredPrefixes = [
      'chrome-extension://', 
      'chrome://', 
      'edge://', 
      'about:',
      'data:',
      'blob:',
      'devtools://',
      'ws://',
      'wss://',
      'safari-extension://',
      'moz-extension://',
      'safari-web-extension://',
      'ms-browser-extension://'
    ];
    
    if (ignoredPrefixes.some(prefix => url.startsWith(prefix))) {
      console.log(`[RequestCapture] Ignoring ${requestType} request (${method}): ${url} - Matched ignored prefix`);
      return true;
    }
    
    // Check scope settings if available
    if (window.ScopeSettings && window.ScopeSettings.scopeRules.length > 0) {
      const inScope = window.ScopeSettings.isInScope(url);
      if (!inScope) {
        console.log(`[RequestCapture] Ignoring out-of-scope request: ${url}`);
        return true;
      }
    }
    
    // Only ignore truly static assets (images, fonts, media)
    // Don't ignore .js files as they might be API endpoints
    if (method === 'GET') {
      const staticExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.mp4', '.webm', '.mp3', '.wav', '.ogg'
      ];
      
      // Only ignore if URL ends with these extensions (not just contains)
      const urlLower = url.toLowerCase();
      const urlWithoutQuery = urlLower.split('?')[0];
      if (staticExtensions.some(ext => urlWithoutQuery.endsWith(ext))) {
        console.log(`[RequestCapture] Ignoring static resource: ${url}`);
        return true;
      }
    }
    
    // Don't ignore by default
    console.log(`[RequestCapture] Accepting ${requestType} request (${method}): ${url}`);
    return false;
  },

  // Generate unique ID
  generateId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Add listener
  addListener(callback) {
    this.listeners.push(callback);
  },

  // Notify listeners
  notifyListeners(event, data) {
    console.log(`[RequestCapture] Notifying ${this.listeners.length} listeners for event:`, event, {
      url: data?.url,
      method: data?.method,
      status: data?.response?.status,
      requestId: data?.id
    });
    
    if (this.listeners.length === 0) {
      console.warn('[RequestCapture] No listeners registered!');
    }
    
    for (let i = 0; i < this.listeners.length; i++) {
      const listener = this.listeners[i];
      console.log(`[RequestCapture] Notifying listener #${i}...`);
      try {
        listener(event, data);
        console.log(`[RequestCapture] Listener #${i} notified successfully`);
      } catch (error) {
        console.error(`[RequestCapture] Error in listener #${i}:`, error);
        console.error('Listener error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    }
    
    console.log('[RequestCapture] Finished notifying all listeners');
  },

  // Get all captured requests
  getRequests() {
    return this.capturedRequests;
  },

  // Clear all captured requests
  clear() {
    this.capturedRequests = [];
    this.requestMap.clear();
    this.notifyListeners('requestsCleared');
  },

  // Sanitize input
  sanitizeInput(str) {
    return String(str)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Build safe request
  buildSafeRequest(request) {
    return {
      ...request,
      url: this.sanitizeInput(request.url),
      method: this.sanitizeInput(request.method),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([k,v]) => 
          [this.sanitizeInput(k), this.sanitizeInput(v)])
      )
    };
  }
};

window.RequestCapture = RequestCapture;
