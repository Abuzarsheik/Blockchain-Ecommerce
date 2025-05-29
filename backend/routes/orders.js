const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user orders
router.get('/', auth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * limit;

        // Build query filter
        const filter = { user_id: req.user.userId };
        if (status) {
            filter.payment_status = status;
        }

        // Get orders with pagination
        const orders = await Order.find(filter)
            .populate('items.product_id', 'name image_url price')
            .sort({ created_at: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        // Get total count
        const total = await Order.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            orders,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findOne({ 
            _id: orderId, 
            user_id: req.user.userId 
        }).populate('items.product_id', 'name image_url price description');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ order });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// Create new order
router.post('/', auth, async (req, res) => {
    try {
        const { 
            items, 
            subtotal,
            tax = 0,
            shipping = 0,
            discount = 0,
            total,
            payment_method = 'card',
            shipping_address, 
            billing_info 
        } = req.body;

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }

        if (!billing_info) {
            return res.status(400).json({ error: 'Billing information is required' });
        }

        if (!payment_method || !['card', 'crypto'].includes(payment_method)) {
            return res.status(400).json({ error: 'Valid payment method is required' });
        }

        // Validate and prepare items
        const validatedItems = [];
        let calculatedSubtotal = 0;

        for (const item of items) {
            const { product_id, name, image, category, quantity, price } = item;

            if (!product_id || !quantity || quantity <= 0 || !price) {
                return res.status(400).json({ 
                    error: 'Each item must have product_id, quantity, and price' 
                });
            }

            // Get product details if needed
            const product = await Product.findById(product_id);
            if (!product) {
                return res.status(400).json({ 
                    error: `Product with ID ${product_id} not found` 
                });
            }

            const itemTotal = price * quantity;
            calculatedSubtotal += itemTotal;

            validatedItems.push({
                product_id,
                name: name || product.name,
                image: image || product.image_url,
                category: category || product.category,
                quantity,
                price
            });
        }

        // Set estimated delivery date (7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        // Create order
        const newOrder = new Order({
            user_id: req.user.userId,
            items: validatedItems,
            subtotal: subtotal || calculatedSubtotal,
            tax,
            shipping,
            discount,
            total: total || (calculatedSubtotal + tax + shipping - discount),
            payment_method,
            payment_status: 'paid', // Assume payment is successful for demo
            status: 'processing',
            billing_info,
            shipping_address: shipping_address || {
                street: billing_info.address,
                city: billing_info.city,
                state: billing_info.state,
                zipCode: billing_info.zipCode,
                country: billing_info.country
            },
            estimated_delivery: estimatedDelivery
        });

        await newOrder.save();

        // Simulate tracking number generation
        setTimeout(async () => {
            try {
                await Order.findByIdAndUpdate(newOrder._id, {
                    tracking_number: `TK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    status: 'shipped'
                });
            } catch (err) {
                console.error('Error updating tracking:', err);
            }
        }, 5000); // Add tracking number after 5 seconds

        res.status(201).json({
            message: 'Order created successfully',
            order: newOrder
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update order status
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (!['pending', 'paid', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, user_id: req.user.userId },
            { payment_status: status, updated_at: new Date() },
            { new: true }
        ).populate('items.product_id', 'name image_url price');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({
            message: 'Order status updated successfully',
            order
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router; 