# EchoPlus Architecture Documentation

## Overview

EchoPlus is a Chrome DevTools extension built with vanilla JavaScript (no frameworks) that provides professional security testing tools inspired by Burp Suite. The extension follows Chrome Extension Manifest V3 specifications.

## Core Architecture

### Extension Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Background Service Worker              │ │
│  │  - Context menu management                             │ │
│  │  - Response modification storage                       │ │
│  │  - Request/Response interception (Fetch API)          │ │
│  │  - Debugger attachment & management                    │ │
│  │  - Cross-tab communication                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    DevTools Panel                       │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Repeater │ Intruder │ Scanner │ Intercept      │  │ │
│  │  │  Manipulation │ Chat │ Settings                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │           Core Modules                           │  │ │
│  │  │  - Request Capture                               │  │ │
│  │  │  - Request Replay                                │  │ │
│  │  │  - Storage Management                            │  │ │
│  │  │  - AI Integration                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### 1. UI Modules (`js/ui/`)

#### Repeater (`repeater.js` - 28KB)
**Purpose:** Request editing and replay functionality

**Key Features:**
- Raw HTTP request editor with syntax highlighting
- History navigation (undo/redo)
- AI-powered request analysis
- Send to Intruder integration
- Screenshot capture
- Response viewer with beautification

**Architecture:**
```javascript
RepeaterUI = {
  currentRequest: null,
  history: [],
  historyIndex: -1,
  undoStack: [],
  redoStack: [],
  aiContentCache: Map,
  
  init() → bindEvents() → setupResizer()
  sendRequest() → RequestReplay.send()
  loadRequest() → renderRequest() → renderResponse()
  handleAIExplain() → AIManager.explain()
}
```

#### Intruder (`intruder-enhanced.js` - 42KB)
**Purpose:** Automated attack execution with multiple modes

**Attack Modes:**
- **Sniper:** Tests each position independently (1 payload set)
- **Battering Ram:** Same payload in all positions (1 payload set)
- **Pitchfork:** Parallel iteration (1 set per position)
- **Cluster Bomb:** Cartesian product (1 set per position)

**Payload System:**
```javascript
PayloadSet = {
  type: 'list' | 'numbers' | 'file',
  payloads: string[],
  
  // Three tabs:
  - Manual List: Direct input/paste
  - Numbers: From/To/Step generator
  - File Import: .txt/.csv loading
}
```

**Attack Flow:**
```
1. detectPositions() → Find §markers§
2. collectPayloads() → Get payloads from UI
3. generateAttackCombinations() → Create request variants
4. executeAttacksThreaded() → Parallel execution
5. renderResult() → Display in table
6. showDiff() → Click row → Modal with Request/Response/Diff
```

**Payload Library:**
- Common Passwords (28)
- SQL Injection (17)
- XSS Payloads (13)
- Path Traversal (20+)
- Command Injection (15+)
- Common Usernames (23)
- Fuzzing Strings

#### Scanner (`scanner.js` - 32KB)
**Purpose:** AI-powered vulnerability and secret detection

**Detection System:**
```javascript
SecretDetection = {
  entropyAnalysis() → Calculate randomness
  patternMatching() → Regex patterns for secrets
  confidenceScoring() → High/Medium/Low
  aiValidation() → AI confirms findings
}
```

**Secret Types:**
- API Keys (AWS, Google, Firebase, etc.)
- JWT Tokens
- Private Keys (RSA, SSH)
- Authentication Tokens
- Database Credentials
- OAuth Secrets

**AI Integration:**
```javascript
validateWithAI(finding) {
  prompt = `Analyze this potential secret...`
  response = await AIManager.analyze(prompt)
  parse → {isValid, severity, explanation}
  update UI with results
}
```

#### Intercept (`intercept.js` - 19KB)
**Purpose:** Real-time request/response interception (Burp Suite Proxy style)

**Architecture:**
```javascript
InterceptUI = {
  isIntercepting: false,
  interceptQueue: [],
  currentIndex: 0,
  interceptRequests: true,
  interceptResponses: true,
  scopeFilter: 'all',
  
  toggleIntercept() → background.TOGGLE_INTERCEPT
  handleInterceptedRequest() → Add to queue, display
  handleInterceptedResponse() → Add to queue, display
  forwardCurrent() → background.FORWARD_REQUEST
  dropCurrent() → background.DROP_REQUEST
}
```

