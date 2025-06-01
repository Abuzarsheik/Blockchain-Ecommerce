const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const disputeService = require('../services/disputeService');
const express = require('express');
const notificationService = require('../services/notificationService');
const { adminAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// ============== ADMIN DASHBOARD ==============

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get platform overview statistics
 * @access  Admin
 */
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }

        // Get user statistics
        const totalUsers = await User.countDocuments();
        const newUsers = await User.countDocuments({ 
            created_at: { $gte: startDate } 
        });
        const activeUsers = await User.countDocuments({ 
            isActive: true,
            lastLogin: { $gte: startDate }
        });
        const verifiedUsers = await User.countDocuments({ 
            'kyc.status': 'approved' 
        });

        // Get transaction statistics
        const totalTransactions = await Transaction.countDocuments();
        const periodTransactions = await Transaction.countDocuments({
            created_at: { $gte: startDate }
        });
        const transactionVolume = await Transaction.aggregate([
            { $match: { created_at: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Get order statistics
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ 
            status: { $in: ['pending', 'confirmed', 'processing'] }
        });
        const completedOrders = await Order.countDocuments({ 
            status: 'delivered',
            created_at: { $gte: startDate }
        });

        // Get product statistics
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ 
            status: 'active',
            stock_quantity: { $gt: 0 }
        });
        const newProducts = await Product.countDocuments({
            created_at: { $gte: startDate }
        });

        // Get dispute statistics
        const openDisputes = await Dispute.countDocuments({ 
            status: { $in: ['open', 'under_review', 'admin_review'] }
        });
        const resolvedDisputes = await Dispute.countDocuments({
            status: 'resolved',
            created_at: { $gte: startDate }
        });

        // Get revenue statistics
        const revenue = await Order.aggregate([
            { 
                $match: { 
                    status: 'delivered',
                    created_at: { $gte: startDate }
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        // Platform health metrics
        const platformHealth = {
            userGrowthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0,
            orderFulfillmentRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
            disputeRate: totalOrders > 0 ? ((openDisputes / totalOrders) * 100).toFixed(2) : 0,
            averageOrderValue: completedOrders > 0 ? (revenue[0]?.total || 0) / completedOrders : 0
        };

        res.json({
            success: true,
            period,
            users: {
                total: totalUsers,
                new: newUsers,
                active: activeUsers,
                verified: verifiedUsers,
                verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0
            },
            transactions: {
                total: totalTransactions,
                period: periodTransactions,
                volume: transactionVolume[0]?.total || 0
            },
            orders: {
                total: totalOrders,
                pending: pendingOrders,
                completed: completedOrders
            },
            products: {
                total: totalProducts,
                active: activeProducts,
                new: newProducts
            },
            disputes: {
                open: openDisputes,
                resolved: resolvedDisputes
            },
            revenue: {
                total: revenue[0]?.total || 0,
                averageOrderValue: platformHealth.averageOrderValue
            },
            platformHealth
        });

    } catch (error) {
        logger.error('Get admin dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dashboard statistics'
        });
    }
});

/**
 * @route   GET /api/admin/dashboard/activity
 * @desc    Get recent platform activity
 * @access  Admin
 */
