/**
 * rep+ Background Service Worker
 * Handles context menus, request interception, and communication
 */

// Store debugger attached tabs
const attachedTabs = new Set();

// Store response modifications
let responseModifications = {};

// Request Interception State
let interceptEnabled = false;
let interceptOptions = {
  interceptRequests: true,
  interceptResponses: false,
  scopeFilter: 'all'
};
const pendingRequests = new Map(); // requestId -> request details
let requestIdCounter = 0;

// Load modifications from storage
chrome.storage.local.get(['responseModifications'], (result) => {
  if (result.responseModifications) {
    responseModifications = result.responseModifications;
    console.log('[Background] Loaded response modifications:', Object.keys(responseModifications).length);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.responseModifications) {
    responseModifications = changes.responseModifications.newValue || {};
    console.log('[Background] Response modifications updated:', Object.keys(responseModifications).length);
  }
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// Create context menus for converters and AI
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Converters submenu
    chrome.contextMenus.create({
      id: 'rep-plus-converters',
      title: 'rep+ Converters',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'base64-encode',
      parentId: 'rep-plus-converters',
      title: 'Base64 Encode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'base64-decode',
      parentId: 'rep-plus-converters',
      title: 'Base64 Decode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'url-encode',
      parentId: 'rep-plus-converters',
      title: 'URL Encode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'url-decode',
      parentId: 'rep-plus-converters',
      title: 'URL Decode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'jwt-decode',
      parentId: 'rep-plus-converters',
      title: 'JWT Decode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'hex-encode',
      parentId: 'rep-plus-converters',
      title: 'Hex Encode',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'hex-decode',
      parentId: 'rep-plus-converters',
      title: 'Hex Decode',
      contexts: ['selection']
    });

    // AI submenu
    chrome.contextMenus.create({
      id: 'rep-plus-ai',
      title: 'rep+ AI',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'ai-explain',
      parentId: 'rep-plus-ai',
      title: 'Explain with AI',
      contexts: ['selection']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  
  // Send message to DevTools panel
  chrome.runtime.sendMessage({
    action: 'contextMenuClicked',
    menuItemId: info.menuItemId,
    selectedText: selectedText
  });
});

// Listen for messages from DevTools panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // Handle Ollama API requests (bypass CORS)
  if (message.type === 'OLLAMA_REQUEST') {
    handleOllamaRequest(message.data)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('[Background] Ollama error:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  // Handle Ollama models list request
  if (message.type === 'OLLAMA_MODELS') {
    handleOllamaModels(message.data)
      .then(models => {
        sendResponse({ success: true, models });
      })
      .catch(error => {
        console.error('[Background] Models error:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  // Handle debugger attachment
  if (message.action === 'attachDebugger') {
    attachDebugger(message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle debugger detachment
  if (message.action === 'detachDebugger') {
    detachDebugger(message.tabId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle HTTP requests
  if (message.action === 'makeRequest') {
    makeRequest(message.request)
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Handle intercept toggle
  if (message.type === 'TOGGLE_INTERCEPT') {
    interceptEnabled = message.enabled;
    interceptOptions = message.options || interceptOptions;
    console.log('[Background] Intercept toggled:', interceptEnabled ? 'ON' : 'OFF');
    
    if (interceptEnabled && message.tabId) {
      // Attach debugger and enable Fetch domain
      attachDebugger(message.tabId)
        .then(() => {
          console.log('[Background] Debugger attached successfully');
          sendResponse({ success: true, enabled: interceptEnabled });
        })
        .catch(err => {
          console.error('[Background] Failed to attach debugger:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async response
    } else if (!interceptEnabled && message.tabId) {
      // Disable Fetch domain and detach debugger
      disableInterception(message.tabId)
        .then(() => {
          console.log('[Background] Interception disabled successfully');
          sendResponse({ success: true, enabled: interceptEnabled });
        })
        .catch(err => {
          console.error('[Background] Failed to disable interception:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async response
    }
    
    sendResponse({ success: true, enabled: interceptEnabled });
    return false;
  }
  
  // Handle update intercept options
  if (message.type === 'UPDATE_INTERCEPT_OPTIONS') {
    interceptOptions = message.options || interceptOptions;
    console.log('[Background] Intercept options updated:', interceptOptions);
    sendResponse({ success: true });
    return false;
  }
  
  // Handle forward request
  if (message.type === 'FORWARD_REQUEST') {
    forwardInterceptedRequest(message.request);
    sendResponse({ success: true });
    return false;
  }
  
  // Handle drop request
  if (message.type === 'DROP_REQUEST') {
    dropInterceptedRequest(message.requestId);
    sendResponse({ success: true });
    return false;
  }
  
  // Default response for unknown messages
  sendResponse({ received: true });
  return false;
});

// Attach debugger to tab for request interception
async function attachDebugger(tabId) {
  if (attachedTabs.has(tabId)) {
    return;
  }

  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable');
    
    // Enable Fetch domain for request and response interception
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
      patterns: [
        {
          urlPattern: '*',
          requestStage: 'Request'
        },
        {
          urlPattern: '*',
          requestStage: 'Response'
        }
      ],
      handleAuthRequests: false
    });
    
    attachedTabs.add(tabId);
    console.log('[Background] Debugger attached to tab:', tabId);
  } catch (error) {
    console.error('Failed to attach debugger:', error);
    throw error;
  }
}

// Disable interception and detach debugger
async function disableInterception(tabId) {
  if (!attachedTabs.has(tabId)) {
    return;
  }

  try {
    // Disable Fetch domain first
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.disable');
    console.log('[Background] Fetch domain disabled');
    
    // Then detach debugger
    await chrome.debugger.detach({ tabId });
    attachedTabs.delete(tabId);
    console.log('[Background] Debugger detached from tab:', tabId);
  } catch (error) {
    console.error('Failed to disable interception:', error);
    throw error;
  }
}

// Detach debugger from tab
async function detachDebugger(tabId) {
  if (!attachedTabs.has(tabId)) {
    return;
  }

  try {
    await chrome.debugger.detach({ tabId });
    attachedTabs.delete(tabId);
  } catch (error) {
    console.error('Failed to detach debugger:', error);
    throw error;
  }
}

// Make HTTP request using fetch
async function makeRequest(requestData) {
  const { method, url, headers, body } = requestData;

  const fetchOptions = {
    method: method,
    headers: headers || {},
    mode: 'cors',
    credentials: 'include'
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = body;
  }

  try {
    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    const endTime = Date.now();

    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = await response.text();

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      time: endTime - startTime,
      size: responseBody.length
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}

// Handle Ollama API requests through background script (no CORS restrictions)
async function handleOllamaRequest(data) {
  const { endpoint, model, prompt, stream } = data;
  
  
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false // Simplified for now
      })
    });
    
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Ollama error response:', errorText);
      throw new Error(`Ollama returned ${response.status}: ${errorText || response.statusText}`);
    }
    
    const result = await response.json();
    
    return result.response || '';
  } catch (error) {
    console.error('[Background] Ollama request failed:', error);
    throw error;
  }
}

// Handle Ollama models list request
async function handleOllamaModels(data) {
  const { endpoint } = data;
  
  
  try {
    const response = await fetch(`${endpoint}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const result = await response.json();
    
    return result.models || [];
  } catch (error) {
    console.error('[Background] Failed to fetch models:', error);
    throw error;
  }
}

// Handle debugger detach
chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId) {
    attachedTabs.delete(source.tabId);
  }
});

// Listen for debugger events
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestWillBeSent' || 
      method === 'Network.responseReceived' ||
      method === 'Network.loadingFinished') {
    
    // Forward network events to DevTools panel
    chrome.runtime.sendMessage({
      action: 'debuggerEvent',
      tabId: source.tabId,
      method: method,
      params: params
    });
  }
  
  // Handle request and response interception with Fetch API
  if (interceptEnabled && method === 'Fetch.requestPaused') {
    console.log('[Background] Fetch.requestPaused event:', {
      hasResponseStatusCode: params.responseStatusCode !== undefined,
      hasResponseHeaders: !!params.responseHeaders,
      hasResponseErrorReason: !!params.responseErrorReason,
      hasNetworkId: !!params.networkId,
      requestStage: params.request ? 'has request object' : 'no request object',
      url: params.request?.url,
      allKeys: Object.keys(params)
    });
    
    // Check if it's a request or response
    // Response stage has responseStatusCode or responseHeaders
    if (params.responseStatusCode !== undefined || params.responseHeaders || params.responseErrorReason) {
      // This is a response
      console.log('[Background] ✅ Detected as RESPONSE');
      handleResponseInterception(source.tabId, params);
    } else {
      // This is a request
      console.log('[Background] ➡️ Detected as REQUEST');
      handleRequestInterception(source.tabId, params);
    }
  }
});

// Handle response interception
async function handleResponseInterception(tabId, params) {
  console.log('[Background] handleResponseInterception called:', {
    interceptResponses: interceptOptions.interceptResponses,
    url: params.request?.url,
    statusCode: params.responseStatusCode
  });
  
  if (!interceptOptions.interceptResponses) {
    // Not intercepting responses, just continue
    console.log('[Background] Response interception disabled, continuing...');
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: params.requestId
      });
    } catch (err) {
      console.error('[Background] Failed to continue response:', err);
    }
    return;
  }
  
  console.log('[Background] ✅ Intercepting response!');
  
  const responseId = `res_${requestIdCounter++}`;
  
  // Convert headers array to object
  const headersObj = {};
  if (params.responseHeaders) {
    if (Array.isArray(params.responseHeaders)) {
      for (const header of params.responseHeaders) {
        headersObj[header.name] = header.value;
      }
    } else if (typeof params.responseHeaders === 'object') {
      Object.assign(headersObj, params.responseHeaders);
    }
  }
  
  // Get response body if available
  let responseBody = '';
  try {
    const bodyResult = await chrome.debugger.sendCommand(
      { tabId },
      'Fetch.getResponseBody',
      { requestId: params.requestId }
    );
    responseBody = bodyResult.base64Encoded 
      ? atob(bodyResult.body) 
      : bodyResult.body;
  } catch (err) {
    console.log('[Background] Could not get response body:', err.message);
  }
  
  // Store response details
  const interceptedResponse = {
    id: responseId,
    type: 'response',
    tabId: tabId,
    fetchRequestId: params.requestId,
    method: params.request?.method || 'GET',
    url: params.request?.url || params.responseUrl || 'unknown',
    statusCode: params.responseStatusCode,
    statusText: params.responseStatusText || '',
    headers: headersObj,
    body: responseBody,
    timestamp: Date.now()
  };
  
  pendingRequests.set(responseId, interceptedResponse);
  
  // Send to DevTools panel
  try {
    chrome.runtime.sendMessage({
      type: 'RESPONSE_INTERCEPTED',
      data: interceptedResponse
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('[Background] Panel not open, response queued');
      }
    });
  } catch (err) {
    console.log('[Background] Could not send to panel:', err.message);
  }
  
  console.log('[Background] Response intercepted and paused:', interceptedResponse.url);
}

// Handle request interception
async function handleRequestInterception(tabId, params) {
  if (!interceptOptions.interceptRequests) {
    // Not intercepting, just continue the request
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: params.requestId
      });
    } catch (err) {
      console.error('[Background] Failed to continue request:', err);
    }
    return;
  }
  
  const request = params.request;
  const requestId = `req_${requestIdCounter++}`;
  
  // Convert headers to object (handle both array and object formats)
  const headersObj = {};
  if (request.headers) {
    if (Array.isArray(request.headers)) {
      // Headers as array
      for (const header of request.headers) {
        headersObj[header.name] = header.value;
      }
    } else if (typeof request.headers === 'object') {
      // Headers already as object
      Object.assign(headersObj, request.headers);
    }
  }
  
  // Store request details with Fetch request ID
  const interceptedRequest = {
    id: requestId,
    tabId: tabId,
    networkRequestId: params.networkId,
    fetchRequestId: params.requestId, // Fetch API request ID - IMPORTANT for continuing
    method: request.method,
    url: request.url,
    headers: headersObj,
    body: request.postData || params.postData,
    timestamp: Date.now()
  };
  
  pendingRequests.set(requestId, interceptedRequest);
  
  // Send to DevTools panel
  try {
    chrome.runtime.sendMessage({
      type: 'REQUEST_INTERCEPTED',
      data: interceptedRequest
    }, (response) => {
      // Response received
      if (chrome.runtime.lastError) {
        console.log('[Background] Panel not open, request queued');
      }
    });
  } catch (err) {
    console.log('[Background] Could not send to panel:', err.message);
  }
  
  console.log('[Background] Request intercepted and paused:', request.url);
  
  // DO NOT continue the request here - it will be continued when user clicks Forward
  // The request is now paused and waiting for user action
}

// Handle forward request or response
async function forwardInterceptedRequest(request) {
  console.log('[Background] Forwarding:', request.type || 'request', request.url);
  
  // Remove from pending
  pendingRequests.delete(request.id);
  
  if (!request.tabId || !request.fetchRequestId) {
    console.error('[Background] Missing tabId or fetchRequestId');
    return;
  }
  
  // Check if debugger is still attached
  if (!attachedTabs.has(request.tabId)) {
    console.error('[Background] Debugger is not attached to tab:', request.tabId);
    return;
  }
  
  try {
    if (request.type === 'response') {
      // For responses, always just continue without modification for now
      // Modifying responses requires proper base64 encoding which is complex
      await chrome.debugger.sendCommand(
        { tabId: request.tabId },
        'Fetch.continueRequest',
        {
          requestId: request.fetchRequestId
        }
      );
      console.log('[Background] Response forwarded');
    } else {
      // Forward request using Fetch.continueRequest
      if (request.modified) {
        // Continue with modifications
        const params = {
          requestId: request.fetchRequestId,
          url: request.url,
          method: request.method,
          headers: convertHeadersToArray(request.headers)
        };
        
        // Only add postData if it exists and is not empty
        if (request.body && request.body.trim()) {
          params.postData = request.body;
        }
        
        await chrome.debugger.sendCommand(
          { tabId: request.tabId },
          'Fetch.continueRequest',
          params
        );
        console.log('[Background] Request forwarded with modifications');
      } else {
        // Continue without modifications
        await chrome.debugger.sendCommand(
          { tabId: request.tabId },
          'Fetch.continueRequest',
          {
            requestId: request.fetchRequestId
          }
        );
        console.log('[Background] Request forwarded without modifications');
      }
    }
  } catch (err) {
    console.error('[Background] Failed to forward:', err);
  }
}

// Handle drop request
async function dropInterceptedRequest(requestId) {
  const request = pendingRequests.get(requestId);
  if (!request) return;
  
  console.log('[Background] Dropping request:', request.url);
  
  // Use Chrome Debugger API to fail the request
  if (request.tabId && request.fetchRequestId) {
    try {
      await chrome.debugger.sendCommand(
        { tabId: request.tabId },
        'Fetch.failRequest',
        {
          requestId: request.fetchRequestId,
          errorReason: 'BlockedByClient'
        }
      );
      console.log('[Background] Request dropped successfully');
    } catch (err) {
      console.error('[Background] Failed to drop request:', err);
    }
  }
  
  pendingRequests.delete(requestId);
}

// Convert headers object to array format for Chrome Debugger API
function convertHeadersToArray(headers) {
  // Filter out forbidden headers that Chrome won't allow
  const forbiddenHeaders = ['host', 'content-length'];
  
  const headerArray = [];
  for (const [name, value] of Object.entries(headers)) {
    if (!forbiddenHeaders.includes(name.toLowerCase())) {
      headerArray.push({ name, value });
    }
  }
  return headerArray;
}
