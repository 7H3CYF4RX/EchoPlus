/**
 * rep+ Repeater UI
 */

const RepeaterUI = {
  currentRequest: null,
  history: [],
  historyIndex: -1,
  undoStack: [],
  redoStack: [],
  aiContentCache: new Map(), // Store AI content per request ID

  init() {
    this.bindEvents();
    this.setupResizer();
    this.setupAIResizer();
    this.loadState();
  },

  bindEvents() {
    // Send request
    document.getElementById('send-request')?.addEventListener('click', () => {
      this.sendRequest();
    });

    // Star request
    document.getElementById('star-request')?.addEventListener('click', () => {
      this.toggleStar();
    });

    // Screenshot
    document.getElementById('screenshot-btn')?.addEventListener('click', () => {
      this.takeScreenshot();
    });

    // Send to Intruder
    document.getElementById('send-to-intruder')?.addEventListener('click', () => {
      this.sendToIntruder();
    });

    // History navigation
    document.getElementById('history-back')?.addEventListener('click', () => {
      this.navigateHistory(-1);
    });

    document.getElementById('history-forward')?.addEventListener('click', () => {
      this.navigateHistory(1);
    });

    // Undo/Redo
    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.undo();
    });

    document.getElementById('redo-btn')?.addEventListener('click', () => {
      this.redo();
    });

    // AI Actions - Fixed to match actual HTML IDs
    const explainBtn = document.getElementById('ai-explain');
    const aiActionsBtn = document.getElementById('ai-actions-dropdown');
    
    if (explainBtn) {
      explainBtn.addEventListener('click', async () => {
        await this.handleAIExplain();
      });
    } else {
      console.warn('[Repeater] ai-explain not found in DOM');
    }

    if (aiActionsBtn) {
      aiActionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.getElementById('ai-actions-container');
        if (container) {
          container.classList.toggle('active');
        }
      });
    } else {
      console.warn('[Repeater] ai-actions-dropdown button not found');
    }
    
    // AI Dropdown items
    const dropdownItems = document.querySelectorAll('#ai-dropdown-menu .dropdown-item');
    
    dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        this.handleAIAction(action);
        const container = document.getElementById('ai-actions-container');
        if (container) container.classList.remove('active');
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const container = document.getElementById('ai-actions-container');
      if (container && !container.contains(e.target)) {
        container.classList.remove('active');
      }
    });

    // AI panel is always visible now - no close button needed

    // Request editor changes
    document.getElementById('request-editor')?.addEventListener('input', (e) => {
      this.saveToUndoStack();
    });

    // Layout toggle
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.toggleLayout(e.target.dataset.layout);
      });
    });

    // Fullscreen toggles
    document.getElementById('fullscreen-request')?.addEventListener('click', () => {
      this.toggleFullscreen('request-section');
    });

    document.getElementById('fullscreen-response')?.addEventListener('click', () => {
      this.toggleFullscreen('response-section');
    });

    // Wrap toggle
    document.getElementById('wrap-request')?.addEventListener('click', () => {
      this.toggleWrap();
    });

    // Beautify response
    document.getElementById('beautify-response')?.addEventListener('click', () => {
      this.beautifyResponse();
    });
  },

  setupResizer() {
    const resizer = document.getElementById('split-resizer');
    const container = document.getElementById('main-split-view');
    const leftPanel = document.getElementById('request-section');
    const rightPanel = document.getElementById('response-section');
    
    if (!resizer || !container) return;

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const containerRect = container.getBoundingClientRect();
      const layout = container.classList.contains('vertical') ? 'vertical' : 'horizontal';

      if (layout === 'horizontal') {
        const offsetX = e.clientX - containerRect.left;
        const percentage = (offsetX / containerRect.width) * 100;
        
        if (percentage > 20 && percentage < 80) {
          container.style.gridTemplateColumns = `${percentage}% ${100 - percentage}%`;
        }
      } else {
        const offsetY = e.clientY - containerRect.top;
        const percentage = (offsetY / containerRect.height) * 100;
        
        if (percentage > 20 && percentage < 80) {
          container.style.gridTemplateRows = `${percentage}% ${100 - percentage}%`;
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });
  },

  setupAIResizer() {
    const resizer = document.getElementById('ai-resizer');
    const aiPanel = document.getElementById('ai-panel');
    const container = document.getElementById('repeater-panel');

    if (!resizer || !aiPanel || !container) return;

    const minHeight = 200;
    const maxHeight = 600;
    const storageKey = 'repplus_ai_panel_height';

    const storedHeight = parseInt(localStorage.getItem(storageKey), 10);
    if (!Number.isNaN(storedHeight) && storedHeight >= minHeight && storedHeight <= maxHeight) {
      aiPanel.style.height = `${storedHeight}px`;
    }

    let isResizing = false;
    let startY = 0;
    let startHeight = aiPanel.offsetHeight || 320;

    const onMouseMove = (e) => {
      if (!isResizing) return;
      const delta = startY - e.clientY;
      let newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + delta));
      aiPanel.style.height = `${newHeight}px`;
      localStorage.setItem(storageKey, newHeight);
    };

    const stopResizing = () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    };

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = aiPanel.offsetHeight || 320;
      document.body.style.cursor = 'row-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stopResizing);
    });
  },

  toggleLayout(layout) {
    const container = document.getElementById('main-split-view');
    const resizer = document.getElementById('split-resizer');
    
    if (!container || !resizer) return;

    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    if (layout === 'vertical') {
      container.classList.add('vertical');
      container.style.gridTemplateColumns = '';
      container.style.gridTemplateRows = '1fr 1fr';
      resizer.className = 'split-resizer vertical';
    } else {
      container.classList.remove('vertical');
      container.style.gridTemplateRows = '';
      container.style.gridTemplateColumns = '1fr 1fr';
      resizer.className = 'split-resizer horizontal';
    }
  },

  toggleFullscreen(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    if (section.classList.contains('fullscreen')) {
      section.classList.remove('fullscreen');
      document.body.style.overflow = '';
    } else {
      // Remove fullscreen from other section
      document.querySelectorAll('.editor-section.fullscreen').forEach(el => {
        el.classList.remove('fullscreen');
      });
      section.classList.add('fullscreen');
      document.body.style.overflow = 'hidden';
    }

    // Handle ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && section.classList.contains('fullscreen')) {
        section.classList.remove('fullscreen');
        document.body.style.overflow = '';
      }
    });
  },

  toggleWrap() {
    const editor = document.getElementById('request-editor');
    if (!editor) return;

    if (editor.style.whiteSpace === 'pre-wrap') {
      editor.style.whiteSpace = 'pre';
    } else {
      editor.style.whiteSpace = 'pre-wrap';
    }
  },

  beautifyResponse() {
    const viewer = document.getElementById('response-viewer');
    if (!viewer || !this.currentRequest?.response) return;

    try {
      const contentType = this.currentRequest.response.headers['content-type'] || '';
      let beautified = this.currentRequest.response.body;

      if (contentType.includes('json')) {
        const json = JSON.parse(this.currentRequest.response.body);
        beautified = JSON.stringify(json, null, 2);
      } else if (contentType.includes('html') || contentType.includes('xml')) {
        // Simple HTML/XML formatting
        beautified = this.formatXML(this.currentRequest.response.body);
      }

      viewer.textContent = beautified;
    } catch (e) {
      console.error('Beautify error:', e);
    }
  },

  formatXML(xml) {
    const formatted = [];
    const regex = /(>)(<)(\/*)/g;
    xml = xml.replace(regex, '$1\n$2$3');
    let pad = 0;
    
    xml.split('\n').forEach(node => {
      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) {
          pad -= 1;
        }
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      }
      
      formatted.push('  '.repeat(pad) + node);
      pad += indent;
    });
    
    return formatted.join('\n');
  },

  loadRequest(request) {
    console.log('[Repeater] Loading request:', {
      url: request.url,
      method: request.method,
      hasResponse: !!request.response,
      responseStatus: request.response?.status
    });
    
    // Save current AI content before switching
    if (this.currentRequest && this.currentRequest.id) {
      const aiContent = document.getElementById('ai-content');
      if (aiContent && aiContent.innerHTML) {
        this.aiContentCache.set(this.currentRequest.id, aiContent.innerHTML);
      }
    }
    
    this.currentRequest = request;
    this.history.push({ ...request });
    this.historyIndex = this.history.length - 1;
    this.undoStack = [];
    this.redoStack = [];
    
    this.renderRequest();
    this.restoreAIContent();
  },
  
  restoreAIContent() {
    if (!this.currentRequest || !this.currentRequest.id) return;
    
    const aiContent = document.getElementById('ai-content');
    if (!aiContent) return;
    
    // Restore cached AI content for this request
    if (this.aiContentCache.has(this.currentRequest.id)) {
      aiContent.innerHTML = this.aiContentCache.get(this.currentRequest.id);
      console.log('[Repeater] Restored AI content for request:', this.currentRequest.id);
    } else {
      // Show placeholder for new request
      aiContent.innerHTML = '<p class="ai-placeholder">Select a request and click ✨ Explain or choose an action from the AI menu.</p>';
    }
  },

  renderRequest() {
    if (!this.currentRequest) return;

    const editor = document.getElementById('request-editor');
    if (editor) {
      const rawRequest = RequestReplay.buildRawRequest(
        this.currentRequest.method,
        this.currentRequest.url,
        this.currentRequest.headers,
        this.currentRequest.body
      );
      editor.value = rawRequest || '';
      this.applySyntaxHighlighting(editor, 'request');
    }

    // Render response if available
    const viewer = document.getElementById('response-viewer');
    if (this.currentRequest.response) {
      this.renderResponse(this.currentRequest.response);
    } else if (viewer) {
      // Clear and show placeholder
      SafeDOM.clear(viewer);
      const placeholder = SafeDOM.createElement('div', { className: 'placeholder-text' });
      SafeDOM.append(placeholder, SafeDOM.createText('No response yet. Click "Send" to execute the request.'));
      SafeDOM.append(viewer, placeholder);
    }
  },

  renderResponse(response) {
    console.log('[Repeater] Rendering response:', {
      status: response.status,
      bodyLength: response.body?.length || 0,
      hasBody: !!response.body,
      contentType: response.headers?.['content-type']
    });

    const viewer = document.getElementById('response-viewer');
    const statusBadge = document.getElementById('response-status');
    const timeBadge = document.getElementById('response-time');
    const sizeBadge = document.getElementById('response-size');

    if (statusBadge) {
      SafeDOM.setTextContent(statusBadge, `${response.status} ${response.statusText}`);
      SafeDOM.addClass(statusBadge, 'status-badge');
      SafeDOM.addClass(statusBadge, `status-${Math.floor(response.status / 100)}xx`);
    }

    if (timeBadge) {
      SafeDOM.setTextContent(timeBadge, `${response.time}ms`);
    }

    if (sizeBadge) {
      SafeDOM.setTextContent(sizeBadge, this.formatSize(response.size));
    }

    if (viewer) {
      // Clear existing content safely
      SafeDOM.clear(viewer);

      // Build response elements safely
      const statusClass = `http-status-${Math.floor(response.status / 100)}xx`;
      const statusLine = SafeDOM.createElement('span', { className: statusClass });
      SafeDOM.append(statusLine, SafeDOM.createText(`HTTP/1.1 ${response.status} ${response.statusText}`));
      SafeDOM.append(viewer, statusLine);
      SafeDOM.append(viewer, SafeDOM.createText('\n'));

      // Add headers
      for (const [key, value] of Object.entries(response.headers || {})) {
        const headerLine = SafeDOM.createElement('span');
        SafeDOM.append(headerLine, SafeDOM.createElement('span', { className: 'http-header-name' }, [this.escapeHtml(key)]));
        SafeDOM.append(headerLine, SafeDOM.createText(': '));
        SafeDOM.append(headerLine, SafeDOM.createElement('span', { className: 'http-header-value' }, [this.escapeHtml(value)]));
        SafeDOM.append(headerLine, SafeDOM.createText('\n'));
        SafeDOM.append(viewer, headerLine);
      }

      SafeDOM.append(viewer, SafeDOM.createText('\n'));

      // Add body with highlighting
      if (response.body) {
        const contentType = response.headers?.['content-type'] || '';
        if (contentType.includes('json')) {
          const highlighted = this.highlightJSON(response.body);
          SafeDOM.append(viewer, SafeDOM.createHTMLFragment(highlighted));
        } else {
          SafeDOM.append(viewer, SafeDOM.createText(this.escapeHtml(response.body)));
        }
      } else {
        SafeDOM.append(viewer, SafeDOM.createText('[No response body]'));
      }

      console.log('[Repeater] Response rendered, viewer content length:', viewer.textContent?.length || 0);
    }
  },

  async sendRequest() {
    const editor = document.getElementById('request-editor');
    if (!editor) return;

    const rawRequest = editor.value;
    const parsed = RequestReplay.parseRawRequest(rawRequest);
    
    if (!parsed) {
      alert('Invalid request format');
      return;
    }

    try {
      // Show loading state
      const sendBtn = document.getElementById('send-request');
      if (sendBtn) {
        sendBtn.disabled = true;
        SafeDOM.clear(sendBtn);
        const span = SafeDOM.createElement('span');
        SafeDOM.append(span, SafeDOM.createText('⏳'));
        SafeDOM.append(sendBtn, span);
        SafeDOM.append(sendBtn, SafeDOM.createText(' Sending...'));
      }

      const response = await RequestReplay.send(parsed);
      
      // Update current request with response
      this.currentRequest.response = response;
      this.renderResponse(response);

      // Add to history
      this.history.push({ ...this.currentRequest });
      this.historyIndex = this.history.length - 1;

    } catch (error) {
      alert(`Request failed: ${error.message}`);
    } finally {
      const sendBtn = document.getElementById('send-request');
      if (sendBtn) {
        sendBtn.disabled = false;
        SafeDOM.clear(sendBtn);
        const span = SafeDOM.createElement('span');
        SafeDOM.append(span, SafeDOM.createText('▶️'));
        SafeDOM.append(sendBtn, span);
        SafeDOM.append(sendBtn, SafeDOM.createText(' Send'));
      }
    }
  },

  toggleStar() {
    if (!this.currentRequest) {
      console.warn('[Repeater] No request selected to star');
      return;
    }
    
    this.currentRequest.starred = !this.currentRequest.starred;
    
    // Update star button visual
    const starBtn = document.getElementById('star-request');
    if (starBtn) {
      starBtn.textContent = this.currentRequest.starred ? '⭐' : '☆';
      starBtn.classList.toggle('starred', this.currentRequest.starred);
    }
    
    // Update in main app
    if (window.app) {
      window.app.updateRequest(this.currentRequest);
      window.app.renderRequestList();
    }
    
    window.postMessage({ type: 'updateRequest', request: this.currentRequest }, '*');
  },

  async takeScreenshot() {
    try {
      const canvas = await html2canvas(document.querySelector('.split-view'));
      const imgData = canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `rep-plus-${Date.now()}.png`;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Screenshot error:', error);
      alert('Screenshot feature requires html2canvas library');
    }
  },

  navigateHistory(direction) {
    
    if (this.history.length === 0) {
      return;
    }
    
    const newIndex = this.historyIndex + direction;
    
    if (newIndex < 0 || newIndex >= this.history.length) {
      return;
    }
    
    this.historyIndex = newIndex;
    this.currentRequest = this.history[this.historyIndex];
    this.renderRequest();
  },

  saveToUndoStack() {
    const editor = document.getElementById('request-editor');
    if (!editor) return;

    this.undoStack.push(editor.value);
    this.redoStack = [];
    
    // Limit stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  },

  undo() {
    if (this.undoStack.length === 0) return;
    
    const editor = document.getElementById('request-editor');
    if (!editor) return;

    this.redoStack.push(editor.value);
    editor.value = this.undoStack.pop();
  },

  redo() {
    if (this.redoStack.length === 0) return;
    
    const editor = document.getElementById('request-editor');
    if (!editor) return;

    this.undoStack.push(editor.value);
    editor.value = this.redoStack.pop();
  },

  async handleAIExplain() {
    
    if (!this.currentRequest) {
      alert('Please select a request first');
      return;
    }

    const aiPanel = document.getElementById('ai-panel');
    const aiContent = document.getElementById('ai-content');

    if (!aiPanel || !aiContent) {
      console.error('[Repeater] AI panel elements not found');
      return;
    }

    // Show panel and loading state
    aiPanel.style.display = 'block';
    SafeDOM.clear(aiContent);
    SafeDOM.append(aiContent, SafeDOM.createElement('div', { className: 'spinner' }));
    SafeDOM.append(aiContent, SafeDOM.createText(' Analyzing request with AI...'));
    

    try {
      // Load settings first
      const settings = await StorageManager.loadSettings();
      
      // Initialize AI Manager with settings
      await AIManager.initialize(settings);
      
      const prompt = AIManager.generateExplainPrompt(this.currentRequest);
      
      let fullResponse = '';

      await AIManager.sendMessage(prompt, (chunk) => {
        fullResponse += chunk;
        // Update content safely during streaming
        SafeDOM.clear(aiContent);
        SafeDOM.append(aiContent, SafeDOM.createHTMLFragment(this.formatAIResponse(fullResponse)));
      });

      if (!fullResponse) {
        SafeDOM.clear(aiContent);
        SafeDOM.append(aiContent, SafeDOM.createElement('div', { className: 'error' }, ['No response received from AI']));
      }
      
    } catch (error) {
      console.error('[Repeater] AI explain error:', error);
      SafeDOM.clear(aiContent);
      const errorDiv = SafeDOM.createElement('div', { className: 'error' });
      SafeDOM.append(errorDiv, SafeDOM.createText(`AI Error: ${error.message}`));
      SafeDOM.append(errorDiv, SafeDOM.createElement('br'));
      const small = SafeDOM.createElement('small');
      SafeDOM.append(small, SafeDOM.createText('Please check your settings in Settings tab.'));
      SafeDOM.append(errorDiv, small);
      SafeDOM.append(aiContent, errorDiv);
    }
  },
  
  async handleAIAction(action) {
    
    if (!this.currentRequest) {
      alert('Please select a request first');
      return;
    }

    const aiPanel = document.getElementById('ai-panel');
    const aiContent = document.getElementById('ai-content');

    if (!aiPanel || !aiContent) {
      console.error('[Repeater] AI panel elements not found');
      return;
    }

    aiPanel.style.display = 'block';
    SafeDOM.clear(aiContent);
    SafeDOM.append(aiContent, SafeDOM.createElement('div', { className: 'spinner' }));
    SafeDOM.append(aiContent, SafeDOM.createText(' Analyzing...'));

    try {
      const settings = await StorageManager.loadSettings();
      await AIManager.initialize(settings);
      
      let prompt = '';
      
      switch(action) {
        case 'suggest-attacks':
          prompt = AIManager.generateAttackPrompt(this.currentRequest);
          break;
        case 'analyze-response':
          prompt = AIManager.generateAnalyzePrompt(this.currentRequest);
          break;
        case 'map-attack-surface': {
          const captured = window.RequestCapture?.getRequests?.() || [];
          prompt = AIManager.generateMapPrompt(captured.length ? captured : this.currentRequest);
          break;
        }
        case 'security-analysis':
          prompt = AIManager.generateSecurityAnalysisPrompt(this.currentRequest);
          break;
        case 'generate-api-docs':
          prompt = AIManager.generateAPIDocsPrompt(this.currentRequest);
          break;
        case 'generate-test-cases':
          prompt = AIManager.generateTestCasesPrompt(this.currentRequest);
          break;
        default:
          prompt = AIManager.generateExplainPrompt(this.currentRequest);
      }
      
      let fullResponse = '';
      await AIManager.sendMessage(prompt, (chunk) => {
        fullResponse += chunk;
        // Update content safely during streaming
        SafeDOM.clear(aiContent);
        SafeDOM.append(aiContent, SafeDOM.createHTMLFragment(this.formatAIResponse(fullResponse)));
      });
      
    } catch (error) {
      console.error('[Repeater] AI action error:', error);
      SafeDOM.clear(aiContent);
      SafeDOM.append(aiContent, SafeDOM.createElement('div', { className: 'error' }, [`AI Error: ${error.message}`]));
    }
  },
  
  formatAIResponse(text) {
    // Simple markdown-like formatting
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    return `<div class="ai-response">${formatted}</div>`;
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  },

  syntaxHighlightJSON(json) {
    // Color code JSON with HTML spans
    return json
      .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="json-key">$1</span>:')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
      .replace(/([{}\[\],])/g, '<span class="json-punctuation">$1</span>');
  },
  
  applySyntaxHighlighting(editor, type) {
    // Simple syntax highlighting for request editor
    // This runs on input to provide visual feedback
    if (type === 'request') {
      editor.addEventListener('input', () => {
        const cursorPos = editor.selectionStart;
        const text = editor.value;
        // Store cursor position and restore after (would need proper implementation)
        // For now, we keep it simple with CSS classes on the response viewer only
      });
    }
  },

  highlightJSON(text) {
    try {
      const json = JSON.parse(text);
      const formatted = JSON.stringify(json, null, 2);

      // Use SafeDOM to create highlighted elements
      const container = SafeDOM.createElement('div');

      // Split by lines and highlight each line
      const lines = formatted.split('\n');
      lines.forEach((line, index) => {
        // Simple highlighting - replace with spans
        let highlightedLine = line
          .replace(/("(?:\\.|[^"\\])*")\s*:/g, '<span class="json-key">$1</span>:')
          .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
          .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
          .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
          .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');

        // Create line element with highlighted content
        const lineElement = SafeDOM.createElement('div', { className: 'json-line' });
        SafeDOM.append(lineElement, SafeDOM.createHTMLFragment(highlightedLine));
        SafeDOM.append(container, lineElement);

        // Add line break except for last line
        if (index < lines.length - 1) {
          SafeDOM.append(container, SafeDOM.createElement('br'));
        }
      });

      // Return the container's innerHTML for backward compatibility
      return container.innerHTML;
    } catch (e) {
      return this.escapeHtml(text);
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  sendToIntruder() {
    if (!this.currentRequest) {
      alert('❌ No request selected!\n\nPlease select a request from the list first.');
      return;
    }

    // Get current request text from editor
    const editor = document.getElementById('request-editor');
    const requestText = editor ? editor.value : this.formatRequest(this.currentRequest);

    // Send to Intruder tab
    if (window.IntruderUI && window.IntruderUI.loadFromRepeater) {
      window.IntruderUI.loadFromRepeater(requestText, this.currentRequest);
      
      // Switch to Intruder tab
      const intruderTab = document.querySelector('[data-tab="intruder"]');
      if (intruderTab) {
        intruderTab.click();
      }
      
      // Show success message
      setTimeout(() => {
        alert(`✅ Request sent to Intruder!

📝 Request Details:
• Method: ${this.currentRequest.method}
• URL: ${this.currentRequest.url}

🎯 You can now:
1. Mark injection points with §§
2. Load payloads
3. Start the attack`);
      }, 100);
    } else {
      alert('❌ Intruder not available!\n\nPlease make sure the Intruder tab is loaded.');
    }
  },

  loadState() {
    // Load from storage if needed
  },

  saveState() {
    // Save to storage
  }
};

window.RepeaterUI = RepeaterUI;
