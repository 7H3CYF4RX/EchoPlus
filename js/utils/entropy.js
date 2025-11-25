/**
 * rep+ Entropy Calculator
 * Calculate Shannon entropy for secret detection
 */

const EntropyCalculator = {
  // Calculate Shannon entropy
  calculate(str) {
    if (!str || str.length === 0) return 0;

    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;

    for (let char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  },

  // Check if string has high entropy (potential secret)
  isHighEntropy(str, threshold = 4.5) {
    const entropy = this.calculate(str);
    return entropy >= threshold;
  },

  // Get entropy level
  getEntropyLevel(str) {
    const entropy = this.calculate(str);
    
    if (entropy >= 5.0) return 'very-high';
    if (entropy >= 4.5) return 'high';
    if (entropy >= 4.0) return 'medium';
    if (entropy >= 3.5) return 'low';
    return 'very-low';
  },

  // Analyze string for secret patterns
  analyzeSecret(str) {
    const entropy = this.calculate(str);
    const length = str.length;
    const hasNumbers = /\d/.test(str);
    const hasUpperCase = /[A-Z]/.test(str);
    const hasLowerCase = /[a-z]/.test(str);
    const hasSpecial = /[^A-Za-z0-9]/.test(str);

    let confidence = 'low';
    let score = 0;

    // Entropy score
    if (entropy >= 5.0) score += 40;
    else if (entropy >= 4.5) score += 30;
    else if (entropy >= 4.0) score += 20;
    else score += 10;

    // Length score
    if (length >= 32) score += 20;
    else if (length >= 20) score += 15;
    else if (length >= 12) score += 10;

    // Character variety score
    const variety = [hasNumbers, hasUpperCase, hasLowerCase, hasSpecial].filter(Boolean).length;
    score += variety * 5;

    // Determine confidence
    if (score >= 60) confidence = 'high';
    else if (score >= 40) confidence = 'medium';
    else confidence = 'low';

    return {
      entropy,
      length,
      hasNumbers,
      hasUpperCase,
      hasLowerCase,
      hasSpecial,
      confidence,
      score
    };
  }
};

window.EntropyCalculator = EntropyCalculator;
