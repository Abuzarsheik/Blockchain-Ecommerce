const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // Email validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ min: 5, max: 254 })
    .withMessage('Email must be between 5 and 254 characters'),

  // Password validation
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character'),

  // Name validation
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  // ObjectId validation
  objectId: (field = 'id') => param(field)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),

  // Price validation
  price: body('price')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be a valid number between 0 and 999,999.99')
    .toFloat(),

  // Wallet address validation
  walletAddress: body('wallet_address')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum wallet address format'),

  // Product title validation
  title: body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters')
    .escape(),

  // Product description validation
  description: body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
    .escape(),

  // Category validation
  category: body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters')
    .isIn(['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'])
    .withMessage('Invalid category'),

  // Quantity validation
  quantity: body('quantity')
    .isInt({ min: 0, max: 10000 })
    .withMessage('Quantity must be a valid integer between 0 and 10,000')
    .toInt(),

  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a valid integer between 1 and 1000')
    .toInt(),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be a valid integer between 1 and 100')
    .toInt(),

  // Search query validation
  search: query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),

  // Review rating validation
  rating: body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
    .toInt(),

  // Review comment validation
  comment: body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters')
    .escape(),

  // Phone number validation
  phone: body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),

  // URL validation
  url: body('image_url')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),

  // Date validation
  date: body('date')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date'),

  // Boolean validation
  boolean: (field) => body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be a boolean value`)
    .toBoolean()
};

/**
 * Pre-defined validation middleware for common operations
 */
const validationMiddleware = {
  // User registration
  register: [
    validationRules.email,
    validationRules.password,
    validationRules.name.withMessage('Full name is required'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
    handleValidationErrors
  ],

  // User login
  login: [
    validationRules.email,
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
  ],

  // Product creation
  createProduct: [
    validationRules.title,
    validationRules.description,
    validationRules.price,
    validationRules.category,
    validationRules.quantity,
    body('images')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 images allowed'),
    handleValidationErrors
  ],

  // Product update
  updateProduct: [
    validationRules.objectId(),
    validationRules.title.optional(),
    validationRules.description.optional(),
    validationRules.price.optional(),
    validationRules.category.optional(),
    validationRules.quantity.optional(),
    handleValidationErrors
  ],

  // Review creation
  createReview: [
    validationRules.objectId('productId'),
    validationRules.rating,
    validationRules.comment,
    handleValidationErrors
  ],

  // Order creation
  createOrder: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('Order must contain at least one item'),
    body('items.*.productId')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid product ID');
        }
        return true;
      }),
    body('items.*.quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Item quantity must be between 1 and 100'),
    body('shippingAddress.street')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Street address must be between 5 and 100 characters'),
    body('shippingAddress.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    body('shippingAddress.postalCode')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Postal code must be between 3 and 20 characters'),
    body('shippingAddress.country')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Country must be between 2 and 50 characters'),
    handleValidationErrors
  ],

  // Profile update
  updateProfile: [
    validationRules.name.optional(),
    validationRules.phone,
    validationRules.walletAddress,
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 250 })
      .withMessage('Bio cannot exceed 250 characters')
      .escape(),
    handleValidationErrors
  ],

  // Common ID validation
  validateId: [
    validationRules.objectId(),
    handleValidationErrors
  ],

  // Pagination validation
  validatePagination: [
    validationRules.page,
    validationRules.limit,
    validationRules.search,
    handleValidationErrors
  ]
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

/**
 * Rate limiting by IP
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  validationRules,
  validationMiddleware,
  handleValidationErrors,
  sanitizeInput,
  createRateLimit
}; 