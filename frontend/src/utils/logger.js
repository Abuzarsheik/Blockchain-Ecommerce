/**
 * Simple logger utility for frontend logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  static log(level, message, ...args) {
    if (!isDevelopment && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, ...args);
        break;
      case 'warn':
        console.warn(logMessage, ...args);
        break;
      case 'info':
        console.info(logMessage, ...args);
        break;
      case 'debug':
        console.debug(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
    }
  }

  static error(message, ...args) {
    Logger.log('error', message, ...args);
  }

  static warn(message, ...args) {
    Logger.log('warn', message, ...args);
  }

  static info(message, ...args) {
    Logger.log('info', message, ...args);
  }

  static debug(message, ...args) {
    Logger.log('debug', message, ...args);
  }
}

export default Logger;
export const logger = Logger; 