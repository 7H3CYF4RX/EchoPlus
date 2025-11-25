# 🚦 EchoPlus Request Intercept System

## Overview
A complete request interception system similar to Burp Suite's Proxy/Intercept feature. Capture, modify, and forward HTTP requests in real-time.

## Features

### ✅ Core Functionality
- **Live Request Interception**: Capture requests before they reach the server
- **Request Modification**: Edit method, URL, headers, parameters, and body
- **Queue Management**: Handle multiple intercepted requests
- **Forward/Drop Control**: Choose to forward modified requests or drop them
- **Scope Filtering**: Intercept only in-scope, out-of-scope, or all requests
- **Response Interception**: Optional response interception (future enhancement)

### 🎯 UI Components

#### 1. **Intercept Header**
- **Toggle Button**: Turn interception ON/OFF (🟢 Green = ON, 🔴 Red = OFF)
- **Queue Counter**: Shows number of pending requests
- **Action Buttons**:
  - `Forward` - Send current request (with modifications)
  - `Drop` - Block current request
  - `Send to Repeater` - Transfer request to Repeater tab for analysis
  - `Forward All` - Send all queued requests
  - `Clear Queue` - Empty the queue

#### 2. **Intercept Options**
- **Intercept Requests**: Toggle request interception
- **Intercept Responses**: Toggle response interception
- **Scope Filter**: Choose All/In-Scope/Out-of-Scope

#### 3. **Request Editor**
Four editing modes:
- **Raw**: Full HTTP request in raw format
- **Headers**: Key-value editor for headers
- **Params**: URL parameter editor
- **Body**: Request body editor

#### 4. **Navigation**
- Previous/Next buttons to navigate through queued requests
- Position indicator (e.g., "1 / 5")

## How It Works

### Architecture

```
Browser Request → Chrome Debugger API → Background Script → DevTools Panel
                                              ↓
                                        Intercept Queue
                                              ↓
                                    User Modifies Request
                                              ↓
                                    Forward or Drop Decision
                                              ↓
                                    Continue to Server / Block
```

### Files

1. **`panel.html`** (lines 61-164)
   - Intercept tab UI structure
   - Controls, editors, and empty state

2. **`js/ui/intercept.js`**
   - UI logic and event handlers
   - Queue management
   - Request parsing and modification
   - Communication with background script

3. **`background.js`** (updated)
   - Request interception via Chrome Debugger API
   - State management (enabled/disabled, options)
   - Forward/drop request handling
   - Message passing between panel and background

4. **`styles/intercept.css`**
   - Professional styling for all intercept components
   - Responsive layout
   - Button states and animations

5. **`panel.js`** (updated)
   - Initializes `InterceptUI.init()`

## Usage Guide

### Basic Workflow

1. **Enable Interception**
   - Click the "Intercept is OFF" button
   - Button turns green: "Intercept is ON"

2. **Browse Target Application**
   - Navigate to your target website
   - Requests will be captured automatically

3. **Modify Request**
   - View intercepted request in the editor
   - Switch between Raw/Headers/Params/Body tabs
   - Make your modifications

4. **Forward or Drop**
   - Click "Forward" to send the modified request
   - Click "Drop" to block the request
   - Use navigation arrows for multiple requests

### Advanced Features

#### Scope Filtering
```javascript
// Set in Intercept Options
- All Requests: Intercept everything
- In-Scope Only: Only URLs matching scope settings
- Out-of-Scope Only: Only URLs outside scope
```

#### Queue Management
- Multiple requests queue up automatically
- Navigate with ◀ ▶ buttons
- "Forward All" to clear queue quickly
- "Clear Queue" to discard all pending

#### Request Modification Examples

**Change Method:**
```http
GET /api/user → POST /api/user
```

**Add Header:**
```http
X-Custom-Header: value
```

**Modify Parameter:**
```
?id=1 → ?id=2
```

**Edit Body:**
```json
{"role": "user"} → {"role": "admin"}
```

## Technical Details

### Chrome Debugger API Integration

The system uses Chrome's Debugger API for request interception:

```javascript
// Enable interception
chrome.debugger.attach({ tabId }, '1.3');
chrome.debugger.sendCommand({ tabId }, 'Network.enable');
chrome.debugger.sendCommand({ tabId }, 'Fetch.enable');

// Listen for requests
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.requestWillBeSent') {
    // Intercept request
  }
});

// Modify and continue
chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
  requestId: id,
  url: modifiedUrl,
  method: modifiedMethod,
  headers: modifiedHeaders,
  postData: modifiedBody
});

// Or drop
chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
  requestId: id,
  errorReason: 'BlockedByClient'
});
```

### Message Flow

```javascript
// Panel → Background
chrome.runtime.sendMessage({
  type: 'TOGGLE_INTERCEPT',
  enabled: true,
  options: { ... }
});

// Background → Panel
chrome.runtime.sendMessage({
  type: 'REQUEST_INTERCEPTED',
  data: { id, method, url, headers, body }
});

// Panel → Background
chrome.runtime.sendMessage({
  type: 'FORWARD_REQUEST',
  request: { ...modifiedRequest }
});
```

## Comparison with Burp Suite

| Feature | Burp Suite | EchoPlus |
|---------|-----------|----------|
| Request Interception | ✅ | ✅ |
| Response Interception | ✅ | 🔄 (Planned) |
| Request Modification | ✅ | ✅ |
| Queue Management | ✅ | ✅ |
| Scope Filtering | ✅ | ✅ |
| Match & Replace | ✅ | ❌ |
| WebSocket Support | ✅ | ❌ |

## Keyboard Shortcuts (Future)

- `Ctrl+F` - Forward current request
- `Ctrl+D` - Drop current request
- `Ctrl+I` - Toggle intercept
- `←` / `→` - Navigate queue

## Security Considerations

⚠️ **Important Notes:**
- Only use on applications you have permission to test
- Modifying requests can break application functionality
- Be careful with authentication tokens and session cookies
- Dropped requests may cause application errors

## Troubleshooting

### Intercept Not Working
1. Check if intercept is enabled (green button)
2. Verify scope settings match target URL
3. Ensure Chrome DevTools is attached
4. Check browser console for errors

### Requests Not Appearing
1. Verify "Intercept Requests" is checked
2. Check scope filter settings
3. Ensure target tab has debugger attached
4. Refresh the target page

### Cannot Modify Request
1. Ensure request is in queue (check counter)
2. Try switching editor tabs
3. Check for JavaScript errors in console

## Future Enhancements

- [ ] Response interception and modification
- [ ] Match & Replace rules
- [ ] Request history
- [ ] Export intercepted requests
- [ ] WebSocket interception
- [ ] Automatic modifications (macros)
- [ ] Request/Response diff view
- [ ] SSL/TLS certificate handling

## Credits

Developed by: **Muhammed Farhan (7H3CYF4RX)**
GitHub: https://github.com/7H3CYF4RX/EchoPlus
Inspired by: Burp Suite Proxy/Intercept

---

**Version**: 2.0.0
**Last Updated**: November 2024
