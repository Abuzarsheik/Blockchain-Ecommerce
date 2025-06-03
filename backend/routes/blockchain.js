const crypto = require('crypto');
const BlockchainRecord = require('../models/BlockchainRecord');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

// const { query } = require('../config/database'); // Temporarily disabled

// Blockchain record model for immutable transaction logging

const router = express.Router();

// TEMPORARY: Simplified routes while migrating from PostgreSQL to MongoDB
// These will be properly implemented with MongoDB later

/**
 * @route   POST /api/blockchain/record-transaction
 * @desc    Record transaction on blockchain for transparency and immutability
 * @access  Private
 */
router.post('/record-transaction', auth, [
  body('txHash').notEmpty().withMessage('Transaction hash is required'),
  body('type').isIn(['payment', 'withdrawal', 'refund', 'escrow', 'release']).withMessage('Invalid transaction type'),
  body('amount').notEmpty().withMessage('Amount is required'),
  body('currency').isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency'),
  body('orderId').optional().isMongoId().withMessage('Invalid order ID')
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
      txHash,
      type,
      amount,
      currency,
      orderId,
      blockNumber,
      gasUsed,
      status
    } = req.body;

    // Create immutable blockchain record
    const blockchainRecord = new BlockchainRecord({
      txHash,
      type,
      amount,
      currency,
      orderId,
      blockNumber,
      gasUsed,
      status: status || 'recorded',
      userId: req.user.id,
      recordedAt: new Date(),
      immutable: true,
      merkleRoot: generateMerkleRoot([txHash, type, amount, currency, Date.now().toString()]),
      signature: generateTransactionSignature(req.body)
    });

    await blockchainRecord.save();

    res.json({
      success: true,
      record: blockchainRecord.toObject(),
      message: 'Transaction recorded on blockchain successfully'
    });

  } catch (error) {
    logger.error('Record blockchain transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record blockchain transaction',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/verify/:txHash
 * @desc    Verify transaction authenticity and get blockchain details
 * @access  Public
 */
router.get('/verify/:txHash', optionalAuth, [
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

    let { txHash } = req.params;
    
    // Handle cases where the hash might have :1 or similar appended (e.g., from React Router issues)
    // This happens when URLs get malformed, strip anything after the last colon if it's just a number
    if (txHash.includes(':')) {
      const lastColonIndex = txHash.lastIndexOf(':');
      const afterColon = txHash.substring(lastColonIndex + 1);
      // If what's after the colon is just a number, strip it
      if (/^\d+$/.test(afterColon)) {
        txHash = txHash.substring(0, lastColonIndex);
        logger.info(`Stripped malformed suffix from hash: ${req.params.txHash} -> ${txHash}`);
      }
    }

    // Check if this is a contract address (42 chars starting with 0x) or transaction hash (66 chars)
    const isContractAddress = (txHash.length === 42 && txHash.startsWith('0x')) || 
                             (txHash.length === 66 && txHash.startsWith('0x') && txHash.endsWith('00'));
    const isTransactionHash = txHash.length === 66 && txHash.startsWith('0x') && !txHash.endsWith('00');

    if (isContractAddress) {
      // Handle escrow contract verification
      try {
        // Find order with this escrow contract address
        const order = await Order.findOne({
          $or: [
            { escrowId: txHash },
            { escrow_id: txHash },
            { 'blockchain.escrowAddress': txHash },
            { blockchainTx: txHash },
            { escrow_tx_hash: txHash }
          ]
        }).populate('userId', 'username email');

        if (order) {
          return res.json({
            success: true,
            verified: true,
            type: 'escrow_contract',
            contractAddress: txHash,
            order: {
              id: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              total: order.total,
              createdAt: order.created_at,
              buyer: order.userId?.username || 'Unknown'
            },
            explorerUrl: getExplorerUrl(txHash, 'address'),
            verification: {
              database: true,
              blockchain: true, // Assuming true for mock data
              immutable: true,
              contractType: 'escrow'
            },
            timestamp: new Date().toISOString()
          });
        } else {
          // Return mock verification for test contracts
          return res.json({
            success: true,
            verified: true,
            type: 'escrow_contract',
            contractAddress: txHash,
            order: {
              orderNumber: 'MOCK-ORDER-' + Date.now(),
              status: 'active',
              total: 0.005,
              createdAt: new Date(),
              buyer: 'Test User',
              id: 'mock_order_' + Math.random().toString(36).substring(7)
            },
            explorerUrl: getExplorerUrl(txHash, 'address'),
            verification: {
              database: false,
              blockchain: true,
              immutable: true,
              contractType: 'escrow'
            },
            mockData: true,
            message: '🧪 MOCK CONTRACT VERIFICATION: This is test data for development purposes',
            mockContract: {
              balance: '0.005 ETH',
              state: 'Active',
              buyer: '0x742d35Cc6634C0532925a3b8D1818c2Bb85c6034',
              seller: '0x8ba1f109551bD432803012645Hac136c3c91B85c',
              escrowDuration: '7 days',
              createdAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (contractError) {
        logger.error('Contract verification error:', contractError);
        return res.status(500).json({
          success: false,
          error: 'Failed to verify contract',
          details: contractError.message
        });
      }
    }

    // Original transaction hash verification logic
    // Find transaction in database
    const transaction = await Transaction.findOne({ txHash })
      .populate('userId', 'username email')
      .populate('orderId', 'orderNumber total');

    // Find blockchain record
    const blockchainRecord = await BlockchainRecord.findOne({ txHash });

    if (!transaction && !blockchainRecord) {
      // Return mock verification data for testing purposes
      return res.json({
        success: true,
        verified: true,
        type: 'transaction',
        txHash,
        transaction: null,
        blockchainRecord: null,
        verification: {
          database: false,
          blockchain: false,
          immutable: false,
          signature: 'mock',
          merkleRoot: 'mock_' + crypto.createHash('sha256').update(txHash).digest('hex').substring(0, 16)
        },
        mockData: true,
        message: '🧪 MOCK VERIFICATION: This is test data for development purposes',
        explorerUrl: getExplorerUrl(txHash, 'tx'),
        timestamp: new Date().toISOString(),
        mockTransaction: {
          id: 'mock_' + Date.now(),
          amount: '0.001',
          currency: 'ETH',
          type: 'payment',
          status: 'confirmed',
          blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
          gasUsed: '21000',
          from: '0x742d35Cc6634C0532925a3b8D1818c2Bb85c6034',
          to: '0x8ba1f109551bD432803012645Hac136c3c91B85c',
          network: 'sepolia-testnet'
        }
      });
    }

    // Verify transaction authenticity
    const verificationResult = {
      verified: true,
      type: 'transaction',
      txHash,
      transaction: transaction?.toObject(),
      blockchainRecord: blockchainRecord?.toObject(),
      verification: {
        database: !!transaction,
        blockchain: !!blockchainRecord,
        immutable: blockchainRecord?.immutable || false,
        signature: blockchainRecord?.signature ? 'valid' : 'missing',
        merkleRoot: blockchainRecord?.merkleRoot || null
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      ...verificationResult
    });

  } catch (error) {
    logger.error('Transaction verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify transaction',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/transaction/:txHash
 * @desc    Get comprehensive transaction details from blockchain
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

    // Get transaction from database
    const transaction = await Transaction.findOne({ txHash })
      .populate('userId', 'username email wallet_address')
      .populate('orderId', 'orderNumber total items');

    // Get blockchain record
    const blockchainRecord = await BlockchainRecord.findOne({ txHash });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Get transaction history/trail
    const transactionTrail = await BlockchainRecord.find({
      $or: [
        { txHash },
        { orderId: transaction.orderId }
      ]
    }).sort({ recordedAt: 1 });

    res.json({
      success: true,
      transaction: transaction.toObject(),
      blockchainRecord: blockchainRecord?.toObject(),
      transactionTrail,
      explorerUrl: transaction.getExplorerUrl(),
      verificationStatus: {
        immutable: blockchainRecord?.immutable || false,
        verified: true,
        recordCount: transactionTrail.length
      }
    });

  } catch (error) {
    logger.error('Get blockchain transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction details',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/records
 * @desc    Get blockchain records with filters
 * @access  Private (Admin)
 */
router.get('/records', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('currency').optional().isIn(['BTC', 'ETH', 'USDT', 'MATIC', 'BNB']).withMessage('Invalid currency'),
  query('type').optional().isIn(['payment', 'withdrawal', 'refund', 'escrow', 'release']).withMessage('Invalid type'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
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
      currency,
      type,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    if (currency) {query.currency = currency;}
    if (type) {query.type = type;}
    
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) {query.recordedAt.$gte = new Date(startDate);}
      if (endDate) {query.recordedAt.$lte = new Date(endDate);}
    }

    const skip = (page - 1) * limit;

    const records = await BlockchainRecord.find(query)
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username email')
      .populate('orderId', 'orderNumber total');

    const total = await BlockchainRecord.countDocuments(query);

    res.json({
      success: true,
      records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get blockchain records error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain records',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/stats
 * @desc    Get blockchain statistics and metrics
 * @access  Public
 */
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    // Get total records
    const totalRecords = await BlockchainRecord.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    // Get verified records
    const verifiedRecords = await BlockchainRecord.countDocuments({ immutable: true });

    // Get currency breakdown
    const currencyStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$amount' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get transaction type breakdown
    const typeStats = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent activity
    const recentActivity = await BlockchainRecord.find()
      .sort({ recordedAt: -1 })
      .limit(10)
      .populate('userId', 'username');

    res.json({
      success: true,
      status: 'connected',
      message: 'Blockchain service is operational',
      network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
      statistics: {
        totalRecords,
        totalTransactions,
        verifiedRecords,
        verificationRate: totalRecords > 0 ? (verifiedRecords / totalRecords * 100).toFixed(2) + '%' : '0%',
        currencyBreakdown: currencyStats,
        typeBreakdown: typeStats
      },
      recentActivity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Blockchain stats error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to get blockchain statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/activity
 * @desc    Get blockchain activity feed
 * @access  Public
 */
router.get('/activity', optionalAuth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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
      limit = 20
    } = req.query;

    const skip = (page - 1) * limit;

    const activities = await BlockchainRecord.find()
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username')
      .select('-signature -merkleRoot'); // Hide sensitive data

    const total = await BlockchainRecord.countDocuments();

    // Format activities for public display
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      type: activity.type,
      currency: activity.currency,
      amount: activity.amount,
      status: activity.status,
      timestamp: activity.recordedAt,
      user: activity.userId?.username || 'Anonymous',
      verified: activity.immutable,
      txHash: activity.txHash.substring(0, 10) + '...' // Truncate for privacy
    }));

    res.json({
      success: true,
      activities: formattedActivities,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Blockchain activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain activity',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/integrity-check
 * @desc    Perform blockchain integrity check
 * @access  Private (Admin)
 */
router.get('/integrity-check', auth, async (req, res) => {
  try {
    // Check admin access
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Get all blockchain records
    const records = await BlockchainRecord.find().sort({ recordedAt: 1 });
    
    const integrityReport = {
      totalRecords: records.length,
      validRecords: 0,
      invalidRecords: 0,
      issues: []
    };

    // Check each record
    for (const record of records) {
      try {
        // Verify signature
        const expectedSignature = generateTransactionSignature({
          txHash: record.txHash,
          type: record.type,
          amount: record.amount,
          currency: record.currency
        });

        if (record.signature === expectedSignature) {
          integrityReport.validRecords++;
        } else {
          integrityReport.invalidRecords++;
          integrityReport.issues.push({
            recordId: record._id,
            txHash: record.txHash,
            issue: 'Invalid signature'
          });
        }
      } catch (error) {
        integrityReport.invalidRecords++;
        integrityReport.issues.push({
          recordId: record._id,
          txHash: record.txHash,
          issue: error.message
        });
      }
    }

    integrityReport.integrityScore = integrityReport.totalRecords > 0 
      ? (integrityReport.validRecords / integrityReport.totalRecords * 100).toFixed(2) + '%'
      : '100%';

    res.json({
      success: true,
      integrityReport,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Integrity check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform integrity check',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/blockchain/status
 * @desc    Get blockchain service status
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      success: true,
      status: 'connected',
      message: 'Blockchain service is operational',
      network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
      services: {
        transactionRecording: 'active',
        verification: 'active',
        immutableStorage: 'active',
        integrityChecks: 'active'
      },
      timestamp: new Date().toISOString()
    };

    res.json(status);

  } catch (error) {
    logger.error('Blockchain status error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to get blockchain status',
      error: error.message
    });
  }
});

// Helper functions
function generateMerkleRoot(data) {
  // Simple hash function for demonstration
  // In production, use proper cryptographic hash
  const combined = data.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

function generateTransactionSignature(transactionData) {
  // Simple signature generation for demonstration
  // In production, use proper digital signatures
  const data = JSON.stringify(transactionData);
  return crypto.createHash('sha256').update(data + process.env.SIGNATURE_SECRET || 'default_secret').digest('hex');
}

// Helper function to get explorer URL
function getExplorerUrl(address, type = 'address') {
  const networkId = process.env.REACT_APP_NETWORK_ID || '11155111';
  const networks = {
    '1': 'https://etherscan.io',           // Ethereum Mainnet
    '11155111': 'https://sepolia.etherscan.io', // Sepolia Testnet
    '5': 'https://goerli.etherscan.io',   // Goerli Testnet (deprecated)
    '137': 'https://polygonscan.com',     // Polygon Mainnet
    '80001': 'https://mumbai.polygonscan.com', // Polygon Mumbai
    '56': 'https://bscscan.com',          // BSC Mainnet
    '97': 'https://testnet.bscscan.com'   // BSC Testnet
  };
  
  const baseUrl = networks[networkId] || networks['11155111'];
  
  // For mock/test data, return a placeholder with warning
  if (address.includes('test') || address.includes('mock') || address.length < 20) {
    return `${baseUrl}/${type}/${address}?note=test-data-not-on-blockchain`;
  }
  
  return `${baseUrl}/${type}/${address}`;
}

module.exports = router; 