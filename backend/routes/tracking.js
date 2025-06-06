        const db = require('../config/database');
const Order = require('../models/Order');
const express = require('express');
const notificationService = require('../services/notificationService');
const shippingService = require('../services/shippingService');
const trackingService = require('../services/trackingService');
const { auth, adminAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// Tracking Health Check (no auth required) - MOVED TO TOP
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            service: 'Tracking',
            timestamp: new Date().toISOString(),
            endpoints: [
                'GET /api/tracking/:trackingNumber',
                'POST /api/tracking/create',
                'PUT /api/tracking/:trackingNumber',
                'POST /api/tracking/webhook'
            ]
        };

        // Test tracking service
        try {
            const serviceStatus = await trackingService.getServiceStatus();
            health.stats = {
                ...serviceStatus,
                message: 'Tracking service operational'
            };
        } catch (statsError) {
            health.message = 'Tracking service running but stats unavailable';
            health.warning = statsError.message;
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'Tracking',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route   GET /api/tracking/:trackingNumber
 * @desc    Track shipment by tracking number (public)
 * @access  Public
 */
router.get('/:trackingNumber', [
    param('trackingNumber').isLength({ min: 1 }).withMessage('Tracking number is required')
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

        const trackingNumber = req.params.trackingNumber;

        const order = await Order.findByTrackingNumber(trackingNumber)
            .populate('items.product_id', 'name image_url category')
            .populate('seller_id', 'firstName lastName businessName')
            .select('-user_id -billing_info -payment_id -blockchain_tx -communication_log -admin_notes');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'No shipment found with this tracking number' 
            });
        }

        // Get real-time tracking if available
        let liveTracking = null;
        try {
            const trackingResult = await shippingService.getTrackingInfo(order._id);
            if (trackingResult.success) {
                liveTracking = trackingResult.tracking_data;
            }
        } catch (trackingError) {
            logger.error('Error fetching live tracking:', trackingError);
        }

        res.json({
            success: true,
            shipment: {
                orderNumber: order.orderNumber,
                status: order.status,
                tracking_number: trackingNumber,
                carrier: order.shipping_info?.carrier,
                service_type: order.shipping_info?.service_type,
                shipped_date: order.shipped_at,
                estimated_delivery: order.estimated_delivery,
                delivered_at: order.delivered_at,
                tracking_url: order.getTrackingURL(),
                items_count: order.items.length,
                seller: order.seller_id ? {
                    name: order.seller_id.businessName || `${order.seller_id.firstName} ${order.seller_id.lastName}`,
                    id: order.seller_id._id
                } : null
            },
            delivery_address: {
                city: order.shipping_address?.city,
                state: order.shipping_address?.state,
                country: order.shipping_address?.country,
                zipCode: order.shipping_address?.zipCode
            },
            tracking_events: order.tracking_events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
            latest_event: order.getLatestTrackingEvent(),
            live_tracking: liveTracking
        });

    } catch (error) {
        logger.error('Track shipment error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to track shipment' 
        });
    }
});

/**
 * @route   POST /api/tracking/bulk-update
 * @desc    Update tracking for multiple orders (admin only)
 * @access  Admin
 */
router.post('/bulk-update', adminAuth, async (req, res) => {
    try {
        
        const results = await shippingService.updateAllOrderTracking();
        
        res.json({
            success: true,
            message: 'Bulk tracking update completed',
            results
        });

    } catch (error) {
        logger.error('Bulk tracking update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update tracking information' 
        });
    }
});

/**
 * @route   POST /api/tracking/webhook/carrier
 * @desc    Receive tracking updates from carriers
 * @access  Internal (webhook)
 */
