/**
 * rep+ Enhanced AI Manager
 * Deep security analysis and ethical attack surface mapping
 */

const AIManager = {
  currentProvider: null,
  settings: null,

  async initialize(settings) {
    this.settings = settings;
    this.selectProvider(settings.aiProvider);
  },

  generateAttackPrompt(request) {
    if (!request) {
      return 'Provide a general web-application security testing checklist.';
    }
    return this.generateAttackVectorsPrompt(request);
  },

  generateAnalyzePrompt(request) {
    if (request?.response) {
      return this.generateResponseAnalysisPrompt(request, request.response);
    }
    return this.generateExplainPrompt(request);
  },

  generateMapPrompt(requests) {
    const list = Array.isArray(requests)
      ? requests
      : (requests ? [requests] : []);
    if (list.length === 0) {
      return 'Provide a general methodology for mapping an application\'s attack surface when no traffic has been captured yet.';
    }
    return this.generateAttackSurfaceMappingPrompt(list);
  },

  selectProvider(providerName) {
    
    switch (providerName) {
      case 'claude':
        this.currentProvider = ClaudeProvider;
        break;
      case 'openai':
        this.currentProvider = OpenAIProvider;
        break;
      case 'gemini':
        this.currentProvider = GeminiProvider;
        break;
      case 'ollama':
        this.currentProvider = OllamaProvider;
        break;
      default:
        console.warn('[AIManager] Unknown provider:', providerName);
        this.currentProvider = null;
    }
    
    if (this.currentProvider) {
    }
  },

  async sendMessage(prompt, onChunk = null) {
    
    if (!this.currentProvider) {
      throw new Error('No AI provider selected. Please configure in Settings.');
    }

    // Validate API key ONLY for providers that need it (not Ollama)
    const providerName = this.currentProvider.name || this.settings?.aiProvider;
    
    if (providerName !== 'ollama' && !this.settings.apiKey) {
      throw new Error('API key required. Please configure in Settings tab.');
    }

    try {
      if (this.currentProvider.name === 'ollama') {
        return await this.currentProvider.sendMessage(
          prompt,
          this.settings.apiEndpoint || 'http://localhost:11434',
          this.settings.model,
          onChunk
        );
      } else {
        return await this.currentProvider.sendMessage(
          prompt,
          this.settings.apiKey,
          this.settings.model,
          onChunk
        );
      }
    } catch (error) {
      console.error('AI Manager error:', error);
      throw error;
    }
  },

  // Deep request analysis with ethical guidelines
  generateExplainPrompt(request) {
    return `You are a security researcher analyzing an HTTP request for vulnerabilities and attack surface.

**IMPORTANT ETHICAL GUIDELINES:**
- Focus on identifying vulnerabilities ethically
- Provide defensive recommendations
- Do not suggest harmful attacks against live production systems
- Emphasize responsible disclosure and permission-based testing

**REQUEST ANALYSIS:**

Method: ${request.method}
URL: ${request.url}
Headers:
${JSON.stringify(request.headers, null, 2)}

Body:
${request.body || '(empty)'}

${request.response ? `Response Status: ${request.response.status}\n\nResponse Headers:\n${JSON.stringify(request.response.headers, null, 2)}\n\nResponse Body (first 1000 chars):\n${request.response.body.substring(0, 1000)}` : ''}

**PROVIDE A COMPREHENSIVE ANALYSIS:**

1. **Request Purpose & Functionality**
   - What does this request do?
   - What application feature does it support?
   - Is this a common API pattern?

2. **Security Observations**
   - Authentication/Authorization mechanisms detected
   - Session management approach
   - Input validation indicators
   - Output encoding practices
   - Security headers present/missing

3. **Potential Vulnerability Indicators**
   - IDOR (Insecure Direct Object Reference) opportunities
   - Injection points (SQL, NoSQL, Command, LDAP)
   - XSS (Cross-Site Scripting) potential
   - CSRF (Cross-Site Request Forgery) risks
   - Authentication bypass possibilities
   - Authorization flaws
   - Information disclosure
   - Business logic flaws

4. **Attack Surface Analysis**
   - Entry points for testing
   - Parameters that accept user input
   - Hidden/undocumented parameters
   - Rate limiting indicators
   - Error handling behavior

5. **Ethical Testing Recommendations**
   - Safe testing approaches for each identified risk
   - Test cases that won't cause harm
   - How to verify without exploitation
   - Recommended tools and techniques

6. **Defensive Recommendations**
   - How the application should be hardened
   - Missing security controls
   - Best practices not being followed

**FORMAT:** Provide clear, structured analysis with specific examples and actionable insights.`;
  },

  // Attack vector suggestions with ethical framework
  generateAttackVectorsPrompt(request) {
    return `You are an ethical security tester creating a testing checklist for this HTTP request.

**ETHICAL TESTING FRAMEWORK:**
- All suggestions must be for authorized testing only
- Focus on vulnerability identification, not exploitation
- Provide non-destructive test cases
- Emphasize detection over damage
- Include remediation guidance

**REQUEST TO ANALYZE:**

Method: ${request.method}
URL: ${request.url}
Headers:
${JSON.stringify(request.headers, null, 2)}

Body:
${request.body || '(empty)'}

**CREATE A PRIORITIZED SECURITY TESTING CHECKLIST:**

## 🎯 HIGH PRIORITY TESTS

### 1. Authentication & Authorization
- [ ] **Test:** [Specific test case]
  - **How:** [Detailed steps]
  - **Expected:** [What indicates vulnerability]
  - **Payload Examples:** [Safe test payloads]
  - **Risk:** [Potential impact]

### 2. Injection Vulnerabilities
- [ ] **SQL Injection Test Points:**
  - Parameter: [parameter name]
  - Test payload: [safe detection payload]
  - Success indicator: [what to look for]
  
- [ ] **NoSQL Injection:**
  - [Specific test guidance]
  
- [ ] **Command Injection:**
  - [Specific test guidance]

### 3. IDOR (Insecure Direct Object Reference)
- [ ] **Test Object References:**
  - ID parameter: [parameter]
  - Test approach: [increment/decrement IDs]
  - Success criteria: [unauthorized access]

### 4. Cross-Site Scripting (XSS)
- [ ] **Reflected XSS Points:**
  - [Parameters accepting user input]
  - Detection payload: [non-executing test string]
  
- [ ] **Stored XSS Potential:**
  - [Where input might be stored]

### 5. Business Logic Flaws
- [ ] **Price/Quantity Manipulation:**
  - [Specific tests]
  
- [ ] **Workflow Bypass:**
  - [Steps to test]

## ⚠️ MEDIUM PRIORITY TESTS

### 6. Session Management
- [ ] Session fixation tests
- [ ] Token entropy analysis
- [ ] Session timeout verification

### 7. Information Disclosure
- [ ] Error message analysis
- [ ] Verbose responses
- [ ] Debug information leakage

### 8. Rate Limiting & DoS
- [ ] Brute force protection
- [ ] Resource exhaustion limits

## 📋 LOW PRIORITY TESTS

### 9. Security Headers
- [ ] Missing CSP
- [ ] HSTS not configured
- [ ] X-Frame-Options missing

### 10. CORS Misconfiguration
- [ ] Origin reflection
- [ ] Wildcard origins

**FOR EACH IDENTIFIED TEST:**

🔍 **Detection Approach:**
- How to test without causing harm
- What responses indicate vulnerability
- Safe payload examples

⚠️ **Risk Assessment:**
- Potential impact if exploited
- Likelihood of existence
- Affected functionality

🛡️ **Remediation:**
- How developers should fix it
- Secure coding practices
- Framework-specific guidance

**ADDITIONAL NOTES:**
- Focus on tests appropriate for your authorization level
- Document all findings
- Follow responsible disclosure practices
- Never test on production without explicit permission`;
  },

  // Comprehensive site-wide attack surface mapping
  generateAttackSurfaceMappingPrompt(allRequests) {
    const requestSummary = allRequests.slice(0, 50).map(req => ({
      method: req.method,
      url: req.url,
      hasAuth: req.headers['authorization'] || req.headers['cookie'] ? 'Yes' : 'No',
      contentType: req.headers['content-type'] || 'N/A'
    }));

    return `You are performing an ethical attack surface mapping analysis on a web application.

**CAPTURED REQUEST SUMMARY (${allRequests.length} total requests):**

${JSON.stringify(requestSummary, null, 2)}

**PERFORM COMPREHENSIVE ATTACK SURFACE MAPPING:**

## 📊 APPLICATION ARCHITECTURE ANALYSIS

### 1. Application Structure
- Technology stack identified
- Framework/platform indicators
- API architecture (REST, GraphQL, etc.)
- Authentication mechanisms in use
- Session management approach

### 2. Entry Points Discovered
- Public endpoints (no auth required)
- Authenticated endpoints
- Admin/privileged endpoints
- API versions detected
- Hidden/undocumented endpoints

### 3. Data Flow Analysis
- User input entry points
- Data processing endpoints
- Output/response patterns
- File upload capabilities
- Data export functionality

## 🎯 ATTACK SURFACE MAP

### A. Authentication & Session Management
**Endpoints:**
- Login: [URLs]
- Logout: [URLs]
- Password reset: [URLs]
- Token refresh: [URLs]

**Testing Priorities:**
1. Brute force protection
2. Session fixation
3. Token security
4. Password policy
5. MFA implementation

### B. Authorization & Access Control
**Endpoint Categories:**
- User-level: [count]
- Admin-level: [count]
- Public: [count]

**Testing Priorities:**
1. Horizontal privilege escalation (IDOR)
2. Vertical privilege escalation
3. Missing function-level access control
4. Broken object property-level authorization

### C. Input Validation & Injection Points
**Identified Input Parameters:** [count]

**Injection Test Priorities:**
1. SQL Injection candidates: [endpoints]
2. NoSQL Injection: [endpoints]
3. Command Injection: [endpoints]
4. LDAP Injection: [endpoints]
5. XPath Injection: [endpoints]

### D. Business Logic
**Critical Functionality:**
- Payment processing: [Yes/No]
- User management: [Yes/No]
- File operations: [Yes/No]
- Data export: [Yes/No]

**Logic Flaw Test Areas:**
1. Price manipulation opportunities
2. Quantity/limit bypasses
3. Workflow circumvention
4. Race conditions
5. Time-based attacks

### E. Client-Side Security
**Findings:**
- JavaScript files captured: [count]
- API keys in client code: [check needed]
- Sensitive data exposure: [check needed]
- Client-side validation only: [indicators]

## 🔐 SECURITY CONTROLS ASSESSMENT

### Positive Security Controls Observed:
- ✅ [List what's working well]

### Missing/Weak Security Controls:
- ⚠️ [List gaps and weaknesses]

### Security Headers Analysis:
- CSP: [Present/Missing/Weak]
- HSTS: [Present/Missing]
- X-Frame-Options: [Present/Missing]
- CORS: [Configuration status]

## 📋 PRIORITIZED TESTING ROADMAP

### Phase 1: High-Risk, High-Impact (Test First)
1. [Specific vulnerability area]
   - Why: [Risk explanation]
   - How: [Testing approach]
   - Expected finding: [What to look for]

### Phase 2: Medium-Risk (Test Second)
[Similar structure]

### Phase 3: Low-Risk, Comprehensive (Test Last)
[Similar structure]

## 🎓 TESTING METHODOLOGY RECOMMENDATIONS

### Tools Recommended:
- Burp Suite / rep+ for manual testing
- [Other relevant tools]

### Test Approach:
1. Start with passive reconnaissance
2. Active testing on non-production if possible
3. Gradual escalation of test intensity
4. Document all findings immediately
5. Follow responsible disclosure timeline

## ⚖️ ETHICAL CONSIDERATIONS

**Before Testing:**
- ✅ Obtain written authorization
- ✅ Define scope boundaries
- ✅ Establish communication channel
- ✅ Agree on testing windows
- ✅ Set up safe test accounts

**During Testing:**
- ✅ Stay within authorized scope
- ✅ Avoid DoS/resource exhaustion
- ✅ Don't access other users' data
- ✅ Don't modify production data
- ✅ Document everything

**After Testing:**
- ✅ Responsible disclosure
- ✅ Provide remediation guidance
- ✅ Allow reasonable fix timeline
- ✅ Verify fixes if requested

## 📈 RISK ASSESSMENT SUMMARY

**Overall Risk Level:** [Assessment]

**Critical Findings Expected:** [Number/Areas]

**Priority Remediation Areas:**
1. [Most critical]
2. [Second priority]
3. [Third priority]

**Estimated Testing Time:** [Recommendation]

---

**IMPORTANT:** This analysis is for authorized security testing only. Always obtain explicit permission before testing any system you don't own.`;
  },

  // Response analysis for security issues
  generateResponseAnalysisPrompt(request, response) {
    return `Analyze this HTTP response for security vulnerabilities and sensitive information disclosure.

**REQUEST:**
${request.method} ${request.url}

**RESPONSE:**
Status: ${response.status} ${response.statusText}

Headers:
${JSON.stringify(response.headers, null, 2)}

Body (first 2000 chars):
${response.body.substring(0, 2000)}

**PERFORM DEEP RESPONSE ANALYSIS:**

## 🔍 Security Issues Detection

### 1. Sensitive Information Disclosure
- [ ] API keys, tokens, secrets
- [ ] Internal paths, server info
- [ ] Database details
- [ ] User PII (emails, names, addresses)
- [ ] System configuration
- [ ] Debug information
- [ ] Stack traces
- [ ] Comments with sensitive data

### 2. Security Header Analysis
- [ ] Missing Content-Security-Policy
- [ ] Missing X-Frame-Options
- [ ] Missing X-Content-Type-Options
- [ ] Weak/Missing CORS configuration
- [ ] Cache-Control for sensitive data
- [ ] Missing HSTS
- [ ] Server version disclosure

### 3. Error Handling Issues
- [ ] Verbose error messages
- [ ] Stack trace exposure
- [ ] SQL error messages
- [ ] Path disclosure
- [ ] Technology stack revelation

### 4. Authentication/Authorization Leaks
- [ ] Token exposure
- [ ] Session information
- [ ] User role/permission data
- [ ] Weak token entropy
- [ ] Predictable identifiers

### 5. Injection Vulnerability Indicators
- [ ] Unescaped user input in response
- [ ] SQL query fragments
- [ ] System command output
- [ ] LDAP information
- [ ] XML/XXE indicators

### 6. Business Logic Exposure
- [ ] Pricing information
- [ ] Discount calculation logic
- [ ] Workflow states
- [ ] Hidden functionality
- [ ] Admin features

## 🎯 Findings Summary

**CRITICAL (Immediate Action Required):**
- [List with specific examples from response]

**HIGH (Fix Soon):**
- [List with specific examples]

**MEDIUM (Should Fix):**
- [List with specific examples]

**LOW (Consider Fixing):**
- [List with specific examples]

**INFORMATIONAL:**
- [Non-security observations]

## 🛡️ Remediation Recommendations

For each finding, provide:
1. **What:** Specific issue found
2. **Where:** Exact location in response
3. **Impact:** Security implications
4. **Fix:** How to remediate
5. **Prevention:** How to prevent similar issues

## 💡 Additional Testing Suggestions

Based on this response, recommend:
- Follow-up requests to send
- Parameters to manipulate
- Headers to test
- Payloads to try
- Tools to use

**PROVIDE:** Specific, actionable findings with evidence from the actual response data.`;
  },

  // Deep security analysis prompt
  generateSecurityAnalysisPrompt(request) {
    return `Perform a comprehensive security analysis of this HTTP request:
    
Method: ${request.method}
URL: ${request.url}
Headers:
${JSON.stringify(request.headers, null, 2)}

Body:
${request.body || '(empty)'}

Analyze the following aspects:
1. **Authentication & Authorization**: Identify mechanisms and potential flaws.
2. **Input Validation**: Check for injection risks (SQLi, XSS, Command Injection).
3. **Sensitive Data Exposure**: Look for leaked PII or secrets in the request structure.
4. **Security Misconfigurations**: Missing headers, weak settings.
5. **Business Logic Risks**: Potential for IDOR, rate limiting bypass, etc.

Provide findings with severity levels (Critical, High, Medium, Low) and remediation advice.`;
  },

  // API Documentation generation prompt
  generateAPIDocsPrompt(request) {
    return `Generate professional API documentation for this HTTP request:

Method: ${request.method}
URL: ${request.url}
Headers:
${JSON.stringify(request.headers, null, 2)}

Body:
${request.body || '(empty)'}

Output the documentation in Markdown format including:
1. **Endpoint Description**: What this endpoint likely does.
2. **Parameters**: Table of query/path parameters (Name, Type, Required/Optional, Description).
3. **Request Body**: Schema of the payload.
4. **Headers**: Required headers.
5. **Example Usage**: cURL command.
6. **Expected Responses**: Likely success/error codes.`;
  },

  // Test Case generation prompt
  generateTestCasesPrompt(request) {
    return `Generate a suite of security test cases for this HTTP request:

Method: ${request.method}
URL: ${request.url}
Headers:
${JSON.stringify(request.headers, null, 2)}

Body:
${request.body || '(empty)'}

Provide:
1. **Positive Test Cases**: Valid inputs to verify functionality.
2. **Negative Test Cases**: Invalid inputs, missing parameters, wrong types.
3. **Security Test Cases**: SQL injection payloads, XSS vectors, IDOR attempts, Auth bypass.
4. **Edge Cases**: Boundary values, empty strings, large payloads.

Format as a checklist for manual testing.`;
  },

  // Analyze all captured requests (scoped)
  generateAnalyzeAllPrompt(requests) {
    // Create detailed summary with headers and response preview
    const detailedSummary = requests.map((r, idx) => {
      let entry = `\n--- Request ${idx + 1} ---
${r.method} ${r.url}
Status: ${r.response ? r.response.status : 'No Response'}`;
      
      // Add key headers (auth, content-type, cookies)
      if (r.headers) {
        const keyHeaders = ['authorization', 'cookie', 'content-type', 'x-api-key'];
        const relevantHeaders = Object.keys(r.headers)
          .filter(h => keyHeaders.includes(h.toLowerCase()))
          .map(h => `  ${h}: ${r.headers[h]}`)
          .join('\n');
        if (relevantHeaders) {
          entry += `\nKey Headers:\n${relevantHeaders}`;
        }
      }
      
      // Add response preview (first 200 chars)
      if (r.response?.body) {
        const preview = r.response.body.substring(0, 200);
        entry += `\nResponse Preview: ${preview}${r.response.body.length > 200 ? '...' : ''}`;
      }
      
      return entry;
    }).join('\n');
    
    return `Perform an in-depth security analysis of the following captured traffic (${requests.length} requests):

${detailedSummary}

Analyze the overall security posture based on these traffic patterns:
1. **Attack Surface**: Identify exposed endpoints and their risks.
2. **Authentication Patterns**: How is auth handled across the app? Any tokens, sessions, or API keys?
3. **Data Exposure**: Any sensitive data leaking in URLs, headers, or responses?
4. **Vulnerabilities**: Potential weak points (IDOR, Injection, XSS, CSRF, etc.).
5. **Business Logic**: Any unusual patterns or potential logic flaws?
6. **Recommendations**: Strategic security improvements and testing priorities.

Focus on the holistic view of the application's security posture.`;
  },

  // Explain selected text in security context
  async explainText(text) {
    const prompt = `Explain the following text in the context of HTTP security testing and vulnerability analysis:

"${text}"

Provide:
1. **What it is:** Technical explanation
2. **Security relevance:** Why it matters for testing
3. **Potential issues:** Security implications
4. **Testing approach:** How to test/verify
5. **Common pitfalls:** What to watch out for

Keep the explanation concise, technical, and focused on practical security testing.`;

    return await this.sendMessage(prompt);
  },

  getAvailableModels() {
    if (!this.currentProvider) return [];
    return this.currentProvider.getModels();
  }
};

window.AIManager = AIManager;
