const Order = require('../models/Order');
const Product = require('../models/Product');
const express = require('express');
const notificationService = require('../services/notificationService');
const shippingService = require('../services/shippingService');
const { auth, adminAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// Orders Health Check (no auth required) - MOVED TO TOP
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            service: 'Orders',
            timestamp: new Date().toISOString(),
            endpoints: [
                'GET /api/orders',
                'GET /api/orders/:id',
                'POST /api/orders',
                'PUT /api/orders/:id'
            ]
        };

        // Get some basic stats
        try {
            const totalOrders = await Order.countDocuments();
            const pendingOrders = await Order.countDocuments({ status: 'pending' });
            health.stats = {
                totalOrders,
                pendingOrders,
                message: 'Orders service operational'
            };
        } catch (statsError) {
            health.message = 'Orders service running but stats unavailable';
            health.warning = statsError.message;
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'Orders',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @route   GET /api/orders
 * @desc    Get user orders with enhanced filtering
 * @access  Private
 */
router.get('/', auth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('status').optional().isIn([
        'pending', 'confirmed', 'processing', 'ready_to_ship', 
        'shipped', 'in_transit', 'out_for_delivery', 'delivered', 
        'cancelled', 'returned', 'refunded', 'disputed'
    ]).withMessage('Invalid status'),
    query('payment_status').optional().isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded'])
        .withMessage('Invalid payment status'),
    query('tracking_number').optional().isString().withMessage('Tracking number must be string')
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
            limit = 10, 
            status, 
            payment_status, 
            tracking_number 
        } = req.query;
        
        const skip = (page - 1) * limit;

        // Build query filter
        const filter = { userId: req.user.id };
        if (status) {filter.status = status;}
        if (payment_status) {filter.payment_status = payment_status;}
        if (tracking_number) {
            filter.$or = [
                { 'shipping_info.tracking_number': new RegExp(tracking_number, 'i') },
                { 'tracking_number': new RegExp(tracking_number, 'i') }
            ];
        }

        // Get orders with enhanced population
        const orders = await Order.find(filter)
            .populate('items.productId', 'name image_url price category')
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        // Add tracking URLs and latest events
        const enhancedOrders = orders.map(order => {
            const orderObj = order.toObject();
            orderObj.tracking_url = order.getTrackingURL();
            orderObj.latest_tracking_event = order.getLatestTrackingEvent();
            return orderObj;
        });

        // Get total count
        const total = await Order.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            orders: enhancedOrders,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: total,
                items_per_page: parseInt(limit),
                has_next: page < totalPages,
                has_prev: page > 1
            }
        });

    } catch (error) {
        logger.error('Get orders error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get orders' 
        });
    }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Get single order with full tracking details
 * @access  Private
 */
router.get('/:id', auth, [
    param('id').isMongoId().withMessage('Invalid order ID')
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

        const orderId = req.params.id;

        const order = await Order.findOne({ 
            _id: orderId, 
            userId: req.user.id 
        })
        .populate('items.productId', 'name image_url price description category')
        .populate('userId', 'firstName lastName email phone');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }

        // Get latest tracking info if available
        let trackingInfo = null;
        if (order.shipping_info?.tracking_number || order.tracking_number) {
            try {
                const trackingResult = await shippingService.getTrackingInfo(orderId);
                if (trackingResult.success) {
                    trackingInfo = trackingResult;
                }
            } catch (trackingError) {
                logger.error('Error fetching tracking info:', trackingError);
            }
        }

        const orderResponse = {
            ...order.toObject(),
            tracking_url: order.getTrackingURL(),
            latest_tracking_event: order.getLatestTrackingEvent(),
            tracking_info: trackingInfo
        };

        res.json({ 
            success: true, 
            order: orderResponse 
        });

    } catch (error) {
        logger.error('Get order error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get order' 
        });
    }
});

/**
 * @route   GET /api/orders/:id/tracking
 * @desc    Get real-time tracking information for an order
 * @access  Private
 */
router.get('/:id/tracking', auth, [
    param('id').isMongoId().withMessage('Invalid order ID')
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

        const orderId = req.params.id;

        // Verify order belongs to user
        const order = await Order.findOne({ 
            _id: orderId, 
            userId: req.user.id 
        });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }

        // Get tracking information
        const trackingInfo = await shippingService.getTrackingInfo(orderId);

        res.json(trackingInfo);

    } catch (error) {
        logger.error('Get tracking error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get tracking information' 
        });
    }
});

/**
 * @route   GET /api/orders/tracking/:trackingNumber
 * @desc    Track order by tracking number (public)
 * @access  Public
 */
router.get('/tracking/:trackingNumber', [
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
            .populate('items.productId', 'name image_url')
            .select('orderNumber status shipping_info tracking_events shipping_address estimated_delivery delivered_at');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'No order found with this tracking number' 
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
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                tracking_number: trackingNumber,
                carrier: order.shipping_info?.carrier,
                service_type: order.shipping_info?.service_type,
                estimated_delivery: order.estimated_delivery,
                delivered_at: order.delivered_at,
                tracking_url: order.getTrackingURL(),
                items_count: order.items.length
            },
            tracking_events: order.tracking_events,
            latest_event: order.getLatestTrackingEvent(),
            live_tracking: liveTracking
        });

    } catch (error) {
        logger.error('Track by number error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to track order' 
        });
    }
});

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Private
 */
