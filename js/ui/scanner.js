/**
 * rep+ Secret Scanner UI
 */

console.log('[Scanner] 🔍 Scanner module loading...');

const ScannerUI = {
  secrets: [],
  vulnerabilities: [],
  scannedFiles: 0,
  aiValidated: 0,
  scanResults: new Map(), // Store scan results per finding

  init() {
    console.log('[Scanner] 🚀 Initializing Scanner UI...');
    
    // Add visual indicator that scanner loaded
    const scannerPanel = document.getElementById('scanner-panel');
    if (scannerPanel) {
      const indicator = document.createElement('div');
      indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:10px;z-index:9999;border-radius:5px;';
      indicator.textContent = '✅ Scanner Loaded';
      scannerPanel.appendChild(indicator);
      setTimeout(() => indicator.remove(), 3000);
    }
    
    this.bindEvents();
    console.log('[Scanner] ✅ Scanner UI initialized');
  },

  bindEvents() {
    console.log('[Scanner] Binding events...');
    
    const scanJsBtn = document.getElementById('scan-js-files');
    if (scanJsBtn) {
      scanJsBtn.addEventListener('click', () => {
        console.log('[Scanner] Scan JS files clicked');
        this.scanJavaScriptFiles();
      });
      console.log('[Scanner] scan-js-files bound');
    } else {
      console.error('[Scanner] scan-js-files button not found!');
    }

    const scanAllBtn = document.getElementById('scan-all-responses');
    if (scanAllBtn) {
      scanAllBtn.addEventListener('click', () => {
        console.log('[Scanner] Scan all responses clicked');
        this.scanAllResponses();
      });
      console.log('[Scanner] scan-all-responses bound');
    }

    const scanHeadersBtn = document.getElementById('scan-headers');
    if (scanHeadersBtn) {
      scanHeadersBtn.addEventListener('click', () => {
        console.log('[Scanner] Scan headers clicked');
        this.scanHeaders();
      });
      console.log('[Scanner] scan-headers bound');
    }

    const validateBtn = document.getElementById('validate-with-ai');
    if (validateBtn) {
      validateBtn.addEventListener('click', () => {
        console.log('[Scanner] ✨ AI Validate button clicked!');
        this.validateWithAI();
      });
      console.log('[Scanner] ✅ validate-with-ai button bound successfully');
    } else {
      console.error('[Scanner] ❌ validate-with-ai button NOT FOUND!');
    }

    document.getElementById('secret-search')?.addEventListener('input', (e) => {
      this.filterSecrets(e.target.value);
    });

    document.getElementById('confidence-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('type-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });

    document.getElementById('validation-filter')?.addEventListener('change', () => {
      this.applyFilters();
    });
    
    console.log('[Scanner] All events bound');
  },

  async scanJavaScriptFiles() {
    const requests = RequestCapture.getRequests();
    const jsRequests = requests.filter(req => 
      req.response?.mimeType?.includes('javascript') || 
      req.url.endsWith('.js')
    );

    if (jsRequests.length === 0) {
      alert('No JavaScript files captured. Browse the target site first.');
      return;
    }

    this.secrets = [];
    this.scannedFiles = 0;
    document.getElementById('secrets-list').innerHTML = '<div class="spinner"></div> Scanning...';

    for (const req of jsRequests) {
      await this.scanFile(req);
    }

    this.updateStats();
    this.renderSecrets();
  },

  async scanFile(request) {
    this.scannedFiles++;
    
    const content = request.response?.body || '';
    const patterns = this.getSecretPatterns();

    for (const pattern of patterns) {
      const matches = content.matchAll(new RegExp(pattern.regex, 'g'));
      
      for (const match of matches) {
        const secret = match[1] || match[0];
        const analysis = EntropyCalculator.analyzeSecret(secret);
        
        // Filter low confidence matches
        if (analysis.confidence === 'low' && analysis.score < 30) {
          continue;
        }

        this.secrets.push({
          type: pattern.type,
          value: secret,
          file: request.url,
          confidence: analysis.confidence,
          entropy: analysis.entropy.toFixed(2),
          length: secret.length,
          context: this.getContext(content, match.index, 50),
          fullContext: this.getContext(content, match.index, 200),
          lineNumber: this.getLineNumber(content, match.index),
          sourceBody: content // Store full source for AI analysis
        });
      }
    }
  },

  getSecretPatterns() {
    return [
      {
        type: 'api_key',
        regex: /(?:api[_-]?key|apikey)["\']?\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})/gi
      },
      {
        type: 'jwt',
        regex: /(eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/g
      },
      {
        type: 'private_key',
        regex: /(-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----)/g
      },
      {
        type: 'password',
        regex: /(?:password|passwd|pwd)["\']?\s*[:=]\s*["']([^"'\s]{6,})/gi
      },
      {
        type: 'token',
        regex: /(?:token|access[_-]?token)["\']?\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})/gi
      },
      {
        type: 'aws_key',
        regex: /(AKIA[0-9A-Z]{16})/g
      },
      {
        type: 'github_token',
        regex: /(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})/g
      },
      {
        type: 'slack_token',
        regex: /(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,32})/g
      },
      {
        type: 'google_api',
        regex: /(AIza[0-9A-Za-z_\-]{35})/g
      },
      {
        type: 'firebase',
        regex: /(?:firebase|FIREBASE)["\']?\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})/gi
      }
    ];
  },

  getContext(content, index, length) {
    const start = Math.max(0, index - length);
    const end = Math.min(content.length, index + length);
    return '...' + content.substring(start, end) + '...';
  },

  getLineNumber(content, index) {
    const beforeMatch = content.substring(0, index);
    return beforeMatch.split('\n').length;
  },

  updateStats() {
    document.getElementById('files-scanned').textContent = this.scannedFiles;
    document.getElementById('secrets-found').textContent = this.secrets.length;
    
    const high = this.secrets.filter(s => s.confidence === 'high').length;
    const medium = this.secrets.filter(s => s.confidence === 'medium').length;
    
    document.getElementById('high-confidence').textContent = high;
    document.getElementById('medium-confidence').textContent = medium;
  },

  renderSecrets() {
    const container = document.getElementById('secrets-list');
    if (!container) return;

    const allFindings = [...this.secrets, ...this.vulnerabilities];
    
    if (allFindings.length === 0) {
      container.innerHTML = '<p class="text-muted">No findings. Run a scan to detect secrets and vulnerabilities.</p>';
      return;
    }

    container.innerHTML = '';
    
    // Render secrets
    this.secrets.forEach((secret, idx) => {
      const div = document.createElement('div');
      div.className = 'secret-item';
      div.classList.add(`confidence-${secret.confidence}`);
      if (secret.validated) div.classList.add('validated');
      if (secret.aiValidation === 'FALSE_POSITIVE') div.classList.add('false-positive');
      
      div.innerHTML = `
        <div class="secret-header">
          <span class="secret-type">${secret.type.replace('_', ' ').toUpperCase()}</span>
          <span class="confidence-badge ${secret.validated && secret.aiSeverity ? secret.aiSeverity.toLowerCase() : secret.confidence}">${secret.validated && secret.aiSeverity ? secret.aiSeverity : secret.confidence}</span>
          ${secret.validated ? this.renderValidationBadge(secret) : ''}
        </div>
        <div class="secret-value">
          <code>${this.truncate(secret.value, 60)}</code>
          <button class="btn-small copy-btn" data-value="${secret.value}">Copy</button>
        </div>
        <div class="secret-meta">
          <span>Entropy: ${secret.entropy}</span>
          <span>Length: ${secret.length}</span>
          ${secret.lineNumber ? `<span>Line: ${secret.lineNumber}</span>` : ''}
        </div>
        <div class="secret-file">
          <small title="${secret.file}">${this.truncateUrl(secret.file)}</small>
        </div>
        <details class="secret-context">
          <summary>📄 Show Code Context</summary>
          <pre><code>${secret.context}</code></pre>
        </details>
        ${secret.validated ? this.renderAIAnalysisDetails(secret) : ''}
      `;
      
      container.appendChild(div);
    });

    // Render vulnerabilities
    this.vulnerabilities.forEach((vuln, idx) => {
      const div = document.createElement('div');
      div.className = 'secret-item vulnerability-item';
      div.classList.add(`severity-${vuln.severity}`);
      if (vuln.validated) div.classList.add('validated');
      if (vuln.aiValidation === 'FALSE_POSITIVE') div.classList.add('false-positive');
      
      div.innerHTML = `
        <div class="secret-header">
          <span class="secret-type">${vuln.type.replace('_', ' ').toUpperCase()}</span>
          <span class="confidence-badge ${vuln.severity}">${vuln.severity}</span>
          ${vuln.validated ? this.renderValidationBadge(vuln) : ''}
        </div>
        <div class="vuln-title"><strong>${vuln.title}</strong></div>
        <div class="vuln-details">${vuln.details}</div>
        <div class="secret-file">
          <small>${this.truncateUrl(vuln.url)}</small>
        </div>
        ${vuln.validated ? this.renderAIAnalysis(vuln) : ''}
        <details class="secret-context">
          <summary>🔧 Remediation</summary>
          <p>${vuln.remediation}</p>
        </details>
        ${vuln.validated ? this.renderAIAnalysisDetails(vuln) : ''}
      `;
      
      container.appendChild(div);
    });

    // Bind copy buttons
    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const value = e.target.dataset.value;
        navigator.clipboard.writeText(value);
        e.target.textContent = 'Copied!';
        setTimeout(() => {
          e.target.textContent = 'Copy';
        }, 2000);
      });
    });
  },

  renderValidationBadge(finding) {
    const isValid = finding.aiValidation === 'TRUE_POSITIVE';
    const badgeClass = isValid ? 'validation-badge valid' : 'validation-badge invalid';
    const icon = isValid ? '✓' : '✗';
    const text = isValid ? 'Valid' : 'False Positive';
    const severity = finding.aiSeverity ? ` - ${finding.aiSeverity}` : '';
    
    return `<span class="${badgeClass}">${icon} ${text}${severity}</span>`;
  },

  renderAIAnalysis(finding) {
    console.log('[Scanner] Rendering AI analysis for:', finding.type, 'validated:', finding.validated, 'explanation:', finding.aiExplanation);
    
    if (!finding.aiExplanation || finding.aiExplanation === 'No explanation provided.') {
      return `
        <div class="ai-validation">
          <div class="ai-verdict"><strong>⚠️ AI VALIDATION INCOMPLETE</strong></div>
          <div class="ai-explanation">The AI response could not be parsed. Check console for details.</div>
        </div>
      `;
    }
    
    const isValid = finding.aiValidation === 'TRUE_POSITIVE';
    const validityClass = isValid ? 'ai-validation valid' : 'ai-validation invalid';
    const validityText = isValid ? '✓ VALID FINDING' : '✗ FALSE POSITIVE';
    
    return `
      <div class="${validityClass}">
        <div class="ai-verdict"><strong>${validityText}</strong></div>
        <div class="ai-explanation">${finding.aiExplanation}</div>
      </div>
    `;
  },

  renderAIAnalysisDetails(finding) {
    if (!finding.aiExplanation) {
      return '';
    }
    
    const isValid = finding.aiValidation === 'TRUE_POSITIVE';
    const icon = isValid ? '🔴' : '✅';
    const title = isValid ? 'Security Risk Analysis' : 'False Positive Analysis';
    
    // Format the AI response for better readability
    const formattedExplanation = finding.aiExplanation
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')  // Bold text
      .replace(/\n\n/g, '</p><p>')  // Paragraphs
      .replace(/\n/g, '<br>');  // Line breaks
    
    return `
      <details class="ai-analysis-details">
        <summary>${icon} AI ${title}</summary>
        <div class="ai-detailed-explanation">
          <div class="ai-meta">
            <span><strong>Validation:</strong> ${finding.aiValidation === 'TRUE_POSITIVE' ? 'Valid Security Issue' : 'False Positive'}</span>
            <span><strong>AI Severity:</strong> ${finding.aiSeverity || 'N/A'}</span>
          </div>
          <div class="ai-full-explanation">
            <p>${formattedExplanation}</p>
          </div>
        </div>
      </details>
    `;
  },

  filterSecrets(query) {
    this.applyFilters();
  },

  applyFilters() {
    const query = document.getElementById('secret-search')?.value || '';
    const confidence = document.getElementById('confidence-filter')?.value || 'all';
    const type = document.getElementById('type-filter')?.value || 'all';

    let filtered = this.secrets;

    if (confidence !== 'all') {
      filtered = filtered.filter(s => s.confidence === confidence);
    }

    if (type !== 'all') {
      filtered = filtered.filter(s => s.type === type);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(s => 
        s.value.toLowerCase().includes(lowerQuery) ||
        s.file.toLowerCase().includes(lowerQuery) ||
        s.type.toLowerCase().includes(lowerQuery)
      );
    }

    this.renderFilteredSecrets(filtered);
  },

  renderFilteredSecrets(filtered) {
    // Similar to renderSecrets but with filtered array
    const container = document.getElementById('secrets-list');
    if (!container) return;

    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-muted">No matching secrets.</p>';
      return;
    }

    container.innerHTML = '';
    filtered.forEach(secret => {
      const div = document.createElement('div');
      div.className = 'secret-item';
      div.classList.add(`confidence-${secret.confidence}`);
      div.innerHTML = `
        <div class="secret-header">
          <span class="secret-type">${secret.type.replace('_', ' ').toUpperCase()}</span>
          <span class="confidence-badge ${secret.confidence}">${secret.confidence}</span>
        </div>
        <div class="secret-value"><code>${this.truncate(secret.value, 60)}</code></div>
        <div class="secret-file"><small>${this.truncateUrl(secret.file)}</small></div>
      `;
      container.appendChild(div);
    });
  },

  truncate(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop();
    } catch {
      return url;
    }
  },

  // Scan all captured responses for secrets and vulnerabilities
  async scanAllResponses() {
    const requests = RequestCapture.getRequests();
    
    if (requests.length === 0) {
      alert('No requests captured. Browse the target site first.');
      return;
    }

    this.secrets = [];
    this.vulnerabilities = [];
    this.scannedFiles = 0;
    document.getElementById('secrets-list').innerHTML = '<div class="spinner"></div> Scanning all responses...';

    for (const req of requests) {
      if (req.response?.body) {
        await this.scanFile(req);
        await this.scanForVulnerabilities(req);
      }
    }

    this.updateStats();
    this.renderSecrets();
  },

  // Scan HTTP headers for security issues
  async scanHeaders() {
    const requests = RequestCapture.getRequests();
    
    if (requests.length === 0) {
      alert('No requests captured. Browse the target site first.');
      return;
    }

    this.vulnerabilities = [];
    this.secrets = [];
    document.getElementById('secrets-list').innerHTML = '<div class="spinner"></div> Scanning headers...';

    for (const req of requests) {
      this.checkSecurityHeaders(req);
    }

    this.updateStats();
    this.renderSecrets();
  },

  // Check for missing or misconfigured security headers
  checkSecurityHeaders(request) {
    const headers = request.response?.headers || {};
    const url = request.url;

    // Check for missing security headers
    const securityHeaders = {
      'strict-transport-security': 'Missing HSTS header',
      'x-frame-options': 'Missing X-Frame-Options (Clickjacking risk)',
      'x-content-type-options': 'Missing X-Content-Type-Options',
      'content-security-policy': 'Missing Content-Security-Policy',
      'x-xss-protection': 'Missing X-XSS-Protection'
    };

    for (const [header, issue] of Object.entries(securityHeaders)) {
      if (!headers[header] && !headers[header.toUpperCase()]) {
        this.vulnerabilities.push({
          type: 'missing_header',
          severity: 'medium',
          title: issue,
          url: url,
          details: `The ${header} header is not set, which may expose the application to security risks.`,
          remediation: `Add the ${header} header to all responses.`,
          validated: false
        });
      }
    }

    // Check for insecure cookies
    const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      cookies.forEach(cookie => {
        if (!cookie.includes('Secure')) {
          this.vulnerabilities.push({
            type: 'insecure_cookie',
            severity: 'high',
            title: 'Cookie without Secure flag',
            url: url,
            details: `Cookie: ${cookie.split(';')[0]}`,
            remediation: 'Add Secure flag to all cookies transmitted over HTTPS.',
            validated: false
          });
        }
        if (!cookie.includes('HttpOnly')) {
          this.vulnerabilities.push({
            type: 'insecure_cookie',
            severity: 'medium',
            title: 'Cookie without HttpOnly flag',
            url: url,
            details: `Cookie: ${cookie.split(';')[0]}`,
            remediation: 'Add HttpOnly flag to prevent XSS attacks from stealing cookies.',
            validated: false
          });
        }
      });
    }
  },

  // Scan for common vulnerabilities in responses
  async scanForVulnerabilities(request) {
    const body = request.response?.body || '';
    const url = request.url;

    // Check for SQL error messages
    const sqlErrors = [
      /SQL syntax.*MySQL/i,
      /Warning.*mysql_/i,
      /valid MySQL result/i,
      /MySqlClient\./i,
      /PostgreSQL.*ERROR/i,
      /Warning.*pg_/i,
      /valid PostgreSQL result/i,
      /Npgsql\./i,
      /Driver.*SQL Server/i,
      /OLE DB.*SQL Server/i,
      /SQLServer JDBC Driver/i,
      /Oracle error/i,
      /Oracle.*Driver/i,
      /Warning.*oci_/i
    ];

    for (const pattern of sqlErrors) {
      if (pattern.test(body)) {
        this.vulnerabilities.push({
          type: 'sql_error',
          severity: 'high',
          title: 'SQL Error Message Disclosure',
          url: url,
          details: 'Database error messages detected in response. This may indicate SQL injection vulnerability.',
          remediation: 'Implement proper error handling and never display database errors to users.',
          validated: false,
          responseBody: body // Store for AI analysis
        });
        break;
      }
    }

    // Check for stack traces
    if (body.match(/at\s+[\w\.]+\([^\)]+:\d+:\d+\)/i) || body.match(/Traceback \(most recent call last\)/i)) {
      this.vulnerabilities.push({
        type: 'stack_trace',
        severity: 'medium',
        title: 'Stack Trace Disclosure',
        url: url,
        details: 'Application stack trace detected in response.',
        remediation: 'Disable debug mode in production and implement custom error pages.',
        validated: false,
        responseBody: body
      });
    }

    // Check for directory listing
    if (body.match(/<title>Index of/i) || body.match(/Parent Directory/i)) {
      this.vulnerabilities.push({
        type: 'directory_listing',
        severity: 'medium',
        title: 'Directory Listing Enabled',
        url: url,
        details: 'Directory listing is enabled, exposing file structure.',
        remediation: 'Disable directory listing in web server configuration.',
        validated: false,
        responseBody: body.substring(0, 1000) // Store sample
      });
    }
  },

  // Validate findings with AI
  async validateWithAI() {
    try {
      console.log('[Scanner] validateWithAI called');
      
      if (this.secrets.length === 0 && this.vulnerabilities.length === 0) {
        alert('❌ No findings to validate. Run a scan first.');
        return;
      }

      // Get unvalidated findings
      const unvalidatedSecrets = this.secrets.filter(f => !f.validated);
      const unvalidatedVulns = this.vulnerabilities.filter(f => !f.validated);
      const unvalidated = [...unvalidatedSecrets, ...unvalidatedVulns];

      console.log('[Scanner] Total findings:', this.secrets.length + this.vulnerabilities.length);
      console.log('[Scanner] Unvalidated findings:', unvalidated.length);

      if (unvalidated.length === 0) {
        alert('✅ All findings have already been validated!');
        return;
      }

      // Check if AIManager exists
      if (!window.AIManager) {
        alert('❌ AI Manager not available.\n\nPlease:\n1. Go to Settings tab\n2. Configure your AI provider (OpenAI/Anthropic/Gemini)\n3. Add your API key\n4. Try again');
        console.error('[Scanner] AIManager not found');
        return;
      }

      console.log('[Scanner] Starting AI validation for', unvalidated.length, 'findings');
      
      const container = document.getElementById('secrets-list');
      container.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <div class="spinner"></div>
          <h3>🤖 AI Validation in Progress...</h3>
          <p>Analyzing ${unvalidated.length} finding(s) with AI</p>
          <p style="color:#888;">This may take a few seconds...</p>
        </div>
      `;

      const prompt = this.generateValidationPrompt(unvalidated);
      console.log('[Scanner] Generated prompt:', prompt.substring(0, 500) + '...');
      
      let aiResponse = '';

      await AIManager.sendMessage(prompt, (chunk) => {
        aiResponse += chunk;
      });

      console.log('[Scanner] Received AI response, length:', aiResponse.length);

      // Parse AI response and update findings
      this.parseAIValidation(aiResponse, unvalidated);
      
      // Count all validated findings
      const validatedSecrets = this.secrets.filter(f => f.validated).length;
      const validatedVulns = this.vulnerabilities.filter(f => f.validated).length;
      this.aiValidated = validatedSecrets + validatedVulns;
      
      console.log('[Scanner] Total AI validated:', this.aiValidated);
      
      this.updateStats();
      this.renderSecrets();
      
      // Show success message
      alert(`✅ AI Validation Complete!\n\n${this.aiValidated} finding(s) validated.\n\nExpand each finding to see detailed AI analysis.`);

    } catch (error) {
      console.error('[Scanner] AI validation error:', error);
      console.error('[Scanner] Error stack:', error.stack);
      alert('❌ AI validation failed!\n\n' + error.message + '\n\nPlease check:\n1. AI provider is configured in Settings\n2. API key is valid\n3. You have internet connection');
      this.renderSecrets();
    }
  },

  generateValidationPrompt(findings) {
    // Limit to 5 findings for detailed analysis
    const findingsToAnalyze = findings.slice(0, 5);
    
    const detailedFindings = findingsToAnalyze.map((f, idx) => {
      let details = `\n=== Finding ${idx + 1} ===\n`;
      
      if (f.type === 'sql_error' || f.type === 'stack_trace' || f.type === 'missing_header' || f.type === 'insecure_cookie' || f.type === 'directory_listing') {
        // Vulnerability
        details += `Type: ${f.type.toUpperCase()}\n`;
        details += `Title: ${f.title}\n`;
        details += `URL: ${f.url}\n`;
        details += `Severity: ${f.severity}\n`;
        details += `Details: ${f.details}\n`;
        
        // Add response body context if available
        if (f.responseBody) {
          details += `\nResponse Context (first 500 chars):\n${f.responseBody.substring(0, 500)}\n`;
        }
      } else {
        // Secret
        details += `Type: ${f.type.toUpperCase()}\n`;
        details += `Value: ${f.value}\n`;
        details += `File: ${f.file}\n`;
        details += `Line: ${f.lineNumber || 'unknown'}\n`;
        details += `Confidence: ${f.confidence}\n`;
        details += `Entropy: ${f.entropy}\n`;
        details += `Length: ${f.length}\n`;
        details += `\nCode Context:\n${f.fullContext || f.context}\n`;
        
        // Add surrounding code analysis
        if (f.sourceBody) {
          const snippet = this.getRelevantSourceSnippet(f.sourceBody, f.value);
          details += `\nRelevant Source Code:\n${snippet}\n`;
        }
      }
      
      return details;
    }).join('\n');

    return `You are a senior security analyst. Analyze these security findings and determine if they are real threats or false positives.

${detailedFindings}

CRITICAL INSTRUCTIONS:
For EACH finding, you MUST respond in EXACTLY this format (the pipe | symbols are REQUIRED):

Finding 1: FALSE_POSITIVE | LOW | The value "YGBbZDzs+0gQE2Hd31kbdc__pnYePSA" appears to be a CSRF (Cross-Site Request Forgery) token in the context provided. CSRF tokens are typically used to protect against CSRF attacks by ensuring that requests made from user browsers include a unique token generated on the server-side and validated upon submission.

**WHERE exactly the issue is:** The token is found within a JSON object in file: https://zero.com/api/csrftoken, at line 1.

**WHY it's valid or false positive:** This is a FALSE POSITIVE. The value found does not match any known pattern for Google API keys (AIza). Furthermore, it seems to be a CSRF token, which is usually shorter and more predictable than a full API key. Additionally, the value does not match any known pattern for secret tokens, especially since it's described as a CSRF token, which is not typically indicative of an API key or secret token.

**WHAT makes it dangerous (if valid):** N/A - This is a false positive.

**HOW it could be exploited (if valid):** N/A - This is a false positive.

**RECOMMENDATIONS:** No action needed. This is a CSRF token used for security purposes and is not a leaked secret or API key.

IMPORTANT RULES:
1. Start each finding with "Finding N:" (where N is the number)
2. Follow with either TRUE_POSITIVE or FALSE_POSITIVE
3. Then add " | " (pipe with spaces)
4. Then add severity: CRITICAL, HIGH, MEDIUM, or LOW
5. Then add " | " (pipe with spaces)
6. Then provide your detailed explanation with all sections

Analyze all findings now:`;
  },

  getRelevantSourceSnippet(sourceBody, value) {
    // Find the value in source and get surrounding function/block
    const index = sourceBody.indexOf(value);
    if (index === -1) return 'Source not found';
    
    // Get more context - look for function boundaries
    let start = Math.max(0, index - 300);
    let end = Math.min(sourceBody.length, index + 300);
    
    // Try to find function start
    const beforeValue = sourceBody.substring(0, index);
    const functionMatch = beforeValue.lastIndexOf('function');
    const arrowMatch = beforeValue.lastIndexOf('=>');
    const blockMatch = beforeValue.lastIndexOf('{');
    
    if (functionMatch > start) start = functionMatch;
    else if (arrowMatch > start) start = arrowMatch - 50;
    else if (blockMatch > start) start = blockMatch;
    
    return sourceBody.substring(start, end);
  },

  parseAIValidation(aiResponse, findings) {
    console.log('[Scanner] ===== AI VALIDATION PARSING =====');
    console.log('[Scanner] Full AI Response:', aiResponse);
    console.log('[Scanner] Total findings to validate:', findings.length);
    
    const lines = aiResponse.split('\n');
    let parsedCount = 0;
    
    lines.forEach((line, lineIdx) => {
      // Try multiple regex patterns to match different AI response formats
      let match = line.match(/Finding\s+(\d+):\s*(TRUE_POSITIVE|FALSE_POSITIVE)\s*\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*\|\s*(.+)/i);
      
      // Alternative format: Finding 1 - TRUE_POSITIVE - HIGH - explanation
      if (!match) {
        match = line.match(/Finding\s+(\d+)\s*[-:]\s*(TRUE_POSITIVE|FALSE_POSITIVE)\s*[-:]\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*[-:]\s*(.+)/i);
      }
      
      // Alternative format: 1. TRUE_POSITIVE | HIGH | explanation
      if (!match) {
        match = line.match(/^(\d+)\.\s*(TRUE_POSITIVE|FALSE_POSITIVE)\s*\|\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*\|\s*(.+)/i);
      }
      
      if (match) {
        const [fullMatch, idx, validation, severity, explanation] = match;
        const findingIdx = parseInt(idx) - 1;
        
        console.log(`[Scanner] ✓ Matched line ${lineIdx}:`, line.substring(0, 100));
        console.log(`[Scanner] Parsed finding ${idx}:`, { 
          validation, 
          severity, 
          explanation: explanation.substring(0, 100) + '...' 
        });
        
        if (findings[findingIdx]) {
          findings[findingIdx].validated = true;
          findings[findingIdx].aiValidation = validation.toUpperCase();
          findings[findingIdx].aiSeverity = severity.toUpperCase();
          findings[findingIdx].aiExplanation = explanation.trim();
          parsedCount++;
          console.log(`[Scanner] ✓ Updated finding ${idx}`);
        } else {
          console.warn(`[Scanner] ✗ Finding index ${findingIdx} not found in array`);
        }
      }
    });
    
    console.log(`[Scanner] Successfully parsed ${parsedCount} out of ${findings.length} findings`);
    
    // If parsing failed, show the FULL AI response to user
    if (parsedCount === 0) {
      console.error('[Scanner] ❌ PARSING FAILED - AI response format not recognized');
      console.error('[Scanner] Expected format: Finding 1: TRUE_POSITIVE | HIGH | explanation');
      console.error('[Scanner] First 500 chars of response:', aiResponse.substring(0, 500));
      
      // Store FULL raw AI response in findings
      findings.forEach((f, idx) => {
        f.validated = true;
        f.aiValidation = 'UNKNOWN';
        f.aiSeverity = 'UNKNOWN';
        f.aiExplanation = `⚠️ AI Response (showing full unstructured response):\n\n${aiResponse}`;
      });
      parsedCount = findings.length;
    }
    
    console.log('[Scanner] Validated findings:', findings.filter(f => f.validated).length);
    console.log('[Scanner] ===== END PARSING =====');
  },


  updateStats() {
    document.getElementById('files-scanned').textContent = this.scannedFiles;
    document.getElementById('secrets-found').textContent = this.secrets.length;
    document.getElementById('vulnerabilities-found').textContent = this.vulnerabilities.length;
    document.getElementById('ai-validated').textContent = this.aiValidated;
    
    const high = this.secrets.filter(s => s.confidence === 'high').length;
    const medium = this.secrets.filter(s => s.confidence === 'medium').length;
    
    document.getElementById('high-confidence').textContent = high;
    document.getElementById('medium-confidence').textContent = medium;
  }
};

window.ScannerUI = ScannerUI;
