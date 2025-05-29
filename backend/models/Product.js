const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image_url: {
        type: String,
        default: null
    },
    blockchain_hash: {
        type: String,
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        required: true,
        enum: ['digital-art', 'gaming', 'music', 'fashion', 'other']
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
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
productSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Product', productSchema); 