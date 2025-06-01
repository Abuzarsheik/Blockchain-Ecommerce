/**
 * Logger utility for backend
 * Provides structured logging functionality
 */

const logger = {
  error: (message, ...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  warn: (message, ...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  info: (message, ...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
  
  log: (message, ...args) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[LOG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

module.exports = logger; 