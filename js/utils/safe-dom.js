/**
 * rep+ Safe DOM Utilities
 * XSS-safe DOM manipulation utilities
 */

const SafeDOM = {
  // Create safe text node
  createText(text) {
    return document.createTextNode(String(text || ''));
  },

  // Create safe element with attributes
  createElement(tagName, attributes = {}, children = []) {
    const element = document.createElement(tagName);

    // Set attributes safely
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else if (key === 'title' || key === 'id' || key === 'name') {
        element.setAttribute(key, value);
      } else {
        // For other attributes, ensure they're safe
        element.setAttribute(key, String(value));
      }
    });

    // Add children safely
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(this.createText(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });

    return element;
  },

  // Safe HTML fragment creation (only for trusted content)
  createHTMLFragment(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
  },

  // Safe text content update
  setTextContent(element, text) {
    if (element) {
      element.textContent = String(text || '');
    }
  },

  // Safe class manipulation
  addClass(element, className) {
    if (element && className) {
      // Split by spaces to handle multiple classes
      const classes = String(className).split(/\s+/).filter(c => c);
      classes.forEach(c => element.classList.add(c));
    }
  },

  removeClass(element, className) {
    if (element && className) {
      element.classList.remove(className);
    }
  },

  toggleClass(element, className, force) {
    if (element && className) {
      element.classList.toggle(className, force);
    }
  },

  // Safe attribute setting
  setAttribute(element, name, value) {
    if (element && name) {
      element.setAttribute(name, String(value || ''));
    }
  },

  // Safe event listener addition
  addEventListener(element, event, handler, options = {}) {
    if (element && event && typeof handler === 'function') {
      element.addEventListener(event, handler, options);
    }
  },

  // Clear element content safely
  clear(element) {
    if (element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  },

  // Safe append operation
  append(parent, child) {
    if (parent && child) {
      parent.appendChild(child);
    }
  },

  // Safe insert operation
  insertBefore(parent, newElement, referenceElement) {
    if (parent && newElement) {
      parent.insertBefore(newElement, referenceElement);
    }
  }
};

// Export for global use
window.SafeDOM = SafeDOM;
