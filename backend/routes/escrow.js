const express = require('express');
const router = express.Router();
const escrowService = require('../services/escrowService');
const { auth } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const notificationService = require('../services/notificationService');
const { body, param, validationResult } = require('express-validator');

/**
 * @route   POST /api/escrow/create
 * @desc    Create a new escrow for an order
 * @access  Private (Buyer)
 */
router.post('/create', auth, [
    body('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('sellerAddress').isEthereumAddress().withMessage('Valid seller Ethereum address is required'),
    body('deliveryDays').optional().isInt({ min: 1, max: 365 }).withMessage('Delivery days must be between 1 and 365')
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

        const { orderId, sellerAddress, deliveryDays = 14 } = req.body;
        const buyerAddress = req.user.wallet_address;

        if (!buyerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Buyer wallet address not found. Please connect your wallet.'
            });
        }

        // Get order details
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify buyer owns the order
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: You can only create escrow for your own orders'
            });
        }

        // Check if escrow already exists for this order
        if (order.escrow_id) {
            return res.status(400).json({
                success: false,
                error: 'Escrow already exists for this order',
                escrowId: order.escrow_id
            });
        }

        // Create escrow
        const result = await escrowService.createEscrow(
            order,
            buyerAddress,
            sellerAddress,
            deliveryDays
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Escrow creation data prepared',
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to prepare escrow creation',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Create escrow error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/escrow/:escrowId
 * @desc    Get escrow details
 * @access  Private
 */
router.get('/:escrowId', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required')
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

        const { escrowId } = req.params;
        const userAddress = req.user.wallet_address;

        const result = await escrowService.getEscrow(escrowId);

        if (result.success) {
            // Check if user is authorized to view this escrow
            const escrow = result.escrow;
            if (escrow.buyer !== userAddress && escrow.seller !== userAddress && req.user.userType !== 'admin') {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized: You can only view your own escrows'
                });
            }

            res.json({
                success: true,
                escrow: result.escrow
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Escrow not found',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Get escrow error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/escrow/user/:role
 * @desc    Get user's escrows (buyer or seller)
 * @access  Private
 */
router.get('/user/:role', auth, [
    param('role').isIn(['buyer', 'seller']).withMessage('Role must be either buyer or seller')
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

        const { role } = req.params;
        const userAddress = req.user.wallet_address;

        if (!userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address not found. Please connect your wallet.'
            });
        }

        const result = await escrowService.getUserEscrows(userAddress, role);

        res.json({
            success: result.success,
            escrows: result.escrows || [],
            totalCount: result.totalCount || 0,
            error: result.error
        });

    } catch (error) {
        console.error('Get user escrows error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/:escrowId/confirm-delivery
 * @desc    Seller confirms delivery
 * @access  Private (Seller)
 */
router.post('/:escrowId/confirm-delivery', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required'),
    body('trackingInfo').notEmpty().withMessage('Tracking information is required')
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

        const { escrowId } = req.params;
        const { trackingInfo } = req.body;
        const sellerAddress = req.user.wallet_address;

        if (!sellerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Seller wallet address not found. Please connect your wallet.'
            });
        }

        const result = await escrowService.confirmDelivery(escrowId, trackingInfo, sellerAddress);

        if (result.success) {
            res.json({
                success: true,
                message: 'Delivery confirmation data prepared',
                transactionData: result.transactionData
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to prepare delivery confirmation',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Confirm delivery error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/:escrowId/confirm-receipt
 * @desc    Buyer confirms receipt
 * @access  Private (Buyer)
 */
router.post('/:escrowId/confirm-receipt', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required')
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

        const { escrowId } = req.params;
        const buyerAddress = req.user.wallet_address;

        if (!buyerAddress) {
            return res.status(400).json({
                success: false,
                error: 'Buyer wallet address not found. Please connect your wallet.'
            });
        }

        const result = await escrowService.confirmReceipt(escrowId, buyerAddress);

        if (result.success) {
            res.json({
                success: true,
                message: 'Receipt confirmation data prepared',
                transactionData: result.transactionData
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to prepare receipt confirmation',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Confirm receipt error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/:escrowId/dispute
 * @desc    Raise a dispute
 * @access  Private (Buyer or Seller)
 */
router.post('/:escrowId/dispute', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required'),
    body('reason').isLength({ min: 10, max: 500 }).withMessage('Dispute reason must be between 10 and 500 characters')
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

        const { escrowId } = req.params;
        const { reason } = req.body;
        const userAddress = req.user.wallet_address;

        if (!userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address not found. Please connect your wallet.'
            });
        }

        const result = await escrowService.raiseDispute(escrowId, reason, userAddress);

        if (result.success) {
            res.json({
                success: true,
                message: 'Dispute raising data prepared',
                transactionData: result.transactionData
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to prepare dispute',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Raise dispute error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/:escrowId/resolve-dispute
 * @desc    Resolve a dispute (Admin only)
 * @access  Private (Admin)
 */
router.post('/:escrowId/resolve-dispute', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required'),
    body('favorBuyer').isBoolean().withMessage('favorBuyer must be a boolean value')
], async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Only admins can resolve disputes'
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

        const { escrowId } = req.params;
        const { favorBuyer } = req.body;

        const result = await escrowService.resolveDispute(escrowId, favorBuyer);

        if (result.success) {
            res.json({
                success: true,
                message: 'Dispute resolved successfully',
                transaction: result.transaction
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to resolve dispute',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/:escrowId/auto-release
 * @desc    Auto-release funds after timeout
 * @access  Private
 */
router.post('/:escrowId/auto-release', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required')
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

        const { escrowId } = req.params;
        const userAddress = req.user.wallet_address;

        if (!userAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address not found. Please connect your wallet.'
            });
        }

        // Check if auto-release is possible
        const canReleaseResult = await escrowService.canAutoRelease(escrowId);
        if (!canReleaseResult.success || !canReleaseResult.canAutoRelease) {
            return res.status(400).json({
                success: false,
                error: 'Auto-release not possible for this escrow',
                details: canReleaseResult.error
            });
        }

        const result = await escrowService.autoReleaseFunds(escrowId, userAddress);

        if (result.success) {
            res.json({
                success: true,
                message: 'Auto-release data prepared',
                transactionData: result.transactionData
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to prepare auto-release',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Auto-release error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/escrow/:escrowId/can-auto-release
 * @desc    Check if escrow can be auto-released
 * @access  Private
 */
router.get('/:escrowId/can-auto-release', auth, [
    param('escrowId').isInt({ min: 1 }).withMessage('Valid escrow ID is required')
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

        const { escrowId } = req.params;

        const result = await escrowService.canAutoRelease(escrowId);

        res.json({
            success: result.success,
            canAutoRelease: result.canAutoRelease,
            escrowId: result.escrowId,
            error: result.error
        });

    } catch (error) {
        console.error('Check auto-release error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/escrow/transaction/:txHash
 * @desc    Get transaction status
 * @access  Private
 */
router.get('/transaction/:txHash', auth, [
    param('txHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Valid transaction hash is required')
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

        const { txHash } = req.params;

        const result = await escrowService.getTransactionStatus(txHash);

        res.json({
            success: result.success,
            status: result.status,
            blockNumber: result.blockNumber,
            confirmations: result.confirmations,
            gasUsed: result.gasUsed,
            events: result.events,
            error: result.error
        });

    } catch (error) {
        console.error('Get transaction status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/escrow/stats
 * @desc    Get contract statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/stats', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.userType !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Only admins can view contract statistics'
            });
        }

        const result = await escrowService.getContractStats();

        if (result.success) {
            res.json({
                success: true,
                stats: result.stats
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to get contract statistics',
                details: result.error
            });
        }

    } catch (error) {
        console.error('Get contract stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/webhook/events
 * @desc    Handle blockchain events (Internal webhook)
 * @access  Internal
 */
router.post('/webhook/events', async (req, res) => {
    try {
        const { eventType, eventData } = req.body;

        // Handle different event types
        switch (eventType) {
            case 'EscrowCreated':
                // Update order with escrow ID
                await Order.findOneAndUpdate(
                    { _id: eventData.orderId },
                    { 
                        escrow_id: eventData.escrowId,
                        escrow_tx_hash: eventData.transactionHash,
                        status: 'escrow_created'
                    }
                );
                break;

            case 'DeliveryConfirmed':
                // Update order status
                await Order.findOneAndUpdate(
                    { escrow_id: eventData.escrowId },
                    { 
                        status: 'delivered',
                        tracking_info: eventData.trackingInfo
                    }
                );
                break;

            case 'ReceiptConfirmed':
                // Update order status
                await Order.findOneAndUpdate(
                    { escrow_id: eventData.escrowId },
                    { status: 'completed' }
                );
                break;

            case 'DisputeRaised':
                // Update order status
                await Order.findOneAndUpdate(
                    { escrow_id: eventData.escrowId },
                    { 
                        status: 'disputed',
                        dispute_reason: eventData.reason
                    }
                );
                break;

            case 'FundsReleased':
                // Update order status based on recipient
                const order = await Order.findOne({ escrow_id: eventData.escrowId });
                if (order) {
                    const isRefund = eventData.recipient.toLowerCase() === order.buyer_address?.toLowerCase();
                    await Order.findOneAndUpdate(
                        { escrow_id: eventData.escrowId },
                        { 
                            status: isRefund ? 'refunded' : 'funds_released',
                            completed_at: new Date()
                        }
                    );
                }
                break;

            default:
                console.log('Unknown event type:', eventType);
        }

        res.json({
            success: true,
            message: 'Event processed successfully'
        });

    } catch (error) {
        console.error('Webhook event error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/escrow/activate
 * @desc    Activate escrow for an order
 * @access  Private
 */
router.post('/activate', auth, [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
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

    const { orderId, amount } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate('buyer_id seller_id');
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (order.buyer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can activate escrow'
      });
    }

    // Check if escrow is already active
    if (order.escrow_status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Escrow is already active for this order'
      });
    }

    // Activate escrow (mock implementation)
    order.escrow_status = 'active';
    order.escrow_amount = amount;
    order.escrow_activated_at = new Date();
    order.status = 'escrow_active';
    
    await order.save();

    // Send escrow activation notifications
    try {
      // Notify buyer
      await notificationService.sendPaymentNotification(order.buyer_id._id, 'escrow_activated', {
        orderNumber: order.orderNumber,
        amount: amount.toString(),
        currency: order.payment_currency || 'ETH',
        orderId: order._id
      });

      // Notify seller
      await notificationService.sendOrderNotification(order.seller_id._id, 'escrow_activated', {
        orderNumber: order.orderNumber,
        amount: amount.toString(),
        currency: order.payment_currency || 'ETH',
        orderId: order._id,
        buyerName: order.buyer_id.username
      });
    } catch (notifError) {
      console.error('Failed to send escrow activation notifications:', notifError);
    }

    res.json({
      success: true,
      message: 'Escrow activated successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        escrow_status: order.escrow_status,
        escrow_amount: order.escrow_amount,
        escrow_activated_at: order.escrow_activated_at
      }
    });

  } catch (error) {
    console.error('Escrow activation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate escrow',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/escrow/release
 * @desc    Release escrow funds
 * @access  Private
 */
router.post('/release', auth, [
  body('orderId').isMongoId().withMessage('Valid order ID is required')
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

    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate('buyer_id seller_id');
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the buyer or admin
    if (order.buyer_id._id.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer or admin can release escrow'
      });
    }

    // Check if escrow is active
    if (order.escrow_status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Escrow is not active for this order'
      });
    }

    // Release escrow (mock implementation)
    order.escrow_status = 'released';
    order.escrow_released_at = new Date();
    order.status = 'completed';
    
    await order.save();

    // Send escrow release notifications
    try {
      // Notify buyer
      await notificationService.sendPaymentNotification(order.buyer_id._id, 'escrow_released', {
        orderNumber: order.orderNumber,
        amount: order.escrow_amount.toString(),
        currency: order.payment_currency || 'ETH',
        orderId: order._id,
        sellerName: order.seller_id.username
      });

      // Notify seller
      await notificationService.sendPaymentNotification(order.seller_id._id, 'escrow_released', {
        orderNumber: order.orderNumber,
        amount: order.escrow_amount.toString(),
        currency: order.payment_currency || 'ETH',
        orderId: order._id,
        buyerName: order.buyer_id.username
      });
    } catch (notifError) {
      console.error('Failed to send escrow release notifications:', notifError);
    }

    res.json({
      success: true,
      message: 'Escrow released successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        escrow_status: order.escrow_status,
        escrow_amount: order.escrow_amount,
        escrow_released_at: order.escrow_released_at,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Escrow release error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release escrow',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/escrow/confirm-delivery
 * @desc    Confirm product delivery
 * @access  Private
 */
router.post('/confirm-delivery', auth, [
  body('orderId').isMongoId().withMessage('Valid order ID is required')
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

    const { orderId } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate('buyer_id seller_id');
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user is the buyer
    if (order.buyer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the buyer can confirm delivery'
      });
    }

    // Update delivery status
    order.delivery_status = 'delivered';
    order.delivery_confirmed_at = new Date();
    
    await order.save();

    // Send delivery confirmation notifications
    try {
      // Notify buyer
      await notificationService.sendOrderNotification(order.buyer_id._id, 'product_delivered', {
        orderNumber: order.orderNumber,
        orderId: order._id,
        deliveryTime: new Date().toISOString()
      });

      // Notify seller
      await notificationService.sendOrderNotification(order.seller_id._id, 'product_delivered', {
        orderNumber: order.orderNumber,
        orderId: order._id,
        buyerName: order.buyer_id.username,
        deliveryTime: new Date().toISOString()
      });
    } catch (notifError) {
      console.error('Failed to send delivery confirmation notifications:', notifError);
    }

    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        delivery_status: order.delivery_status,
        delivery_confirmed_at: order.delivery_confirmed_at
      }
    });

  } catch (error) {
    console.error('Delivery confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm delivery',
      details: error.message
    });
  }
});

module.exports = router; 