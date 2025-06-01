/**
 * Accessibility utilities for improved user experience
 */

// Focus management
export const focusUtils = {
  /**
   * Trap focus within a container
   * @param {HTMLElement} container - Container to trap focus within
   * @param {Function} onEscape - Callback when escape is pressed
   */
  trapFocus(container, onEscape) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === 'Escape' && onEscape) {
        onEscape();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Restore focus to previously focused element
   * @param {HTMLElement} element - Element to focus
   */
  restoreFocus(element) {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  },

  /**
   * Get next focusable element
   * @param {HTMLElement} container - Container to search within
   * @param {HTMLElement} currentElement - Current focused element
   * @param {boolean} reverse - Direction to search
   */
  getNextFocusable(container, currentElement, reverse = false) {
    const focusableElements = Array.from(container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));

    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (reverse) {
      return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1];
    } else {
      return focusableElements[currentIndex + 1] || focusableElements[0];
    }
  }
};

// ARIA utilities
export const ariaUtils = {
  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - Priority level (polite, assertive)
   */
  announce(message, priority = 'polite') {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  },

  /**
   * Generate unique ID for ARIA relationships
   * @param {string} prefix - Prefix for the ID
   */
  generateId(prefix = 'aria') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Set ARIA expanded state
   * @param {HTMLElement} element - Element to update
   * @param {boolean} expanded - Expanded state
   */
  setExpanded(element, expanded) {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  /**
   * Set ARIA selected state
   * @param {HTMLElement} element - Element to update
   * @param {boolean} selected - Selected state
   */
  setSelected(element, selected) {
    element.setAttribute('aria-selected', selected.toString());
  },

  /**
   * Create ARIA live region
   * @param {string} id - ID for the live region
   * @param {string} politeness - Politeness level
   */
  createLiveRegion(id, politeness = 'polite') {
    const existing = document.getElementById(id);
    if (existing) return existing;

    const liveRegion = document.createElement('div');
    liveRegion.id = id;
    liveRegion.setAttribute('aria-live', politeness);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    
    document.body.appendChild(liveRegion);
    return liveRegion;
  },

  /**
   * Update live region content
   * @param {string} id - Live region ID
   * @param {string} message - Message to announce
   */
  updateLiveRegion(id, message) {
    const liveRegion = document.getElementById(id);
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
};

// Keyboard navigation utilities
export const keyboardUtils = {
  /**
   * Common keyboard event handlers
   */
  keys: {
    ENTER: 'Enter',
    SPACE: ' ',
    TAB: 'Tab',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End'
  },

  /**
   * Handle keyboard navigation for lists
   * @param {KeyboardEvent} event - Keyboard event
   * @param {Array} items - List items
   * @param {number} currentIndex - Current selected index
   * @param {Function} onSelect - Selection callback
   * @param {boolean} loop - Whether to loop navigation
   */
  handleListNavigation(event, items, currentIndex, onSelect, loop = true) {
    const { key } = event;
    let newIndex = currentIndex;

    switch (key) {
      case this.keys.ARROW_UP:
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? items.length - 1 : 0);
        break;
      case this.keys.ARROW_DOWN:
        event.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : (loop ? 0 : items.length - 1);
        break;
      case this.keys.HOME:
        event.preventDefault();
        newIndex = 0;
        break;
      case this.keys.END:
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case this.keys.ENTER:
      case this.keys.SPACE:
        event.preventDefault();
        onSelect && onSelect(currentIndex);
        return currentIndex;
      default:
        // No action for other keys
        break;
    }

    if (newIndex !== currentIndex) {
      onSelect && onSelect(newIndex);
    }

    return newIndex;
  },

  /**
   * Handle grid navigation (2D)
   * @param {KeyboardEvent} event - Keyboard event
   * @param {number} currentRow - Current row
   * @param {number} currentCol - Current column
   * @param {number} totalRows - Total number of rows
   * @param {number} totalCols - Total number of columns
   * @param {Function} onMove - Move callback
   */
  handleGridNavigation(event, currentRow, currentCol, totalRows, totalCols, onMove) {
    const { key } = event;
    let newRow = currentRow;
    let newCol = currentCol;

    switch (key) {
      case this.keys.ARROW_UP:
        event.preventDefault();
        newRow = Math.max(0, currentRow - 1);
        break;
      case this.keys.ARROW_DOWN:
        event.preventDefault();
        newRow = Math.min(totalRows - 1, currentRow + 1);
        break;
      case this.keys.ARROW_LEFT:
        event.preventDefault();
        newCol = Math.max(0, currentCol - 1);
        break;
      case this.keys.ARROW_RIGHT:
        event.preventDefault();
        newCol = Math.min(totalCols - 1, currentCol + 1);
        break;
      case this.keys.HOME:
        event.preventDefault();
        newCol = 0;
        break;
      case this.keys.END:
        event.preventDefault();
        newCol = totalCols - 1;
        break;
      default:
        // No action for other keys
        break;
    }

    if (newRow !== currentRow || newCol !== currentCol) {
      onMove && onMove(newRow, newCol);
    }

    return { row: newRow, col: newCol };
  }
};

// Color contrast utilities
export const colorUtils = {
  /**
   * Calculate relative luminance
   * @param {string} color - Color in hex format
   */
  getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  /**
   * Calculate contrast ratio between two colors
   * @param {string} color1 - First color
   * @param {string} color2 - Second color
   */
  getContrastRatio(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check if color combination meets WCAG standards
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @param {string} level - WCAG level (AA, AAA)
   * @param {string} size - Text size (normal, large)
   */
  isAccessible(foreground, background, level = 'AA', size = 'normal') {
    const contrast = this.getContrastRatio(foreground, background);
    
    const requirements = {
      'AA': { normal: 4.5, large: 3 },
      'AAA': { normal: 7, large: 4.5 }
    };

    return contrast >= requirements[level][size];
  },

  /**
   * Convert hex to RGB
   * @param {string} hex - Hex color
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
};

// Screen reader utilities
export const screenReaderUtils = {
  /**
   * Hide element from screen readers
   * @param {HTMLElement} element - Element to hide
   */
  hide(element) {
    element.setAttribute('aria-hidden', 'true');
  },

  /**
   * Show element to screen readers
   * @param {HTMLElement} element - Element to show
   */
  show(element) {
    element.removeAttribute('aria-hidden');
  },

  /**
   * Create screen reader only text
   * @param {string} text - Text for screen readers
   */
  createSROnlyText(text) {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  },

  /**
   * Describe element for screen readers
   * @param {HTMLElement} element - Element to describe
   * @param {string} description - Description text
   */
  describe(element, description) {
    const id = ariaUtils.generateId('desc');
    const descElement = document.createElement('div');
    descElement.id = id;
    descElement.className = 'sr-only';
    descElement.textContent = description;
    
    element.setAttribute('aria-describedby', id);
    element.parentNode.appendChild(descElement);
    
    return id;
  }
};

// Motion preferences
export const motionUtils = {
  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  /**
   * Apply animation with motion preference respect
   * @param {HTMLElement} element - Element to animate
   * @param {Array} keyframes - Animation keyframes
   * @param {Object} options - Animation options
   */
  animate(element, keyframes, options = {}) {
    if (this.prefersReducedMotion()) {
      // Skip animation or use reduced version
      return element.animate([], { duration: 0 });
    }
    
    return element.animate(keyframes, options);
  },

  /**
   * Set up motion preference listener
   * @param {Function} callback - Callback when preference changes
   */
  onMotionPreferenceChange(callback) {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', callback);
    
    return () => mediaQuery.removeEventListener('change', callback);
  }
};

// Comprehensive accessibility checker
export const a11yChecker = {
  /**
   * Check element for common accessibility issues
   * @param {HTMLElement} element - Element to check
   */
  checkElement(element) {
    const issues = [];

    // Check for missing alt text on images
    if (element.tagName === 'IMG' && !element.alt) {
      issues.push('Image missing alt text');
    }

    // Check for proper heading hierarchy
    if (/^H[1-6]$/.test(element.tagName)) {
      const level = parseInt(element.tagName.substring(1));
      const prevHeading = this.findPreviousHeading(element);
      if (prevHeading && level > prevHeading + 1) {
        issues.push(`Heading level ${level} skips levels`);
      }
    }

    // Check for interactive elements without keyboard access
    if (element.onclick && !element.onkeydown && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
      issues.push('Interactive element without keyboard support');
    }

    // Check for proper form labels
    if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') && 
        !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
      issues.push('Form control missing label');
    }

    return issues;
  },

  /**
   * Find previous heading element
   * @param {HTMLElement} element - Current element
   */
  findPreviousHeading(element) {
    let prev = element.previousElementSibling;
    while (prev) {
      if (/^H[1-6]$/.test(prev.tagName)) {
        return parseInt(prev.tagName.substring(1));
      }
      prev = prev.previousElementSibling;
    }
    return null;
  },

  /**
   * Generate accessibility report
   * @param {HTMLElement} container - Container to check
   */
  generateReport(container = document.body) {
    const elements = container.querySelectorAll('*');
    const report = {
      totalElements: elements.length,
      issues: [],
      passed: 0,
      failed: 0
    };

    elements.forEach(element => {
      const issues = this.checkElement(element);
      if (issues.length > 0) {
        report.issues.push({
          element: element.tagName,
          issues: issues,
          selector: this.getSelector(element)
        });
        report.failed++;
      } else {
        report.passed++;
      }
    });

    return report;
  },

  /**
   * Get CSS selector for element
   * @param {HTMLElement} element - Element to get selector for
   */
  getSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ').join('.')}`;
    return element.tagName.toLowerCase();
  }
};

const accessibilityUtils = {
  focusUtils,
  ariaUtils,
  keyboardUtils,
  colorUtils,
  screenReaderUtils,
  motionUtils,
  a11yChecker
};

export default accessibilityUtils; 