router.post('/webhook/carrier', async (req, res) => {
    try {
        const { carrier, tracking_number, event_data, signature } = req.body;

        // Verify webhook signature (implement based on carrier requirements)
        // For now, we'll skip signature verification

        if (!tracking_number || !event_data) {
            return res.status(400).json({
                success: false,
                error: 'Tracking number and event data required'
            });
        }

        // Find order by tracking number
        const order = await Order.findByTrackingNumber(tracking_number)
            .populate('user_id', 'firstName lastName email')
            .populate('seller_id', 'firstName lastName businessName email');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Process the webhook event
        const trackingEvent = {
            timestamp: new Date(event_data.timestamp || Date.now()),
            status: event_data.status,
            description: event_data.description,
            location: event_data.location || {},
            carrier_status: event_data.carrier_status,
            event_type: event_data.event_type || 'in_transit'
        };

        // Add tracking event to order
        await order.addTrackingEvent(trackingEvent);

        // Send notifications for important events
        if (['delivered', 'out_for_delivery', 'exception'].includes(trackingEvent.event_type)) {
            await shippingService.sendTrackingNotification(order, trackingEvent);
        }

        res.json({
            success: true,
            message: 'Tracking event processed successfully'
        });

    } catch (error) {
        logger.error('Carrier webhook error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process webhook' 
        });
    }
});

/**
 * @route   POST /api/tracking/events
 * @desc    Add manual tracking event (seller/admin)
 * @access  Private
 */
router.post('/events', auth, [
    body('tracking_number').isLength({ min: 1 }).withMessage('Tracking number is required'),
    body('event_type').isIn(['pickup', 'in_transit', 'out_for_delivery', 'delivered', 'attempted_delivery', 'exception', 'returned'])
        .withMessage('Valid event type is required'),
    body('status').isLength({ min: 1, max: 200 }).withMessage('Status is required (1-200 chars)'),
    body('description').isLength({ min: 1, max: 500 }).withMessage('Description is required (1-500 chars)'),
    body('location').optional().isObject().withMessage('Location must be object')
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

        const { tracking_number, event_type, status, description, location } = req.body;

        const order = await Order.findByTrackingNumber(tracking_number)
            .populate('user_id', 'firstName lastName email')
            .populate('seller_id', 'firstName lastName businessName');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found with this tracking number' 
            });
        }

        // Check if user is seller or admin
        const isSeller = order.seller_id && order.seller_id._id.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isSeller && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Only sellers and admins can add tracking events'
            });
        }

        // Add tracking event
        await order.addTrackingEvent({
            event_type,
            status,
            description,
            location: location || {},
            timestamp: new Date()
        });

        // Send notification for important events
        if (['delivered', 'out_for_delivery', 'exception'].includes(event_type)) {
            await shippingService.sendTrackingNotification(order, {
                event_type,
                status,
                description,
                location
            });
        }

        res.json({
            success: true,
            message: 'Tracking event added successfully',
            latest_event: order.getLatestTrackingEvent()
        });

    } catch (error) {
        logger.error('Add tracking event error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add tracking event' 
        });
    }
});

/**
 * @route   POST /api/tracking/shipping-labels
 * @desc    Create shipping label and tracking number (seller)
 * @access  Private
 */
router.post('/shipping-labels', auth, [
    body('order_id').isMongoId().withMessage('Valid order ID is required'),
    body('carrier').isIn(['fedex', 'ups', 'dhl', 'usps']).withMessage('Valid carrier is required'),
    body('service_type').isString().withMessage('Service type is required'),
    body('package_info').isObject().withMessage('Package information is required')
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

        const { order_id, carrier, service_type, package_info } = req.body;

        const order = await Order.findById(order_id)
            .populate('user_id', 'firstName lastName email phone')
            .populate('seller_id', 'firstName lastName businessName');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }

        // Check if user is seller or admin
        const isSeller = order.seller_id && order.seller_id._id.toString() === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isSeller && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Only sellers and admins can create shipping labels'
            });
        }

        // Create shipping label
        const labelResult = await shippingService.createShippingLabel(order_id, {
            carrier,
            service_type,
            package_info
        });

        if (!labelResult.success) {
            return res.status(500).json({
                success: false,
                error: labelResult.error
            });
        }

        // Send notification to buyer
        try {
            await notificationService.sendOrderNotification(order.user_id._id, 'order_shipped', {
                orderNumber: order.orderNumber,
                trackingNumber: labelResult.label.tracking_number,
                carrier: carrier,
                trackingUrl: order.getTrackingURL(),
                estimatedDelivery: order.estimated_delivery
            });
        } catch (notifError) {
            logger.error('Failed to send shipping notification:', notifError);
        }

        res.json({
            success: true,
            message: 'Shipping label created successfully',
            label: labelResult.label,
            tracking_url: order.getTrackingURL()
        });

    } catch (error) {
        logger.error('Create shipping label error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create shipping label' 
        });
    }
});

