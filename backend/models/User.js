const mongoose = require('mongoose');

const { 
  addressSchema, 
  deviceInfoSchema, 
  auditTrailSchema, 
  contactInfoSchema,
  ratingSchema,
  commonSchemaOptions 
} = require('./shared/schemas');
const { 
  USER_TYPES, 
  USER_ROLES, 
  KYC_STATUS, 
  DOCUMENT_TYPES 
} = require('../config/constants');

const userSchema = new mongoose.Schema({
    // Basic Contact Information - Using shared schema
    ...contactInfoSchema.obj,
    
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    password_hash: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        enum: Object.values(USER_TYPES),
        required: true,
        default: USER_TYPES.BUYER
    },
    role: {
        type: String,
        enum: Object.values(USER_ROLES),
        default: USER_ROLES.USER
    },
    wallet_address: {
        type: String,
        default: null
    },
    
    // 2FA and Security Fields
    twoFactorAuth: {
        isEnabled: {
            type: Boolean,
            default: false
        },
        secret: {
            type: String,
            default: null
        },
        backupCodes: [{
            code: String,
            used: {
                type: Boolean,
                default: false
            }
        }],
        lastUsed: {
            type: Date,
            default: null
        }
    },
    
    // Password Reset Fields
    passwordReset: {
        token: {
            type: String,
            default: null
        },
        expires: {
            type: Date,
            default: null
        },
        attempts: {
            type: Number,
            default: 0
        }
    },
    
    // Email Verification
    emailVerification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        token: {
            type: String,
            default: null
        },
        expires: {
            type: Date,
            default: null
        }
    },
    
    // Login Tracking
    loginAttempts: {
        count: {
            type: Number,
            default: 0
        },
        lastAttempt: {
            type: Date,
            default: null
        },
        lockedUntil: {
            type: Date,
            default: null
        }
    },
    
    // Login History - Using shared device info schema
    loginHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        ...deviceInfoSchema.obj,
        success: Boolean
    }],
    
    // Security Settings
    security: {
        ipWhitelist: [String],
        loginNotifications: {
            type: Boolean,
            default: true
        },
        emailAlerts: {
            type: Boolean,
            default: true
        },
        suspiciousActivityAlerts: {
            type: Boolean,
            default: true
        },
        sessionTimeout: {
            type: Number,
            default: 7 // days
        }
    },
    
    // Seller-specific fields - Using shared rating schema
    sellerProfile: {
        storeName: {
            type: String,
            default: ''
        },
        storeDescription: {
            type: String,
            default: ''
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        rating: ratingSchema,
        totalSales: {
            type: Number,
            default: 0
        },
        commission: {
            type: Number,
            default: 5, // 5% default commission
            min: 0,
            max: 100
        }
    },
    
    // KYC Verification System - Using centralized constants
    kyc: {
        status: {
            type: String,
            enum: Object.values(KYC_STATUS),
            default: KYC_STATUS.NOT_STARTED
        },
        level: {
            type: String,
            enum: ['basic', 'intermediate', 'advanced'],
            default: 'basic'
        },
        submissionDate: {
            type: Date,
            default: null
        },
        reviewDate: {
            type: Date,
            default: null
        },
        expiryDate: {
            type: Date,
            default: null
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        rejectionReason: {
            type: String,
            default: null
        },
        
        // Personal Information - Using shared address schema
        personalInfo: {
            dateOfBirth: {
                type: Date,
                default: null
            },
            nationality: {
                type: String,
                default: null
            },
            countryOfResidence: {
                type: String,
                default: null
            },
            phoneNumber: {
                type: String,
                default: null
            },
            address: addressSchema,
            occupation: {
                type: String,
                default: null
            },
            sourceOfFunds: {
                type: String,
                enum: ['employment', 'business', 'investments', 'inheritance', 'other'],
                default: 'employment'
            }
        },
        
        // Document Verification - Using centralized document types
        documents: {
            identity: {
                type: {
                    type: String,
                    enum: Object.values(DOCUMENT_TYPES.IDENTITY),
                    default: DOCUMENT_TYPES.IDENTITY.NATIONAL_ID
                },
                documentNumber: {
                    type: String,
                    default: null
                },
                issueDate: {
                    type: Date,
                    default: null
                },
                expiryDate: {
                    type: Date,
                    default: null
                },
                issuingAuthority: {
                    type: String,
                    default: null
                },
                frontImage: {
                    type: String,
                    default: null
                },
                backImage: {
                    type: String,
                    default: null
                },
                verified: {
                    type: Boolean,
                    default: false
                }
            },
            proofOfAddress: {
                type: {
                    type: String,
                    enum: Object.values(DOCUMENT_TYPES.PROOF_OF_ADDRESS),
                    default: DOCUMENT_TYPES.PROOF_OF_ADDRESS.UTILITY_BILL
                },
                issueDate: {
                    type: Date,
                    default: null
                },
                image: {
                    type: String,
                    default: null
                },
                verified: {
                    type: Boolean,
                    default: false
                }
            },
            selfie: {
                image: {
                    type: String,
                    default: null
                },
                verified: {
                    type: Boolean,
                    default: false
                },
                livenessScore: {
                    type: Number,
                    default: null
                }
            }
        },
        
        // Risk Assessment
        riskAssessment: {
            score: {
                type: Number,
                min: 0,
                max: 100,
                default: null
            },
            level: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'low'
            },
            factors: [{
                factor: String,
                score: Number,
                reason: String
            }],
            lastAssessment: {
                type: Date,
                default: null
            }
        },
        
        // Compliance Checks
        compliance: {
            sanctionsList: {
                checked: {
                    type: Boolean,
                    default: false
                },
                result: {
                    type: String,
                    enum: ['clear', 'match', 'potential_match'],
                    default: 'clear'
                },
                lastChecked: {
                    type: Date,
                    default: null
                }
            },
            pepCheck: {
                checked: {
                    type: Boolean,
                    default: false
                },
                result: {
                    type: String,
                    enum: ['clear', 'match', 'potential_match'],
                    default: 'clear'
                },
                lastChecked: {
                    type: Date,
                    default: null
                }
            },
            adverseMedia: {
                checked: {
                    type: Boolean,
                    default: false
                },
                result: {
                    type: String,
                    enum: ['clear', 'match', 'potential_match'],
                    default: 'clear'
                },
                lastChecked: {
                    type: Date,
                    default: null
                }
            }
        },
        
        // Verification History - Using shared audit trail schema
        history: [auditTrailSchema],
        
        // Transaction Limits
        transactionLimits: {
            daily: {
                type: Number,
                default: 1000 // USD equivalent
            },
            monthly: {
                type: Number,
                default: 10000 // USD equivalent
            },
            yearly: {
                type: Number,
                default: 100000 // USD equivalent
            }
        }
    },
    
    // Enhanced Profile Fields
    profile: {
        avatar: {
            type: String,
            default: null
        },
        bio: {
            type: String,
            default: '',
            maxlength: 500
        },
        location: {
            type: String,
            default: ''
        },
        website: {
            type: String,
            default: ''
        },
        social: {
            twitter: { type: String, default: '' },
            instagram: { type: String, default: '' },
            discord: { type: String, default: '' }
        },
        // Additional profile fields
        preferredLanguage: {
            type: String,
            default: 'en'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        notifications: {
            email: {
                marketing: { type: Boolean, default: true },
                security: { type: Boolean, default: true },
                transactions: { type: Boolean, default: true },
                updates: { type: Boolean, default: true }
            },
            push: {
                enabled: { type: Boolean, default: false },
                marketing: { type: Boolean, default: false },
                security: { type: Boolean, default: true },
                transactions: { type: Boolean, default: true }
            }
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'friends', 'private'],
                default: 'public'
            },
            showTransactionHistory: {
                type: Boolean,
                default: false
            },
            showWalletAddress: {
                type: Boolean,
                default: false
            }
        }
    },
    
    // Wishlist functionality
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    wishlistItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        dateAdded: {
            type: Date,
            default: Date.now
        }
    }],
    
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, commonSchemaOptions);

