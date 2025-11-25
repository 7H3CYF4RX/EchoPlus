/**
 * rep+ Enhanced Intruder UI (Burp Suite Pro-style)
 * Attack modes, Grep Match/Extract, Payload Processing
 */

const IntruderUI = {
  attackMode: 'sniper',
  positions: [],
  payloadSets: {},
  grepMatchList: [],
  grepExtractList: [],
  isAttacking: false,
  isPaused: false,
  attackResults: [],
  baselineResponse: null,
  threadCount: 4,
  requestDelay: 0,

  init() {
    this.bindEvents();
    this.bindLibraryButtons();
    this.loadOptions();
  },

  bindEvents() {
    // Attack mode selection
    document.getElementById('attack-mode')?.addEventListener('change', (e) => {
      this.attackMode = e.target.value;
      this.updateModeDescription();
      this.detectPositions();
    });

    // Template input
    document.getElementById('intruder-template')?.addEventListener('input', () => {
      this.detectPositions();
    });

    // Position controls
    document.getElementById('auto-mark-params')?.addEventListener('click', () => {
      this.autoMarkParameters();
    });

    document.getElementById('clear-positions')?.addEventListener('click', () => {
      this.clearPositions();
    });

    document.getElementById('add-position-start')?.addEventListener('click', () => {
      this.addPositionMarker('start');
    });

    document.getElementById('add-position-end')?.addEventListener('click', () => {
      this.addPositionMarker('end');
    });

    // Grep Match
    document.getElementById('add-grep-match')?.addEventListener('click', () => {
      this.addGrepMatch();
    });

    // Grep Extract
    document.getElementById('add-grep-extract')?.addEventListener('click', () => {
      this.addGrepExtract();
    });

    // Attack controls
    document.getElementById('start-attack')?.addEventListener('click', () => {
      this.startAttack();
    });

    document.getElementById('pause-attack')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('stop-attack')?.addEventListener('click', () => {
      this.stopAttack();
    });

    // Results controls
    document.getElementById('export-results')?.addEventListener('click', () => {
      this.exportResults();
    });

    document.getElementById('clear-results')?.addEventListener('click', () => {
      this.clearResults();
    });

    document.getElementById('diff-view-toggle')?.addEventListener('change', (e) => {
      this.toggleDiffView(e.target.checked);
    });

    document.getElementById('close-diff')?.addEventListener('click', () => {
      document.getElementById('diff-viewer').style.display = 'none';
    });

    // Collapsible sections
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const section = e.target.closest('.intruder-section');
        section.classList.toggle('collapsed');
      });
    });
  },

  updateModeDescription() {
    const requiredSets = this.getRequiredPayloadSets();
    const descriptions = {
      'sniper': `<strong>Sniper:</strong> Tests each position independently with its own payloads<br><small>📊 Requires: ${requiredSets} payload set${requiredSets !== 1 ? 's' : ''}</small>`,
      'battering-ram': `<strong>Battering Ram:</strong> Uses the same payload for all positions simultaneously<br><small>📊 Requires: 1 payload set (shared across all positions)</small>`,
      'pitchfork': `<strong>Pitchfork:</strong> Uses multiple payload sets. Iterates through them in parallel<br><small>📊 Requires: ${requiredSets} payload set${requiredSets !== 1 ? 's' : ''} (one per position)</small>`,
      'cluster-bomb': `<strong>Cluster Bomb:</strong> Uses multiple payload sets. Tests all possible combinations<br><small>📊 Requires: ${requiredSets} payload set${requiredSets !== 1 ? 's' : ''} (total requests = product of all sets)</small>`
    };

    const desc = document.getElementById('mode-description');
    if (desc) {
      desc.innerHTML = descriptions[this.attackMode];
    }
  },

  autoMarkParameters() {
    console.log('[Intruder] Auto-marking parameters...');
    const templateEl = document.getElementById('intruder-template');
    if (!templateEl) {
      console.error('[Intruder] Template editor not found!');
      alert('❌ Template editor not found!');
      return;
    }
    
    const template = templateEl.value || '';
    console.log('[Intruder] Original template:', template.substring(0, 200));
    
    let marked = template;

    // Auto-mark JSON values
    marked = marked.replace(/:\s*"([^"]+)"/g, ': "§$1§"');
    marked = marked.replace(/:\s*(\d+)/g, ': §$1§');

    // Auto-mark URL parameters
    marked = marked.replace(/=([^&\s]+)/g, '=§$1§');
    
    // Auto-mark path parameters
    marked = marked.replace(/\/([a-zA-Z0-9_-]+)/g, (match, p1) => {
      // Don't mark common HTTP methods or protocol
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HTTP'].includes(p1.toUpperCase())) {
        return match;
      }
      return '/§' + p1 + '§';
    });

    console.log('[Intruder] Marked template:', marked.substring(0, 200));
    templateEl.value = marked;
    this.detectPositions();
    
    if (this.positions.length > 0) {
      alert(`✅ Auto-marked ${this.positions.length} position(s)!`);
    } else {
      alert('⚠️ No parameters found to mark.\n\nTry manually marking positions with §§');
    }
  },

  clearPositions() {
    const template = document.getElementById('intruder-template')?.value || '';
    const cleared = template.replace(/§/g, '');
    document.getElementById('intruder-template').value = cleared;
    this.detectPositions();
  },

  addPositionMarker(type) {
    const textarea = document.getElementById('intruder-template');
    if (!textarea) {
      alert('❌ Template editor not found!');
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (start === end) {
      alert('⚠️ Please select text first!\n\nHighlight the part you want to mark as a position.');
      return;
    }

    let newText;
    if (type === 'start') {
      // Add § at the start of selection
      newText = text.substring(0, start) + '§' + text.substring(start);
      textarea.value = newText;
      textarea.setSelectionRange(start + 1, end + 1);
    } else {
      // Add § at the end of selection
      newText = text.substring(0, end) + '§' + text.substring(end);
      textarea.value = newText;
      textarea.setSelectionRange(start, end);
    }

    // Detect positions
    this.detectPositions();
    
    // Focus back on textarea
    textarea.focus();
  },

  detectPositions() {
    const templateEl = document.getElementById('intruder-template');
    if (!templateEl) {
      console.error('[Intruder] Template editor not found!');
      return;
    }
    
    const template = templateEl.value || '';
    console.log('[Intruder] Detecting positions in template:', template.substring(0, 100));
    
    const regex = /§([^§]*)§/g;
    const matches = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      matches.push({
        index: matches.length,
        placeholder: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    console.log('[Intruder] Detected positions:', matches.length);
    this.positions = matches;
    this.renderPositions();
    this.updatePayloadSets();
  },

  renderPositions() {
    const container = document.getElementById('positions-list');
    if (!container) return;

    if (this.positions.length === 0) {
      container.innerHTML = '<p class="text-muted">No positions marked. Use § to mark positions or click "Auto-mark Parameters".</p>';
      return;
    }

    container.innerHTML = '<h4>Detected Positions (' + this.positions.length + '):</h4>';
    this.positions.forEach((pos, idx) => {
      container.innerHTML += `
        <div class="position-item">
          <strong>Position ${idx + 1}:</strong> 
          <code>${this.escapeHtml(pos.placeholder) || '(empty)'}</code>
        </div>
      `;
    });
  },

  updatePayloadSets() {
    const container = document.getElementById('payload-sets');
    if (!container) return;

    container.innerHTML = '';

    const requiredSets = this.getRequiredPayloadSets();
    
    for (let i = 0; i < requiredSets; i++) {
      const setDiv = document.createElement('div');
      setDiv.className = 'payload-set';
      setDiv.innerHTML = `
        <div class="payload-set-header">
          <h4>Payload Set ${i + 1}</h4>
          <span class="payload-count" data-set="${i}">0 payloads</span>
        </div>
        
        <div class="payload-type-selector">
          <button class="type-btn active" data-set="${i}" data-type="list">📝 Manual List</button>
          <button class="type-btn" data-set="${i}" data-type="numbers">🔢 Numbers</button>
          <button class="type-btn" data-set="${i}" data-type="file">📁 Import File</button>
        </div>
        
        <div class="payload-config-area">
          <!-- Manual List -->
          <div class="config-panel active" data-set="${i}" data-type="list">
            <div class="payload-actions">
              <button class="action-btn" data-set="${i}" data-action="add">➕ Add Payload</button>
              <button class="action-btn" data-set="${i}" data-action="clear">🗑️ Clear All</button>
            </div>
            <textarea class="payload-list" data-set="${i}" placeholder="Enter payloads (one per line)&#10;admin&#10;user&#10;test&#10;password"></textarea>
          </div>
          
          <!-- Numbers -->
          <div class="config-panel" data-set="${i}" data-type="numbers">
            <div class="number-range">
              <div class="range-input">
                <label>From:</label>
                <input type="number" class="num-from" data-set="${i}" value="1">
              </div>
              <div class="range-input">
                <label>To:</label>
                <input type="number" class="num-to" data-set="${i}" value="100">
              </div>
              <div class="range-input">
                <label>Step:</label>
                <input type="number" class="num-step" data-set="${i}" value="1">
              </div>
              <button class="generate-btn" data-set="${i}">Generate</button>
            </div>
            <div class="preview-area" data-set="${i}">
              <small>Preview: 1, 2, 3, ... 100 (100 payloads)</small>
            </div>
          </div>
          
          <!-- Import File -->
          <div class="config-panel" data-set="${i}" data-type="file">
            <div class="file-import">
              <input type="file" class="file-input" data-set="${i}" accept=".txt,.csv" style="display:none;">
              <button class="import-btn" data-set="${i}">📂 Choose File</button>
              <span class="file-name" data-set="${i}">No file selected</span>
            </div>
            <div class="import-preview" data-set="${i}"></div>
          </div>
        </div>
      `;
      container.appendChild(setDiv);

      this.bindPayloadSetEvents(setDiv, i);
    }
  },

  bindPayloadSetEvents(setDiv, setIndex) {
    // Type selector buttons
    setDiv.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const set = btn.dataset.set;
        
        // Update active button
        setDiv.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding panel
        setDiv.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
        setDiv.querySelector(`.config-panel[data-set="${set}"][data-type="${type}"]`).classList.add('active');
      });
    });

    // Manual list actions
    const addBtn = setDiv.querySelector('[data-action="add"]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const textarea = setDiv.querySelector('.payload-list');
        const newPayload = prompt('Enter new payload:');
        if (newPayload) {
          textarea.value += (textarea.value ? '\n' : '') + newPayload;
          this.updatePayloadCount(setIndex);
        }
      });
    }

    const clearBtn = setDiv.querySelector('[data-action="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all payloads?')) {
          setDiv.querySelector('.payload-list').value = '';
          this.updatePayloadCount(setIndex);
        }
      });
    }

    // Textarea change
    const textarea = setDiv.querySelector('.payload-list');
    if (textarea) {
      textarea.addEventListener('input', () => this.updatePayloadCount(setIndex));
    }

    // Numbers generate
    const generateBtn = setDiv.querySelector('.generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        const from = parseInt(setDiv.querySelector('.num-from').value);
        const to = parseInt(setDiv.querySelector('.num-to').value);
        const step = parseInt(setDiv.querySelector('.num-step').value);
        
        const numbers = [];
        for (let i = from; i <= to; i += step) {
          numbers.push(i);
        }
        
        const textarea = setDiv.querySelector('.payload-list');
        textarea.value = numbers.join('\n');
        this.updatePayloadCount(setIndex);
        
        // Switch to list view
        setDiv.querySelector('.type-btn[data-type="list"]').click();
      });
    }

    // File import
    const importBtn = setDiv.querySelector('.import-btn');
    const fileInput = setDiv.querySelector('.file-input');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const content = event.target.result;
            const textarea = setDiv.querySelector('.payload-list');
            textarea.value = content;
            this.updatePayloadCount(setIndex);
            
            setDiv.querySelector('.file-name').textContent = file.name;
            
            // Switch to list view
            setDiv.querySelector('.type-btn[data-type="list"]').click();
          };
          reader.readAsText(file);
        }
      });
    }
  },

  updatePayloadCount(setIndex) {
    const textarea = document.querySelector(`.payload-list[data-set="${setIndex}"]`);
    const countSpan = document.querySelector(`.payload-count[data-set="${setIndex}"]`);
    if (textarea && countSpan) {
      const lines = textarea.value.split('\n').filter(line => line.trim());
      countSpan.textContent = `${lines.length} payload${lines.length !== 1 ? 's' : ''}`;
    }
  },

  getRequiredPayloadSets() {
    switch (this.attackMode) {
      case 'sniper':
        return this.positions.length > 0 ? 1 : 0;
      case 'battering-ram':
        return 1;
      case 'pitchfork':
      case 'cluster-bomb':
        return this.positions.length;
      default:
        return 1;
    }
  },

  // Grep Match/Extract
  addGrepMatch() {
    const input = document.getElementById('grep-match-input');
    const pattern = input?.value.trim();
    
    if (!pattern) return;

    this.grepMatchList.push({
      id: Date.now(),
      pattern: pattern,
      enabled: true
    });

    this.renderGrepMatch();
    input.value = '';
  },

  renderGrepMatch() {
    const container = document.getElementById('grep-match-list');
    if (!container) return;

    container.innerHTML = '';
    
    this.grepMatchList.forEach(item => {
      const div = document.createElement('div');
      div.className = 'grep-item';
      div.innerHTML = `
        <label class="checkbox-label">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} data-id="${item.id}">
          <code>${this.escapeHtml(item.pattern)}</code>
        </label>
        <button class="btn-small btn-danger" data-id="${item.id}">Remove</button>
      `;
      
      div.querySelector('input').addEventListener('change', (e) => {
        const grepItem = this.grepMatchList.find(g => g.id == e.target.dataset.id);
        if (grepItem) grepItem.enabled = e.target.checked;
      });

      div.querySelector('.btn-danger').addEventListener('click', (e) => {
        this.grepMatchList = this.grepMatchList.filter(g => g.id != e.target.dataset.id);
        this.renderGrepMatch();
      });

      container.appendChild(div);
    });

    // Update table columns
    this.updateGrepColumns();
  },

  addGrepExtract() {
    const input = document.getElementById('grep-extract-input');
    const pattern = input?.value.trim();
    
    if (!pattern) return;

    this.grepExtractList.push({
      id: Date.now(),
      pattern: pattern,
      enabled: true
    });

    this.renderGrepExtract();
    input.value = '';
  },

  renderGrepExtract() {
    const container = document.getElementById('grep-extract-list');
    if (!container) return;

    container.innerHTML = '';
    
    this.grepExtractList.forEach(item => {
      const div = document.createElement('div');
      div.className = 'grep-item';
      div.innerHTML = `
        <label class="checkbox-label">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} data-id="${item.id}">
          <code>${this.escapeHtml(item.pattern)}</code>
        </label>
        <button class="btn-small btn-danger" data-id="${item.id}">Remove</button>
      `;
      
      div.querySelector('input').addEventListener('change', (e) => {
        const grepItem = this.grepExtractList.find(g => g.id == e.target.dataset.id);
        if (grepItem) grepItem.enabled = e.target.checked;
      });

      div.querySelector('.btn-danger').addEventListener('click', (e) => {
        this.grepExtractList = this.grepExtractList.filter(g => g.id != e.target.dataset.id);
        this.renderGrepExtract();
      });

      container.appendChild(div);
    });

    // Update table columns
    this.updateGrepColumns();
  },

  updateGrepColumns() {
    const headerRow = document.querySelector('#results-table thead tr');
    if (!headerRow) return;

    // Remove existing grep columns
    const grepHeader = document.getElementById('grep-columns');
    if (!grepHeader) return;

    grepHeader.innerHTML = '';

    // Add grep match columns
    this.grepMatchList.filter(g => g.enabled).forEach(grep => {
      const th = document.createElement('th');
      th.textContent = grep.pattern;
      th.className = 'grep-match-column';
      grepHeader.appendChild(th);
    });

    // Add grep extract columns
    this.grepExtractList.filter(g => g.enabled).forEach(grep => {
      const th = document.createElement('th');
      th.textContent = 'Extract: ' + grep.pattern;
      th.className = 'grep-extract-column';
      grepHeader.appendChild(th);
    });
  },

  collectPayloads() {
    const payloads = {};
    const container = document.getElementById('payload-sets');
    if (!container) return payloads;

    const sets = container.querySelectorAll('.payload-set');
    sets.forEach((set, idx) => {
      // Always get payloads from the textarea (all types end up there)
      const textarea = set.querySelector('.payload-list');
      if (textarea && textarea.value.trim()) {
        payloads[idx] = textarea.value.split('\n').filter(line => line.trim());
      } else {
        payloads[idx] = [];
      }
    });

    console.log('[Intruder] Collected payloads:', payloads);
    return payloads;
  },

  generateAttackCombinations() {
    const payloads = this.collectPayloads();
    const combinations = [];

    switch (this.attackMode) {
      case 'sniper':
        // Test each position with payloads from set 0
        const sniperPayloads = payloads[0] || [];
        this.positions.forEach((pos, posIdx) => {
          sniperPayloads.forEach(payload => {
            const combo = new Array(this.positions.length).fill('');
            combo[posIdx] = payload;
            combinations.push({ payloads: combo, displayName: `Pos ${posIdx + 1}: ${payload}` });
          });
        });
        break;

      case 'battering-ram':
        // All positions get same payload from set 0
        const ramPayloads = payloads[0] || [];
        ramPayloads.forEach(payload => {
          combinations.push({
            payloads: new Array(this.positions.length).fill(payload),
            displayName: payload
          });
        });
        break;

      case 'pitchfork':
        // Zip payloads together
        const maxLen = Math.max(...Object.values(payloads).map(p => p.length));
        for (let i = 0; i < maxLen; i++) {
          const combo = [];
          const displayParts = [];
          for (let j = 0; j < this.positions.length; j++) {
            const val = (payloads[j] || [])[i] || '';
            combo.push(val);
            displayParts.push(val);
          }
          combinations.push({
            payloads: combo,
            displayName: displayParts.join(' | ')
          });
        }
        break;

      case 'cluster-bomb':
        // Cartesian product
        const cartesian = (arr) => arr.reduce((a, b) => 
          a.flatMap(x => b.map(y => [...x, y])), [[]]
        );
        const payloadArrays = Object.values(payloads);
        const combos = cartesian(payloadArrays);
        combos.forEach(combo => {
          combinations.push({
            payloads: combo,
            displayName: combo.join(' | ')
          });
        });
        break;
    }

    return combinations;
  },

  async startAttack() {
    if (this.isAttacking) return;

    const template = document.getElementById('intruder-template')?.value;
    if (!template) {
      alert('❌ Please enter a request template!');
      return;
    }

    if (this.positions.length === 0) {
      alert('❌ No positions marked!\n\nUse § to mark payload positions or click "Auto-mark Parameters".');
      return;
    }

    // Check if payloads exist
    const payloads = this.collectPayloads();
    const hasPayloads = Object.values(payloads).some(p => p && p.length > 0);
    
    if (!hasPayloads) {
      alert('❌ No payloads configured!\n\nPlease add payloads to at least one payload set:\n• Type manually\n• Generate numbers\n• Import from file\n• Use payload library');
      return;
    }

    this.isAttacking = true;
    this.isPaused = false;
    this.attackResults = [];
    this.threadCount = parseInt(document.getElementById('thread-count')?.value || 4);
    this.requestDelay = parseInt(document.getElementById('request-delay')?.value || 0);
    
    // Update UI
    document.getElementById('start-attack').disabled = true;
    document.getElementById('pause-attack').disabled = false;
    document.getElementById('stop-attack').disabled = false;
    document.getElementById('attack-status').textContent = 'Running...';

    // Clear previous results
    document.getElementById('results-body').innerHTML = '';

    // Generate combinations
    const combinations = this.generateAttackCombinations();
    
    if (combinations.length === 0) {
      alert('❌ No attack combinations generated!\n\nCheck your payloads and positions.');
      this.stopAttack();
      return;
    }
    
    document.getElementById('attack-count').textContent = `0 / ${combinations.length}`;
    console.log(`[Intruder] Starting attack with ${combinations.length} requests`);

    // Get baseline response
    await this.getBaselineResponse(template);

    // Execute attacks with threading
    await this.executeAttacksThreaded(template, combinations);

    this.stopAttack();
  },

  async executeAttacksThreaded(template, combinations) {
    const chunks = [];
    for (let i = 0; i < combinations.length; i += this.threadCount) {
      chunks.push(combinations.slice(i, i + this.threadCount));
    }

    let completed = 0;

    for (const chunk of chunks) {
      while (this.isPaused && this.isAttacking) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!this.isAttacking) break;

      // Execute chunk in parallel
      await Promise.all(chunk.map(async (combo, idx) => {
        const globalIdx = completed + idx + 1;
        await this.executeAttack(template, combo.payloads, globalIdx, combo.displayName);
      }));

      completed += chunk.length;
      document.getElementById('attack-count').textContent = `${completed} / ${combinations.length}`;

      // Apply delay
      if (this.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      }
    }
  },

  async getBaselineResponse(template) {
    const request = this.buildRequest(template, new Array(this.positions.length).fill(''));
    const parsed = RequestReplay.parseRawRequest(request);
    
    if (parsed) {
      this.baselineResponse = await RequestReplay.send(parsed);
    }
  },

  async executeAttack(template, payloads, requestNum, displayName) {
    const request = this.buildRequest(template, payloads);
    const parsed = RequestReplay.parseRawRequest(request);
    
    if (!parsed) {
      console.error('[Intruder] Failed to parse request');
      return;
    }

    const startTime = Date.now();
    const response = await RequestReplay.send(parsed);
    const endTime = Date.now();

    // Apply grep matching
    const grepMatches = this.applyGrepMatch(response.body || '');
    const grepExtracts = this.applyGrepExtract(response.body || '');

    const result = {
      num: requestNum,
      payloads: displayName,
      request: request,  // Store the full request text
      status: response.status || 'Error',
      length: response.body?.length || 0,
      time: endTime - startTime,
      response: response,
      diff: this.calculateDiff(response),
      grepMatches,
      grepExtracts
    };

    console.log('[Intruder] Attack result:', {
      num: requestNum,
      status: result.status,
      requestLength: request.length,
      responseLength: result.length
    });

    this.attackResults.push(result);
    this.renderResult(result);
  },

  buildRequest(template, payloads) {
    let request = template;
    
    // Replace positions with payloads
    this.positions.forEach((pos, idx) => {
      const placeholder = `§${pos.placeholder}§`;
      request = request.replace(placeholder, payloads[idx] || '');
    });

    return request;
  },

  applyGrepMatch(responseBody) {
    const matches = {};
    
    this.grepMatchList.filter(g => g.enabled).forEach(grep => {
      matches[grep.pattern] = responseBody.includes(grep.pattern);
    });

    return matches;
  },

  applyGrepExtract(responseBody) {
    const extracts = {};
    
    this.grepExtractList.filter(g => g.enabled).forEach(grep => {
      try {
        const regex = new RegExp(grep.pattern, 'i');
        const match = responseBody.match(regex);
        extracts[grep.pattern] = match ? match[1] || match[0] : '';
      } catch (e) {
        extracts[grep.pattern] = 'Invalid regex';
      }
    });

    return extracts;
  },

  calculateDiff(response) {
    if (!this.baselineResponse || !response.body) return 0;
    
    const similarity = DiffUtil.similarity(this.baselineResponse.body, response.body);
    return Math.round(100 - similarity);
  },

  renderResult(result) {
    const tbody = document.getElementById('results-body');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.className = 'result-row';
    row.dataset.num = result.num;
    
    let html = `
      <td>${result.num}</td>
      <td class="payload-cell">${this.escapeHtml(result.payloads)}</td>
      <td class="status-${Math.floor(result.status / 100)}xx">${result.status}</td>
      <td>${result.length}</td>
      <td>${result.time}ms</td>
    `;

    // Add grep match columns
    this.grepMatchList.filter(g => g.enabled).forEach(grep => {
      const matched = result.grepMatches[grep.pattern];
      html += `<td class="${matched ? 'grep-match-yes' : 'grep-match-no'}">${matched ? '✓' : ''}</td>`;
    });

    // Add grep extract columns
    this.grepExtractList.filter(g => g.enabled).forEach(grep => {
      const extracted = result.grepExtracts[grep.pattern] || '';
      html += `<td class="grep-extract-cell"><code>${this.escapeHtml(extracted)}</code></td>`;
    });

    row.innerHTML = html;

    row.addEventListener('click', () => {
      this.showDiff(result);
    });

    tbody.appendChild(row);
  },

  showDiff(result) {
    console.log('[Intruder] Showing result details:', result);
    
    // Create modal to show request and response
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content large">
        <div class="modal-header">
          <h3>📊 Attack Result #${result.num}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="result-summary">
            <div class="summary-item">
              <strong>Payload:</strong>
              <code>${this.escapeHtml(result.payloads)}</code>
            </div>
            <div class="summary-item">
              <strong>Status:</strong>
              <span class="status-badge status-${Math.floor(result.status / 100)}xx">${result.status}</span>
            </div>
            <div class="summary-item">
              <strong>Length:</strong>
              <span>${result.length} bytes</span>
            </div>
            <div class="summary-item">
              <strong>Time:</strong>
              <span>${result.time}ms</span>
            </div>
          </div>
          
          <div class="tabs-container">
            <div class="tabs-header">
              <button class="tab-btn active" data-tab="request">📤 Request</button>
              <button class="tab-btn" data-tab="response">📥 Response</button>
              ${this.baselineResponse ? '<button class="tab-btn" data-tab="diff">🔍 Diff</button>' : ''}
            </div>
            
            <div class="tab-content active" data-tab="request">
              <h4>Request Sent</h4>
              <pre class="code-viewer"><code>${this.escapeHtml(result.request || 'Request not available')}</code></pre>
            </div>
            
            <div class="tab-content" data-tab="response">
              <h4>Response Received</h4>
              <div class="response-full">
                <div class="response-status-line">
                  <strong>HTTP/1.1 ${result.response?.status || 'N/A'} ${result.response?.statusText || ''}</strong>
                </div>
                <div class="response-headers">
                  <h5>Headers:</h5>
                  <pre><code>${this.formatResponseHeaders(result.response?.headers)}</code></pre>
                </div>
                <div class="response-body-section">
                  <h5>Body:</h5>
                  <pre class="code-viewer"><code>${this.escapeHtml(result.response?.body || 'No response body')}</code></pre>
                </div>
              </div>
            </div>
            
            ${this.baselineResponse ? `
            <div class="tab-content" data-tab="diff">
              <h4>Diff vs Baseline</h4>
              <div id="diff-content-modal"></div>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-cancel btn">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bind tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
        
        // Render diff if needed
        if (tabName === 'diff' && this.baselineResponse && result.response) {
          const diffContent = modal.querySelector('#diff-content-modal');
          if (diffContent && !diffContent.innerHTML) {
            diffContent.innerHTML = this.renderDiff(this.baselineResponse, result.response);
          }
        }
      });
    });
    
    // Bind close
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.querySelector('.modal-cancel').onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  },

  exportResults() {
    if (this.attackResults.length === 0) {
      alert('No results to export');
      return;
    }

    let csv = '#,Payload,Status,Length,Time(ms)';
    
    // Add grep columns
    this.grepMatchList.filter(g => g.enabled).forEach(g => csv += ',' + g.pattern);
    this.grepExtractList.filter(g => g.enabled).forEach(g => csv += ',Extract:' + g.pattern);
    csv += '\n';

    this.attackResults.forEach(result => {
      csv += `${result.num},"${result.payloads}",${result.status},${result.length},${result.time}`;
      
      this.grepMatchList.filter(g => g.enabled).forEach(g => {
        csv += ',' + (result.grepMatches[g.pattern] ? 'YES' : 'NO');
      });

      this.grepExtractList.filter(g => g.enabled).forEach(g => {
        csv += ',"' + (result.grepExtracts[g.pattern] || '') + '"';
      });

      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intruder-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  clearResults() {
    this.attackResults = [];
    document.getElementById('results-body').innerHTML = '';
    document.getElementById('attack-count').textContent = '0 / 0';
  },

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('pause-attack');
    if (btn) {
      btn.innerHTML = this.isPaused ? '<span>▶️</span> Resume' : '<span>⏸️</span> Pause';
    }
    document.getElementById('attack-status').textContent = this.isPaused ? 'Paused' : 'Running...';
  },

  stopAttack() {
    this.isAttacking = false;
    this.isPaused = false;
    
    document.getElementById('start-attack').disabled = false;
    document.getElementById('pause-attack').disabled = true;
    document.getElementById('stop-attack').disabled = true;
    document.getElementById('attack-status').textContent = 'Completed';
  },

  toggleDiffView(enabled) {
    // Future: Toggle inline diff in table
  },

  loadOptions() {
    // Load saved grep patterns and options
    const saved = localStorage.getItem('repplus_intruder_options');
    if (saved) {
      try {
        const options = JSON.parse(saved);
        this.grepMatchList = options.grepMatch || [];
        this.grepExtractList = options.grepExtract || [];
        this.renderGrepMatch();
        this.renderGrepExtract();
      } catch (e) {
        console.error('Failed to load intruder options:', e);
      }
    }
  },

  saveOptions() {
    const options = {
      grepMatch: this.grepMatchList,
      grepExtract: this.grepExtractList
    };
    localStorage.setItem('repplus_intruder_options', JSON.stringify(options));
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatResponseHeaders(headers) {
    if (!headers) return 'No headers';
    
    if (typeof headers === 'object') {
      return Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    
    return headers.toString();
  },

  renderDiff(baseline, current) {
    const baselineBody = baseline.body || '';
    const currentBody = current.body || '';
    
    // Status comparison
    const statusDiff = baseline.status !== current.status 
      ? `<div class="diff-status changed">Status: ${baseline.status} → ${current.status}</div>`
      : `<div class="diff-status same">Status: ${current.status} (unchanged)</div>`;
    
    // Length comparison
    const lengthDiff = baselineBody.length !== currentBody.length
      ? `<div class="diff-length changed">Length: ${baselineBody.length} → ${currentBody.length} bytes (${currentBody.length - baselineBody.length > 0 ? '+' : ''}${currentBody.length - baselineBody.length})</div>`
      : `<div class="diff-length same">Length: ${currentBody.length} bytes (unchanged)</div>`;
    
    // Simple line-by-line diff
    const baselineLines = baselineBody.split('\n');
    const currentLines = currentBody.split('\n');
    const maxLines = Math.max(baselineLines.length, currentLines.length);
    
    let diffHtml = '<div class="diff-comparison"><div class="diff-side"><h5>Baseline</h5><pre>';
    for (let i = 0; i < maxLines; i++) {
      const line = baselineLines[i] || '';
      const currentLine = currentLines[i] || '';
      const isDifferent = line !== currentLine;
      diffHtml += `<div class="diff-line ${isDifferent ? 'removed' : ''}">${this.escapeHtml(line)}</div>`;
    }
    diffHtml += '</pre></div><div class="diff-side"><h5>Current</h5><pre>';
    for (let i = 0; i < maxLines; i++) {
      const line = currentLines[i] || '';
      const baselineLine = baselineLines[i] || '';
      const isDifferent = line !== baselineLine;
      diffHtml += `<div class="diff-line ${isDifferent ? 'added' : ''}">${this.escapeHtml(line)}</div>`;
    }
    diffHtml += '</pre></div></div>';
    
    return statusDiff + lengthDiff + diffHtml;
  },

  bindLibraryButtons() {
    document.querySelectorAll('.library-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.loadPayloadLibrary(type);
      });
    });
  },

  loadPayloadLibrary(type) {
    const payloads = this.getPayloadLibrary(type);
    
    // Find the first payload textarea
    const firstPayloadArea = document.querySelector('.payload-list[data-set="0"]');
    if (firstPayloadArea) {
      firstPayloadArea.value = payloads.join('\n');
      alert(`✅ Loaded ${payloads.length} payloads from ${type} library!`);
    } else {
      alert('⚠️ Please mark at least one position first!');
    }
  },

  getPayloadLibrary(type) {
    const libraries = {
      'numbers': Array.from({length: 100}, (_, i) => i + 1),
      'common-passwords': [
        'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567', 
        'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
        'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
        'qazwsx', 'michael', 'Football', 'admin', 'password1', 'welcome', 'login'
      ],
      'sql-injection': [
        "' OR '1'='1", "' OR '1'='1' --", "' OR '1'='1' /*", "admin' --", "admin' #",
        "' OR 1=1--", "' OR 1=1#", "' OR 1=1/*", "') OR '1'='1--", "') OR ('1'='1--",
        "1' ORDER BY 1--+", "1' ORDER BY 2--+", "1' ORDER BY 3--+",
        "1' UNION SELECT NULL--", "1' UNION SELECT NULL,NULL--",
        "' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055",
        "admin'/*", "' or 1=1 limit 1 -- -+", "' OR '1'='1' LIMIT 1 -- -+"
      ],
      'xss': [
        '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg/onload=alert(1)>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>', 
        '<iframe src=javascript:alert(1)>', '<body onload=alert(1)>',
        '<input autofocus onfocus=alert(1)>', '<select autofocus onfocus=alert(1)>',
        '<textarea autofocus onfocus=alert(1)>', '<keygen autofocus onfocus=alert(1)>',
        '<video><source onerror="alert(1)">', '<audio src=x onerror=alert(1)>',
        '<details open ontoggle=alert(1)>', '<marquee onstart=alert(1)>'
      ],
      'path-traversal': [
        '../', '../../', '../../../', '../../../../', '../../../../../',
        '..\\', '..\\..\\', '..\\..\\..\\', '..\\..\\..\\..\\',
        '..../', '....\\', '....//', '....\\\\',
        '%2e%2e/', '%2e%2e%2f', '..%2f', '%2e%2e%5c', '..%5c',
        '..;/', '..;\\', '/etc/passwd', 'C:\\Windows\\System32\\',
        '/var/www/', '/usr/local/', '/home/', 'C:\\inetpub\\wwwroot\\'
      ],
      'command-injection': [
        '; ls', '| ls', '`ls`', '$(ls)', '; whoami', '| whoami', '`whoami`', '$(whoami)',
        '; cat /etc/passwd', '| cat /etc/passwd', '`cat /etc/passwd`',
        '; ping -c 4 127.0.0.1', '| ping -c 4 127.0.0.1',
        '; sleep 5', '| sleep 5', '`sleep 5`', '$(sleep 5)',
        '& dir', '&& dir', '| dir', '; dir', '`dir`'
      ],
      'usernames': [
        'admin', 'administrator', 'root', 'user', 'test', 'guest', 'info', 'adm',
        'mysql', 'user', 'administrator', 'oracle', 'ftp', 'pi', 'puppet', 'ansible',
        'ec2-user', 'vagrant', 'azureuser', 'support', 'demo', 'webmaster', 'backup'
      ],
      'fuzzing': [
        'A'.repeat(100), 'A'.repeat(1000), 'A'.repeat(10000),
        '0', '-1', '99999999', '-99999999', '2147483647', '-2147483648',
        'null', 'NULL', 'undefined', 'NaN', 'true', 'false',
        '{}', '[]', '""', "''", '<>', '\\x00', '%00', '\n', '\r\n',
        '!@#$%^&*()', '../../../../../../etc/passwd'
      ]
    };
    
    return libraries[type] || [];
  },

  loadFromRepeater(requestText, requestObject) {
    console.log('[Intruder] Loading request from Repeater:', requestObject);
    
    // Set the request template
    const templateEditor = document.getElementById('intruder-template');
    if (templateEditor) {
      templateEditor.value = requestText;
    }
    
    // Auto-detect positions
    this.detectPositions();
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      font-size: 14px;
      font-weight: 600;
    `;
    notification.innerHTML = `
      ✅ Request loaded from Repeater!<br>
      <small style="opacity:0.9;font-weight:400;">Mark injection points with §§</small>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
};

window.IntruderUI = IntruderUI;
