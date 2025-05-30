const mongoose = require('mongoose');

const blockchainRecordSchema = new mongoose.Schema({
  // Transaction identifiers
  txHash: {
    type: String,
    required: true,
    unique: true,
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
    enum: ['recorded', 'verified', 'confirmed', 'failed'],
    default: 'recorded',
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
    required: false
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

  // Immutability and verification
  immutable: {
    type: Boolean,
    default: true,
    required: true
  },
  merkleRoot: {
    type: String,
    required: true,
    index: true
  },
  signature: {
    type: String,
    required: true
  },
  
  // Audit trail
  recordedAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  },
  recordedBy: {
    type: String,
    default: 'system',
    immutable: true
  },
  
  // Metadata for transparency
  metadata: {
    platform: {
      type: String,
      default: 'Blocmerce',
      immutable: true
    },
    version: {
      type: String,
      default: '1.0.0',
      immutable: true
    },
    networkFee: {
      type: String,
      required: false
    },
    exchangeRate: {
      type: Number,
      required: false
    },
    ipfsHash: {
      type: String,
      required: false
    }
  },

  // Verification chain
  verificationChain: [{
    verifier: {
      type: String,
      required: true
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    verificationHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    }
  }]
}, {
  // Disable versioning to maintain immutability
  versionKey: false,
  // Make the entire document immutable after creation
  strict: true,
  collection: 'blockchain_records',
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// Compound indexes for better query performance
blockchainRecordSchema.index({ txHash: 1, recordedAt: -1 });
blockchainRecordSchema.index({ userId: 1, recordedAt: -1 });
blockchainRecordSchema.index({ orderId: 1, recordedAt: -1 });
blockchainRecordSchema.index({ currency: 1, type: 1, recordedAt: -1 });
blockchainRecordSchema.index({ immutable: 1, status: 1 });
blockchainRecordSchema.index({ merkleRoot: 1 }, { unique: true });

// Pre-save middleware to ensure immutability
blockchainRecordSchema.pre('save', function(next) {
  // If this is not a new document, prevent modifications
  if (!this.isNew) {
    const error = new Error('Blockchain records are immutable and cannot be modified');
    error.code = 'IMMUTABLE_RECORD';
    return next(error);
  }
  
  // Set metadata if not provided
  if (!this.metadata.platform) {
    this.metadata.platform = 'Blocmerce';
  }
  
  if (!this.metadata.version) {
    this.metadata.version = '1.0.0';
  }
  
  next();
});

// Pre-update middleware to prevent updates
blockchainRecordSchema.pre(['update', 'updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  const error = new Error('Blockchain records are immutable and cannot be updated');
  error.code = 'IMMUTABLE_RECORD';
  next(error);
});

// Pre-remove middleware to prevent deletion
blockchainRecordSchema.pre(['remove', 'deleteOne', 'deleteMany'], function(next) {
  const error = new Error('Blockchain records are immutable and cannot be deleted');
  error.code = 'IMMUTABLE_RECORD';
  next(error);
});

// Static methods
blockchainRecordSchema.statics.findByHash = function(txHash) {
  return this.findOne({ txHash });
};

blockchainRecordSchema.statics.findByUser = function(userId, options = {}) {
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
    .sort({ recordedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('orderId', 'orderNumber total')
    .populate('userId', 'username email');
};

blockchainRecordSchema.statics.findByOrder = function(orderId) {
  return this.find({ orderId }).sort({ recordedAt: 1 });
};

blockchainRecordSchema.statics.getVerificationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

blockchainRecordSchema.statics.getCurrencyStats = function(filters = {}) {
  const { startDate, endDate } = filters;
  
  let matchStage = {};
  
  if (startDate || endDate) {
    matchStage.recordedAt = {};
    if (startDate) matchStage.recordedAt.$gte = new Date(startDate);
    if (endDate) matchStage.recordedAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          currency: '$currency',
          type: '$type'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: { $toDouble: '$amount' } },
        avgAmount: { $avg: { $toDouble: '$amount' } }
      }
    },
    {
      $group: {
        _id: '$_id.currency',
        typeBreakdown: {
          $push: {
            type: '$_id.type',
            count: '$count',
            totalAmount: '$totalAmount',
            avgAmount: '$avgAmount'
          }
        },
        totalTransactions: { $sum: '$count' },
        totalVolume: { $sum: '$totalAmount' }
      }
    },
    {
      $sort: { totalVolume: -1 }
    }
  ]);
};

blockchainRecordSchema.statics.verifyIntegrity = async function() {
  const records = await this.find().sort({ recordedAt: 1 });
  
  let integrityReport = {
    totalRecords: records.length,
    validRecords: 0,
    invalidRecords: 0,
    issues: []
  };

  for (const record of records) {
    try {
      // Verify merkle root
      const expectedMerkleRoot = this.generateMerkleRoot([
        record.txHash,
        record.type,
        record.amount,
        record.currency,
        record.recordedAt.getTime().toString()
      ]);

      if (record.merkleRoot === expectedMerkleRoot) {
        integrityReport.validRecords++;
      } else {
        integrityReport.invalidRecords++;
        integrityReport.issues.push({
          recordId: record._id,
          txHash: record.txHash,
          issue: 'Invalid merkle root'
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

  return integrityReport;
};

blockchainRecordSchema.statics.generateMerkleRoot = function(data) {
  const crypto = require('crypto');
  const combined = data.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
};

// Instance methods
blockchainRecordSchema.methods.addVerification = function(verifierData) {
  // Create verification entry
  const verification = {
    verifier: verifierData.verifier,
    verifiedAt: new Date(),
    verificationHash: this.generateVerificationHash(verifierData),
    status: 'verified'
  };

  this.verificationChain.push(verification);
  return this.save();
};

blockchainRecordSchema.methods.generateVerificationHash = function(verifierData) {
  const crypto = require('crypto');
  const data = {
    txHash: this.txHash,
    verifier: verifierData.verifier,
    timestamp: Date.now()
  };
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

blockchainRecordSchema.methods.getExplorerUrl = function() {
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

blockchainRecordSchema.methods.getFormattedAmount = function() {
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

blockchainRecordSchema.methods.isVerified = function() {
  return this.verificationChain.length > 0 && 
         this.verificationChain.some(v => v.status === 'verified');
};

blockchainRecordSchema.methods.getVerificationLevel = function() {
  const verifiedCount = this.verificationChain.filter(v => v.status === 'verified').length;
  
  if (verifiedCount === 0) return 'unverified';
  if (verifiedCount === 1) return 'basic';
  if (verifiedCount >= 2) return 'enhanced';
  
  return 'unknown';
};

// Virtual for record age
blockchainRecordSchema.virtual('age').get(function() {
  const now = new Date();
  const recorded = new Date(this.recordedAt);
  const diffMs = now - recorded;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${diffDays} days ago`;
});

// Virtual for verification status
blockchainRecordSchema.virtual('verificationStatus').get(function() {
  const level = this.getVerificationLevel();
  const colors = {
    unverified: 'red',
    basic: 'orange', 
    enhanced: 'green'
  };
  
  return {
    level,
    color: colors[level] || 'gray',
    verificationCount: this.verificationChain.filter(v => v.status === 'verified').length
  };
});

// Virtual for transaction summary
blockchainRecordSchema.virtual('summary').get(function() {
  return {
    hash: this.txHash.substring(0, 10) + '...',
    type: this.type,
    amount: this.getFormattedAmount(),
    currency: this.currency,
    status: this.status,
    verified: this.isVerified(),
    age: this.age
  };
});

module.exports = mongoose.model('BlockchainRecord', blockchainRecordSchema); 