**Interception Flow:**
```
1. User enables intercept
2. Background attaches debugger to tab
3. Enables Fetch domain with Request & Response stages
4. Fetch.requestPaused event fires for each request/response
5. Background pauses request/response (browser blocks)
6. Sends details to UI panel
7. User edits and clicks Forward/Drop
8. Background continues or fails the request/response
9. Browser resumes
```

**Features:**
- Sequential interception (one at a time)
- Visual REQ/RES badges
- Color-coded status badges (2xx, 3xx, 4xx, 5xx)
- Full editing: Raw, Headers, Params, Body
- Scope filtering
- Forward All / Clear Queue

#### Manipulation (`manipulation-simple.js` - 9KB)
**Purpose:** Automated response capture and modification

**Workflow:**
```
1. capturePage() → fetch(currentURL)
2. displayResponse() → Show status/headers/body
3. openEditor() → Modal with editable fields
4. sendToBrowser() → chrome.scripting.executeScript()
   → document.write(modifiedBody)
```

**Two Actions:**
- **Send to Browser:** Immediate injection via content script
- **Save for Future:** Store rule in chrome.storage.local

#### Chat (`chat.js` - 11KB)
**Purpose:** AI-powered conversational assistant

**Architecture:**
```javascript
ChatUI = {
  chatHistory: [],
  
  handleSend() {
    context = getSelectedContext()
    message = getUserInput()
    
    if (context === 'selected') {
      requestData = getSelectedRequest()
      prompt = buildContextPrompt(message, requestData)
    } else if (context === 'all-scoped') {
      scopedRequests = getAllScopedRequests()
      prompt = buildScopedPrompt(message, scopedRequests)
    } else {
      prompt = message
    }
    
    response = await AIManager.chat(prompt)
    displayMessage(response)
  }
}
```

**Features:**
- Context-aware analysis (General, All Scoped, Selected Request)
- Quick prompt chips (Security Analysis, API Docs, Test Cases)
- Streaming responses
- Persistent chat history
- Multi-provider support

### 2. Core Modules (`js/core/`)

#### Request Capture (`request-capture.js`)
**Purpose:** Capture HTTP requests from Network panel

```javascript
RequestCapture = {
  init() {
    chrome.devtools.network.onRequestFinished.addListener()
  },
  
  captureRequest(request) {
    parse → {method, url, headers, body}
    filter → scopeSettings.isInScope()
    store → storage.saveRequest()
  }
}
```

#### Request Replay (`request-replay.js`)
**Purpose:** Send modified HTTP requests

```javascript
RequestReplay = {
  parseRawRequest(rawText) {
    extract → {method, url, headers, body}
    validate → ensure proper format
    return parsed object
  },
  
  async send(parsed) {
    construct fetch() options
    handle CORS
    return {status, headers, body, time}
  }
}
```

#### Storage (`storage.js`)
**Purpose:** Data persistence using chrome.storage.local

```javascript
Storage = {
  saveRequest(request)
  getRequests(filter)
  saveSettings(settings)
  getSettings()
  // Max 5MB per item
  // Sync across devices if enabled
}
```

### 3. AI Integration (`js/ai/`)

#### AI Manager (`ai-manager-enhanced.js`)
**Purpose:** Unified AI provider interface

```javascript
AIManager = {
  currentProvider: null,
  
  async explain(request) {
    provider = getProvider()
    prompt = buildExplainPrompt(request)
    response = await provider.sendMessage(prompt)
    return formatted response
  },
  
  async suggestAttacks(request) {
    prompt = buildAttackPrompt(request)
    return attack vectors
  }
}
```

#### Providers (`js/ai/providers/`)

**Claude (`claude.js`):**
```javascript
ClaudeProvider = {
  apiKey: string,
  model: 'claude-3-5-sonnet-20241022',
  
  async sendMessage(prompt) {
    fetch('https://api.anthropic.com/v1/messages')
    handle streaming
    return response
  }
}
```

