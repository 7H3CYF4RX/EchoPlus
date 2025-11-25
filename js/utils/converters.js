/**
 * rep+ Converters
 * Base64, URL, JWT, Hex encoding/decoding
 */

const Converters = {
  // Base64 Encode
  base64Encode(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      console.error('Base64 encode error:', e);
      return null;
    }
  },

  // Base64 Decode
  base64Decode(str) {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch (e) {
      console.error('Base64 decode error:', e);
      return null;
    }
  },

  // URL Encode
  urlEncode(str) {
    try {
      return encodeURIComponent(str);
    } catch (e) {
      console.error('URL encode error:', e);
      return null;
    }
  },

  // URL Decode
  urlDecode(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      console.error('URL decode error:', e);
      return null;
    }
  },

  // JWT Decode
  jwtDecode(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const header = JSON.parse(this.base64Decode(parts[0]));
      const payload = JSON.parse(this.base64Decode(parts[1]));

      return {
        header,
        payload,
        signature: parts[2]
      };
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  },

  // Hex Encode
  hexEncode(str) {
    try {
      return Array.from(str)
        .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      console.error('Hex encode error:', e);
      return null;
    }
  },

  // Hex Decode
  hexDecode(hex) {
    try {
      const hexStr = hex.replace(/\s/g, '');
      let str = '';
      for (let i = 0; i < hexStr.length; i += 2) {
        str += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
      }
      return str;
    } catch (e) {
      console.error('Hex decode error:', e);
      return null;
    }
  },

  // Convert selection based on menu action
  convert(action, text) {
    switch (action) {
      case 'base64-encode':
        return this.base64Encode(text);
      case 'base64-decode':
        return this.base64Decode(text);
      case 'url-encode':
        return this.urlEncode(text);
      case 'url-decode':
        return this.urlDecode(text);
      case 'jwt-decode':
        const decoded = this.jwtDecode(text);
        return decoded ? JSON.stringify(decoded, null, 2) : null;
      case 'hex-encode':
        return this.hexEncode(text);
      case 'hex-decode':
        return this.hexDecode(text);
      default:
        return null;
    }
  }
};

// Export for use in other modules
window.Converters = Converters;
