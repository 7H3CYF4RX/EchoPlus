/**
 * rep+ Diff Utility
 * Simple diff implementation for response comparison
 */

const DiffUtil = {
  // Generate diff between two strings
  diff(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    const result = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        result.push({ type: 'equal', content: line1, lineNum: i + 1 });
      } else {
        if (line1 && !line2) {
          result.push({ type: 'delete', content: line1, lineNum: i + 1 });
        } else if (!line1 && line2) {
          result.push({ type: 'add', content: line2, lineNum: i + 1 });
        } else {
          result.push({ type: 'delete', content: line1, lineNum: i + 1 });
          result.push({ type: 'add', content: line2, lineNum: i + 1 });
        }
      }
    }

    return result;
  },

  // Render diff to HTML
  renderDiff(diff) {
    let html = '<div class="diff-container">';
    
    diff.forEach(item => {
      let className = '';
      let prefix = ' ';
      
      switch (item.type) {
        case 'add':
          className = 'diff-add';
          prefix = '+';
          break;
        case 'delete':
          className = 'diff-delete';
          prefix = '-';
          break;
        case 'equal':
          className = 'diff-equal';
          prefix = ' ';
          break;
      }

      const escapedContent = this.escapeHtml(item.content);
      html += `<div class="${className}">`;
      html += `<span class="diff-prefix">${prefix}</span>`;
      html += `<span class="diff-content">${escapedContent}</span>`;
      html += `</div>`;
    });

    html += '</div>';
    return html;
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Calculate similarity percentage
  similarity(text1, text2) {
    if (text1 === text2) return 100;
    if (!text1 || !text2) return 0;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 100;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  },

  // Levenshtein distance
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
};

window.DiffUtil = DiffUtil;