**Similar structure for:**
- OpenAI (GPT-4o, GPT-4 Turbo)
- Gemini (2.0 Flash, 1.5 Pro)
- Ollama (Local LLMs)

### 4. Utilities (`js/utils/`)

#### Diff (`diff.js`)
**Purpose:** Response comparison

```javascript
DiffUtil = {
  diff(baseline, current) {
    line-by-line comparison
    return {added, removed, unchanged}
  },
  
  renderDiff(diff) {
    HTML with color-coded changes
    red = removed
    green = added
  }
}
```

#### Entropy (`entropy.js`)
**Purpose:** Randomness analysis for secret detection

```javascript
EntropyUtil = {
  calculate(string) {
    Shannon entropy formula
    return 0-8 (bits per character)
  },
  
  isHighEntropy(string) {
    return entropy > 4.5
  }
}
```

#### Converters (`converters.js`)
**Purpose:** Encoding/decoding utilities

```javascript
Converters = {
  base64Encode(text)
  base64Decode(text)
  urlEncode(text)
  urlDecode(text)
  hexEncode(text)
  hexDecode(text)
  jwtDecode(token) → {header, payload, signature}
}
```

## Data Flow

### Request Capture Flow
```
User browses → Network request
  ↓
chrome.devtools.network.onRequestFinished
  ↓
RequestCapture.captureRequest()
  ↓
Filter by scope (ScopeSettings.isInScope())
  ↓
Storage.saveRequest()
  ↓
UI updates (request list)
```

### Attack Execution Flow
```
User marks positions (§value§)
  ↓
IntruderUI.detectPositions()
  ↓
User adds payloads (manual/numbers/file/library)
  ↓
IntruderUI.collectPayloads()
  ↓
IntruderUI.generateAttackCombinations()
  ↓
IntruderUI.executeAttacksThreaded()
  ↓
For each combination:
  - buildRequest(template, payloads)
  - RequestReplay.send()
  - Store result
  - Render in table
  ↓
User clicks result → showDiff() → Modal
```

### AI Analysis Flow
```
User clicks "Explain"
  ↓
RepeaterUI.handleAIExplain()
  ↓
AIManager.explain(request)
  ↓
Get current provider (Claude/OpenAI/Gemini/Ollama)
  ↓
Build prompt with request details
  ↓
Provider.sendMessage(prompt)
  ↓
Stream response to UI
  ↓
Parse and format
  ↓
Display in AI panel
```

## Security Considerations

### Content Security Policy (CSP)
- No inline scripts
- No eval()
- All code in external files
- Strict CSP in manifest.json

### API Key Storage
```javascript
// Stored in chrome.storage.local (encrypted by Chrome)
{
  aiProvider: 'claude',
  apiKey: 'sk-ant-...',  // Never logged
  model: 'claude-3-5-sonnet-20241022'
}
```

### CORS Handling
```javascript
// Requests sent from DevTools context
// Inherits page's origin
// No CORS issues for same-origin
// Cross-origin requires server CORS headers
```

## Performance Optimizations

### 1. Lazy Loading
- AI providers loaded only when needed
- Large payloads paginated
- Results table virtualized for 1000+ rows

### 2. Caching
```javascript
// AI responses cached per request ID
aiContentCache = new Map()
aiContentCache.set(requestId, response)

// Payload library cached in memory
payloadLibraryCache = {}
```

### 3. Threading
```javascript
// Intruder attacks use parallel execution
threadCount = 4  // configurable
chunks = splitIntoChunks(combinations, threadCount)
await Promise.all(chunk.map(executeAttack))
```

### 4. Memory Management
```javascript
// Limit stored requests
if (requests.length > 1000) {
  requests = requests.slice(0, 1000)
}

// Clear old AI cache
if (aiContentCache.size > 50) {
  clearOldestEntries()
}
```

## Extension Permissions

```json
{
  "permissions": [
    "storage",      // Data persistence
    "webRequest",   // Request monitoring
    "debugger",     // Network interception & Fetch API
    "contextMenus", // Right-click menu
    "tabs",         // Tab access
    "scripting"     // Content injection
  ],
  "host_permissions": [
    "<all_urls>"    // Access all websites
  ]
}
```

## Intercept System Architecture

