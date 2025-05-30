const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const { body, param, query, validationResult } = require('express-validator');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with filtering and pagination
 * @access  Private
 */
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['transaction', 'security', 'system', 'order', 'promotional']).withMessage('Invalid category'),
  query('type').optional().isString().withMessage('Type must be a string'),
  query('isRead').optional().isBoolean().withMessage('isRead must be boolean'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
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

    const {
      page = 1,
      limit = 20,
      category,
      type,
      isRead,
      priority
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      type,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      priority
    };

    const notifications = await Notification.findByUser(req.user.id, options);
    const total = await Notification.countDocuments({
      userId: req.user.id,
      ...(category && { category }),
      ...(type && { type }),
      ...(isRead !== undefined && { isRead: isRead === 'true' }),
      ...(priority && { priority })
    });

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      notifications: notifications.map(n => n.summary),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      unreadCount,
      filters: { category, type, isRead, priority }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Notification.getStats(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      stats,
      unreadCount
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/notifications/:id
 * @desc    Get specific notification details
 * @access  Private
 */
router.get('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid notification ID')
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

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('relatedEntity.entityId');

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Auto-mark as read when viewed
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json({
      success: true,
      notification: notification.toObject()
    });

  } catch (error) {
    console.error('Get notification details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification details',
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', auth, [
  param('id').isMongoId().withMessage('Invalid notification ID')
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

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: notification.summary
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error.message
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid notification ID')
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

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    Create test notification (development only)
 * @access  Private
 */
router.post('/test', auth, [
  body('type').isString().withMessage('Notification type is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test notifications not allowed in production'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type, data = {} } = req.body;

    const notification = await notificationService.createNotification({
      userId: req.user.id,
      type,
      data
    });

    res.json({
      success: true,
      message: 'Test notification created',
      notification: notification.summary
    });

  } catch (error) {
    console.error('Create test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test notification',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/action
 * @desc    Handle notification action
 * @access  Private
 */
router.post('/action', auth, [
  body('notificationId').isMongoId().withMessage('Invalid notification ID'),
  body('action').isString().withMessage('Action is required')
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

    const { notificationId, action } = req.body;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Handle different actions
    let result = { success: true, message: 'Action processed' };

    switch (action) {
      case 'confirm_delivery':
        // Mark order as delivered
        if (notification.relatedEntity?.entityType === 'order') {
          // Here you would update the order status
          result.message = 'Delivery confirmed';
        }
        break;

      case 'report_issue':
        // Create support ticket or flag issue
        result.message = 'Issue reported';
        break;

      case 'confirm_login':
        // Mark login as confirmed
        result.message = 'Login confirmed';
        break;

      case 'secure_account':
        // Initiate account security measures
        result.message = 'Account security initiated';
        break;

      case 'reset_password':
        // Initiate password reset
        result.message = 'Password reset initiated';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown action'
        });
    }

    // Mark notification as read if action was taken
    if (!notification.isRead) {
      await notification.markAsRead();
    }

    res.json(result);

  } catch (error) {
    console.error('Handle notification action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle notification action',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/notifications/admin/all
 * @desc    Get all notifications (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('category').optional().isString().withMessage('Category must be string'),
  query('priority').optional().isString().withMessage('Priority must be string')
], async (req, res) => {
  try {
    // Check admin access
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      userId,
      category,
      priority
    } = req.query;

    let query = {};
    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username email');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/admin/broadcast
 * @desc    Broadcast notification to multiple users (admin only)
 * @access  Private (Admin)
 */
router.post('/admin/broadcast', auth, [
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isMongoId().withMessage('Invalid user ID'),
  body('title').isString().isLength({ min: 1, max: 200 }).withMessage('Title is required (1-200 chars)'),
  body('message').isString().isLength({ min: 1, max: 1000 }).withMessage('Message is required (1-1000 chars)'),
  body('type').isString().withMessage('Type is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    // Check admin access
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { userIds, title, message, type, priority = 'medium' } = req.body;

    const notifications = [];
    for (const userId of userIds) {
      try {
        const notification = await notificationService.createNotification({
          userId,
          type,
          customTitle: title,
          customMessage: message,
          priority
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification for user ${userId}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Broadcast sent to ${notifications.length} users`,
      sentCount: notifications.length,
      totalUsers: userIds.length
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast notification',
      details: error.message
    });
  }
});

module.exports = router; 