/**
 * @route   GET /api/tracking/carriers/:carrier/rates
 * @desc    Get shipping rates from specific carrier
 * @access  Private
 */
router.post('/carriers/:carrier/rates', auth, [
    param('carrier').isIn(['fedex', 'ups', 'dhl', 'usps']).withMessage('Invalid carrier'),
    body('from_address').isObject().withMessage('From address is required'),
    body('to_address').isObject().withMessage('To address is required'),
    body('package_info').isObject().withMessage('Package info is required')
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

        const { carrier } = req.params;
        const { from_address, to_address, package_info } = req.body;

        const rates = await shippingService.getShippingRates(from_address, to_address, package_info);

        // Filter rates for specific carrier
        const carrierRates = rates.rates ? rates.rates.filter(rate => rate.carrier === carrier) : [];

        res.json({
            success: true,
            carrier,
            rates: carrierRates
        });

    } catch (error) {
        logger.error('Get carrier rates error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get shipping rates' 
        });
    }
});

/**
 * @route   GET /api/tracking/analytics/delivery-performance
 * @desc    Get delivery performance analytics (admin)
 * @access  Admin
 */
router.get('/analytics/delivery-performance', adminAuth, [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    query('carrier').optional().isIn(['fedex', 'ups', 'dhl', 'usps']).withMessage('Invalid carrier')
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

        const days = parseInt(req.query.days) || 30;
        const carrier = req.query.carrier;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Build aggregation pipeline
        const matchStage = {
            created_at: { $gte: startDate },
            status: { $in: ['delivered', 'in_transit', 'shipped'] }
        };

        if (carrier) {
            matchStage['shipping_info.carrier'] = carrier;
        }

        const analytics = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        carrier: '$shipping_info.carrier',
                        status: '$status'
                    },
                    count: { $sum: 1 },
                    avgDeliveryTime: {
                        $avg: {
                            $subtract: ['$delivered_at', '$shipped_at']
                        }
                    },
                    totalOrders: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.carrier',
                    total_orders: { $sum: '$count' },
                    delivered_orders: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.status', 'delivered'] }, '$count', 0]
                        }
                    },
                    avg_delivery_time_ms: { $avg: '$avgDeliveryTime' },
                    status_breakdown: {
                        $push: {
                            status: '$_id.status',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $project: {
                    carrier: '$_id',
                    total_orders: 1,
                    delivered_orders: 1,
                    delivery_rate: {
                        $multiply: [
                            { $divide: ['$delivered_orders', '$total_orders'] },
                            100
                        ]
                    },
                    avg_delivery_time_days: {
                        $divide: ['$avg_delivery_time_ms', 1000 * 60 * 60 * 24]
                    },
                    status_breakdown: 1
                }
            }
        ]);

        res.json({
            success: true,
            period_days: days,
            carrier_filter: carrier,
            analytics
        });

    } catch (error) {
        logger.error('Get delivery analytics error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get delivery analytics' 
        });
    }
});

/**
 * @route   GET /api/tracking/notifications/settings
 * @desc    Get tracking notification settings for user
 * @access  Private
 */
router.get('/notifications/settings', auth, async (req, res) => {
    try {
        // This would typically come from user preferences
        // For now, return default settings
        const defaultSettings = {
            email_notifications: true,
            sms_notifications: false,
            push_notifications: true,
            notification_events: [
                'shipped',
                'out_for_delivery',
                'delivered',
                'exception'
            ]
        };

        res.json({
            success: true,
            settings: defaultSettings
        });

    } catch (error) {
        logger.error('Get notification settings error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get notification settings' 
        });
    }
});

