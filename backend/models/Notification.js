const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // User and targeting
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['user', 'admin', 'seller', 'buyer'],
    default: 'user',
    index: true
  },

  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      // Transaction alerts
      'payment_made',
      'payment_received',
      'escrow_activated',
      'escrow_released',
      'product_delivered',
      'order_confirmed',
      'withdrawal_processed',
      'refund_issued',
      
      // Security alerts
      'login_new_device',
      'password_changed',
      'email_changed',
      'two_factor_enabled',
      'account_locked',
      'suspicious_activity',
      
      // System notifications
      'system_maintenance',
      'feature_update',
      'policy_update',
      'promotional',
      
      // Order notifications
      'order_placed',
      'order_shipped',
      'order_cancelled',
      'dispute_opened',
      'dispute_resolved'
    ],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['transaction', 'security', 'system', 'order', 'promotional'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },

  // Status and interaction
  status: {
    type: String,
    enum: ['pending', 'delivered', 'read', 'archived', 'failed'],
    default: 'pending',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    required: false
  },

  // Related entities
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['order', 'transaction', 'payment', 'user', 'product', 'escrow'],
      required: false
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    }
  },

  // Delivery channels
  channels: {
    inApp: {
      enabled: { type: Boolean, default: true },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date }
    },
    email: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      emailAddress: { type: String }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      phoneNumber: { type: String }
    },
    push: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date }
    }
  },

  // Additional data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Action buttons/links
  actions: [{
    label: { type: String, required: true },
    type: { type: String, enum: ['link', 'button', 'dismiss'], required: true },
    url: { type: String },
    action: { type: String },
    style: { type: String, enum: ['primary', 'secondary', 'danger', 'success'], default: 'primary' }
  }],

  // Scheduling
  scheduledFor: {
    type: Date,
    required: false,
    index: true
  },
  expiresAt: {
    type: Date,
    required: false,
    index: true
  },

  // Metadata
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    location: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, isRead: 1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  next();
});

// Static methods
notificationSchema.statics.findByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    category,
    type,
    isRead,
    priority
  } = options;

  let query = { userId };
  
  if (category) query.category = category;
  if (type) query.type = type;
  if (typeof isRead === 'boolean') query.isRead = isRead;
  if (priority) query.priority = priority;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date(),
      status: 'read'
    }
  );
};

notificationSchema.statics.getStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: {
          category: '$category',
          isRead: '$isRead'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        total: { $sum: '$count' },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$_id.isRead', false] }, '$count', 0]
          }
        },
        read: {
          $sum: {
            $cond: [{ $eq: ['$_id.isRead', true] }, '$count', 0]
          }
        }
      }
    }
  ]);
};

notificationSchema.statics.deleteOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
    category: { $ne: 'security' } // Keep security notifications longer
  });
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  return this.save();
};

notificationSchema.methods.markAsDelivered = function(channel) {
  if (this.channels[channel]) {
    this.channels[channel].delivered = true;
    this.channels[channel].deliveredAt = new Date();
    
    // Update overall status if all enabled channels are delivered
    const enabledChannels = Object.keys(this.channels).filter(
      ch => this.channels[ch].enabled
    );
    const deliveredChannels = enabledChannels.filter(
      ch => this.channels[ch].delivered
    );
    
    if (enabledChannels.length === deliveredChannels.length) {
      this.status = 'delivered';
    }
  }
  
  return this.save();
};

notificationSchema.methods.addAction = function(action) {
  this.actions.push(action);
  return this.save();
};

notificationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

notificationSchema.methods.isPending = function() {
  return this.status === 'pending' && 
         (!this.scheduledFor || new Date() >= this.scheduledFor);
};

notificationSchema.methods.getIcon = function() {
  const icons = {
    // Transaction icons
    payment_made: '💳',
    payment_received: '💰',
    escrow_activated: '🔒',
    escrow_released: '🔓',
    product_delivered: '📦',
    order_confirmed: '✅',
    withdrawal_processed: '💸',
    refund_issued: '↩️',
    
    // Security icons
    login_new_device: '🔐',
    password_changed: '🔑',
    email_changed: '📧',
    two_factor_enabled: '🛡️',
    account_locked: '🚫',
    suspicious_activity: '⚠️',
    
    // System icons
    system_maintenance: '🔧',
    feature_update: '🆕',
    policy_update: '📋',
    promotional: '🎉',
    
    // Order icons
    order_placed: '🛒',
    order_shipped: '🚚',
    order_cancelled: '❌',
    dispute_opened: '⚖️',
    dispute_resolved: '✅'
  };
  
  return icons[this.type] || '📢';
};

notificationSchema.methods.getColor = function() {
  const colors = {
    low: '#6B7280',      // Gray
    medium: '#3B82F6',   // Blue  
    high: '#F59E0B',     // Yellow
    urgent: '#EF4444'    // Red
  };
  
  return colors[this.priority] || colors.medium;
};

notificationSchema.methods.getTimeAgo = function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return created.toLocaleDateString();
};

// Virtual for formatted message
notificationSchema.virtual('formattedMessage').get(function() {
  // Replace placeholders in message with actual data
  let message = this.message;
  
  if (this.data) {
    Object.keys(this.data).forEach(key => {
      const placeholder = `{{${key}}}`;
      if (message.includes(placeholder)) {
        message = message.replace(new RegExp(placeholder, 'g'), this.data[key]);
      }
    });
  }
  
  return message;
});

// Virtual for display summary
notificationSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    title: this.title,
    message: this.formattedMessage,
    type: this.type,
    category: this.category,
    priority: this.priority,
    isRead: this.isRead,
    icon: this.getIcon(),
    color: this.getColor(),
    timeAgo: this.getTimeAgo(),
    actions: this.actions
  };
});

module.exports = mongoose.model('Notification', notificationSchema); 