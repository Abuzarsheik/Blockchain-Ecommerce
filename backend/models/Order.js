const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product_id: {
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
    price: {
        type: Number,
        required: true,
        min: 0
    }
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
    carrier_status: {
        type: String // Original status from carrier
    },
    event_type: {
        type: String,
        enum: ['pickup', 'in_transit', 'out_for_delivery', 'delivered', 'attempted_delivery', 'exception', 'returned'],
        required: true
    }
});

// Schema for shipping information
const shippingInfoSchema = new mongoose.Schema({
    carrier: {
        type: String,
        enum: ['fedex', 'ups', 'dhl', 'usps', 'local_delivery', 'other'],
        required: true
    },
    service_type: {
        type: String // e.g., "FedEx Ground", "UPS Next Day Air"
    },
    tracking_number: {
        type: String,
        required: true
    },
    tracking_url: {
        type: String
    },
    shipped_date: {
        type: Date
    },
    estimated_delivery: {
        type: Date
    },
    actual_delivery: {
        type: Date
    },
    delivery_signature: {
        type: String
    },
    delivery_photo: {
        type: String // URL to delivery photo
    },
    weight: {
        value: Number,
        unit: {
            type: String,
            enum: ['lbs', 'kg'],
            default: 'lbs'
        }
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
            type: String,
            enum: ['in', 'cm'],
            default: 'in'
        }
    },
    insurance_value: {
        type: Number,
        default: 0
    },
    delivery_instructions: {
        type: String
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    shipping_cost: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: [
            'pending', 'confirmed', 'processing', 'ready_to_ship', 
            'shipped', 'in_transit', 'out_for_delivery', 'delivered', 
            'cancelled', 'returned', 'refunded', 'disputed'
        ],
        default: 'pending'
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending'
    },
    payment_method: {
        type: String,
        enum: ['card', 'crypto', 'escrow'],
        required: true
    },
    payment_id: {
        type: String,
        default: null
    },
    blockchain_tx: {
        type: String,
        default: null
    },
    escrow_id: {
        type: String,
        default: null
    },
    billing_info: {
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    shipping_address: {
        firstName: String,
        lastName: String,
        company: String,
        street: String,
        street2: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
        phone: String,
        delivery_instructions: String
    },
    // Enhanced shipping and tracking
    shipping_info: shippingInfoSchema,
    tracking_events: [trackingEventSchema],
    
    // Delivery preferences
    delivery_preferences: {
        signature_required: {
            type: Boolean,
            default: false
        },
        adult_signature_required: {
            type: Boolean,
            default: false
        },
        leave_at_door: {
            type: Boolean,
            default: false
        },
        delivery_window: {
            start_time: String, // e.g., "09:00"
            end_time: String    // e.g., "17:00"
        },
        weekend_delivery: {
            type: Boolean,
            default: false
        }
    },

    // Communication log
    communication_log: [{
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
    tracking_number: {
        type: String,
        default: null
    },
    estimated_delivery: {
        type: Date,
        default: null
    },
    
    notes: {
        type: String,
        default: ''
    },
    admin_notes: {
        type: String,
        default: ''
    },
    
    // Timestamps
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    shipped_at: {
        type: Date
    },
    delivered_at: {
        type: Date
    }
});

// Indexes for better performance
orderSchema.index({ user_id: 1, created_at: -1 });
orderSchema.index({ seller_id: 1, status: 1 });
orderSchema.index({ 'shipping_info.tracking_number': 1 });
orderSchema.index({ tracking_number: 1 }); // Legacy field
orderSchema.index({ status: 1, created_at: -1 });
orderSchema.index({ orderNumber: 1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
    if (this.isNew) {
        this.orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
    this.updated_at = Date.now();
    next();
});

// Instance methods
orderSchema.methods.addTrackingEvent = function(eventData) {
    this.tracking_events.push(eventData);
    
    // Update main status based on event type
    const statusMap = {
        'pickup': 'shipped',
        'in_transit': 'in_transit',
        'out_for_delivery': 'out_for_delivery',
        'delivered': 'delivered',
        'returned': 'returned'
    };
    
    if (statusMap[eventData.event_type]) {
        this.status = statusMap[eventData.event_type];
    }
    
    // Update delivery timestamp if delivered
    if (eventData.event_type === 'delivered' && !this.delivered_at) {
        this.delivered_at = eventData.timestamp || new Date();
        if (this.shipping_info) {
            this.shipping_info.actual_delivery = this.delivered_at;
        }
    }
    
    this.updated_at = new Date();
    return this.save();
};

orderSchema.methods.updateShippingInfo = function(shippingData) {
    if (!this.shipping_info) {
        this.shipping_info = {};
    }
    
    Object.assign(this.shipping_info, shippingData);
    
    // Set shipped timestamp if not already set
    if (shippingData.shipped_date && !this.shipped_at) {
        this.shipped_at = shippingData.shipped_date;
        this.status = 'shipped';
    }
    
    // Update legacy tracking number for backward compatibility
    if (shippingData.tracking_number) {
        this.tracking_number = shippingData.tracking_number;
    }
    
    // Update legacy estimated delivery
    if (shippingData.estimated_delivery) {
        this.estimated_delivery = shippingData.estimated_delivery;
    }
    
    this.updated_at = new Date();
    return this.save();
};

orderSchema.methods.getLatestTrackingEvent = function() {
    if (!this.tracking_events || this.tracking_events.length === 0) {
        return null;
    }
    
    return this.tracking_events
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
};

orderSchema.methods.getTrackingURL = function() {
    if (this.shipping_info && this.shipping_info.tracking_url) {
        return this.shipping_info.tracking_url;
    }
    
    // Generate tracking URL based on carrier and tracking number
    const trackingNumber = this.shipping_info?.tracking_number || this.tracking_number;
    if (!trackingNumber) return null;
    
    const carrier = this.shipping_info?.carrier?.toLowerCase();
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
            { 'shipping_info.tracking_number': trackingNumber },
            { 'tracking_number': trackingNumber }
        ]
    });
};

orderSchema.statics.getOrdersNeedingTrackingUpdate = function() {
    return this.find({
        status: { $in: ['shipped', 'in_transit', 'out_for_delivery'] },
        'shipping_info.tracking_number': { $exists: true, $ne: null }
    });
};

module.exports = mongoose.model('Order', orderSchema); 