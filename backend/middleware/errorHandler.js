const mongoose = require('mongoose');

/**
 * Custom Error Classes for better error handling
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Development error response - includes stack trace
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    status: err.status,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ...(err.isOperational && { operational: true })
  });
};

/**
 * Production error response - clean and secure
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('💥 UNKNOWN ERROR:', err);

    // Send generic message
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handle specific error types
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ConflictError(message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationError(message);
};

const handleJWTError = () =>
  new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
  new AuthenticationError('Your token has expired! Please log in again.');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large. Maximum size is 5MB.');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files. Maximum 5 files allowed.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field.');
  }
  return new ValidationError('File upload error.');
};

const handleStripeError = (err) => {
  switch (err.type) {
    case 'StripeCardError':
      return new ValidationError(`Card error: ${err.message}`);
    case 'StripeInvalidRequestError':
      return new ValidationError(`Invalid request: ${err.message}`);
    case 'StripeAPIError':
      return new AppError('Payment processing error. Please try again.', 502);
    case 'StripeConnectionError':
      return new AppError('Payment service unavailable. Please try again.', 503);
    case 'StripeAuthenticationError':
      return new AppError('Payment authentication error.', 500);
    default:
      return new AppError('Payment processing failed.', 500);
  }
};

/**
 * Async error wrapper
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Cannot find ${req.originalUrl} on this server!`);
  next(err);
};

/**
 * Global Error Handler
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log all errors for monitoring
  console.error('💥 ERROR:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') {error = handleCastErrorDB(error);}
    if (error.code === 11000) {error = handleDuplicateFieldsDB(error);}
    if (error.name === 'ValidationError') {error = handleValidationErrorDB(error);}
    if (error.name === 'JsonWebTokenError') {error = handleJWTError();}
    if (error.name === 'TokenExpiredError') {error = handleJWTExpiredError();}
    if (error.name === 'MulterError') {error = handleMulterError(error);}
    if (error.type && error.type.includes('Stripe')) {error = handleStripeError(error);}

    sendErrorProd(error, res);
  }
};

/**
 * Express async error handler middleware
 */
const expressAsyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  // Create error log entry
  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || 'anonymous',
    statusCode: err.statusCode || 500
  };

  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external logging service
    // logService.error(errorLog);
  }

  console.error('📊 Error Log:', JSON.stringify(errorLog, null, 2));
  next(err);
};

/**
 * Request timeout handler
 */
const timeoutHandler = (timeout = 30000) => {
  return (req, res, next) => {
    const timeoutId = setTimeout(() => {
      const err = new AppError('Request timeout', 408);
      next(err);
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
};

/**
 * Validation helpers
 */
const validateObjectId = (id, fieldName = 'ID') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new ValidationError(`${fieldName} is required`);
  }
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
};

const validatePassword = (password) => {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  
  // Middleware
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  expressAsyncHandler,
  errorLogger,
  timeoutHandler,
  
  // Helpers
  validateObjectId,
  validateRequired,
  validateEmail,
  validatePassword
}; 