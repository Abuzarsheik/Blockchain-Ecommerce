const Dispute = require('../models/Dispute');
const disputeService = require('../services/disputeService');
const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth, adminAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// Configure multer for evidence uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/disputes/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'dispute-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files per evidence submission
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and documents are allowed'));
        }
    }
});

/**
 * @route   POST /api/disputes
 * @desc    Create a new dispute
 * @access  Private
 */
router.post('/', auth, [
    body('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('category').isIn([
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
    ]).withMessage('Valid dispute category is required'),
    body('description').isLength({ min: 20, max: 2000 }).withMessage('Description must be 20-2000 characters'),
    body('subcategory').optional().isLength({ max: 100 }).withMessage('Subcategory must be under 100 characters'),
    body('disputedAmount').optional().isFloat({ min: 0 }).withMessage('Disputed amount must be positive')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const disputeData = {
            orderId: req.body.orderId,
            category: req.body.category,
            subcategory: req.body.subcategory,
            description: req.body.description,
            disputedAmount: req.body.disputedAmount
        };

        const dispute = await disputeService.createDispute(disputeData, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Dispute created successfully',
            dispute
        });

    } catch (error) {
        logger.error('Create dispute error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create dispute'
        });
    }
});

/**
 * @route   GET /api/disputes/my-disputes
 * @desc    Get current user's disputes
 * @access  Private
 */
router.get('/my-disputes', auth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn([
        'open', 'under_review', 'auto_assessment', 'pending_evidence',
        'admin_review', 'awaiting_response', 'resolved', 'closed', 'appealed'
    ]).withMessage('Invalid status filter'),
    query('category').optional().isIn([
        'item_not_received', 'item_not_as_described', 'item_damaged',
        'wrong_item_sent', 'late_delivery', 'seller_communication',
        'payment_issue', 'refund_request', 'shipping_issue',
        'quality_issue', 'counterfeit_item', 'other'
    ]).withMessage('Invalid category filter')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status,
            category: req.query.category
        };

        const disputes = await disputeService.getUserDisputes(req.user.id, options);

        res.json({
            success: true,
            disputes
        });

    } catch (error) {
        logger.error('Get user disputes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get disputes'
        });
    }
});

/**
 * @route   GET /api/disputes/check-eligibility/:orderId
 * @desc    Check if order is eligible for dispute
 * @access  Private
 */
router.get('/check-eligibility/:orderId', auth, [
    param('orderId').isMongoId().withMessage('Invalid order ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        // Check if dispute already exists
        const existingDispute = await Dispute.findByOrder(req.params.orderId);
        
        if (existingDispute) {
            return res.json({
                success: true,
                eligible: false,
                reason: 'Dispute already exists for this order',
                existingDispute: existingDispute.dispute_id
            });
        }

        // Additional eligibility checks can be added here
        // For now, if no existing dispute, order is eligible

        res.json({
            success: true,
            eligible: true,
            reason: 'Order is eligible for dispute'
        });

    } catch (error) {
        logger.error('Check dispute eligibility error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check eligibility'
        });
    }
});

/**
 * @route   GET /api/disputes/:id
 * @desc    Get dispute details
 * @access  Private
 */
router.get('/:id', auth, [
    param('id').isMongoId().withMessage('Invalid dispute ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const dispute = await Dispute.findById(req.params.id)
            .populate('order_id', 'orderNumber total status items')
            .populate('buyer_id', 'firstName lastName username email')
            .populate('seller_id', 'firstName lastName username businessName')
            .populate('assigned_admin', 'firstName lastName')
            .populate('evidence.uploaded_by', 'firstName lastName')
            .populate('messages.sender', 'firstName lastName username');

        if (!dispute) {
            return res.status(404).json({
                success: false,
                error: 'Dispute not found'
            });
        }

        // Verify user has access to this dispute
        const isInvolved = dispute.buyer_id._id.toString() === req.user.id ||
                          dispute.seller_id._id.toString() === req.user.id ||
                          (dispute.assigned_admin && dispute.assigned_admin._id.toString() === req.user.id);

        if (!isInvolved && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to access this dispute'
            });
        }

        res.json({
            success: true,
            dispute
        });

    } catch (error) {
        logger.error('Get dispute error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dispute details'
        });
    }
});

/**
 * @route   POST /api/disputes/:id/evidence
 * @desc    Add evidence to dispute
 * @access  Private
 */
router.post('/:id/evidence', auth, upload.array('files', 10), [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('type').isIn(['image', 'document', 'message', 'transaction_proof', 'delivery_proof'])
        .withMessage('Valid evidence type is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one file is required'
            });
        }

        // Process uploaded files
        const evidenceFiles = req.files.map(file => ({
            type: req.body.type,
            url: `/uploads/disputes/${file.filename}`,
            description: req.body.description || '',
            originalName: file.originalname
        }));

        // Add each file as separate evidence
        for (const evidenceData of evidenceFiles) {
            await disputeService.addEvidence(req.params.id, evidenceData, req.user.id);
        }

        res.json({
            success: true,
            message: 'Evidence added successfully',
            filesUploaded: evidenceFiles.length
        });

    } catch (error) {
        logger.error('Add evidence error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add evidence'
        });
    }
});

/**
 * @route   POST /api/disputes/:id/messages
 * @desc    Add message to dispute
 * @access  Private
 */
router.post('/:id/messages', auth, [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const isAdmin = req.user.role === 'admin';
        await disputeService.addMessage(req.params.id, req.user.id, req.body.message, isAdmin);

        res.json({
            success: true,
            message: 'Message added successfully'
        });

    } catch (error) {
        logger.error('Add message error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add message'
        });
    }
});

