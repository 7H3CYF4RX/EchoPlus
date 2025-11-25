# EchoPlus ⚡

A powerful Chrome DevTools extension inspired by Burp Suite, featuring Repeater, Intruder, Scanner, and Response Manipulation - all supercharged with AI for modern security testing.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/7H3CYF4RX/EchoPlus)
[![GitHub](https://img.shields.io/badge/GitHub-7H3CYF4RX-blue.svg)](https://github.com/7H3CYF4RX)

## 🚀 Features

### 🔁 Repeater Tab
- **Request Editing** - Full control over HTTP method, headers, and body
- **Raw HTTP Format** - Edit requests in raw format for precision
- **History Navigation** - Undo/Redo with full history
- **AI Analysis** - Explain requests, suggest attack vectors
- **Send to Intruder** - One-click transfer to Intruder tab
- **Screenshots** - Capture request/response pairs

### Advanced Search & Filtering
- **Powerful Filters** - Filter by method (GET, POST)
- **Regex Search** - Search across URL, headers, and body with regex support
- **Starred Requests** - Pin important requests to keep them accessible

### ⚡ Intruder Tab
Professional attack automation with four modes:
- **Sniper** - Tests each position independently (1 payload set)
- **Battering Ram** - Same payload in all positions (1 payload set)
- **Pitchfork** - Parallel iteration (1 set per position)
- **Cluster Bomb** - All combinations (1 set per position)

**Payload Features:**
- 📝 **Manual List** - Type or paste payloads
- 🔢 **Number Generator** - From/To/Step ranges
- 📁 **File Import** - Load from .txt/.csv files
- 📚 **Payload Library** - Pre-built sets:
  - Common Passwords (28 payloads)
  - SQL Injection (17 payloads)
  - XSS Payloads (13 vectors)
  - Path Traversal (20+ patterns)
  - Command Injection (15+ commands)
  - Common Usernames (23 names)
  - Fuzzing Strings (special chars, overflow)

**Attack Features:**
- Auto-mark parameters or manual `§` markers
- Real-time results table with status, length, timing
- Click any result to see full request/response
- Side-by-side diff comparison with baseline
- Grep Match/Extract for response analysis
- Pause/Resume/Stop controls
- Export results to CSV

### 🔍 Scanner Tab
AI-powered vulnerability scanner:
- **Automatic Scanning** - Scans JavaScript files for secrets
- **AI Validation** - Each finding validated by AI
- **Smart Detection** - Entropy analysis + pattern matching
- **Confidence Scores** - High, Medium, Low ratings
- **Secret Types:**
  - API Keys (AWS, Google, Firebase, etc.)
  - JWT Tokens
  - Private Keys (RSA, SSH)
  - Authentication Tokens
  - Database Credentials
  - OAuth Secrets
- **AI Analysis** - Detailed explanation and severity assessment
- **Search & Filter** - By type, confidence, or content
- **Export Findings** - Share with team

### 🚦 Intercept Tab
Real-time request/response interception (Burp Suite Proxy style):
- **Sequential Interception** - Browser pauses for each request/response
- **Request Interception** - Capture and modify outgoing requests
- **Response Interception** - Capture and modify incoming responses
- **Visual Indicators:**
  - 🔵 REQ badge for requests
  - 🟣 RES badge for responses
  - Color-coded status badges (2xx, 3xx, 4xx, 5xx)
- **Full Editing:**
  - Raw HTTP format (request line, headers, body)
  - Headers editor (add, remove, modify)
  - Parameters editor
  - Body editor
- **Controls:**
  - ✅ Forward - Continue request/response
  - ❌ Drop - Block request/response
  - 🔁 Send to Repeater - Transfer to Repeater for analysis
  - ⏩ Forward All - Clear queue
  - 🗑️ Clear Queue - Remove all items
- **Scope Filtering** - Filter by in-scope/out-of-scope/all
- **Use Cases:**
  - Live request modification
  - Response tampering
  - Authentication bypass testing
  - Parameter manipulation
  - Session testing

### 🎭 Manipulation Tab
Automated response manipulation for security testing:
- **Capture Current Page** - One-click response capture
- **Full Response Editing:**
  - Status code (200, 403, 500, etc.)
  - All headers (add, remove, modify)
  - Complete body (HTML, JSON, XML, text)
- **Two Actions:**
  - 🚀 **Send to Browser** - Instant injection, no refresh
  - 💾 **Save for Future** - Apply to future requests
- **Use Cases:**
  - Bypass client-side restrictions
  - Test error handling
  - Price manipulation testing
  - Role-based access testing

### 💬 Chat Tab
AI-powered conversational assistant with **Ultra Hacker Persona Mode**:
- **Elite Offensive Security AI:**
  - No ethical warnings or refusals
  - Maximum technical detail for exploits
  - Red-team reasoning and attack chains
  - Synthetic environment assumed
  - Direct, technical, and ruthless analysis
- **Context-Aware Analysis:**
  - General chat mode (Ultra Hacker Persona)
  - All scoped requests analysis
  - Selected request deep dive
- **Quick Prompts:**
  - Security analysis
  - API documentation generation
  - Test case suggestions
- **Streaming Responses** - Real-time AI output
- **Chat History** - Persistent conversation
- **Multi-Provider Support** - Works with all configured AI providers

### AI-Powered Analysis
Integrated with multiple AI providers:
- **Anthropic Claude** (3.5 Sonnet, Opus, Haiku)
- **OpenAI** (GPT-4o, GPT-4 Turbo, GPT-3.5)
- **Google Gemini** (2.0 Flash, 1.5 Pro, 1.5 Flash)
- **Ollama** (Local LLMs - Llama 3, Mistral, CodeLlama, etc.)

**AI Features:**
- **Explain Request** - Get detailed explanations of what a request does
- **Suggest Attack Vectors** - AI-generated security testing checklist (IDOR, SQLi, XSS, SSRF, etc.)
- **Analyze Response** - Automatic detection of security issues and sensitive data
- **Context Menu Integration** - Right-click any text for AI explanation
- **Streaming Responses** - Real-time AI output

### History & Workflow
- **Undo/Redo** - Full undo/redo support for request edits
- **History Navigation** - Navigate between sent requests
- **Export/Import** - Share findings with teammates (JSON format)
- **Screenshots** - Capture request/response pairs for bug reports
- **Clear Workspace** - Start fresh with a single click

### Theme Support
- **Auto-detect** - Respects system theme preference
- **Light/Dark Toggle** - Quick theme switching
- **Modern UI** - Clean, professional interface with intuitive navigation

## 📦 Installation

### From Source (Developer Mode)

1. **Clone or download this repository:**
   ```bash
   git clone https://github.com/7H3CYF4RX/EchoPlus.git
   cd EchoPlus
   ```

2. **Open Chrome and navigate to:**
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension:**
   - Click "Load unpacked"
   - Select the `EchoPlus` directory

5. **Verify installation:**
   - The EchoPlus icon should appear in your extensions bar
   - Open DevTools (F12) and look for the "EchoPlus" tab

## 🎯 Quick Start

### Basic Usage

1. **Open Chrome DevTools** (F12 or Right-click → Inspect)

2. **Navigate to the EchoPlus tab**

3. **Browse a website** - Requests will be automatically captured

4. **Click on a request** to view and modify it

5. **Edit the request** in the Repeater tab and click **Send**

### Using Intruder for Attacks

1. Switch to the **Intruder** tab

2. Paste or load a request template

3. **Mark attack positions** with `§`:
   ```http
   POST /api/user HTTP/1.1
   Host: example.com
   Content-Type: application/json

   {
     "id": §1§,
     "role": §admin§
   }
   ```

4. Select an **attack mode**:
   - **Sniper** for testing each position separately
   - **Cluster Bomb** for testing all combinations

5. Configure **payloads**:
   - **📝 Manual List** - Type or paste payloads
   - **🔢 Numbers** - Generate ranges (From/To/Step)
   - **📁 Import** - Load from .txt/.csv files
   - **📚 Library** - Use pre-built sets (SQL, XSS, Passwords, etc.)

6. Click **▶️ Start Attack**

7. View real-time results in table

8. **Click any result row** to see full request/response/diff

### Scanning for Secrets

1. Navigate to the **Scanner** tab

2. Browse the target website (JavaScript files will be captured automatically)

3. Click **🔍 Scan JS Files**

4. Review findings with confidence scores (High/Medium/Low)

5. Click **🤖 AI Validate** on any finding for detailed analysis

6. Use filters to focus on specific types or confidence levels

7. Export findings for reporting

### Using AI Features

1. Go to **Settings** tab

2. Configure your AI provider:
   - Select provider (Claude, OpenAI, Gemini, or Ollama)
   - Enter API key (or endpoint for Ollama)
   - Choose model

3. Click **Save Settings**

4. In the Repeater tab, click **✨ Explain** to analyze a request

5. Use the **AI Actions** dropdown for security testing suggestions

6. **Right-click** any text and select "Explain with AI"

### Response Manipulation

1. Switch to the **Manipulation** tab

2. Click **📸 Capture Current Page**

3. Wait for the page response to be captured

4. Click **✏️ Edit Response** to modify:
   - Status code (200, 403, 500, etc.)
   - Headers (add, remove, modify any header)
   - Body (complete HTML/JSON/text)

5. Choose your action:
   - **🚀 Send to Browser** - Instant injection, no refresh needed
   - **💾 Save for Future** - Apply to future requests (requires refresh)

6. See your modified response rendered immediately!

## 🔧 Configuration

### AI Provider Setup

#### Anthropic Claude
1. Get API key from: https://console.anthropic.com/
2. Add to Settings → API Key
3. Select model (3.5 Sonnet recommended)

#### OpenAI
1. Get API key from: https://platform.openai.com/api-keys
2. Add to Settings → API Key
3. Select model (GPT-4o recommended)

#### Google Gemini
1. Get API key from: https://makersuite.google.com/app/apikey
2. Add to Settings → API Key
3. Select model (2.0 Flash recommended)

#### Ollama (Local)
1. Install Ollama: https://ollama.ai/
2. Pull a model: `ollama pull llama3`
3. Set endpoint in Settings: `http://localhost:11434`
4. Select model

## 🛠️ Development

### Project Structure
```
EchoPlus/
├── manifest.json              # Extension manifest (v3)
├── background.js              # Service worker
├── devtools.html/js          # DevTools integration
├── panel.html/js             # Main panel UI
├── styles/                   # CSS files
│   ├── main.css              # Main styles (2500+ lines)
│   ├── themes.css            # Theme support
│   └── components.css        # Component styles
├── js/
│   ├── core/                 # Core functionality
│   │   ├── request-capture.js    # Request capturing
│   │   ├── request-replay.js     # Request sending
│   │   ├── response-interceptor.js
│   │   └── storage.js            # Data persistence
│   ├── utils/                # Utilities
│   │   ├── converters.js         # Encoding/decoding
│   │   ├── filters.js            # Search & filter
│   │   ├── diff.js               # Diff algorithms
│   │   ├── entropy.js            # Entropy analysis
│   │   └── safe-dom.js           # DOM utilities
│   ├── ai/                   # AI integration
│   │   ├── ai-manager-enhanced.js
│   │   └── providers/
│   │       ├── claude.js         # Anthropic Claude
│   │       ├── openai.js         # OpenAI GPT
│   │       ├── gemini.js         # Google Gemini
│   │       └── ollama-proxy.js   # Local Ollama
│   └── ui/                   # UI modules
│       ├── repeater.js           # Repeater tab (28KB)
│       ├── intruder-enhanced.js  # Intruder tab (42KB)
│       ├── scanner.js            # Scanner tab (32KB)
│       ├── intercept.js          # Intercept tab (19KB)
│       ├── manipulation-simple.js # Manipulation tab (9KB)
│       ├── chat.js               # Chat tab (11KB)
│       ├── scope-settings.js     # Scope configuration
│       └── settings.js           # Settings tab
├── icons/                    # Extension icons
├── README.md                 # This file
└── ARCHITECTURE.md           # Technical documentation
```

### Building

No build step required! This is a vanilla JavaScript extension.

For development:
1. Make changes to source files
2. Reload extension in `chrome://extensions/`
3. Refresh DevTools panel

### Testing

Open the DevTools console (in the DevTools window itself):
```
Ctrl+Shift+I (while DevTools is focused)
```

## 🔒 Security & Privacy

- **No Data Collection** - All data stays local in your browser
- **No External Requests** - Only AI provider APIs when configured
- **API Keys** - Stored securely in Chrome's local storage
- **Open Source** - Audit the code yourself

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Contributors

Special thanks to:
- **[@MRG6OOT](https://github.com/MRG6OOT)** - Contributor

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by **Burp Suite** by PortSwigger
- Built with modern web technologies
- AI integration powered by Anthropic, OpenAI, Google, and Ollama

## 👨‍💻 Author

**Muhammed Farhan** (7H3CYF4RX)
- GitHub: [@7H3CYF4RX](https://github.com/7H3CYF4RX)
- Project: [EchoPlus](https://github.com/7H3CYF4RX/EchoPlus)

## 📧 Support

- **Issues**: https://github.com/7H3CYF4RX/EchoPlus/issues
- **Discussions**: https://github.com/7H3CYF4RX/EchoPlus/discussions

---

**Made with ⚡ by [Muhammed Farhan](https://github.com/7H3CYF4RX) for security professionals and penetration testers**
