const mongoose = require('mongoose');

/**
 * SHARED UTILITY SCHEMAS FOR BLOCMERCE
 * Eliminates data redundancy across models
 */

// ============================================
// SHARED ADDRESS SCHEMA
// ============================================
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'US'
  }
}, { _id: false });

// ============================================
// SHARED IMAGE SCHEMA
// ============================================
const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  alt: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// ============================================
// SHARED RATING SCHEMA
// ============================================
const ratingSchema = new mongoose.Schema({
  average: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// ============================================
// SHARED DIMENSIONS SCHEMA
// ============================================
const dimensionsSchema = new mongoose.Schema({
  length: {
    type: Number,
    default: 0,
    min: 0
  },
  width: {
    type: Number,
    default: 0,
    min: 0
  },
  height: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    enum: ['in', 'cm'],
    default: 'in'
  }
}, { _id: false });

// ============================================
// SHARED TRACKING/DEVICE INFO SCHEMA
// ============================================
const deviceInfoSchema = new mongoose.Schema({
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  location: {
    type: String,
    trim: true
  }
}, { _id: false });

// ============================================
// SHARED AUDIT TRAIL SCHEMA
// ============================================
const auditTrailSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  details: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// ============================================
// SHARED CONTACT INFO SCHEMA
// ============================================
const contactInfoSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  }
}, { _id: false });

// ============================================
// SHARED WEIGHT SCHEMA
// ============================================
const weightSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    enum: ['lbs', 'kg', 'g', 'oz'],
    default: 'lbs'
  }
}, { _id: false });

// ============================================
// SHARED MONEY/CURRENCY SCHEMA
// ============================================
const moneySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    trim: true
  }
}, { _id: false });

// ============================================
// COMMON SCHEMA OPTIONS
// ============================================
const commonSchemaOptions = {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  addressSchema,
  imageSchema,
  ratingSchema,
  dimensionsSchema,
  deviceInfoSchema,
  auditTrailSchema,
  contactInfoSchema,
  weightSchema,
  moneySchema,
  commonSchemaOptions
}; 