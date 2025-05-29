const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image_url: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Art', 'Digital Art', 'Music', 'Photography', 'Gaming', 'Sports', 'Collectibles', 'Utility', 'Domain Names']
    },
    creator_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token_id: {
        type: String,
        unique: true,
        required: true
    },
    blockchain: {
        type: String,
        default: 'Ethereum',
        enum: ['Ethereum', 'Polygon', 'Binance Smart Chain', 'Solana']
    },
    royalty_percentage: {
        type: Number,
        default: 5,
        min: 0,
        max: 50
    },
    is_minted: {
        type: Boolean,
        default: false
    },
    is_listed: {
        type: Boolean,
        default: true
    },
    like_count: {
        type: Number,
        default: 0,
        min: 0
    },
    view_count: {
        type: Number,
        default: 0,
        min: 0
    },
    liked_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    metadata: {
        image: String,
        attributes: [{
            trait_type: String,
            value: mongoose.Schema.Types.Mixed
        }],
        external_url: String,
        animation_url: String
    },
    contract_address: {
        type: String,
        default: null
    },
    transaction_hash: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for better query performance
nftSchema.index({ creator_id: 1 });
nftSchema.index({ owner_id: 1 });
nftSchema.index({ category: 1 });
nftSchema.index({ price: 1 });
nftSchema.index({ created_at: -1 });
nftSchema.index({ like_count: -1 });
nftSchema.index({ view_count: -1 });

// Virtual for checking if NFT is owned by current user
nftSchema.virtual('isOwned').get(function() {
    return this.owner_id;
});

// Method to increment view count
nftSchema.methods.incrementViews = async function() {
    this.view_count += 1;
    return this.save();
};

// Method to toggle like
nftSchema.methods.toggleLike = async function(userId) {
    const userIndex = this.liked_by.indexOf(userId);
    
    if (userIndex > -1) {
        // Unlike
        this.liked_by.splice(userIndex, 1);
        this.like_count = Math.max(0, this.like_count - 1);
    } else {
        // Like
        this.liked_by.push(userId);
        this.like_count += 1;
    }
    
    return this.save();
};

// Pre-save middleware to ensure consistency
nftSchema.pre('save', function(next) {
    // Ensure like_count matches liked_by array length
    if (this.liked_by) {
        this.like_count = this.liked_by.length;
    }
    next();
});

module.exports = mongoose.model('NFT', nftSchema); 