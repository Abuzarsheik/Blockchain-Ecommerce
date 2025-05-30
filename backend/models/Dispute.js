const mongoose = require('mongoose');

const disputeEvidenceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'document', 'message', 'transaction_proof', 'delivery_proof'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    uploaded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploaded_at: {
        type: Date,
        default: Date.now
    }
});

const disputeMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 1000
    },
    is_admin: {
        type: Boolean,
        default: false
    },
    sent_at: {
        type: Date,
        default: Date.now
    }
});

const disputeTimelineSchema = new mongoose.Schema({
    action: {
        type: String,
        enum: [
            'dispute_created',
            'evidence_submitted',
            'auto_assessment_completed',
            'escalated_to_admin',
            'admin_review_started',
            'additional_info_requested',
            'decision_made',
            'resolution_executed',
            'dispute_closed'
        ],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    performed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    automated: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const disputeResolutionSchema = new mongoose.Schema({
    decision: {
        type: String,
        enum: [
            'buyer_wins',           // Full refund to buyer
            'seller_wins',          // Funds released to seller
            'partial_refund',       // Partial refund to buyer, rest to seller
            'mutual_agreement',     // Custom agreement between parties
            'inconclusive'          // No clear resolution, case-by-case handling
        ],
        required: true
    },
    refund_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    refund_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    seller_compensation: {
        type: Number,
        default: 0,
        min: 0
    },
    resolution_reason: {
        type: String,
        required: true,
        maxlength: 1000
    },
    additional_actions: [{
        action: {
            type: String,
            enum: ['account_warning', 'account_suspension', 'seller_rating_impact', 'dispute_fee']
        },
        target_user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        details: String
    }],
    resolved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resolved_at: {
        type: Date,
        default: Date.now
    },
    resolution_method: {
        type: String,
        enum: ['automated', 'admin_manual', 'escalated_admin'],
        required: true
    }
});

const autoAssessmentSchema = new mongoose.Schema({
    criteria_checked: [{
        criterion: String,
        result: Boolean,
        weight: Number,
        details: String
    }],
    confidence_score: {
        type: Number,
        min: 0,
        max: 100,
        required: true
    },
    recommended_action: {
        type: String,
        enum: ['auto_resolve_buyer', 'auto_resolve_seller', 'escalate_to_admin', 'request_more_info'],
        required: true
    },
    reasoning: {
        type: String,
        required: true
    },
    assessed_at: {
        type: Date,
        default: Date.now
    },
    assessment_version: {
        type: String,
        default: '1.0'
    }
});

const disputeSchema = new mongoose.Schema({
    // Core dispute information
    dispute_id: {
        type: String,
        unique: true,
        required: true
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    transaction_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: false,
        index: true
    },
    
    // Parties involved
    buyer_id: {
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
    initiated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Dispute details
    category: {
        type: String,
        enum: [
            'item_not_received',
            'item_not_as_described',
            'item_damaged',
            'wrong_item_sent',
            'late_delivery',
            'seller_communication',
            'payment_issue',
            'refund_request',
            'shipping_issue',
            'quality_issue',
            'counterfeit_item',
            'other'
        ],
        required: true,
        index: true
    },
    subcategory: {
        type: String,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    
    // Dispute status and priority
    status: {
        type: String,
        enum: [
            'open',                 // Newly created dispute
            'under_review',         // Being processed
            'auto_assessment',      // Automated assessment in progress
            'pending_evidence',     // Waiting for additional evidence
            'admin_review',         // Escalated to admin
            'awaiting_response',    // Waiting for party response
            'resolved',             // Dispute resolved
            'closed',               // Dispute closed
            'appealed'              // Resolution appealed
        ],
        default: 'open',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    
    // Financial information
    disputed_amount: {
        type: Number,
        required: true,
        min: 0
    },
    escrow_amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        enum: ['USD', 'BTC', 'ETH', 'USDT', 'MATIC', 'BNB'],
        default: 'USD'
    },
    
    // Evidence and communication
    evidence: [disputeEvidenceSchema],
    messages: [disputeMessageSchema],
    timeline: [disputeTimelineSchema],
    
    // Automated assessment
    auto_assessment: autoAssessmentSchema,
    requires_manual_review: {
        type: Boolean,
        default: false
    },
    
    // Admin assignment
    assigned_admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    admin_notes: {
        type: String,
        maxlength: 2000
    },
    
    // Resolution
    resolution: disputeResolutionSchema,
    
    // Blockchain integration
    blockchain_locked: {
        type: Boolean,
        default: false
    },
    smart_contract_address: {
        type: String
    },
    resolution_tx_hash: {
        type: String
    },
    
    // Deadlines and timeouts
    response_deadline: {
        type: Date
    },
    auto_close_at: {
        type: Date
    },
    escalation_deadline: {
        type: Date
    },
    
    // Metadata
    dispute_tags: [String],
    related_disputes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dispute'
    }],
    
    // Appeal information
    appeal_info: {
        appealed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        appeal_reason: String,
        appealed_at: Date,
        appeal_status: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'denied']
        }
    },
    
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
    closed_at: {
        type: Date
    }
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

// Indexes for better query performance
disputeSchema.index({ dispute_id: 1 }, { unique: true });
disputeSchema.index({ order_id: 1, status: 1 });
disputeSchema.index({ buyer_id: 1, created_at: -1 });
disputeSchema.index({ seller_id: 1, created_at: -1 });
disputeSchema.index({ status: 1, priority: 1, created_at: -1 });
disputeSchema.index({ assigned_admin: 1, status: 1 });
disputeSchema.index({ category: 1, status: 1 });
disputeSchema.index({ created_at: -1 });

// Pre-save middleware
disputeSchema.pre('save', function(next) {
    // Generate dispute ID if new
    if (this.isNew) {
        this.dispute_id = 'DSP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Set initial timeline entry
        this.timeline.push({
            action: 'dispute_created',
            description: `Dispute created by ${this.initiated_by === this.buyer_id ? 'buyer' : 'seller'}`,
            performed_by: this.initiated_by,
            automated: false
        });
        
        // Set deadlines
        this.response_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        this.auto_close_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        this.escalation_deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    }
    
    this.updated_at = Date.now();
    next();
});

// Instance methods
disputeSchema.methods.addEvidence = function(evidenceData, uploadedBy) {
    this.evidence.push({
        ...evidenceData,
        uploaded_by: uploadedBy,
        uploaded_at: new Date()
    });
    
    this.timeline.push({
        action: 'evidence_submitted',
        description: `New evidence submitted: ${evidenceData.type}`,
        performed_by: uploadedBy,
        automated: false
    });
    
    return this.save();
};

disputeSchema.methods.addMessage = function(senderId, message, isAdmin = false) {
    this.messages.push({
        sender: senderId,
        message,
        is_admin: isAdmin,
        sent_at: new Date()
    });
    
    return this.save();
};

disputeSchema.methods.updateStatus = function(newStatus, performedBy, description, automated = false) {
    this.status = newStatus;
    
    this.timeline.push({
        action: newStatus,
        description: description || `Status updated to ${newStatus}`,
        performed_by: performedBy,
        automated
    });
    
    if (newStatus === 'closed' || newStatus === 'resolved') {
        this.closed_at = new Date();
    }
    
    return this.save();
};

disputeSchema.methods.assignAdmin = function(adminId) {
    this.assigned_admin = adminId;
    this.status = 'admin_review';
    
    this.timeline.push({
        action: 'admin_review_started',
        description: 'Dispute assigned to admin for manual review',
        performed_by: adminId,
        automated: false
    });
    
    return this.save();
};

disputeSchema.methods.setResolution = function(resolutionData, resolvedBy, method = 'admin_manual') {
    this.resolution = {
        ...resolutionData,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
        resolution_method: method
    };
    
    this.status = 'resolved';
    
    this.timeline.push({
        action: 'decision_made',
        description: `Dispute resolved: ${resolutionData.decision}`,
        performed_by: resolvedBy,
        automated: method === 'automated'
    });
    
    return this.save();
};

disputeSchema.methods.performAutoAssessment = function(assessmentData) {
    this.auto_assessment = {
        ...assessmentData,
        assessed_at: new Date()
    };
    
    this.timeline.push({
        action: 'auto_assessment_completed',
        description: `Automated assessment completed with ${assessmentData.confidence_score}% confidence`,
        automated: true,
        metadata: {
            confidence_score: assessmentData.confidence_score,
            recommended_action: assessmentData.recommended_action
        }
    });
    
    // Auto-escalate if confidence is low
    if (assessmentData.confidence_score < 70 || assessmentData.recommended_action === 'escalate_to_admin') {
        this.requires_manual_review = true;
        this.status = 'admin_review';
        
        this.timeline.push({
            action: 'escalated_to_admin',
            description: 'Dispute escalated to admin due to low confidence or complexity',
            automated: true
        });
    }
    
    return this.save();
};

// Static methods
disputeSchema.statics.findByOrder = function(orderId) {
    return this.findOne({ order_id: orderId });
};

disputeSchema.statics.findUserDisputes = function(userId, options = {}) {
    const { page = 1, limit = 10, status, category } = options;
    
    let query = {
        $or: [
            { buyer_id: userId },
            { seller_id: userId }
        ]
    };
    
    if (status) query.status = status;
    if (category) query.category = category;
    
    return this.find(query)
        .populate('order_id', 'orderNumber total')
        .populate('buyer_id', 'firstName lastName username')
        .populate('seller_id', 'firstName lastName username businessName')
        .populate('assigned_admin', 'firstName lastName')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

disputeSchema.statics.findAdminDisputes = function(options = {}) {
    const { page = 1, limit = 20, status, priority, assigned_admin } = options;
    
    let query = {
        $or: [
            { status: 'admin_review' },
            { requires_manual_review: true },
            { assigned_admin: { $exists: true } }
        ]
    };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assigned_admin) query.assigned_admin = assigned_admin;
    
    return this.find(query)
        .populate('order_id', 'orderNumber total')
        .populate('buyer_id', 'firstName lastName username')
        .populate('seller_id', 'firstName lastName username businessName')
        .populate('assigned_admin', 'firstName lastName')
        .sort({ priority: 1, created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
};

disputeSchema.statics.getDisputeStats = function(timeframe = 30) {
    const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
    
    return this.aggregate([
        { $match: { created_at: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                total_disputes: { $sum: 1 },
                resolved_disputes: {
                    $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                },
                auto_resolved: {
                    $sum: { $cond: [{ $eq: ['$resolution.resolution_method', 'automated'] }, 1, 0] }
                },
                avg_resolution_time: {
                    $avg: {
                        $cond: [
                            { $ne: ['$closed_at', null] },
                            { $subtract: ['$closed_at', '$created_at'] },
                            null
                        ]
                    }
                },
                by_category: {
                    $push: '$category'
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Dispute', disputeSchema); 