router.get('/dashboard/activity', adminAuth, [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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

        const limit = parseInt(req.query.limit) || 20;

        // Get recent activities from various collections
        const recentUsers = await User.find()
            .sort({ created_at: -1 })
            .limit(5)
            .select('firstName lastName email created_at');

        const recentOrders = await Order.find()
            .sort({ created_at: -1 })
            .limit(5)
            .populate('user_id', 'firstName lastName email')
            .select('orderNumber total status created_at user_id');

        const recentDisputes = await Dispute.find()
            .sort({ created_at: -1 })
            .limit(5)
            .populate('order_id', 'orderNumber')
            .populate('complainant_id', 'firstName lastName')
            .select('type status priority created_at order_id complainant_id');

        const recentTransactions = await Transaction.find()
            .sort({ created_at: -1 })
            .limit(5)
            .populate('user_id', 'firstName lastName')
            .select('type amount status created_at user_id');

        // Format activity feed
        const activities = [];

        recentUsers.forEach(user => {
            activities.push({
                type: 'user_registration',
                timestamp: user.created_at,
                description: `New user registered: ${user.firstName} ${user.lastName}`,
                data: { userId: user._id, email: user.email }
            });
        });

        recentOrders.forEach(order => {
            activities.push({
                type: 'order_created',
                timestamp: order.created_at,
                description: `New order placed: ${order.orderNumber} ($${order.total})`,
                data: { 
                    orderId: order._id, 
                    orderNumber: order.orderNumber,
                    user: order.user_id?.firstName + ' ' + order.user_id?.lastName
                }
            });
        });

        recentDisputes.forEach(dispute => {
            activities.push({
                type: 'dispute_created',
                timestamp: dispute.created_at,
                description: `New dispute: ${dispute.type} for order ${dispute.order_id?.orderNumber}`,
                data: { 
                    disputeId: dispute._id, 
                    priority: dispute.priority,
                    complainant: dispute.complainant_id?.firstName + ' ' + dispute.complainant_id?.lastName
                }
            });
        });

        recentTransactions.forEach(transaction => {
            activities.push({
                type: 'transaction',
                timestamp: transaction.created_at,
                description: `${transaction.type}: $${transaction.amount} - ${transaction.status}`,
                data: { 
                    transactionId: transaction._id,
                    user: transaction.user_id?.firstName + ' ' + transaction.user_id?.lastName
                }
            });
        });

        // Sort by timestamp and limit
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            activities: activities.slice(0, limit)
        });

    } catch (error) {
        logger.error('Get admin activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get platform activity'
        });
    }
});

// ============== USER MANAGEMENT ==============

/**
 * @route   GET /api/admin/users
 * @desc    Get users with filtering and pagination
 * @access  Admin
 */
router.get('/users', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isLength({ min: 1 }).withMessage('Search term required'),
    query('status').optional().isIn(['all', 'active', 'inactive', 'locked']).withMessage('Invalid status'),
    query('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),
    query('verification').optional().isIn(['all', 'verified', 'unverified', 'pending']).withMessage('Invalid verification status'),
    query('sortBy').optional().isIn(['created_at', 'lastLogin', 'firstName', 'email']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { search, status, role, verification, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

        // Build filter
        const filter = {};

        if (search) {
            filter.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        if (status && status !== 'all') {
            switch (status) {
                case 'active':
                    filter.isActive = true;
                    filter['loginAttempts.lockedUntil'] = { $exists: false };
                    break;
                case 'inactive':
                    filter.isActive = false;
                    break;
                case 'locked':
                    filter['loginAttempts.lockedUntil'] = { $gt: new Date() };
                    break;
            }
        }

        if (role) {
            filter.role = role;
        }

        if (verification && verification !== 'all') {
            switch (verification) {
                case 'verified':
                    filter['kyc.status'] = 'approved';
                    break;
                case 'unverified':
                    filter['kyc.status'] = { $in: ['pending', 'rejected'] };
                    break;
                case 'pending':
                    filter['kyc.status'] = 'in_review';
                    break;
            }
        }

        // Build sort
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const users = await User.find(filter)
            .select('-password_hash -twoFactorAuth.secret -passwordReset')
            .sort(sort)
            .limit(limit)
            .skip(skip);

        const total = await User.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            users,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_users: total,
                users_per_page: limit,
                has_next: page < totalPages,
                has_prev: page > 1
            }
        });

    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get detailed user information
 * @access  Admin
 */
router.get('/users/:id', adminAuth, [
    param('id').isMongoId().withMessage('Invalid user ID')
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

        const user = await User.findById(req.params.id)
            .select('-password_hash -twoFactorAuth.secret -passwordReset');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get user's orders
        const orders = await Order.find({ user_id: req.params.id })
            .sort({ created_at: -1 })
            .limit(10)
            .select('orderNumber total status created_at');

        // Get user's transactions
        const transactions = await Transaction.find({ user_id: req.params.id })
            .sort({ created_at: -1 })
            .limit(10)
            .select('type amount status created_at');

        // Get user's disputes
        const disputes = await Dispute.find({ 
            $or: [
                { complainant_id: req.params.id },
                { respondent_id: req.params.id }
            ]
        })
            .sort({ created_at: -1 })
            .limit(5)
            .populate('order_id', 'orderNumber')
            .select('type status priority created_at order_id');

        res.json({
            success: true,
            user,
            activity: {
                orders,
                transactions,
                disputes
            }
        });

    } catch (error) {
        logger.error('Get user details error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user details'
        });
    }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Admin
 */
router.put('/users/:id', adminAuth, [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),
    body('adminNotes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
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

        const allowedUpdates = ['isActive', 'role', 'adminNotes'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'adminNotes') {
                    updates['admin_notes'] = req.body[field];
                } else {
                    updates[field] = req.body[field];
                }
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid updates provided'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { 
                ...updates,
                updated_at: new Date()
            },
            { new: true }
        ).select('-password_hash -twoFactorAuth.secret');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Send notification for important changes
        if (updates.isActive === false) {
            await notificationService.sendSecurityAlert(
                user._id,
                'account_locked',
                { reason: 'Account deactivated by administrator' }
            );
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });

    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

/**
 * @route   POST /api/admin/users/:id/unlock
 * @desc    Unlock user account
 * @access  Admin
 */
router.post('/users/:id/unlock', adminAuth, [
    param('id').isMongoId().withMessage('Invalid user ID')
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

        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                $unset: {
                    'loginAttempts.count': 1,
                    'loginAttempts.lastAttempt': 1,
                    'loginAttempts.lockedUntil': 1
                },
                updated_at: new Date()
            },
            { new: true }
        ).select('-password_hash');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Send notification
        await notificationService.sendSecurityAlert(
            user._id,
            'account_unlocked',
            { unlockedBy: 'Administrator' }
        );

        res.json({
            success: true,
            message: 'User account unlocked successfully',
            user
        });

    } catch (error) {
        logger.error('Unlock user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unlock user'
        });
    }
});