// Update the updated_at field before saving
userSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil > Date.now());
});

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock and it's expired, restart attempts
    if (this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil < Date.now()) {
        return this.updateOne({
            $unset: {
                'loginAttempts.lockedUntil': 1
            },
            $set: {
                'loginAttempts.count': 1,
                'loginAttempts.lastAttempt': Date.now()
            }
        });
    }
    
    const updates = {
        $inc: {
            'loginAttempts.count': 1
        },
        $set: {
            'loginAttempts.lastAttempt': Date.now()
        }
    };
    
    // Lock account after 5 failed attempts for 1 hour
    if (this.loginAttempts.count + 1 >= 5) {
        updates.$set['loginAttempts.lockedUntil'] = Date.now() + (60 * 60 * 1000); // 1 hour
    }
    
    return this.updateOne(updates);
};

// Method to reset login attempts after successful login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: {
            'loginAttempts.count': 1,
            'loginAttempts.lastAttempt': 1,
            'loginAttempts.lockedUntil': 1
        }
    });
};

// Method to add login history entry
userSchema.methods.addLoginHistory = function(ipAddress, userAgent, location, success) {
    this.loginHistory.push({
        timestamp: new Date(),
        ipAddress,
        userAgent,
        location,
        success
    });
    
    // Keep only last 50 login attempts
    if (this.loginHistory.length > 50) {
        this.loginHistory = this.loginHistory.slice(-50);
    }
    
    return this.save();
};

