/**
 * Simple logger utility for frontend logging
 */

// Enhanced Logger with Audit Capabilities
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.auditQueue = [];
    this.flushInterval = 5000;
    this.startAutoFlush();
  }

  // Standard logging methods
  info(message, ...args) {
    if (this.isDevelopment) {
      console.log(`[${new Date().toISOString()}] [INFO]`, message, ...args);
    }
  }

  warn(message, ...args) {
    console.warn(`[${new Date().toISOString()}] [WARN]`, message, ...args);
  }

  error(message, ...args) {
    console.error(`[${new Date().toISOString()}] [ERROR]`, message, ...args);
  }

  debug(message, ...args) {
    if (this.isDevelopment) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, message, ...args);
    }
  }

  // Audit logging methods
  logUserAction(action, details = {}) {
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
      changes: details.changes || null
    };

    this.auditQueue.push({ type: 'user_action', data: logEntry });

    // Flush immediately for critical actions
    if (logEntry.severity === 'critical' || logEntry.severity === 'high') {
      this.flush();
    }
  }

  logSecurityEvent(event, details = {}) {
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

    this.auditQueue.push({ type: 'security_event', data: logEntry });
    this.flush(); // Immediately flush security events
  }

  determineSeverity(action) {
    const criticalActions = [
      'password_change', 'email_change', 'kyc_approval', 'kyc_rejection',
      'admin_action', 'system_configuration', 'smart_contract_deployment',
      'dispute_resolved', 'security_breach_attempt'
    ];

    const highActions = [
      'user_login', 'user_logout', 'profile_update', 'kyc_submission',
      'order_creation', 'payment_processed', 'dispute_created',
      'smart_contract_interaction'
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    return 'medium';
  }

  generateDescription(action, details) {
    const descriptions = {
      user_login: 'User logged in successfully',
      user_logout: 'User logged out',
      profile_update: 'User updated their profile',
      password_change: 'User changed their password',
      order_creation: 'User created a new order',
      payment_processed: 'Payment processed successfully',
      dispute_created: 'User created a new dispute'
    };

    let description = descriptions[action] || `User performed action: ${action}`;

    if (details.resource && details.resourceId) {
      description += ` on ${details.resource} (ID: ${details.resourceId})`;
    }

    return description;
  }

  async flush() {
    if (this.auditQueue.length === 0) return;

    const logsToSend = [...this.auditQueue];
    this.auditQueue = [];

    try {
      // In a real implementation, send to audit endpoint
      if (this.isDevelopment) {
        console.log('Audit logs:', logsToSend);
      }
    } catch (error) {
      this.error('Failed to flush audit logs:', error);
    }
  }

  startAutoFlush() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
}

// Create singleton instance
const logger = new Logger();

// Export convenience functions
export { logger };
export const logUserAction = (action, details) => logger.logUserAction(action, details);
export const logSecurityEvent = (event, details) => logger.logSecurityEvent(event, details); 