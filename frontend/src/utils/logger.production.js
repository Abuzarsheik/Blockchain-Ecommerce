/**
 * Production-Safe Logger for Blocmerce Frontend
 * Automatically removes console statements in production builds
 */

class ProductionLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isEnabled = !this.isProduction || process.env.REACT_APP_ENABLE_LOGGING === 'true';
  }

  // Safe logging methods - removed in production
  info(message, ...args) {
    if (this.isEnabled) {
      console.log(`[${new Date().toISOString()}] [INFO]`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.isEnabled) {
      console.warn(`[${new Date().toISOString()}] [WARN]`, message, ...args);
    }
  }

  error(message, ...args) {
    // Always log errors, even in production (for debugging)
    console.error(`[${new Date().toISOString()}] [ERROR]`, message, ...args);
  }

  debug(message, ...args) {
    // Only log debug in development
    if (this.isDevelopment) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, message, ...args);
    }
  }

  // Performance logging - only in development
  performance(label, fn) {
    if (this.isDevelopment && window.performance) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      this.debug(`Performance: ${label} took ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return fn();
  }

  // API request logging - only in development
  apiRequest(method, url, data = null) {
    if (this.isDevelopment) {
      this.debug(`API ${method.toUpperCase()} ${url}`, data ? { data } : '');
    }
  }

  apiResponse(method, url, status, data = null) {
    if (this.isDevelopment) {
      this.debug(`API ${method.toUpperCase()} ${url} -> ${status}`, data ? { data } : '');
    }
  }

  // User action logging for analytics (safe for production)
  userAction(action, details = {}) {
    if (this.isEnabled) {
      // In production, this could send to analytics service
      // In development, just log to console
      if (this.isDevelopment) {
        this.info(`User Action: ${action}`, details);
      } else {
        // Send to analytics service in production
        this.sendToAnalytics('user_action', { action, ...details });
      }
    }
  }

  // Send to analytics service (placeholder)
  sendToAnalytics(event, data) {
    // Implement your analytics service here
    // Example: Google Analytics, Mixpanel, etc.
    if (window.gtag) {
      window.gtag('event', event, data);
    }
  }

  // Error boundary logging
  errorBoundary(error, errorInfo) {
    this.error('React Error Boundary caught an error:', error, errorInfo);
    
    // In production, send to error tracking service
    if (this.isProduction) {
      // Send to Sentry, LogRocket, etc.
      if (window.Sentry) {
        window.Sentry.captureException(error, { extra: errorInfo });
      }
    }
  }
}

// Create singleton instance
const logger = new ProductionLogger();

// Export as default and named exports
export { logger };
export default logger;

// Convenience functions for easier migration
export const logInfo = (message, ...args) => logger.info(message, ...args);
export const logWarn = (message, ...args) => logger.warn(message, ...args);
export const logError = (message, ...args) => logger.error(message, ...args);
export const logDebug = (message, ...args) => logger.debug(message, ...args);
export const logUserAction = (action, details) => logger.userAction(action, details);
export const logApiRequest = (method, url, data) => logger.apiRequest(method, url, data);
export const logApiResponse = (method, url, status, data) => logger.apiResponse(method, url, status, data); 