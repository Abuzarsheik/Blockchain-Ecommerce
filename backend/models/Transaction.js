const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Transaction identifiers
  txHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows null/undefined values
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Transaction details
  type: {
    type: String,
    enum: ['payment', 'withdrawal', 'refund', 'escrow', 'release'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'broadcasted', 'confirmed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Amount and currency
  amount: {
    type: String, // Store as string to preserve precision
    required: true
  },
  currency: {
    type: String,
    enum: ['BTC', 'ETH', 'USDT', 'MATIC', 'BNB'],
    required: true,
    index: true
  },
  network: {
    type: String,
    enum: ['bitcoin', 'ethereum', 'polygon', 'bsc'],
    required: true
  },

  // Addresses
  fromAddress: {
    type: String,
    required: true,
    index: true
  },
  toAddress: {
    type: String,
    required: true,
    index: true
  },

  // Blockchain information
  blockNumber: {
    type: Number,
    required: false
  },
  gasUsed: {
    type: String,
    required: false
  },
  gasPrice: {
    type: String,
    required: false
  },
  confirmations: {
    type: Number,
    default: 0
  },

  // Transaction metadata
  description: {
    type: String,
    required: false
  },
  fee: {
    type: String,
    required: false
  },
  exchangeRate: {
    type: Number,
    required: false
  },
  usdValue: {
    type: Number,
    required: false
  },

  // Error handling
  errorMessage: {
    type: String,
    required: false
  },
  retryCount: {
    type: Number,
    default: 0
  },

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  confirmedAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ txHash: 1 }, { unique: true, sparse: true });
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ fromAddress: 1, timestamp: -1 });
transactionSchema.index({ toAddress: 1, timestamp: -1 });
transactionSchema.index({ currency: 1, timestamp: -1 });
transactionSchema.index({ status: 1, timestamp: -1 });
transactionSchema.index({ type: 1, status: 1 });

// Pre-save middleware to update timestamps
transactionSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  if (this.status === 'confirmed' && !this.confirmedAt) {
    this.confirmedAt = new Date();
  }
  
  next();
});

// Static methods
transactionSchema.statics.findByHash = function(txHash) {
  return this.findOne({ txHash });
};

transactionSchema.statics.findByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    currency
  } = options;

  let query = { userId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (currency) query.currency = currency;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('orderId', 'orderNumber total')
    .populate('userId', 'username email');
};

transactionSchema.statics.findByAddress = function(address, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    currency
  } = options;

  let query = {
    $or: [
      { fromAddress: address },
      { toAddress: address }
    ]
  };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (currency) query.currency = currency;

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('orderId', 'orderNumber total')
    .populate('userId', 'username email');
};

transactionSchema.statics.getStats = function(filters = {}) {
  const { startDate, endDate, currency, type } = filters;
  
  let matchStage = {};
  
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }
  
  if (currency) matchStage.currency = currency;
  if (type) matchStage.type = type;

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          currency: '$currency',
          status: '$status',
          type: '$type'
        },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        count: { $sum: 1 },
        avgAmount: { $avg: { $toDouble: '$amount' } }
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
            count: '$count',
            avgAmount: '$avgAmount'
          }
        },
        totalAmount: { $sum: '$totalAmount' },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { '_id.currency': 1, '_id.type': 1 }
    }
  ]);
};

// Instance methods
transactionSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  this.updatedAt = new Date();
  
  if (status === 'confirmed') {
    this.confirmedAt = new Date();
  }
  
  // Update additional blockchain data
  if (additionalData.blockNumber) this.blockNumber = additionalData.blockNumber;
  if (additionalData.gasUsed) this.gasUsed = additionalData.gasUsed;
  if (additionalData.gasPrice) this.gasPrice = additionalData.gasPrice;
  if (additionalData.confirmations) this.confirmations = additionalData.confirmations;
  
  return this.save();
};

transactionSchema.methods.addError = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.retryCount += 1;
  this.updatedAt = new Date();
  
  return this.save();
};

transactionSchema.methods.getExplorerUrl = function() {
  if (!this.txHash) return null;
  
  const explorerUrls = {
    ethereum: 'https://etherscan.io/tx/',
    polygon: 'https://polygonscan.com/tx/',
    bsc: 'https://bscscan.com/tx/',
    bitcoin: 'https://blockstream.info/tx/'
  };
  
  const baseUrl = explorerUrls[this.network];
  return baseUrl ? `${baseUrl}${this.txHash}` : null;
};

transactionSchema.methods.getFormattedAmount = function() {
  const decimals = {
    BTC: 8,
    ETH: 4,
    USDT: 2,
    MATIC: 4,
    BNB: 4
  };
  
  const decimal = decimals[this.currency] || 4;
  const amount = parseFloat(this.amount);
  
  return isNaN(amount) ? '0' : amount.toFixed(decimal);
};

transactionSchema.methods.isConfirmed = function() {
  return this.status === 'confirmed' && this.confirmations > 0;
};

transactionSchema.methods.isPending = function() {
  return ['pending', 'broadcasted'].includes(this.status);
};

transactionSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

// Virtual for displaying transaction direction
transactionSchema.virtual('direction').get(function() {
  if (this.type === 'payment') return 'outgoing';
  if (this.type === 'withdrawal') return 'outgoing';
  if (this.type === 'refund') return 'incoming';
  return 'unknown';
});

// Virtual for calculating transaction age
transactionSchema.virtual('age').get(function() {
  const now = new Date();
  const created = new Date(this.timestamp);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
});

// Virtual for status badge color
transactionSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'orange',
    broadcasted: 'blue',
    confirmed: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  
  return colors[this.status] || 'gray';
});

module.exports = mongoose.model('Transaction', transactionSchema); 