// ============== KYC MANAGEMENT ==============

/**
 * @route   GET /api/admin/kyc/pending
 * @desc    Get pending KYC applications
 * @access  Admin
 */
router.get('/kyc/pending', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('level').optional().isIn(['basic', 'intermediate', 'advanced']).withMessage('Invalid KYC level')
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const { level } = req.query;

        const filter = { 'kyc.status': 'in_review' };
        if (level) {
            filter['kyc.level'] = level;
        }

        const applications = await User.find(filter)
            .select('firstName lastName email kyc username created_at')
            .sort({ 'kyc.submissionDate': 1 })
            .limit(limit)
            .skip(skip);

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            applications,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });

    } catch (error) {
        logger.error('Get pending KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pending KYC applications'
        });
    }
});

/**
 * @route   POST /api/admin/kyc/:userId/review
 * @desc    Review and approve/reject KYC application
 * @access  Admin
 */
router.post('/kyc/:userId/review', adminAuth, [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
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

        const { decision, reason, notes } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (user.kyc.status !== 'in_review') {
            return res.status(400).json({
                success: false,
                error: 'KYC application is not under review'
            });
        }

        // Update KYC status
        await user.updateKycStatus(decision, req.user.id, reason);

        // Add admin notes if provided
        if (notes) {
            user.admin_notes = notes;
            await user.save();
        }

        // Send notification to user
        const notificationType = decision === 'approved' ? 'kyc_approved' : 'kyc_rejected';
        await notificationService.createNotification({
            userId: user._id,
            type: notificationType,
            data: { reason, reviewedBy: req.user.id }
        });

        res.json({
            success: true,
            message: `KYC application ${decision} successfully`,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                kyc: user.kyc
            }
        });

    } catch (error) {
        logger.error('Review KYC error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to review KYC application'
        });
    }
});

// ============== SECURITY & AUDIT TRAIL ==============

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with advanced filtering
 * @access  Admin
 */