/**
 * @route   PUT /api/tracking/notifications/settings
 * @desc    Update tracking notification settings
 * @access  Private
 */
router.put('/notifications/settings', auth, [
    body('email_notifications').optional().isBoolean(),
    body('sms_notifications').optional().isBoolean(),
    body('push_notifications').optional().isBoolean(),
    body('notification_events').optional().isArray()
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

        // Update user notification preferences
        // This would typically update a user preferences model
        const updatedSettings = req.body;

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            settings: updatedSettings
        });

    } catch (error) {
        logger.error('Update notification settings error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update notification settings' 
        });
    }
});

// Create new shipment
router.post('/shipments', auth, async (req, res) => {
    try {
        const {
            orderId,
            nftId,
            buyer,
            provider = 'local',
            service = 'standard',
            origin,
            destination,
            weight,
            dimensions,
            value
        } = req.body;

        // Validate required fields
        if (!orderId || !nftId || !buyer || !destination) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: orderId, nftId, buyer, destination'
            });
        }

        const result = await trackingService.createShipment({
            orderId,
            nftId,
            seller: req.user.id,
            buyer,
            provider,
            service,
            origin,
            destination,
            weight,
            dimensions,
            value
        });

        res.status(201).json(result);

    } catch (error) {
        logger.error('Create shipment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Track shipment by tracking number
router.get('/track/:trackingNumber', async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        
        const result = await trackingService.trackShipment(trackingNumber);
        
        res.json(result);

    } catch (error) {
        logger.error('Track shipment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update shipment status (for logistics providers)
router.put('/shipments/:trackingNumber', auth, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        const updateData = req.body;

        // Validate update data
        if (!updateData.status && !updateData.location && !updateData.estimatedDelivery) {
            return res.status(400).json({
                success: false,
                error: 'At least one update field required: status, location, estimatedDelivery'
            });
        }

        const result = await trackingService.updateShipmentStatus(trackingNumber, updateData);
        
        res.json({
            success: true,
            shipment: result
        });

    } catch (error) {
        logger.error('Update shipment error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user's shipments
router.get('/shipments/user/:userId', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role = 'buyer' } = req.query;

        // Check if user can access these shipments
        if (userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const result = await trackingService.getUserShipments(userId, role);
        
        res.json(result);

    } catch (error) {
        logger.error('Get user shipments error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get delivery proof
router.get('/proof/:trackingNumber', auth, async (req, res) => {
    try {
        const { trackingNumber } = req.params;
        
        const result = await trackingService.getDeliveryProof(trackingNumber);
        
        res.json(result);

    } catch (error) {
        logger.error('Get delivery proof error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bulk track multiple shipments
router.post('/track/bulk', async (req, res) => {
    try {
        const { trackingNumbers } = req.body;

        if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'trackingNumbers must be a non-empty array'
            });
        }

        if (trackingNumbers.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 50 tracking numbers allowed per request'
            });
        }

        const results = await Promise.allSettled(
            trackingNumbers.map(trackingNumber => 
                trackingService.trackShipment(trackingNumber)
            )
        );

        const response = results.map((result, index) => ({
            trackingNumber: trackingNumbers[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));

        res.json({
            success: true,
            results: response
        });

    } catch (error) {
        logger.error('Bulk tracking error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get tracking statistics
router.get('/stats', auth, async (req, res) => {
    try {
        // Only allow admin or authenticated users
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        
        const stats = await db.collection('shipments').aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgDeliveryTime: {
                        $avg: {
                            $subtract: ['$metadata.lastUpdated', '$metadata.created']
                        }
                    }
                }
            }
        ]).toArray();

        const totalShipments = await db.collection('shipments').countDocuments();
        
        res.json({
            success: true,
            stats: {
                total: totalShipments,
                byStatus: stats,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        logger.error('Get tracking stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 