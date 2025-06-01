const fs = require('fs');
const path = require('path');
const winston = require('winston');

/**
 * Logger Configuration
 * Provides structured logging for the application
 */


// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'blocmerce-backend' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    })
  ]
});

// Add specific loggers for different purposes
logger.add(new winston.transports.File({
  filename: path.join(logsDir, 'security.log'),
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'SECURITY' }),
    winston.format.json()
  )
}));

// Helper methods
logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, category: 'security' });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'audit' });
};

logger.payment = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'payment' });
};

logger.blockchain = (message, meta = {}) => {
  logger.info(message, { ...meta, category: 'blockchain' });
};

// Handle uncaught exceptions - TEMPORARILY DISABLED
// logger.exceptions.handle(
//   new winston.transports.File({
//     filename: path.join(logsDir, 'exceptions.log')
//   })
// );

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = logger; 