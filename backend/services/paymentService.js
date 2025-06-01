const { ethers } = require('ethers');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const notificationService = require('./notificationService');

// Supported cryptocurrencies
const SUPPORTED_CURRENCIES = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    type: 'native',
    network: 'bitcoin'
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    network: 'ethereum'
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    type: 'erc20',
    network: 'ethereum',
    contractAddress: process.env.USDT_CONTRACT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  }
};

// Network configurations
const NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
    explorerUrl: 'https://etherscan.io'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com'
  },
  bsc: {
    chainId: 56,
    name: 'Binance Smart Chain',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com'
  }
};

class PaymentService {
  constructor() {
    this.providers = {};
    this.isInitialized = false;
    this.platformWallet = null;
    
    this.init();
  }

  async init() {
    try {
      // Initialize providers for different networks (ethers v6 syntax)
      for (const [networkName, config] of Object.entries(NETWORKS)) {
        this.providers[networkName] = new ethers.JsonRpcProvider(config.rpcUrl);
      }

      // Initialize platform wallet if private key is provided
      if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
        this.platformWallet = new ethers.Wallet(
          process.env.PLATFORM_WALLET_PRIVATE_KEY,
          this.providers.ethereum
        );
      }

      this.isInitialized = true;
      console.log('✅ Payment service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize payment service:', error);
    }
  }

  /**
   * Process cryptocurrency payment
   * @param {Object} paymentData - Payment information
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    const {
      orderId,
      amount,
      currency,
      fromAddress,
      toAddress,
      txHash,
      description,
      userId
    } = paymentData;

    try {
      // Validate currency
      if (!SUPPORTED_CURRENCIES[currency]) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      // Validate addresses
      if (!this.isValidAddress(fromAddress, currency) || !this.isValidAddress(toAddress, currency)) {
        throw new Error('Invalid wallet address');
      }

      // Create transaction record
      const transactionData = {
        orderId,
        txHash,
        fromAddress,
        toAddress,
        amount: amount.toString(),
        currency,
        description,
        status: 'pending',
        type: 'payment',
        userId,
        network: SUPPORTED_CURRENCIES[currency].network,
        timestamp: new Date(),
        gasUsed: null,
        blockNumber: null,
        confirmations: 0
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();

      // Send payment notification
      try {
        await notificationService.sendPaymentNotification(userId, 'payment_made', {
          amount,
          currency,
          recipient: toAddress,
          transactionId: transaction._id,
          txHash: txHash || 'pending',
          orderNumber: orderId ? (await Order.findById(orderId))?.orderNumber : null
        });
      } catch (notifError) {
        console.error('Failed to send payment notification:', notifError);
      }

      // If transaction hash is provided, start monitoring
      if (txHash && txHash !== 'pending') {
        this.monitorTransaction(transaction._id, txHash, currency);
      }

      // Update order with payment information
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          payment_method: 'cryptocurrency',
          payment_currency: currency,
          payment_tx_hash: txHash,
          payment_status: 'pending'
        });

        // Send order notification
        try {
          await notificationService.sendOrderNotification(userId, 'order_confirmed', {
            orderId,
            orderNumber: (await Order.findById(orderId))?.orderNumber,
            amount,
            currency
          });
        } catch (notifError) {
          console.error('Failed to send order notification:', notifError);
        }
      }

      return {
        success: true,
        transaction: transaction.toObject(),
        message: 'Payment processed successfully'
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor transaction confirmation
   * @param {string} transactionId - Internal transaction ID
   * @param {string} txHash - Blockchain transaction hash
   * @param {string} currency - Currency type
   */
  async monitorTransaction(transactionId, txHash, currency) {
    try {
      const network = SUPPORTED_CURRENCIES[currency].network;
      const provider = this.providers[network];

      if (!provider) {
        console.error(`No provider available for network: ${network}`);
        return;
      }

      // Wait for transaction receipt
      const receipt = await provider.waitForTransaction(txHash, 1);

      if (receipt) {
        // Update transaction status
        const updateData = {
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          confirmations: 1
        };

        await Transaction.findByIdAndUpdate(transactionId, updateData);

        // Get transaction details for notifications
        const transaction = await Transaction.findById(transactionId).populate('userId', 'username email');
        
        if (transaction) {
          // Send transaction confirmation notification
          try {
            const notificationType = receipt.status === 1 ? 'payment_received' : 'payment_failed';
            await notificationService.sendPaymentNotification(transaction.userId._id, notificationType, {
              amount: transaction.amount,
              currency: transaction.currency,
              txHash,
              blockNumber: receipt.blockNumber,
              sender: transaction.fromAddress,
              transactionId: transaction._id
            });
          } catch (notifError) {
            console.error('Failed to send transaction confirmation notification:', notifError);
          }

          // Update order status
          if (transaction.orderId) {
            const paymentStatus = receipt.status === 1 ? 'confirmed' : 'failed';
            await Order.findByIdAndUpdate(transaction.orderId, {
              payment_status: paymentStatus
            });

            // If payment confirmed, update order status
            if (paymentStatus === 'confirmed') {
              await Order.findByIdAndUpdate(transaction.orderId, {
                status: 'paid'
              });
            }
          }
        }

        // Record blockchain transaction
        await this.recordBlockchainTransaction({
          txHash,
          type: 'payment',
          amount: transaction.amount,
          currency: transaction.currency,
          orderId: transaction.orderId,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'success' : 'failed'
        });

        console.log(`✅ Transaction ${txHash} confirmed`);
      }

    } catch (error) {
      console.error(`❌ Transaction monitoring failed for ${txHash}:`, error);
      
      // Update transaction as failed
      await Transaction.findByIdAndUpdate(transactionId, {
        status: 'failed',
        errorMessage: error.message
      });

      // Send failure notification
      try {
        const transaction = await Transaction.findById(transactionId).populate('userId', 'username email');
        if (transaction) {
          await notificationService.sendPaymentNotification(transaction.userId._id, 'payment_failed', {
            amount: transaction.amount,
            currency: transaction.currency,
            txHash,
            error: error.message,
            transactionId: transaction._id
          });
        }
      } catch (notifError) {
        console.error('Failed to send payment failure notification:', notifError);
      }
    }
  }

  /**
   * Process withdrawal request
   * @param {Object} withdrawalData - Withdrawal information
   * @returns {Object} Withdrawal result
   */
  async processWithdrawal(withdrawalData) {
    const {
      userId,
      amount,
      currency,
      destinationAddress,
      description
    } = withdrawalData;

    try {
      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate currency and amount
      if (!SUPPORTED_CURRENCIES[currency]) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      if (parseFloat(amount) <= 0) {
        throw new Error('Invalid withdrawal amount');
      }

      // Validate destination address
      if (!this.isValidAddress(destinationAddress, currency)) {
        throw new Error('Invalid destination address');
      }

      // Check if platform has sufficient funds (mock check)
      const platformBalance = await this.getPlatformBalance(currency);
      if (parseFloat(platformBalance.balance) < parseFloat(amount)) {
        throw new Error('Insufficient platform funds');
      }

      // Create withdrawal transaction record
      const transactionData = {
        userId,
        fromAddress: this.platformWallet?.address || 'platform_wallet',
        toAddress: destinationAddress,
        amount: amount.toString(),
        currency,
        description: description || `Withdrawal to ${destinationAddress}`,
        status: 'pending',
        type: 'withdrawal',
        network: SUPPORTED_CURRENCIES[currency].network,
        timestamp: new Date()
      };

      const transaction = new Transaction(transactionData);
      await transaction.save();

      // Execute withdrawal (mock implementation)
      const withdrawalResult = await this.executeWithdrawal(transaction);

      // Send withdrawal notification
      try {
        await notificationService.sendPaymentNotification(userId, 'withdrawal_processed', {
          amount,
          currency,
          destinationAddress,
          transactionId: transaction._id,
          txHash: withdrawalResult.txHash
        });
      } catch (notifError) {
        console.error('Failed to send withdrawal notification:', notifError);
      }

      return {
        success: true,
        transaction: transaction.toObject(),
        txHash: withdrawalResult.txHash,
        message: 'Withdrawal processed successfully'
      };

    } catch (error) {
      console.error('Withdrawal processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute withdrawal transaction
   * @param {Object} transaction - Transaction object
   * @returns {Object} Execution result
   */
  async executeWithdrawal(transaction) {
    try {
      // Mock withdrawal execution
      // In a real implementation, this would:
      // 1. Create and sign the blockchain transaction
      // 2. Broadcast to the network
      // 3. Return the transaction hash

      const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');

      // Update transaction with hash
      await Transaction.findByIdAndUpdate(transaction._id, {
        txHash: mockTxHash,
        status: 'broadcasted'
      });

      // Start monitoring
      setTimeout(async () => {
        // Mock confirmation after 30 seconds
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'confirmed',
          blockNumber: Math.floor(Math.random() * 1000000),
          confirmations: 1
        });

        await this.recordBlockchainTransaction({
          txHash: mockTxHash,
          type: 'withdrawal',
          amount: transaction.amount,
          currency: transaction.currency,
          blockNumber: Math.floor(Math.random() * 1000000),
          status: 'success'
        });

        console.log(`✅ Withdrawal ${mockTxHash} confirmed`);
      }, 30000);

      return {
        success: true,
        txHash: mockTxHash
      };

    } catch (error) {
      console.error('Withdrawal execution error:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user or address
   * @param {string} identifier - User ID or wallet address
   * @param {Object} options - Query options
   * @returns {Object} Transaction history
   */
  async getTransactionHistory(identifier, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        currency,
        type,
        status
      } = options;

      const skip = (page - 1) * limit;
      const query = {};

      // Check if identifier is user ID or wallet address
      if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
        // MongoDB ObjectId
        query.userId = identifier;
      } else if (identifier.startsWith('0x')) {
        // Ethereum address
        query.$or = [
          { fromAddress: identifier },
          { toAddress: identifier }
        ];
      } else {
        // Bitcoin address or other
        query.$or = [
          { fromAddress: identifier },
          { toAddress: identifier }
        ];
      }

      // Add filters
      if (currency) {query.currency = currency;}
      if (type) {query.type = type;}
      if (status) {query.status = status;}

      const transactions = await Transaction.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')
        .populate('orderId', 'orderNumber total');

      const total = await Transaction.countDocuments(query);

      return {
        success: true,
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };

    } catch (error) {
      console.error('Get transaction history error:', error);
      return {
        success: false,
        error: error.message,
        transactions: []
      };
    }
  }

  /**
   * Get transaction details by hash
   * @param {string} txHash - Transaction hash
   * @returns {Object} Transaction details
   */
  async getTransactionByHash(txHash) {
    try {
      const transaction = await Transaction.findOne({ txHash })
        .populate('userId', 'username email')
        .populate('orderId', 'orderNumber total');

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      // Get blockchain information if available
      let blockchainInfo = null;
      if (transaction.network && this.providers[transaction.network]) {
        try {
          const receipt = await this.providers[transaction.network].getTransactionReceipt(txHash);
          if (receipt) {
            const currentBlock = await this.providers[transaction.network].getBlockNumber();
            blockchainInfo = {
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed.toString(),
              confirmations: currentBlock - receipt.blockNumber,
              status: receipt.status === 1 ? 'success' : 'failed'
            };
          }
        } catch (error) {
          console.warn('Failed to get blockchain info:', error.message);
        }
      }

      return {
        success: true,
        transaction: transaction.toObject(),
        blockchainInfo
      };

    } catch (error) {
      console.error('Get transaction by hash error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record blockchain transaction for transparency
   * @param {Object} transactionData - Transaction data to record
   */
  async recordBlockchainTransaction(transactionData) {
    try {
      // Create immutable record for transparency
      const blockchainRecord = {
        txHash: transactionData.txHash,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        orderId: transactionData.orderId,
        blockNumber: transactionData.blockNumber,
        gasUsed: transactionData.gasUsed,
        status: transactionData.status,
        timestamp: new Date(),
        recordedAt: new Date(),
        immutable: true
      };

      // Save to blockchain records collection (for transparency)
      // This would typically be stored in a separate immutable collection
      console.log('📝 Recording blockchain transaction:', blockchainRecord);

      // In a real implementation, this could also:
      // 1. Store in IPFS for immutability
      // 2. Create merkle tree proof
      // 3. Anchor to Bitcoin blockchain
      // 4. Store in distributed ledger

      return blockchainRecord;

    } catch (error) {
      console.error('Failed to record blockchain transaction:', error);
    }
  }

  /**
   * Get platform balance for a currency
   * @param {string} currency - Currency symbol
   * @returns {Object} Balance information
   */
  async getPlatformBalance(currency) {
    try {
      if (!this.isInitialized) {
        throw new Error('Payment service not initialized');
      }

      const currencyConfig = SUPPORTED_CURRENCIES[currency];
      if (!currencyConfig) {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      if (!this.platformWallet) {
        throw new Error('Platform wallet not configured');
      }

      const provider = this.providers[currencyConfig.network];
      const balance = await provider.getBalance(this.platformWallet.address);

      return {
        success: true,
        currency,
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance)
      };
    } catch (error) {
      console.error('Get platform balance error:', error);
      return {
        success: false,
        error: error.message,
        balance: '0'
      };
    }
  }

  /**
   * Get payment statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Payment statistics
   */
  async getPaymentStats(filters = {}) {
    try {
      const { startDate, endDate, currency } = filters;

      const matchStage = { type: 'payment' };

      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) {matchStage.timestamp.$gte = new Date(startDate);}
        if (endDate) {matchStage.timestamp.$lte = new Date(endDate);}
      }

      if (currency) {
        matchStage.currency = currency;
      }

      const stats = await Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              currency: '$currency',
              status: '$status'
            },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.currency',
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

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('Get payment stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format amount with proper decimals
   * @param {string|number} amount - Raw amount
   * @param {string} currency - Currency symbol
   * @returns {string} Formatted amount
   */
  formatAmount(amount, currency) {
    const currencyConfig = SUPPORTED_CURRENCIES[currency];
    if (!currencyConfig) {return amount.toString();}

    if (currencyConfig.type === 'native' && currency === 'ETH') {
      return ethers.formatUnits(amount, currencyConfig.decimals);
    }

    return ethers.formatUnits(amount, currencyConfig.decimals);
  }

  /**
   * Validate crypto wallet address
   * @param {string} address - Wallet address
   * @param {string} currency - Currency type
   * @returns {boolean} Is valid address
   */
  isValidAddress(address, currency) {
    try {
      const currencyConfig = SUPPORTED_CURRENCIES[currency];
      if (!currencyConfig) {return false;}

      // For Ethereum-based currencies, use ethers address validation
      if (currencyConfig.network === 'ethereum') {
        return ethers.isAddress(address);
      }

      // For Bitcoin, implement basic validation (simplified)
      if (currency === 'BTC') {
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address);
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported currencies
   * @returns {Object} Supported currencies
   */
  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Get network configurations
   * @returns {Object} Network configurations
   */
  getNetworks() {
    return NETWORKS;
  }
}

// Create singleton instance
const paymentService = new PaymentService();

module.exports = paymentService; 