// KYC-related methods
userSchema.methods.updateKycStatus = function(status, reviewedBy = null, reason = null) {
    this.kyc.status = status;
    this.kyc.reviewDate = new Date();
    if (reviewedBy) {this.kyc.reviewedBy = reviewedBy;}
    if (reason) {this.kyc.rejectionReason = reason;}
    
    // Set expiry date for approved KYC (1 year from approval)
    if (status === KYC_STATUS.APPROVED) {
        this.kyc.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        this.isVerified = true;
    }
    
    // Add to history
    this.kyc.history.push({
        action: status,
        timestamp: new Date(),
        performedBy: reviewedBy,
        details: reason,
        metadata: { status, reason }
    });
    
    return this.save();
};

userSchema.methods.addKycDocument = function(documentType, documentData) {
    if (documentType === 'identity') {
        this.kyc.documents.identity = { ...this.kyc.documents.identity, ...documentData };
    } else if (documentType === 'proofOfAddress') {
        this.kyc.documents.proofOfAddress = { ...this.kyc.documents.proofOfAddress, ...documentData };
    } else if (documentType === 'selfie') {
        this.kyc.documents.selfie = { ...this.kyc.documents.selfie, ...documentData };
    }
    
    // Add to history
    this.kyc.history.push({
        action: 'document_uploaded',
        timestamp: new Date(),
        details: `${documentType} document uploaded`,
        metadata: { documentType, ...documentData }
    });
    
    return this.save();
};

userSchema.methods.updateRiskAssessment = function(score, level, factors) {
    this.kyc.riskAssessment = {
        score,
        level,
        factors,
        lastAssessment: new Date()
    };
    return this.save();
};

userSchema.methods.runComplianceChecks = function(sanctionsResult, pepResult, adverseMediaResult) {
    const now = new Date();
    
    this.kyc.compliance = {
        sanctionsList: {
            checked: true,
            result: sanctionsResult,
            lastChecked: now
        },
        pepCheck: {
            checked: true,
            result: pepResult,
            lastChecked: now
        },
        adverseMedia: {
            checked: true,
            result: adverseMediaResult,
            lastChecked: now
        }
    };
    
    return this.save();
};

// Virtual to check if KYC is expired
userSchema.virtual('isKycExpired').get(function() {
    return this.kyc.expiryDate && this.kyc.expiryDate < new Date();
});

// Virtual to check if KYC is approved and valid
userSchema.virtual('isKycApproved').get(function() {
    return this.kyc.status === KYC_STATUS.APPROVED && !this.isKycExpired;
});

// Virtual to get KYC completion percentage
userSchema.virtual('kycCompletionPercentage').get(function() {
    let completed = 0;
    const total = 8; // Total number of required fields
    
    if (this.kyc.personalInfo.dateOfBirth) {completed++;}
    if (this.kyc.personalInfo.nationality) {completed++;}
    if (this.kyc.personalInfo.phoneNumber) {completed++;}
    if (this.kyc.personalInfo.address && this.kyc.personalInfo.address.street && this.kyc.personalInfo.address.city) {completed++;}
    if (this.kyc.documents.identity.frontImage) {completed++;}
    if (this.kyc.documents.proofOfAddress.image) {completed++;}
    if (this.kyc.documents.selfie.image) {completed++;}
    if (this.kyc.personalInfo.sourceOfFunds) {completed++;}
    
    return Math.round((completed / total) * 100);
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('User', userSchema); 