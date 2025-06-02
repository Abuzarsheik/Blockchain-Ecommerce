import { logger } from './logger';
import { apiEndpoints } from '../services/api';

class AuditLogger {
  static instance = null;

  constructor() {
    if (AuditLogger.instance) {
      return AuditLogger.instance;
    }
    AuditLogger.instance = this;
    this.isEnabled = true;
    this.queue = [];
    this.flushInterval = 5000; // 5 seconds
    this.startAutoFlush();
  }

  static getInstance() {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // Log user actions
  logUserAction(action, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      action,
      severity: this.determineSeverity(action),
      description: this.generateDescription(action, details),
      resource: details.resource || null,
      resourceId: details.resourceId || null,
      method: details.method || null,
      metadata: details.metadata || {},
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: null, // Will be determined server-side
      changes: details.changes || null
    };

    this.queue.push({ type: 'user_action', data: logEntry });

    // Flush immediately for critical actions
    if (logEntry.severity === 'critical' || logEntry.severity === 'high') {
      this.flush();
    }
  }

  // Log system events
  logSystemEvent(event, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      event,
      severity: details.severity || 'medium',
      description: details.description || event,
      component: details.component || 'system',
      metadata: details.metadata || {},
      timestamp: new Date().toISOString()
    };

    this.queue.push({ type: 'system_event', data: logEntry });
  }

  // Log security events
  logSecurityEvent(event, details = {}) {
    if (!this.isEnabled) return;

    const logEntry = {
      event,
      severity: details.severity || 'high',
      description: details.description || event,
      sourceIp: details.sourceIp || null,
      userAgent: navigator.userAgent,
      location: details.location || null,
      metadata: details.metadata || {},
      timestamp: new Date().toISOString(),
      status: details.status || 'detected'
    };

    this.queue.push({ type: 'security_event', data: logEntry });

    // Immediately flush security events
    this.flush();
  }

  // Determine severity based on action type
  determineSeverity(action) {
    const criticalActions = [
      'password_change',
      'email_change',
      'kyc_approval',
      'kyc_rejection',
      'admin_action',
      'system_configuration',
      'smart_contract_deployment',
      'dispute_resolved',
      'security_breach_attempt'
    ];

    const highActions = [
      'user_login',
      'user_logout',
      'profile_update',
      'kyc_submission',
      'order_creation',
      'payment_processed',
      'dispute_created',
      'smart_contract_interaction'
    ];

    const mediumActions = [
      'order_cancellation',
      'payment_failed'
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  }

  // Generate human-readable descriptions
  generateDescription(action, details) {
    const descriptions = {
      user_login: `User logged in successfully`,
      user_logout: `User logged out`,
      profile_update: `User updated their profile`,
      password_change: `User changed their password`,
      email_change: `User changed their email address`,
      kyc_submission: `User submitted KYC documentation`,
      kyc_approval: `KYC documentation approved for user`,
      kyc_rejection: `KYC documentation rejected for user`,
      order_creation: `User created a new order`,
      order_cancellation: `User cancelled an order`,
      payment_processed: `Payment processed successfully`,
      payment_failed: `Payment processing failed`,
      dispute_created: `User created a new dispute`,
      dispute_resolved: `Dispute was resolved`,
      admin_action: `Administrator performed an action`,
      system_configuration: `System configuration was modified`,
      smart_contract_deployment: `Smart contract was deployed`,
      smart_contract_interaction: `User interacted with smart contract`,
      security_breach_attempt: `Security breach attempt detected`,
      suspicious_activity: `Suspicious activity detected`
    };

    let description = descriptions[action] || `User performed action: ${action}`;

    // Add context if available
    if (details.resource && details.resourceId) {
      description += ` on ${details.resource} (ID: ${details.resourceId})`;
    } else if (details.resource) {
      description += ` on ${details.resource}`;
    }

    return description;
  }

  // Flush queued logs to server
  async flush() {
    if (this.queue.length === 0) return;

    const logsToSend = [...this.queue];
    this.queue = [];

    try {
      // Group logs by type and send them
      const userActions = logsToSend.filter(log => log.type === 'user_action').map(log => log.data);
      const systemEvents = logsToSend.filter(log => log.type === 'system_event').map(log => log.data);
      const securityEvents = logsToSend.filter(log => log.type === 'security_event').map(log => log.data);

      const promises = [];

      if (userActions.length > 0) {
        promises.push(
          Promise.all(userActions.map(action => 
            apiEndpoints.logUserAction(action).catch(err => 
              logger.error('Failed to log user action:', err)
            )
          ))
        );
      }

      if (systemEvents.length > 0) {
        promises.push(
          Promise.all(systemEvents.map(event => 
            apiEndpoints.logSystemEvent(event).catch(err => 
              logger.error('Failed to log system event:', err)
            )
          ))
        );
      }

      if (securityEvents.length > 0) {
        promises.push(
          Promise.all(securityEvents.map(event => 
            apiEndpoints.logSecurityEvent(event).catch(err => 
              logger.error('Failed to log security event:', err)
            )
          ))
        );
      }

      await Promise.all(promises);
    } catch (error) {
      logger.error('Failed to flush audit logs:', error);
      // Re-add failed logs to queue for retry
      this.queue.unshift(...logsToSend);
    }
  }

  // Start automatic flushing
  startAutoFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // Enable/disable logging
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Get pending logs count
  getPendingCount() {
    return this.queue.length;
  }

  // Clear all pending logs
  clearQueue() {
    this.queue = [];
  }
}