### Chrome Debugger Protocol Integration

```javascript
// Background Service Worker
const interceptEnabled = false
const interceptOptions = {
  interceptRequests: true,
  interceptResponses: true,
  scopeFilter: 'all'
}

// Attach debugger to tab
await chrome.debugger.attach({ tabId }, '1.3')
await chrome.debugger.sendCommand({ tabId }, 'Network.enable')
await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
  patterns: [
    { urlPattern: '*', requestStage: 'Request' },
    { urlPattern: '*', requestStage: 'Response' }
  ],
  handleAuthRequests: false
})

// Listen for paused requests/responses
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Fetch.requestPaused') {
    if (params.responseStatusCode || params.responseHeaders) {
      // This is a response
      handleResponseInterception(source.tabId, params)
    } else {
      // This is a request
      handleRequestInterception(source.tabId, params)
    }
  }
})

// Continue or fail the request/response
await chrome.debugger.sendCommand(
  { tabId },
  'Fetch.continueRequest',
  { requestId: params.requestId }
)

await chrome.debugger.sendCommand(
  { tabId },
  'Fetch.failRequest',
  { requestId: params.requestId, errorReason: 'BlockedByClient' }
)
```

### Request/Response Flow

```
Browser makes request
  ↓
Fetch.requestPaused (Request stage)
  ↓
Background: handleRequestInterception()
  ↓
Store in pendingRequests Map
  ↓
Send to DevTools panel (chrome.runtime.sendMessage)
  ↓
UI: Add to interceptQueue, display
  ↓
[Browser is paused, waiting for user action]
  ↓
User clicks Forward/Drop
  ↓
UI sends FORWARD_REQUEST or DROP_REQUEST
  ↓
Background: Fetch.continueRequest or Fetch.failRequest
  ↓
Request continues to server
  ↓
Server responds
  ↓
Fetch.requestPaused (Response stage)
  ↓
Background: handleResponseInterception()
  ↓
Store in pendingRequests Map
  ↓
Send to DevTools panel
  ↓
UI: Add to interceptQueue, display
  ↓
[Browser is paused, waiting for user action]
  ↓
User clicks Forward/Drop
  ↓
Background: Fetch.continueRequest or Fetch.failRequest
  ↓
Response delivered to browser
```

## Build & Deployment

### No Build Step Required
- Pure vanilla JavaScript
- No transpilation
- No bundling
- Direct file loading

### Development Workflow
```bash
1. Edit source files
2. Go to chrome://extensions/
3. Click "Reload" on rep+ extension
4. Refresh DevTools panel (close and reopen)
```

### File Size Summary
```
Total: ~170KB of UI code
- intruder-enhanced.js: 42KB
- scanner.js: 32KB
- repeater.js: 28KB
- intercept.js: 19KB
- scope-settings.js: 13KB
- chat.js: 11KB
- manipulation-simple.js: 9KB
- settings.js: 5KB
- main.css: ~100KB
- intercept.css: ~10KB
```

## Future Enhancements

### Completed Features
- ✅ Request/Response Interception (Burp Suite Proxy style)
- ✅ AI Chat Interface with context awareness
- ✅ Sequential interception (browser blocking)
- ✅ Visual request/response indicators

### Planned Features
- Response modification in Intercept (currently view-only for responses)
- Match & Replace rules for automatic modification
- WebSocket support
- Request history persistence
- Custom payload generators
- Response beautification
- Export to Burp/OWASP ZAP
- Collaborative features
- Browser automation integration
- Custom secret patterns
- Advanced diff algorithms

### Performance Improvements
- IndexedDB for large datasets
- Web Workers for heavy computation
- Virtual scrolling for all lists
- Progressive loading

### UI Enhancements
- Drag-and-drop payload import
- Visual request builder
- Response preview (HTML rendering)
- Dark/Light theme improvements
- Keyboard shortcuts

---

**Author:** Muhammed Farhan ([@7H3CYF4RX](https://github.com/7H3CYF4RX))  
**Last Updated:** November 25, 2024  
**Version:** 2.0.0  
**Architecture:** Chrome Extension Manifest V3  
**Repository:** https://github.com/7H3CYF4RX/EchoPlus