router.post('/', auth, [
    body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
    body('payment_method').isIn(['card', 'crypto', 'escrow']).withMessage('Valid payment method required'),
    body('billing_info').isObject().withMessage('Billing information is required')
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
            items,
            subtotal,
            tax = 0,
            shipping_cost = 0,
            discount = 0,
            total,
            payment_method,
            billing_info,
            shipping_address,
            shippingAddress,
            delivery_preferences
        } = req.body;

        // Validate and prepare items
        const validatedItems = [];
        let calculatedSubtotal = 0;

        for (const item of items) {
            const { product_id, name, image, category, quantity, price } = item;

            if (!product_id || !quantity || quantity <= 0 || !price) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Each item must have product_id, quantity, and price' 
                });
            }

            // Validate ObjectId format first
            if (!product_id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({ 
                    success: false,
                    error: `Invalid product ID format: ${product_id}` 
                });
            }

            // Get product details
            const product = await Product.findById(product_id);
            if (!product) {
                return res.status(400).json({ 
                    success: false,
                    error: `Product with ID ${product_id} not found` 
                });
            }

            const itemTotal = price * quantity;
            calculatedSubtotal += itemTotal;

            validatedItems.push({
                productId: product_id,
                name: name || product.name,
                image: image || (product.images && product.images[0] ? product.images[0].url : ''),
                category: category || product.category,
                quantity,
                price: {
                    amount: price,
                    currency: 'USD'
                }
            });
        }

        // Validate shipping address if provided
        const shippingAddr = shipping_address || shippingAddress;
        if (shippingAddr) {
            const requiredShippingFields = ['street', 'city', 'postalCode', 'country'];
            const missingFields = requiredShippingFields.filter(field => !shippingAddr[field]);
            
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required shipping address fields: ${missingFields.join(', ')}`
                });
            }
        }

        // Set estimated delivery date (7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        // Create order
        const newOrder = new Order({
            orderNumber: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
            userId: req.user.id,
            items: validatedItems,
            subtotal: {
                amount: subtotal || calculatedSubtotal,
                currency: 'USD'
            },
            tax: {
                amount: tax || 0,
                currency: 'USD'
            },
            shippingCost: {
                amount: shipping_cost || 0,
                currency: 'USD'
            },
            discount: {
                amount: discount || 0,
                currency: 'USD'
            },
            total: {
                amount: total || (calculatedSubtotal + (tax || 0) + (shipping_cost || 0) - (discount || 0)),
                currency: 'USD'
            },
            paymentMethod: payment_method,
            paymentStatus: payment_method === 'crypto' ? 'pending' : 'paid',
            status: 'processing',
            billingInfo: {
                firstName: billing_info.firstName,
                lastName: billing_info.lastName,
                email: billing_info.email,
                phone: billing_info.phone,
                address: {
                    street: billing_info.address || billing_info.street,
                    city: billing_info.city,
                    state: billing_info.state,
                    postalCode: billing_info.zipCode || billing_info.postalCode,
                    country: billing_info.country
                }
            },
            shippingAddress: {
                firstName: (shipping_address || billing_info).firstName,
                lastName: (shipping_address || billing_info).lastName,
                email: (shipping_address || billing_info).email,
                phone: (shipping_address || billing_info).phone,
                address: {
                    street: (shipping_address || billing_info).address || (shipping_address || billing_info).street,
                    city: (shipping_address || billing_info).city,
                    state: (shipping_address || billing_info).state,
                    postalCode: (shipping_address || billing_info).zipCode || (shipping_address || billing_info).postalCode,
                    country: (shipping_address || billing_info).country
                }
            },
            estimatedDelivery: estimatedDelivery,
            deliveryPreferences: delivery_preferences || {}
        });

        await newOrder.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: newOrder
        });

    } catch (error) {
        logger.error('Create order error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create order' 
        });
    }
});

/**
 * @route   POST /api/orders/:id/delivery-confirmation
 * @desc    Confirm delivery (buyer confirms receipt)
 * @access  Private
 */
router.post('/:id/delivery-confirmation', auth, [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('feedback').optional().isLength({ max: 1000 }).withMessage('Feedback must be under 1000 chars')
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

        const orderId = req.params.id;
        const { rating, feedback } = req.body;

        const order = await Order.findOne({ 
            _id: orderId, 
            userId: req.user.id 
        }).populate('userId', 'firstName lastName email');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }

        if (order.status === 'delivered') {
            return res.status(400).json({
                success: false,
                error: 'Order already confirmed as delivered'
            });
        }

        // Add delivery confirmation event
        await order.addTrackingEvent({
            event_type: 'delivered',
            status: 'Delivery confirmed by customer',
            description: feedback || 'Package delivery confirmed by recipient',
            timestamp: new Date()
        });

        // Update order status
        order.status = 'delivered';
        order.delivered_at = new Date();
        if (order.shipping_info) {
            order.shipping_info.actual_delivery = new Date();
        }
        await order.save();

        res.json({
            success: true,
            message: 'Delivery confirmed successfully',
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                delivered_at: order.delivered_at
            }
        });

    } catch (error) {
        logger.error('Delivery confirmation error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to confirm delivery' 
        });
    }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (legacy)
 * @access  Private
 */
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (!['pending', 'paid', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid status',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, userId: req.user.id },
            { payment_status: status, updated_at: new Date() },
            { new: true }
        ).populate('items.productId', 'name image_url price');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Order not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            message: 'Order status updated successfully',
            order
        });

    } catch (error) {
        logger.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update order status',
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router; 