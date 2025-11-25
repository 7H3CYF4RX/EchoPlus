/**
 * rep+ Request Replay
 * Send modified HTTP requests
 */

const RequestReplay = {
  // Send HTTP request
  async send(requestData) {
    const { method, url, headers, body } = requestData;

    try {
      const startTime = performance.now();
      
      const fetchOptions = {
        method: method,
        headers: this.prepareHeaders(headers),
        mode: 'cors',
        credentials: 'include',
        redirect: 'follow'
      };

      // Add body for appropriate methods
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);
      const endTime = performance.now();

      // Parse response
      const responseHeaders = this.parseResponseHeaders(response.headers);
      const responseBody = await response.text();

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        size: responseBody.length,
        time: Math.round(endTime - startTime),
        url: response.url,
        redirected: response.redirected
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  },

  // Prepare headers for fetch
  prepareHeaders(headers) {
    const prepared = {};
    
    // Filter out restricted headers
    const restrictedHeaders = [
      'host',
      'connection',
      'content-length',
      'expect',
      'origin',
      'referer',
      'user-agent'
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (!restrictedHeaders.includes(lowerKey)) {
        prepared[key] = value;
      }
    }

    return prepared;
  },

  // Parse response headers
  parseResponseHeaders(headers) {
    const parsed = {};
    headers.forEach((value, key) => {
      parsed[key] = value;
    });
    return parsed;
  },

  // Parse raw HTTP request
  parseRawRequest(rawRequest) {
    try {
      const lines = rawRequest.split('\n');
      
      // Parse request line
      const requestLine = lines[0].trim();
      const [method, path, protocol] = requestLine.split(' ');

      // Parse headers
      const headers = {};
      let i = 1;
      for (; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          i++;
          break;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      // Parse body
      const body = lines.slice(i).join('\n').trim();

      // Construct URL
      const host = headers['Host'] || headers['host'] || '';
      const scheme = headers['X-Forwarded-Proto'] || 'https';
      const url = `${scheme}://${host}${path}`;

      return {
        method,
        url,
        path,
        protocol,
        headers,
        body
      };
    } catch (e) {
      console.error('Parse raw request error:', e);
      return null;
    }
  },

  // Build raw HTTP request
  buildRawRequest(method, url, headers, body) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      const host = urlObj.host;

      let raw = `${method} ${path} HTTP/1.1\n`;
      raw += `Host: ${host}\n`;

      // Add headers if provided
      if (headers && typeof headers === 'object') {
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() !== 'host') {
            raw += `${key}: ${value}\n`;
          }
        }
      }

      raw += '\n';
      if (body) {
        raw += body;
      }

      return raw;
    } catch (e) {
      console.error('Build raw request error:', e);
      return null;
    }
  }
};

window.RequestReplay = RequestReplay;
