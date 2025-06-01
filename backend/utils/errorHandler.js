const logger = require('../config/logger');

/**
 * Centralized Error Handling System
 * Provides consistent error responses and logging across all services
 */


class AppError extends Error {
  constructor(message, statusCode, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Common error types
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DUPLICATE: 'DUPLICATE',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  BLOCKCHAIN_ERROR: 'BLOCKCHAIN_ERROR'
};

// Error response factory
const createErrorResponse = (type, message, details = null, statusCode = 500) => {
  return {
    success: false,
    error: {
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

// Standard error handlers
const handleValidationError = (error) => {
  const errors = Object.values(error.errors || {}).map(val => val.message);
  return createErrorResponse(
    ErrorTypes.VALIDATION_ERROR,
    'Validation failed',
    errors,
    400
  );
};

const handleDuplicateError = (error) => {
  const field = Object.keys(error.keyValue || {})[0];
  return createErrorResponse(
    ErrorTypes.DUPLICATE,
    `${field} already exists`,
    error.keyValue,
    409
  );
};

const handleCastError = (error) => {
  return createErrorResponse(
    ErrorTypes.VALIDATION_ERROR,
    `Invalid ${error.path}: ${error.value}`,
    null,
    400
  );
};

const handleJWTError = () => {
  return createErrorResponse(
    ErrorTypes.UNAUTHORIZED,
    'Invalid token. Please log in again',
    null,
    401
  );
};

const handleJWTExpiredError = () => {
  return createErrorResponse(
    ErrorTypes.UNAUTHORIZED,
    'Token expired. Please log in again',
    null,
    401
  );
};

// Main error handler middleware
const globalErrorHandler = (err, req, res, next) => {
  let errorResponse;
  let statusCode = err.statusCode || 500;

  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse = handleValidationError(err);
    statusCode = 400;
  } else if (err.code === 11000) {
    errorResponse = handleDuplicateError(err);
    statusCode = 409;
  } else if (err.name === 'CastError') {
    errorResponse = handleCastError(err);
    statusCode = 400;
  } else if (err.name === 'JsonWebTokenError') {
    errorResponse = handleJWTError();
    statusCode = 401;
  } else if (err.name === 'TokenExpiredError') {
    errorResponse = handleJWTExpiredError();
    statusCode = 401;
  } else if (err instanceof AppError) {
    errorResponse = createErrorResponse(
      err.type || ErrorTypes.SERVER_ERROR,
      err.message,
      null,
      err.statusCode
    );
    statusCode = err.statusCode;
  } else {
    // Generic server error
    errorResponse = createErrorResponse(
      ErrorTypes.SERVER_ERROR,
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message,
      process.env.NODE_ENV === 'production' ? null : err.stack,
      500
    );
    statusCode = 500;
  }

  res.status(statusCode).json(errorResponse);
};

// Catch async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Standard success response
const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// Pagination response
const paginatedResponse = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  AppError,
  ErrorTypes,
  createErrorResponse,
  globalErrorHandler,
  catchAsync,
  successResponse,
  paginatedResponse
}; 