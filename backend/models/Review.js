const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    seller_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Product review
    product_rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    product_review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    
    // Seller review
    seller_rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    seller_review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    
    // Review categories/aspects
    aspects: {
        quality: {
            type: Number,
            min: 1,
            max: 5
        },
        value: {
            type: Number,
            min: 1,
            max: 5
        },
        shipping: {
            type: Number,
            min: 1,
            max: 5
        },
        packaging: {
            type: Number,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    
    // Media attachments
    images: [{
        url: String,
        caption: String,
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Verification and authenticity
    verified_purchase: {
        type: Boolean,
        default: true
    },
    blockchain_verified: {
        type: Boolean,
        default: false
    },
    blockchain_tx: {
        type: String,
        default: null
    },
    
    // Review status and moderation
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'approved'
    },
    moderation_notes: {
        type: String,
        maxlength: 500
    },
    
    // Seller response
    seller_response: {
        content: {
            type: String,
            maxlength: 1000
        },
        responded_at: Date,
        edited_at: Date
    },
    
    // Helpfulness tracking
    helpful_votes: {
        up: {
            type: Number,
            default: 0
        },
        down: {
            type: Number,
            default: 0
        },
        voters: [{
            user_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            vote: {
                type: String,
                enum: ['up', 'down']
            },
            voted_at: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    // Reporting and flags
    reports: [{
        reported_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reason: {
            type: String,
            enum: ['spam', 'inappropriate', 'fake', 'offensive', 'other'],
            required: true
        },
        details: {
            type: String,
            maxlength: 500
        },
        reported_at: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved'],
            default: 'pending'
        }
    }],
    
    // Metadata
    review_source: {
        type: String,
        enum: ['web', 'mobile', 'api'],
        default: 'web'
    },
    ip_address: String,
    user_agent: String,
    
    // Timestamps
    created_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    edited_at: Date
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Compound indexes for performance and uniqueness
reviewSchema.index({ product_id: 1, user_id: 1 }, { unique: true });
reviewSchema.index({ seller_id: 1, created_at: -1 });
reviewSchema.index({ product_id: 1, status: 1, created_at: -1 });
reviewSchema.index({ user_id: 1, created_at: -1 });
reviewSchema.index({ order_id: 1 }, { unique: true });

// Update the updated_at field before saving
reviewSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    if (this.isModified('product_review') || this.isModified('seller_review')) {
        this.edited_at = Date.now();
    }
    next();
});

// Static methods for aggregated data
reviewSchema.statics.getProductStats = function(productId) {
    return this.aggregate([
        { $match: { product_id: mongoose.Types.ObjectId(productId), status: 'approved' } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$product_rating' },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: '$product_rating'
                },
                aspectAverages: {
                    $push: {
                        quality: '$aspects.quality',
                        value: '$aspects.value',
                        shipping: '$aspects.shipping',
                        packaging: '$aspects.packaging'
                    }
                }
            }
        },
        {
            $project: {
                averageRating: { $round: ['$averageRating', 1] },
                totalReviews: 1,
                ratingDistribution: {
                    $let: {
                        vars: {
                            ratings: '$ratingDistribution'
                        },
                        in: {
                            5: { $size: { $filter: { input: '$$ratings', cond: { $eq: ['$$this', 5] } } } },
                            4: { $size: { $filter: { input: '$$ratings', cond: { $eq: ['$$this', 4] } } } },
                            3: { $size: { $filter: { input: '$$ratings', cond: { $eq: ['$$this', 3] } } } },
                            2: { $size: { $filter: { input: '$$ratings', cond: { $eq: ['$$this', 2] } } } },
                            1: { $size: { $filter: { input: '$$ratings', cond: { $eq: ['$$this', 1] } } } }
                        }
                    }
                }
            }
        }
    ]);
};

reviewSchema.statics.getSellerStats = function(sellerId) {
    return this.aggregate([
        { $match: { seller_id: mongoose.Types.ObjectId(sellerId), status: 'approved' } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$seller_rating' },
                totalReviews: { $sum: 1 },
                communicationRating: { $avg: '$aspects.communication' },
                responseRate: {
                    $avg: {
                        $cond: [
                            { $ne: ['$seller_response.content', null] },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $project: {
                averageRating: { $round: ['$averageRating', 1] },
                totalReviews: 1,
                communicationRating: { $round: ['$communicationRating', 1] },
                responseRate: { $round: [{ $multiply: ['$responseRate', 100] }, 1] }
            }
        }
    ]);
};

// Instance methods
reviewSchema.methods.addSellerResponse = function(content) {
    this.seller_response = {
        content,
        responded_at: new Date(),
        edited_at: new Date()
    };
    return this.save();
};

reviewSchema.methods.updateSellerResponse = function(content) {
    if (this.seller_response && this.seller_response.content) {
        this.seller_response.content = content;
        this.seller_response.edited_at = new Date();
        return this.save();
    }
    throw new Error('No existing response to update');
};

reviewSchema.methods.addHelpfulVote = function(userId, voteType) {
    // Remove existing vote from this user
    this.helpful_votes.voters = this.helpful_votes.voters.filter(
        voter => voter.user_id.toString() !== userId.toString()
    );
    
    // Add new vote
    this.helpful_votes.voters.push({
        user_id: userId,
        vote: voteType,
        voted_at: new Date()
    });
    
    // Update counts
    const upVotes = this.helpful_votes.voters.filter(v => v.vote === 'up').length;
    const downVotes = this.helpful_votes.voters.filter(v => v.vote === 'down').length;
    
    this.helpful_votes.up = upVotes;
    this.helpful_votes.down = downVotes;
    
    return this.save();
};

reviewSchema.methods.addReport = function(reportedBy, reason, details) {
    this.reports.push({
        reported_by: reportedBy,
        reason,
        details,
        reported_at: new Date(),
        status: 'pending'
    });
    
    // Auto-flag if multiple reports
    if (this.reports.length >= 3) {
        this.status = 'flagged';
    }
    
    return this.save();
};

reviewSchema.methods.canEdit = function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.created_at > oneDayAgo;
};

reviewSchema.methods.getHelpfulnessScore = function() {
    const total = this.helpful_votes.up + this.helpful_votes.down;
    if (total === 0) return 0;
    return ((this.helpful_votes.up / total) * 100).toFixed(1);
};

module.exports = mongoose.model('Review', reviewSchema); 