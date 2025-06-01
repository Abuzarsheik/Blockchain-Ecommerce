const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const express = require('express');
const paymentService = require('../services/paymentService');
const { auth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/payments/process
 * @desc    Process cryptocurrency payment
 * @access  Private
 */
router.post('/process', auth, [
  body('orderId').optional().isMongoId().withMessage('Valid order ID required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Unsupported currency'),
  body('fromAddress').notEmpty().withMessage('From address is required'),
  body('toAddress').notEmpty().withMessage('To address is required'),
  body('txHash').optional().isString().withMessage('Transaction hash must be a string'),
  body('description').optional().isString()
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

    const paymentData = {
      ...req.body,
      userId: req.user.id
    };

    const result = await paymentService.processPayment(paymentData);

    if (result.success) {
      res.json({
        success: true,
        transaction: result.transaction,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/payments/withdraw
 * @desc    Process cryptocurrency withdrawal
 * @access  Private
 */
router.post('/withdraw', auth, [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Unsupported currency'),
  body('destinationAddress').notEmpty().withMessage('Destination address is required'),
  body('description').optional().isString()
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

    const withdrawalData = {
      ...req.body,
      userId: req.user.id
    };

    const result = await paymentService.processWithdrawal(withdrawalData);

    if (result.success) {
      res.json({
        success: true,
        transaction: result.transaction,
        txHash: result.txHash,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
router.get('/transactions', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('currency').optional().isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency'),
  query('type').optional().isIn(['payment', 'withdrawal', 'refund', 'escrow', 'release']).withMessage('Invalid transaction type'),
  query('status').optional().isIn(['pending', 'broadcasted', 'confirmed', 'failed', 'cancelled']).withMessage('Invalid status')
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
      currency: req.query.currency,
      type: req.query.type,
      status: req.query.status
    };

    const result = await paymentService.getTransactionHistory(req.user.id, options);

    res.json({
      success: result.success,
      transactions: result.transactions || [],
      pagination: result.pagination,
      error: result.error
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/transactions/:address
 * @desc    Get transaction history for a specific address
 * @access  Private
 */
router.get('/transactions/:address', auth, [
  param('address').notEmpty().withMessage('Address is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('currency').optional().isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency'),
  query('type').optional().isIn(['payment', 'withdrawal', 'refund', 'escrow', 'release']).withMessage('Invalid transaction type'),
  query('status').optional().isIn(['pending', 'broadcasted', 'confirmed', 'failed', 'cancelled']).withMessage('Invalid status')
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

    const { address } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      currency: req.query.currency,
      type: req.query.type,
      status: req.query.status
    };

    const result = await paymentService.getTransactionHistory(address, options);

    res.json({
      success: result.success,
      transactions: result.transactions || [],
      pagination: result.pagination,
      error: result.error
    });

  } catch (error) {
    logger.error('Get address transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/transaction/:txHash
 * @desc    Get transaction details by hash
 * @access  Private
 */
router.get('/transaction/:txHash', auth, [
  param('txHash').notEmpty().withMessage('Transaction hash is required')
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
    const result = await paymentService.getTransactionByHash(txHash);

    if (result.success) {
      res.json({
        success: true,
        transaction: result.transaction,
        blockchainInfo: result.blockchainInfo
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Get transaction by hash error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   PUT /api/payments/transactions/:txHash
 * @desc    Update transaction status
 * @access  Private
 */
router.put('/transactions/:txHash', auth, [
  param('txHash').notEmpty().withMessage('Transaction hash is required'),
  body('status').isIn(['pending', 'broadcasted', 'confirmed', 'failed', 'cancelled']).withMessage('Invalid status'),
  body('blockNumber').optional().isInt().withMessage('Block number must be an integer'),
  body('gasUsed').optional().isString().withMessage('Gas used must be a string'),
  body('gasPrice').optional().isString().withMessage('Gas price must be a string'),
  body('confirmations').optional().isInt({ min: 0 }).withMessage('Confirmations must be non-negative')
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
    const updateData = req.body;

    const transaction = await Transaction.findOne({ txHash });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if user owns this transaction or is admin
    if (transaction.userId.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to update this transaction'
      });
    }

    await transaction.updateStatus(updateData.status, updateData);

    res.json({
      success: true,
      transaction: transaction.toObject(),
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    logger.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/currencies
 * @desc    Get supported currencies and networks
 * @access  Public
 */
router.get('/currencies', async (req, res) => {
  try {
    const currencies = paymentService.getSupportedCurrencies();
    const networks = paymentService.getNetworks();

    res.json({
      success: true,
      currencies,
      networks
    });

  } catch (error) {
    logger.error('Get currencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/balance/:currency
 * @desc    Get platform balance for a currency
 * @access  Private (Admin)
 */
router.get('/balance/:currency', auth, [
  param('currency').isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required'
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

    const { currency } = req.params;
    const balance = await paymentService.getPlatformBalance(currency);

    res.json({
      success: true,
      currency,
      balance
    });

  } catch (error) {
    logger.error('Get platform balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private (Admin)
 */
router.get('/stats', auth, [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 date'),
  query('currency').optional().isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Admin access required'
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

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      currency: req.query.currency
    };

    const result = await paymentService.getPaymentStats(filters);

    if (result.success) {
      res.json({
        success: true,
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   POST /api/payments/validate-address
 * @desc    Validate cryptocurrency address
 * @access  Private
 */
router.post('/validate-address', auth, [
  body('address').notEmpty().withMessage('Address is required'),
  body('currency').isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency')
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

    const { address, currency } = req.body;
    const isValid = paymentService.isValidAddress(address, currency);

    res.json({
      success: true,
      address,
      currency,
      isValid
    });

  } catch (error) {
    logger.error('Validate address error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/payments/user-stats
 * @desc    Get user's payment statistics
 * @access  Private
 */
router.get('/user-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's transaction summary
    const stats = await Transaction.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            currency: '$currency',
            type: '$type',
            status: '$status'
          },
          totalAmount: { $sum: { $toDouble: '$amount' } },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            currency: '$_id.currency',
            type: '$_id.type'
          },
          statusBreakdown: {
            $push: {
              status: '$_id.status',
              amount: '$totalAmount',
              count: '$count'
            }
          },
          totalAmount: { $sum: '$totalAmount' },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('orderId', 'orderNumber total');

    res.json({
      success: true,
      stats,
      recentTransactions
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router; 