// Convenience methods for easy access
export const auditLogger = AuditLogger.getInstance();

export const logUserAction = (action, details) => {
  auditLogger.logUserAction(action, details);
};

export const logSystemEvent = (event, details) => {
  auditLogger.logSystemEvent(event, details);
};

export const logSecurityEvent = (event, details) => {
  auditLogger.logSecurityEvent(event, details);
};

// Higher-level convenience functions for common actions
export const logLogin = (userId, method = 'password') => {
  logUserAction('user_login', {
    resource: 'auth',
    metadata: { method, userId }
  });
};

export const logLogout = (userId) => {
  logUserAction('user_logout', {
    resource: 'auth',
    metadata: { userId }
  });
};

export const logProfileUpdate = (userId, changes) => {
  logUserAction('profile_update', {
    resource: 'user',
    resourceId: userId,
    changes,
    metadata: { changedFields: Object.keys(changes) }
  });
};

export const logOrderCreation = (orderId, userId, orderData) => {
  logUserAction('order_creation', {
    resource: 'order',
    resourceId: orderId,
    metadata: { 
      userId, 
      amount: orderData.total,
      itemCount: orderData.items?.length 
    }
  });
};

export const logPaymentProcessed = (paymentId, orderId, amount) => {
  logUserAction('payment_processed', {
    resource: 'payment',
    resourceId: paymentId,
    metadata: { orderId, amount }
  });
};

export const logDisputeCreated = (disputeId, userId, orderData) => {
  logUserAction('dispute_created', {
    resource: 'dispute',
    resourceId: disputeId,
    metadata: { 
      userId, 
      orderId: orderData.orderId,
      category: orderData.category 
    }
  });
};

export const logKycSubmission = (userId, documentTypes) => {
  logUserAction('kyc_submission', {
    resource: 'kyc',
    resourceId: userId,
    metadata: { documentTypes }
  });
};

export const logAdminAction = (adminId, action, targetResource, targetId) => {
  logUserAction('admin_action', {
    resource: targetResource,
    resourceId: targetId,
    metadata: { 
      adminId, 
      adminAction: action,
      severity: 'critical'
    }
  });
};

export const logSecurityBreach = (details) => {
  logSecurityEvent('security_breach_attempt', {
    severity: 'critical',
    description: details.description || 'Security breach attempt detected',
    ...details
  });
};

export const logSuspiciousActivity = (details) => {
  logSecurityEvent('suspicious_activity', {
    severity: 'high',
    description: details.description || 'Suspicious activity detected',
    ...details
  });
};

export default AuditLogger; 