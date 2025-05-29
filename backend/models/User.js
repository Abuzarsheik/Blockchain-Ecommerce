const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password_hash: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        enum: ['buyer', 'seller'],
        required: true,
        default: 'buyer'
    },
    wallet_address: {
        type: String,
        default: null
    },
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
        }
    },
    // Seller-specific fields
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
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
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
});

// Update the updated_at field before saving
userSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('User', userSchema); 