// ============== ADMIN ROUTES ==============

/**
 * @route   GET /api/disputes/admin/dashboard
 * @desc    Get admin dispute dashboard data
 * @access  Admin
 */
router.get('/admin/dashboard', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn([
        'open', 'under_review', 'auto_assessment', 'pending_evidence',
        'admin_review', 'awaiting_response', 'resolved', 'closed', 'appealed'
    ]).withMessage('Invalid status filter'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority filter'),
    query('assigned_admin').optional().isMongoId().withMessage('Invalid admin ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status,
            priority: req.query.priority,
            assigned_admin: req.query.assigned_admin
        };

        const disputes = await disputeService.getAdminDisputes(options);
        const stats = await disputeService.getDisputeStatistics();

        res.json({
            success: true,
            disputes,
            statistics: stats[0] || {
                total_disputes: 0,
                resolved_disputes: 0,
                auto_resolved: 0,
                avg_resolution_time: 0
            }
        });

    } catch (error) {
        logger.error('Get admin disputes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get admin disputes'
        });
    }
});

/**
 * @route   POST /api/disputes/:id/assign
 * @desc    Assign dispute to admin
 * @access  Admin
 */
router.post('/:id/assign', adminAuth, [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('adminId').optional().isMongoId().withMessage('Invalid admin ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const adminId = req.body.adminId || req.user.id;
        const dispute = await disputeService.assignDisputeToAdmin(req.params.id, adminId);

        res.json({
            success: true,
            message: 'Dispute assigned successfully',
            dispute
        });

    } catch (error) {
        logger.error('Assign dispute error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to assign dispute'
        });
    }
});

/**
 * @route   POST /api/disputes/:id/resolve
 * @desc    Admin resolves dispute
 * @access  Admin
 */
router.post('/:id/resolve', adminAuth, [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('decision').isIn(['buyer_wins', 'seller_wins', 'partial_refund', 'mutual_agreement', 'inconclusive'])
        .withMessage('Valid decision is required'),
    body('resolution_reason').isLength({ min: 10, max: 1000 }).withMessage('Resolution reason must be 10-1000 characters'),
    body('refund_amount').optional().isFloat({ min: 0 }).withMessage('Refund amount must be positive'),
    body('refund_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Refund percentage must be 0-100'),
    body('seller_compensation').optional().isFloat({ min: 0 }).withMessage('Seller compensation must be positive'),
    body('additional_actions').optional().isArray().withMessage('Additional actions must be an array')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const resolutionData = {
            decision: req.body.decision,
            resolution_reason: req.body.resolution_reason,
            refund_amount: req.body.refund_amount || 0,
            refund_percentage: req.body.refund_percentage || 0,
            seller_compensation: req.body.seller_compensation || 0,
            additional_actions: req.body.additional_actions || []
        };

        const dispute = await disputeService.adminResolveDispute(req.params.id, resolutionData, req.user.id);

        res.json({
            success: true,
            message: 'Dispute resolved successfully',
            dispute
        });

    } catch (error) {
        logger.error('Admin resolve dispute error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to resolve dispute'
        });
    }
});

/**
 * @route   PUT /api/disputes/:id/admin-notes
 * @desc    Update admin notes for dispute
 * @access  Admin
 */
router.put('/:id/admin-notes', adminAuth, [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('notes').isLength({ max: 2000 }).withMessage('Notes must be under 2000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const dispute = await Dispute.findByIdAndUpdate(
            req.params.id,
            { admin_notes: req.body.notes },
            { new: true }
        );

        if (!dispute) {
            return res.status(404).json({
                success: false,
                error: 'Dispute not found'
            });
        }

        res.json({
            success: true,
            message: 'Admin notes updated successfully',
            dispute
        });

    } catch (error) {
        logger.error('Update admin notes error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update admin notes'
        });
    }
});

/**
 * @route   GET /api/disputes/admin/statistics
 * @desc    Get detailed dispute statistics for admin
 * @access  Admin
 */
router.get('/admin/statistics', adminAuth, [
    query('timeframe').optional().isInt({ min: 1, max: 365 }).withMessage('Timeframe must be 1-365 days')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const timeframe = parseInt(req.query.timeframe) || 30;
        const stats = await disputeService.getDisputeStatistics(timeframe);

        res.json({
            success: true,
            statistics: stats[0] || {
                total_disputes: 0,
                resolved_disputes: 0,
                auto_resolved: 0,
                avg_resolution_time: 0,
                by_category: []
            },
            timeframe
        });

    } catch (error) {
        logger.error('Get dispute statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dispute statistics'
        });
    }
});

/**
 * @route   POST /api/disputes/:id/escalate
 * @desc    Escalate dispute (force admin review)
 * @access  Private
 */
router.post('/:id/escalate', auth, [
    param('id').isMongoId().withMessage('Invalid dispute ID'),
    body('reason').isLength({ min: 10, max: 500 }).withMessage('Escalation reason must be 10-500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) {
            return res.status(404).json({
                success: false,
                error: 'Dispute not found'
            });
        }

        // Verify user is involved in dispute
        if (dispute.buyer_id.toString() !== req.user.id && dispute.seller_id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to escalate this dispute'
            });
        }

        await disputeService.escalateToAdmin(dispute, `Escalated by user: ${req.body.reason}`);

        res.json({
            success: true,
            message: 'Dispute escalated to admin review'
        });

    } catch (error) {
        logger.error('Escalate dispute error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to escalate dispute'
        });
    }
});

module.exports = router; 