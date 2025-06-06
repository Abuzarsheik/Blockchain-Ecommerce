const mongoose = require('mongoose');

const { 
  imageSchema, 
  ratingSchema, 
  dimensionsSchema, 
  weightSchema,
  commonSchemaOptions 
} = require('./shared/schemas');
const { 
  PRODUCT_CATEGORY_ENUM, 
  PRODUCT_STATUS, 
  INVENTORY_TYPES 
} = require('../config/constants');

const productSchema = new mongoose.Schema({
    // Basic Product Information
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    shortDescription: {
        type: String,
        maxlength: 500
    },
    
    // Pricing
    price: {
        type: Number,
        required: true,
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    discountPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    
    // Category and Classification
    category: {
        type: String,
        required: true,
        enum: PRODUCT_CATEGORY_ENUM
    },
    subcategory: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    
    // Images and Media - Using shared schema
    images: [imageSchema],
    
    // Inventory Management
    inventory: {
        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        reserved: {
            type: Number,
            default: 0,
            min: 0
        },
        available: {
            type: Number,
            default: function() {
                return this.inventory.quantity - this.inventory.reserved;
            }
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0
        },
        trackInventory: {
            type: Boolean,
            default: true
        },
        allowBackorders: {
            type: Boolean,
            default: false
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        }
    },
    
    // Seller Information
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Product Status - Using centralized constants
    status: {
        type: String,
        enum: Object.values(PRODUCT_STATUS),
        default: PRODUCT_STATUS.DRAFT
    },
    
    // Product Specifications
    specifications: [{
        name: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        }
    }],
    
    // Shipping Information - Using shared schemas
    shipping: {
        weight: weightSchema,
        dimensions: dimensionsSchema,
        freeShipping: {
            type: Boolean,
            default: false
        },
        shippingCost: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    
    // SEO and Marketing
    seo: {
        metaTitle: String,
        metaDescription: String,
        slug: {
            type: String,
            unique: true,
            sparse: true
        }
    },
    
    // Reviews and Ratings - Using shared schema
    rating: ratingSchema,
    
    // Sales Metrics
    sales: {
        totalSold: {
            type: Number,
            default: 0
        },
        revenue: {
            type: Number,
            default: 0
        },
        views: {
            type: Number,
            default: 0
        }
    },
    
    // Inventory History - Using centralized constants
    inventoryHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        type: {
            type: String,
            enum: Object.values(INVENTORY_TYPES)
        },
        quantity: Number,
        previousQuantity: Number,
        newQuantity: Number,
        reason: String,
        reference: String // Order ID, adjustment ID, etc.
    }]
}, commonSchemaOptions);

// Indexes for better performance
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ 'inventory.quantity': 1 });
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'sales.totalSold': -1 });

// Virtual for available inventory
productSchema.virtual('availableInventory').get(function() {
    return Math.max(0, this.inventory.quantity - this.inventory.reserved);
});

// Pre-save middleware
productSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Generate SKU if not provided
    if (!this.inventory.sku) {
        this.inventory.sku = `SKU-${this._id}`;
    }
    
    // Generate slug if not provided
    if (!this.seo.slug) {
        this.seo.slug = this.name.toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    
    // Update available inventory
    this.inventory.available = Math.max(0, this.inventory.quantity - this.inventory.reserved);
    
    // Update status based on inventory (but don't override discontinued status)
    if (this.inventory.trackInventory && this.availableInventory === 0 && this.status !== PRODUCT_STATUS.DISCONTINUED) {
        this.status = PRODUCT_STATUS.OUT_OF_STOCK;
    }
    
    next();
});

// Instance methods
productSchema.methods.updateInventory = function(quantity, type, reason, reference) {
    const previousQuantity = this.inventory.quantity;
    this.inventory.quantity = Math.max(0, quantity);
    
    // Add to inventory history
    this.inventoryHistory.push({
        type: type,
        quantity: type === INVENTORY_TYPES.STOCK_IN ? quantity - previousQuantity : previousQuantity - quantity,
        previousQuantity: previousQuantity,
        newQuantity: this.inventory.quantity,
        reason: reason,
        reference: reference
    });
    
    return this.save();
};

productSchema.methods.reserveInventory = function(quantity) {
    if (this.availableInventory >= quantity) {
        this.inventory.reserved += quantity;
        return this.save();
    }
    throw new Error('Insufficient inventory to reserve');
};

productSchema.methods.releaseInventory = function(quantity) {
    this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
    return this.save();
};

productSchema.methods.isLowStock = function() {
    return this.inventory.trackInventory && 
           this.availableInventory <= this.inventory.lowStockThreshold;
};

productSchema.methods.canSell = function(quantity = 1) {
    if (!this.inventory.trackInventory) {return true;}
    if (this.availableInventory >= quantity) {return true;}
    if (this.inventory.allowBackorders) {return true;}
    return false;
};

// Static methods
productSchema.statics.findBySeller = function(sellerId, status = null) {
    const query = { seller: sellerId };
    if (status) {query.status = status;}
    return this.find(query).sort({ updatedAt: -1 });
};

productSchema.statics.findLowStock = function(sellerId) {
    return this.find({
        seller: sellerId,
        'inventory.trackInventory': true,
        $expr: {
            $lte: [
                { $subtract: ['$inventory.quantity', '$inventory.reserved'] },
                '$inventory.lowStockThreshold'
            ]
        }
    });
};

productSchema.statics.searchProducts = function(query, filters = {}) {
    const searchQuery = {};
    
    if (query) {
        searchQuery.$or = [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ];
    }
    
    if (filters.category) {searchQuery.category = filters.category;}
    if (filters.seller) {searchQuery.seller = filters.seller;}
    if (filters.status) {searchQuery.status = filters.status;}
    if (filters.minPrice) {searchQuery.price = { $gte: filters.minPrice };}
    if (filters.maxPrice) {
        searchQuery.price = searchQuery.price || {};
        searchQuery.price.$lte = filters.maxPrice;
    }
    
    return this.find(searchQuery);
};

module.exports = mongoose.model('Product', productSchema); 