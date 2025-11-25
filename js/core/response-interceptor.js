/**
 * rep+ Response Interceptor
 * Real-time response interception and modification using Chrome Debugger API
 */

const ResponseInterceptor = {
  isActive: false,
  tabId: null,
  interceptQueue: new Map(), // Store responses waiting for modification
  modifiedResponses: new Map(), // Store modified response bodies
  rules: [],

  async start(tabId) {
    if (this.isActive) return;
    
    this.tabId = tabId;
    
    try {
      // Attach debugger to the tab
      await chrome.debugger.attach({ tabId }, '1.3');
      
      // Enable Network domain
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
      
      // Enable Fetch domain for request interception
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
        patterns: [{ urlPattern: '*' }]
      });
      
      // Listen for network events
      chrome.debugger.onEvent.addListener(this.handleDebuggerEvent.bind(this));
      
      this.isActive = true;
      
      return true;
    } catch (error) {
      console.error('Failed to start response interceptor:', error);
      throw error;
    }
  },

  async stop() {
    if (!this.isActive || !this.tabId) return;
    
    try {
      await chrome.debugger.detach({ tabId: this.tabId });
      this.isActive = false;
      this.tabId = null;
      this.interceptQueue.clear();
      this.modifiedResponses.clear();
    } catch (error) {
      console.error('Failed to stop response interceptor:', error);
    }
  },

  handleDebuggerEvent(source, method, params) {
    if (source.tabId !== this.tabId) return;

    switch (method) {
      case 'Fetch.requestPaused':
        this.handleRequestPaused(params);
        break;
      
      case 'Network.responseReceived':
        this.handleResponseReceived(params);
        break;
    }
  },

  async handleRequestPaused(params) {
    const { requestId, request, responseStatusCode, responseHeaders } = params;
    
    // If this is a response (has status code), check if we should intercept it
    if (responseStatusCode) {
      const shouldIntercept = this.shouldInterceptUrl(request.url);
      
      if (shouldIntercept) {
        // Check if we have a modified response for this URL
        const modifiedBody = this.modifiedResponses.get(request.url);
        
        if (modifiedBody) {
          // Send modified response
          try {
            await chrome.debugger.sendCommand(
              { tabId: this.tabId },
              'Fetch.fulfillRequest',
              {
                requestId: requestId,
                responseCode: responseStatusCode,
                responseHeaders: responseHeaders,
                body: btoa(modifiedBody) // Base64 encode
              }
            );
            
            
            // Notify UI
            this.notifyModified(request.url, modifiedBody);
            
            // Clear the modified response after use
            this.modifiedResponses.delete(request.url);
            return;
          } catch (error) {
            console.error('Failed to fulfill modified request:', error);
          }
        } else {
          // Store in queue for potential modification
          this.interceptQueue.set(requestId, {
            request,
            responseStatusCode,
            responseHeaders,
            requestId
          });
          
          // Get response body
          try {
            const body = await chrome.debugger.sendCommand(
              { tabId: this.tabId },
              'Fetch.getResponseBody',
              { requestId }
            );
            
            // Notify UI that response is available for modification
            this.notifyIntercepted({
              requestId,
              url: request.url,
              method: request.method,
              status: responseStatusCode,
              headers: responseHeaders,
              body: body.base64Encoded ? atob(body.body) : body.body
            });
            
            // Continue with original response for now
            await chrome.debugger.sendCommand(
              { tabId: this.tabId },
              'Fetch.continueRequest',
              { requestId }
            );
            
          } catch (error) {
            console.error('Failed to get response body:', error);
            // Continue anyway
            await chrome.debugger.sendCommand(
              { tabId: this.tabId },
              'Fetch.continueRequest',
              { requestId }
            );
          }
        }
      } else {
        // Not intercepting, continue normally
        await chrome.debugger.sendCommand(
          { tabId: this.tabId },
          'Fetch.continueRequest',
          { requestId }
        );
      }
    } else {
      // This is a request, not a response, continue normally
      await chrome.debugger.sendCommand(
        { tabId: this.tabId },
        'Fetch.continueRequest',
        { requestId }
      );
    }
  },

  handleResponseReceived(params) {
    // Additional handling for response received events if needed
  },

  shouldInterceptUrl(url) {
    if (this.rules.length === 0) return false;
    
    return this.rules.some(rule => {
      if (!rule.enabled) return false;
      
      try {
        const pattern = new RegExp(rule.pattern.replace(/\*/g, '.*'));
        return pattern.test(url);
      } catch (e) {
        return false;
      }
    });
  },

  setRules(rules) {
    this.rules = rules;
  },

  // Queue a modified response to be sent on next request
  queueModifiedResponse(url, modifiedBody) {
    this.modifiedResponses.set(url, modifiedBody);
  },

  notifyIntercepted(data) {
    // Send message to UI
    window.postMessage({
      type: 'RESPONSE_INTERCEPTED',
      data: data
    }, '*');
  },

  notifyModified(url, body) {
    window.postMessage({
      type: 'RESPONSE_MODIFIED',
      data: { url, body }
    }, '*');
  }
};

window.ResponseInterceptor = ResponseInterceptor;
