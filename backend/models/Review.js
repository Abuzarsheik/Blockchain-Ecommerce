const mongoose = require('mongoose');

const { 
  imageSchema, 
  deviceInfoSchema,
  commonSchemaOptions 
} = require('./shared/schemas');

const reviewSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Product review
    productRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    productReview: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    
    // Seller review
    sellerRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    sellerReview: {
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
    
    // Media attachments - Using shared image schema
    images: [imageSchema],
    
    // Verification and authenticity
    verifiedPurchase: {
        type: Boolean,
        default: true
    },
    blockchainVerified: {
        type: Boolean,
        default: false
    },
    blockchainTx: {
        type: String,
        default: null
    },
    
    // Review status and moderation
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'approved'
    },
    moderationNotes: {
        type: String,
        maxlength: 500
    },
    
    // Seller response
    sellerResponse: {
        content: {
            type: String,
            maxlength: 1000
        },
        respondedAt: Date,
        editedAt: Date
    },
    
    // Helpfulness tracking
    helpfulVotes: {
        up: {
            type: Number,
            default: 0
        },
        down: {
            type: Number,
            default: 0
        },
        voters: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            vote: {
                type: String,
                enum: ['up', 'down']
            },
            votedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    
    // Reporting and flags
    reports: [{
        reportedBy: {
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
        reportedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved'],
            default: 'pending'
        }
    }],
    
    // Metadata - Using shared device info schema
    reviewSource: {
        type: String,
        enum: ['web', 'mobile', 'api'],
        default: 'web'
    },
    ...deviceInfoSchema.obj,
    
    // Additional timestamps
    editedAt: Date
}, commonSchemaOptions);

// Compound indexes for performance and uniqueness
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ sellerId: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1 }, { unique: true });

// Pre-save middleware
reviewSchema.pre('save', function(next) {
    if (this.isModified('productReview') || this.isModified('sellerReview')) {
        this.editedAt = Date.now();
    }
    next();
});

// Static methods for aggregated data
reviewSchema.statics.getProductStats = function(productId) {
    return this.aggregate([
        { $match: { productId: mongoose.Types.ObjectId(productId), status: 'approved' } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$productRating' },
                totalReviews: { $sum: 1 },
                ratingDistribution: {
                    $push: '$productRating'
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
        { $match: { sellerId: mongoose.Types.ObjectId(sellerId), status: 'approved' } },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$sellerRating' },
                totalReviews: { $sum: 1 },
                communicationRating: { $avg: '$aspects.communication' },
                responseRate: {
                    $avg: {
                        $cond: [
                            { $ne: ['$sellerResponse.content', null] },
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
    this.sellerResponse = {
        content,
        respondedAt: new Date(),
        editedAt: new Date()
    };
    return this.save();
};

reviewSchema.methods.updateSellerResponse = function(content) {
    if (this.sellerResponse && this.sellerResponse.content) {
        this.sellerResponse.content = content;
        this.sellerResponse.editedAt = new Date();
        return this.save();
    }
    throw new Error('No existing response to update');
};

reviewSchema.methods.addHelpfulVote = function(userId, voteType) {
    // Remove existing vote from this user
    this.helpfulVotes.voters = this.helpfulVotes.voters.filter(
        voter => voter.userId.toString() !== userId.toString()
    );
    
    // Add new vote
    this.helpfulVotes.voters.push({
        userId: userId,
        vote: voteType,
        votedAt: new Date()
    });
    
    // Update counts
    const upVotes = this.helpfulVotes.voters.filter(v => v.vote === 'up').length;
    const downVotes = this.helpfulVotes.voters.filter(v => v.vote === 'down').length;
    
    this.helpfulVotes.up = upVotes;
    this.helpfulVotes.down = downVotes;
    
    return this.save();
};

reviewSchema.methods.addReport = function(reportedBy, reason, details) {
    this.reports.push({
        reportedBy: reportedBy,
        reason,
        details,
        reportedAt: new Date(),
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
    return this.createdAt > oneDayAgo;
};

reviewSchema.methods.getHelpfulnessScore = function() {
    const total = this.helpfulVotes.up + this.helpfulVotes.down;
    if (total === 0) {return 0;}
    return ((this.helpfulVotes.up / total) * 100).toFixed(1);
};

module.exports = mongoose.model('Review', reviewSchema); 