// Performance optimization utilities
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const memoize = (func, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return function(...args) {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
};

export const formatPrice = memoize((price, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price);
});

export const formatAddress = memoize((address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
});

export const lazyLoad = (importFunc) => {
  // Dynamic import React only when needed
  const React = require('react');
  return React.lazy(importFunc);
};

// Performance utility functions

/**
 * Lazy loading utility for images
 * @param {string} src - Image source URL
 * @param {Object} options - Options for lazy loading
 */
export const lazyLoadImage = (src, options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    
    // Create intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              img.src = src;
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold, rootMargin }
      );
      
      // Create placeholder element to observe
      const placeholderElement = document.createElement('div');
      placeholderElement.style.width = '1px';
      placeholderElement.style.height = '1px';
      document.body.appendChild(placeholderElement);
      observer.observe(placeholderElement);
      
      // Clean up after loading
      img.onload = () => {
        document.body.removeChild(placeholderElement);
        observer.disconnect();
        resolve(img);
      };
      
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src;
    }
  });
};

/**
 * Image optimization utility
 * @param {string} url - Original image URL
 * @param {Object} options - Optimization options
 */
export const optimizeImageUrl = (url, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fallback = 'jpeg'
  } = options;

  if (!url) return null;

  // If it's already an optimized URL, return as is
  if (url.includes('?') && (url.includes('w=') || url.includes('h=') || url.includes('q='))) {
    return url;
  }

  // For external URLs or CDN, add optimization parameters
  const separator = url.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  params.append('q', quality);
  params.append('f', format);
  params.append('fallback', fallback);

  return `${url}${separator}${params.toString()}`;
};

/**
 * Progressive image loading with blur-up effect
 * @param {string} src - Image source URL
 * @param {string} placeholder - Low-quality placeholder
 */
export const progressiveImageLoad = (src, placeholder) => {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        src: img.src,
        loaded: true,
        placeholder: false
      });
    };
    
    img.onerror = () => {
      resolve({
        src: placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=',
        loaded: false,
        error: true
      });
    };
    
    // Start with placeholder
    resolve({
      src: placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+',
      loaded: false,
      placeholder: true
    });
    
    // Load actual image
    img.src = src;
  });
};

/**
 * Bundle splitting utility for dynamic imports
 * @param {Function} importFn - Dynamic import function
 * @param {string} componentName - Component name for better error messages
 */
export const lazyComponent = (importFn, componentName = 'Component') => {
  // Dynamic import React only when needed
  const React = require('react');
  return React.lazy(() => 
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      // Return a fallback component
      return {
        default: () => React.createElement('div', {
          style: { 
            padding: '20px', 
            textAlign: 'center',
            border: '1px dashed #ccc',
            borderRadius: '8px',
            color: '#666'
          }
        }, `Failed to load ${componentName}. Please refresh the page.`)
      };
    })
  );
};

/**
 * Virtual scrolling calculation utilities
 */
export const virtualScrollUtils = {
  /**
   * Calculate visible items for virtual scrolling
   * @param {number} scrollTop - Current scroll position
   * @param {number} itemHeight - Height of each item
   * @param {number} containerHeight - Height of container
   * @param {number} totalItems - Total number of items
   * @param {number} overscan - Number of extra items to render
   */
  calculateVisibleRange(scrollTop, itemHeight, containerHeight, totalItems, overscan = 5) {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      totalItems
    );
    
    return {
      start: Math.max(0, start - overscan),
      end,
      visibleStart: start,
      visibleEnd: Math.min(start + Math.ceil(containerHeight / itemHeight), totalItems)
    };
  },

  /**
   * Calculate grid layout for virtual scrolling
   * @param {number} containerWidth - Width of container
   * @param {number} itemWidth - Width of each item
   * @param {number} gap - Gap between items
   */
  calculateGridLayout(containerWidth, itemWidth, gap = 16) {
    const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
    const actualItemWidth = (containerWidth - (gap * (columnsCount - 1))) / columnsCount;
    
    return {
      columnsCount: Math.max(1, columnsCount),
      itemWidth: actualItemWidth,
      gap
    };
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure render time of a component
   * @param {string} componentName - Name of component being measured
   */
  measureRender(componentName) {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      
      if (duration > 16) { // Longer than 1 frame at 60fps
        console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    };
  },

  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    if ('web-vital' in window) {
      // This would integrate with a real monitoring service
      return;
    }

    // Basic performance tracking
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('Performance Entry:', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        });
      }
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    } catch (e) {
      console.warn('Performance Observer not supported');
    }
  }
};

/**
 * Memory optimization utilities
 */
export const memoryUtils = {
  /**
   * Clean up event listeners and timers
   * @param {Array} cleanupFns - Array of cleanup functions
   */
  cleanup(cleanupFns) {
    cleanupFns.forEach(fn => {
      try {
        if (typeof fn === 'function') {
          fn();
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
  },

  /**
   * Weak reference cache for better memory management
   */
  createWeakCache() {
    const cache = new WeakMap();
    
    return {
      get(key) {
        return cache.get(key);
      },
      set(key, value) {
        cache.set(key, value);
      },
      has(key) {
        return cache.has(key);
      },
      delete(key) {
        return cache.delete(key);
      }
    };
  }
};

/**
 * Image compression utility for better performance
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    type = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Service Worker registration for caching
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource URLs to preload
 */
export const preloadResources = (resources) => {
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.url;
    link.as = resource.type || 'fetch';
    if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
    document.head.appendChild(link);
  });
};

const performanceUtils = {
  debounce,
  throttle,
  memoize,
  lazyLoadImage,
  optimizeImageUrl,
  progressiveImageLoad,
  lazyComponent,
  virtualScrollUtils,
  performanceMonitor,
  compressImage,
  registerServiceWorker,
  preloadResources
};

export default performanceUtils; 