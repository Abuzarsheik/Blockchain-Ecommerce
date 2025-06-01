const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security Configuration
 */
const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
      console.warn('⚠️ Using default JWT secret - NOT suitable for production');
      return 'development-only-jwt-secret-change-in-production';
    })(),
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'Blocmerce',
    audience: 'Blocmerce-Users'
  },

  // Password Requirements
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAttempts: 5,
    lockoutTime: 30 * 60 * 1000, // 30 minutes
    saltRounds: 12
  },

  // Session Configuration
  session: {
    name: 'blocmerce.sid',
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be set in production environment');
      }
      console.warn('⚠️ Using default session secret - NOT suitable for production');
      return 'development-only-session-secret-change-in-production';
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // Rate Limiting
  rateLimits: {
    // General API rate limit
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },

    // Strict rate limit for auth endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per window
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    },

    // Password reset rate limit
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset attempts per hour
      message: 'Too many password reset attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    },

    // File upload rate limit
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 uploads per hour
      message: 'Too many file uploads, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // CORS Configuration
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://your-production-domain.com',
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
      ];
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) {return callback(null, true);}
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  },

  // Helmet Security Headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },

  // File Upload Security
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt']
  }
};

/**
 * Create rate limiter middleware
 */
const createRateLimit = (config) => {
  return rateLimit(config);
};

/**
 * CORS middleware factory
 */
const createCorsMiddleware = () => {
  return cors(securityConfig.cors);
};

/**
 * Helmet middleware factory
 */
const createHelmetMiddleware = () => {
  return helmet(securityConfig.helmet);
};

/**
 * Compression middleware
 */
const createCompressionMiddleware = () => {
  return compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  });
};

/**
 * Content Type Validation
 */
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header is required'
      });
    }

    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];

    const isValidType = allowedTypes.some(type => 
      contentType.includes(type)
    );

    if (!isValidType) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported Content-Type'
      });
    }
  }
  
  next();
};

/**
 * IP Whitelist/Blacklist middleware
 */
const createIPFilter = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check whitelist (if provided)
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  };
};

/**
 * Request size limiter
 */
const createSizeLimiter = (limit = '10mb') => {
  return (req, res, next) => {
    req.on('data', (chunk) => {
      const currentSize = parseInt(req.get('Content-Length')) || 0;
      const maxSize = typeof limit === 'string' ? 
        parseInt(limit) * 1024 * 1024 : limit;

      if (currentSize > maxSize) {
        return res.status(413).json({
          success: false,
          message: 'Request entity too large'
        });
      }
    });
    
    next();
  };
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  const acceptVersion = req.headers['accept-version'] || req.query.version || 'v1';
  
  // Validate version format
  if (!/^v\d+$/.test(acceptVersion)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid API version format. Use v1, v2, etc.'
    });
  }
  
  req.apiVersion = acceptVersion;
  res.setHeader('API-Version', acceptVersion);
  
  next();
};

/**
 * Request ID middleware for tracking
 */
const requestId = (req, res, next) => {
  const id = req.headers['x-request-id'] || 
            req.headers['x-correlation-id'] || 
            Math.random().toString(36).substr(2, 9);
  
  req.id = id;
  res.setHeader('X-Request-ID', id);
  
  next();
};

module.exports = {
  securityConfig,
  createRateLimit,
  createCorsMiddleware,
  createHelmetMiddleware,
  createCompressionMiddleware,
  validateContentType,
  createIPFilter,
  createSizeLimiter,
  securityHeaders,
  apiVersioning,
  requestId
}; 