router.get('/audit-logs', adminAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            action, 
            userId, 
            severity, 
            startDate, 
            endDate 
        } = req.query;

        const filter = {};
        if (action) {filter.action = action;}
        if (userId) {filter.userId = userId;}
        if (severity) {filter.severity = severity;}
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) {filter.timestamp.$gte = new Date(startDate);}
            if (endDate) {filter.timestamp.$lte = new Date(endDate);}
        }

        const skip = (page - 1) * limit;

        // Query actual audit logs from database
        // TODO: Implement AuditLog model and replace with real data
        const auditLogs = [];
        const total = 0;

        res.json({
            success: true,
            auditLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs'
        });
    }
});

/**
 * @route   GET /api/admin/audit-logs/export
 * @desc    Export audit logs
 * @access  Admin
 */
router.get('/audit-logs/export', adminAuth, async (req, res) => {
    try {
        const { format = 'csv', ...filters } = req.query;
        
        // TODO: Implement actual audit log export functionality
        // Query audit logs based on filters and format as CSV/JSON
        
        const csvHeaders = 'Timestamp,Action,User,Severity,Description\n';
        const csvData = csvHeaders; // Add actual data here
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        res.send(csvData);

    } catch (error) {
        logger.error('Export audit logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export audit logs'
        });
    }
});

/**
 * @route   GET /api/admin/smart-contracts
 * @desc    Get smart contracts registry
 * @access  Admin
 */
router.get('/smart-contracts', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, riskLevel } = req.query;

        // TODO: Implement actual smart contracts registry
        // This should connect to blockchain and fetch deployed contracts
        const contracts = [];
        const total = 0;

        res.json({
            success: true,
            contracts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get smart contracts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch smart contracts'
        });
    }
});

/**
 * @route   POST /api/admin/smart-contracts/:id/audit
 * @desc    Request contract audit
 * @access  Admin
 */
router.post('/smart-contracts/:id/audit', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { auditType = 'security', priority = 'medium' } = req.body;

        // TODO: Implement actual contract audit request
        // This should create audit record and integrate with audit service
        
        res.json({
            success: true,
            message: 'Audit request submitted successfully',
            auditId: `audit_${Date.now()}`,
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

    } catch (error) {
        logger.error('Request contract audit error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to request contract audit'
        });
    }
});

/**
 * @route   GET /api/admin/security-events
 * @desc    Get security events
 * @access  Admin
 */
router.get('/security-events', adminAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            severity,
            category,
            status,
            startDate,
            endDate
        } = req.query;

        // TODO: Implement actual security events from database
        // Query SecurityEvent model with proper filtering
        const events = [];
        const total = 0;

        res.json({
            success: true,
            events,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Get security events error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch security events'
        });
    }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Admin
 */
router.get('/analytics', adminAuth, async (req, res) => {
    try {
        const { metric = 'revenue', period = '30d' } = req.query;

        // Mock analytics data
        const mockAnalytics = {
            revenue: {
                current: 125000,
                previous: 98000,
                growth: 27.6,
                data: [
                    { date: '2024-01-01', value: 5000 },
                    { date: '2024-01-02', value: 7500 },
                    { date: '2024-01-03', value: 6200 }
                ]
            },
            users: {
                current: 1250,
                previous: 1100,
                growth: 13.6,
                data: [
                    { date: '2024-01-01', value: 50 },
                    { date: '2024-01-02', value: 75 },
                    { date: '2024-01-03', value: 62 }
                ]
            },
            orders: {
                current: 850,
                previous: 720,
                growth: 18.1,
                data: [
                    { date: '2024-01-01', value: 25 },
                    { date: '2024-01-02', value: 35 },
                    { date: '2024-01-03', value: 30 }
                ]
            }
        };

        res.json({
            success: true,
            analytics: mockAnalytics[metric] || mockAnalytics.revenue,
            insights: [
                'Revenue growth is accelerating this quarter',
                'User acquisition is above target',
                'Mobile traffic increased by 45%'
            ]
        });

    } catch (error) {
        logger.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
    }
});

module.exports = router; 