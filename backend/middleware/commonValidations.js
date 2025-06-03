const { body, param, query } = require('express-validator');

/**
 * SHARED VALIDATION UTILITIES
 * Eliminates duplicate validation patterns across routes
 */

// ============================================
// COMMON FIELD VALIDATIONS
// ============================================

const commonValidations = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  // Password validation
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  newPassword: () => body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  // Name validations
  firstName: () => body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),

  lastName: () => body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),

  username: () => body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters'),

  // Description validations (different lengths for different contexts)
  shortDescription: () => body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be 10-500 characters'),

  mediumDescription: () => body('description')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be 20-1000 characters'),

  longDescription: () => body('description')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20-2000 characters'),

  // Review validations
  productReview: () => body('productReview')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Product review must be 10-2000 characters'),

  sellerReview: () => body('sellerReview')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Seller review must be 10-1000 characters'),

  // Message/content validations
  message: () => body('message')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be 1-1000 characters'),

  title: () => body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required (1-200 chars)'),

  // Phone validation
  phoneNumber: () => body('phoneNumber')
    .isLength({ min: 7, max: 20 })
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),

  // Address validations
  street: () => body('address.street')
    .isLength({ min: 1 })
    .withMessage('Street address is required'),

  city: () => body('address.city')
    .isLength({ min: 1 })
    .withMessage('City is required'),

  country: () => body('address.country')
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be 2-character country code'),

  postalCode: () => body('address.postalCode')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Invalid postal code'),

  // 2FA validation
  twoFactorCode: () => body('code')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA code must be 6 digits'),

  // ID validations
  mongoId: (field = 'id') => param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),

  // Optional fields
  bio: () => body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  location: () => body('profile.location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),

  notes: () => body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  // Dispute specific
  disputeReason: () => body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Dispute reason must be 10-500 characters'),

  // Tracking specific
  trackingNumber: () => body('tracking_number')
    .isLength({ min: 1 })
    .withMessage('Tracking number is required'),

  status: () => body('status')
    .isLength({ min: 1, max: 200 })
    .withMessage('Status is required (1-200 chars)')
};

// ============================================
// VALIDATION GROUPS
// ============================================

const validationGroups = {
  // User registration
  userRegistration: [
    commonValidations.firstName(),
    commonValidations.lastName(),
    commonValidations.username(),
    commonValidations.email(),
    commonValidations.password()
  ],

  // User login
  userLogin: [
    commonValidations.email(),
    commonValidations.password()
  ],

  // Profile update
  profileUpdate: [
    commonValidations.firstName(),
    commonValidations.lastName(),
    commonValidations.username(),
    commonValidations.bio(),
    commonValidations.location()
  ],

  // Address validation
  addressValidation: [
    commonValidations.street(),
    commonValidations.city(),
    commonValidations.country(),
    commonValidations.postalCode()
  ],

  // Review validation
  reviewValidation: [
    commonValidations.productReview(),
    commonValidations.sellerReview()
  ],

  // Password change
  passwordChange: [
    commonValidations.password(),
    commonValidations.newPassword()
  ],

  // 2FA validation
  twoFactorValidation: [
    commonValidations.twoFactorCode()
  ]
};

module.exports = {
  commonValidations,
  validationGroups
}; 