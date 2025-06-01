const mongoose = require('mongoose');
const { 
  addressSchema, 
  contactInfoSchema, 
  weightSchema, 
  dimensionsSchema,
  moneySchema,
  commonSchemaOptions 
} = require('./shared/schemas');
const { 
  ORDER_STATUS, 
  PAYMENT_STATUS, 
  PAYMENT_METHODS, 
  SHIPPING_CARRIERS 
} = require('../config/constants');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    category: {
        type: String
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: moneySchema
});

// Schema for tracking events
const trackingEventSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    location: {
        city: String,
        state: String,
        country: String,
        facility: String
    },
    carrierStatus: {
        type: String // Original status from carrier
    },
    eventType: {
        type: String,
        enum: ['pickup', 'in_transit', 'out_for_delivery', 'delivered', 'attempted_delivery', 'exception', 'returned'],
        required: true
    }
});

// Schema for shipping information - Using shared schemas
const shippingInfoSchema = new mongoose.Schema({
    carrier: {
        type: String,
        enum: Object.values(SHIPPING_CARRIERS),
        required: true
    },
    serviceType: {
        type: String // e.g., "FedEx Ground", "UPS Next Day Air"
    },
    trackingNumber: {
        type: String,
        required: true
    },
    trackingUrl: {
        type: String
    },
    shippedDate: {
        type: Date
    },
    estimatedDelivery: {
        type: Date
    },
    actualDelivery: {
        type: Date
    },
    deliverySignature: {
        type: String
    },
    deliveryPhoto: {
        type: String // URL to delivery photo
    },
    weight: weightSchema,
    dimensions: dimensionsSchema,
    insuranceValue: moneySchema,
    deliveryInstructions: {
        type: String
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    items: [orderItemSchema],
    
    // Pricing - Using shared money schema
    subtotal: moneySchema,
    tax: moneySchema,
    shippingCost: moneySchema,
    discount: moneySchema,
    total: moneySchema,
    
    // Status - Using centralized constants
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.PENDING
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        required: true
    },
    paymentId: {
        type: String,
        default: null
    },
    blockchainTx: {
        type: String,
        default: null
    },
    escrowId: {
        type: String,
        default: null
    },
    
    // Billing and Shipping - Using shared contact and address schemas
    billingInfo: {
        ...contactInfoSchema.obj,
        address: addressSchema
    },
    shippingAddress: {
        ...contactInfoSchema.obj,
        company: String,
        address: addressSchema,
        deliveryInstructions: String
    },
    
    // Enhanced shipping and tracking
    shippingInfo: shippingInfoSchema,
    trackingEvents: [trackingEventSchema],
    
    // Delivery preferences
    deliveryPreferences: {
        signatureRequired: {
            type: Boolean,
            default: false
        },
        adultSignatureRequired: {
            type: Boolean,
            default: false
        },
        leaveAtDoor: {
            type: Boolean,
            default: false
        },
        deliveryWindow: {
            startTime: String, // e.g., "09:00"
            endTime: String    // e.g., "17:00"
        },
        weekendDelivery: {
            type: Boolean,
            default: false
        }
    },

    // Communication log
    communicationLog: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: ['sms', 'email', 'push', 'call'],
            required: true
        },
        content: String,
        recipient: String,
        status: {
            type: String,
            enum: ['sent', 'delivered', 'failed'],
            default: 'sent'
        }
    }],

    // Legacy fields for backward compatibility
    trackingNumber: {
        type: String,
        default: null
    },
    estimatedDelivery: {
        type: Date,
        default: null
    },
    
    notes: {
        type: String,
        default: ''
    },
    adminNotes: {
        type: String,
        default: ''
    },
    
    // Additional timestamps
    shippedAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    }
}, commonSchemaOptions);

// Indexes for better performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, status: 1 });
orderSchema.index({ 'shippingInfo.trackingNumber': 1 });
orderSchema.index({ trackingNumber: 1 }); // Legacy field
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
    if (this.isNew) {
        this.orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
    next();
});

// Instance methods
orderSchema.methods.addTrackingEvent = function(eventData) {
    this.trackingEvents.push(eventData);
    
    // Update main status based on event type
    const statusMap = {
        'pickup': ORDER_STATUS.SHIPPED,
        'in_transit': ORDER_STATUS.IN_TRANSIT,
        'out_for_delivery': ORDER_STATUS.OUT_FOR_DELIVERY,
        'delivered': ORDER_STATUS.DELIVERED,
        'returned': ORDER_STATUS.RETURNED
    };
    
    if (statusMap[eventData.eventType]) {
        this.status = statusMap[eventData.eventType];
    }
    
    // Update delivery timestamp if delivered
    if (eventData.eventType === 'delivered' && !this.deliveredAt) {
        this.deliveredAt = eventData.timestamp || new Date();
        if (this.shippingInfo) {
            this.shippingInfo.actualDelivery = this.deliveredAt;
        }
    }
    
    return this.save();
};

orderSchema.methods.updateShippingInfo = function(shippingData) {
    if (!this.shippingInfo) {
        this.shippingInfo = {};
    }
    
    Object.assign(this.shippingInfo, shippingData);
    
    // Set shipped timestamp if not already set
    if (shippingData.shippedDate && !this.shippedAt) {
        this.shippedAt = shippingData.shippedDate;
        this.status = ORDER_STATUS.SHIPPED;
    }
    
    // Update legacy tracking number for backward compatibility
    if (shippingData.trackingNumber) {
        this.trackingNumber = shippingData.trackingNumber;
    }
    
    // Update legacy estimated delivery
    if (shippingData.estimatedDelivery) {
        this.estimatedDelivery = shippingData.estimatedDelivery;
    }
    
    return this.save();
};

orderSchema.methods.getLatestTrackingEvent = function() {
    if (!this.trackingEvents || this.trackingEvents.length === 0) {
        return null;
    }
    
    return this.trackingEvents
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
};

orderSchema.methods.getTrackingURL = function() {
    if (this.shippingInfo && this.shippingInfo.trackingUrl) {
        return this.shippingInfo.trackingUrl;
    }
    
    // Generate tracking URL based on carrier and tracking number
    const trackingNumber = this.shippingInfo?.trackingNumber || this.trackingNumber;
    if (!trackingNumber) return null;
    
    const carrier = this.shippingInfo?.carrier?.toLowerCase();
    const trackingUrls = {
        'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
        'ups': `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`,
        'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
        'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
    };
    
    return trackingUrls[carrier] || null;
};

// Static methods
orderSchema.statics.findByTrackingNumber = function(trackingNumber) {
    return this.findOne({
        $or: [
            { 'shippingInfo.trackingNumber': trackingNumber },
            { 'trackingNumber': trackingNumber }
        ]
    });
};

orderSchema.statics.getOrdersNeedingTrackingUpdate = function() {
    return this.find({
        status: { $in: [ORDER_STATUS.SHIPPED, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.OUT_FOR_DELIVERY] },
        'shippingInfo.trackingNumber': { $exists: true, $ne: null }
    });
};

module.exports = mongoose.model('Order', orderSchema); 