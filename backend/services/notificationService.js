const Notification = require('../models/Notification');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Mock email service (replace with actual email service like SendGrid, Nodemailer, etc.)
const emailService = {
  async send(to, subject, message, data = {}) {
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return { success: true, messageId: 'mock_' + Date.now() };
  }
};

// Mock SMS service (replace with actual SMS service like Twilio, etc.)
const smsService = {
  async send(to, message) {
    console.log(`📱 SMS sent to ${to}: ${message}`);
    return { success: true, messageId: 'mock_' + Date.now() };
  }
};

class NotificationService {
  constructor() {
    this.templates = this.initializeTemplates();
    this.listeners = new Map(); // For real-time notifications
  }

  /**
   * Initialize notification templates
   */
  initializeTemplates() {
    return {
      // Transaction alert templates
      payment_made: {
        title: 'Payment Sent Successfully',
        message: 'You have successfully sent {{amount}} {{currency}} to {{recipient}}.',
        category: 'transaction',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      payment_received: {
        title: 'Payment Received',
        message: 'You have received {{amount}} {{currency}} from {{sender}}.',
        category: 'transaction',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      escrow_activated: {
        title: 'Escrow Activated',
        message: 'Escrow has been activated for order #{{orderNumber}}. Funds are now secured.',
        category: 'transaction',
        priority: 'high',
        channels: { inApp: true, email: true }
      },
      escrow_released: {
        title: 'Escrow Released',
        message: 'Escrow funds have been released for order #{{orderNumber}}. Transaction completed.',
        category: 'transaction',
        priority: 'high',
        channels: { inApp: true, email: true }
      },
      product_delivered: {
        title: 'Product Delivered',
        message: 'Your order #{{orderNumber}} has been marked as delivered. Please confirm receipt.',
        category: 'transaction',
        priority: 'high',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Confirm Delivery', type: 'button', action: 'confirm_delivery', style: 'primary' },
          { label: 'Report Issue', type: 'button', action: 'report_issue', style: 'secondary' }
        ]
      },
      order_confirmed: {
        title: 'Order Confirmed',
        message: 'Your order #{{orderNumber}} has been confirmed and is being processed.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      withdrawal_processed: {
        title: 'Withdrawal Processed',
        message: 'Your withdrawal of {{amount}} {{currency}} has been processed successfully.',
        category: 'transaction',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      refund_issued: {
        title: 'Refund Issued',
        message: 'A refund of {{amount}} {{currency}} has been issued for order #{{orderNumber}}.',
        category: 'transaction',
        priority: 'high',
        channels: { inApp: true, email: true }
      },

      // Security alert templates
      login_new_device: {
        title: 'New Device Login',
        message: 'Your account was accessed from a new device: {{deviceType}} from {{location}}.',
        category: 'security',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'This was me', type: 'button', action: 'confirm_login', style: 'primary' },
          { label: 'Secure my account', type: 'button', action: 'secure_account', style: 'danger' }
        ]
      },
      password_changed: {
        title: 'Password Changed',
        message: 'Your account password has been changed successfully.',
        category: 'security',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true }
      },
      email_changed: {
        title: 'Email Address Changed',
        message: 'Your email address has been updated to {{newEmail}}.',
        category: 'security',
        priority: 'high',
        channels: { inApp: true, email: true }
      },
      two_factor_enabled: {
        title: 'Two-Factor Authentication Enabled',
        message: 'Two-factor authentication has been enabled for your account.',
        category: 'security',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      account_locked: {
        title: 'Account Temporarily Locked',
        message: 'Your account has been temporarily locked due to suspicious activity.',
        category: 'security',
        priority: 'urgent',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Contact Support', type: 'link', url: '/support', style: 'primary' },
          { label: 'Reset Password', type: 'button', action: 'reset_password', style: 'secondary' }
        ]
      },
      suspicious_activity: {
        title: 'Suspicious Activity Detected',
        message: 'We detected unusual activity on your account. Please review recent transactions.',
        category: 'security',
        priority: 'urgent',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Review Activity', type: 'link', url: '/account/activity', style: 'primary' },
          { label: 'Secure Account', type: 'button', action: 'secure_account', style: 'danger' }
        ]
      },

      // Order notifications
      order_placed: {
        title: 'Order Placed Successfully',
        message: 'Your order #{{orderNumber}} has been placed successfully.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      order_shipped: {
        title: 'Order Shipped',
        message: 'Your order #{{orderNumber}} has been shipped. Tracking: {{trackingNumber}}',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true, sms: true }
      },
      order_cancelled: {
        title: 'Order Cancelled',
        message: 'Your order #{{orderNumber}} has been cancelled. Refund will be processed shortly.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true }
      },

      // Enhanced tracking and delivery notifications
      package_picked_up: {
        title: 'Package Picked Up',
        message: '📦 Your package for order #{{orderNumber}} has been picked up by {{carrier}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' }
        ]
      },
      package_in_transit: {
        title: 'Package In Transit',
        message: '🚚 Your package is on its way! Current location: {{location}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' }
        ]
      },
      package_out_for_delivery: {
        title: 'Out for Delivery',
        message: '🚛 Your package is out for delivery! Expected delivery today.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Track Live', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' },
          { label: 'Update Address', type: 'button', action: 'update_delivery_address', style: 'secondary' }
        ]
      },
      package_delivered: {
        title: 'Package Delivered! 📦',
        message: '✅ Your order #{{orderNumber}} has been delivered to {{deliveryLocation}}.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Confirm Receipt', type: 'button', action: 'confirm_delivery', style: 'primary' },
          { label: 'Report Issue', type: 'button', action: 'report_delivery_issue', style: 'secondary' },
          { label: 'Leave Review', type: 'link', url: '/reviews/create/{{orderNumber}}', style: 'tertiary' }
        ]
      },
      delivery_attempted: {
        title: 'Delivery Attempted',
        message: '❗ Delivery was attempted but not completed. Package will be redelivered.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Reschedule Delivery', type: 'button', action: 'reschedule_delivery', style: 'primary' },
          { label: 'Update Address', type: 'button', action: 'update_delivery_address', style: 'secondary' },
          { label: 'Pick Up at Hub', type: 'button', action: 'pickup_at_hub', style: 'tertiary' }
        ]
      },
      package_delivery_exception: {
        title: 'Delivery Exception',
        message: '⚠️ There was an issue with your delivery: {{exceptionReason}}',
        category: 'order',
        priority: 'urgent',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Contact Carrier', type: 'button', action: 'contact_carrier', style: 'primary' },
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'secondary' },
          { label: 'Contact Support', type: 'link', url: '/support', style: 'tertiary' }
        ]
      },
      delivery_rescheduled: {
        title: 'Delivery Rescheduled',
        message: '📅 Your delivery has been rescheduled to {{newDeliveryDate}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' }
        ]
      },
      package_delayed: {
        title: 'Package Delayed',
        message: '⏰ Your package delivery is delayed. New estimated delivery: {{newEstimatedDelivery}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' },
          { label: 'Contact Support', type: 'link', url: '/support', style: 'secondary' }
        ]
      },
      tracking_number_assigned: {
        title: 'Tracking Number Available',
        message: 'Your order #{{orderNumber}} now has tracking number {{trackingNumber}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' }
        ]
      },
      delivery_window_update: {
        title: 'Delivery Window Updated',
        message: '📅 Your delivery window has been updated: {{deliveryWindow}}.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'View Details', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'primary' }
        ]
      },
      package_returned: {
        title: 'Package Returned',
        message: '↩️ Your package has been returned to sender. Reason: {{returnReason}}',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Contact Support', type: 'link', url: '/support', style: 'primary' },
          { label: 'Reorder', type: 'button', action: 'reorder', style: 'secondary' }
        ]
      },
      delivery_instructions_updated: {
        title: 'Delivery Instructions Updated',
        message: '📝 Your delivery instructions have been updated successfully.',
        category: 'order',
        priority: 'low',
        channels: { inApp: true, email: true }
      },
      package_held_at_facility: {
        title: 'Package Held at Facility',
        message: '🏢 Your package is being held at {{facilityName}}. Please pick up within {{holdDays}} days.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'Get Directions', type: 'button', action: 'get_facility_directions', style: 'primary' },
          { label: 'Schedule Pickup', type: 'button', action: 'schedule_pickup', style: 'secondary' }
        ]
      },
      delivery_signature_required: {
        title: 'Signature Required for Delivery',
        message: '✍️ A signature will be required for delivery of your package.',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Authorize Release', type: 'button', action: 'authorize_release', style: 'primary' },
          { label: 'Reschedule', type: 'button', action: 'reschedule_delivery', style: 'secondary' }
        ]
      },

      // Enhanced seller notifications for tracking
      order_ready_to_ship: {
        title: 'Order Ready to Ship',
        message: 'Order #{{orderNumber}} is ready to ship. Please create shipping label.',
        category: 'order',
        priority: 'high',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Create Label', type: 'button', action: 'create_shipping_label', style: 'primary' },
          { label: 'View Order', type: 'link', url: '/orders/{{orderNumber}}', style: 'secondary' }
        ]
      },
      shipping_label_created: {
        title: 'Shipping Label Created',
        message: 'Shipping label created for order #{{orderNumber}}. Tracking: {{trackingNumber}}',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Download Label', type: 'button', action: 'download_label', style: 'primary' },
          { label: 'Track Package', type: 'link', url: '/tracking/{{trackingNumber}}', style: 'secondary' }
        ]
      },
      delivery_confirmed: {
        title: 'Delivery Confirmed by Customer',
        message: '✅ Customer confirmed delivery of order #{{orderNumber}}. {{customerFeedback}}',
        category: 'order',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'View Feedback', type: 'link', url: '/orders/{{orderNumber}}', style: 'primary' }
        ]
      },

      // Review and rating notifications
      review_received: {
        title: 'New Review Received',
        message: 'You received a {{rating}}-star review for {{productName}}.',
        category: 'review',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'View Review', type: 'link', url: '{{actionUrl}}', style: 'primary' },
          { label: 'Respond to Review', type: 'button', action: 'respond_review', style: 'secondary' }
        ]
      },
      positive_review: {
        title: 'Positive Review Received!',
        message: '🌟 {{customerName}} left you a {{rating}}-star review for {{productName}}!',
        category: 'review',
        priority: 'low',
        channels: { inApp: true, email: true }
      },
      seller_response: {
        title: 'Seller Responded to Your Review',
        message: '{{sellerName}} responded to your review: "{{responseContent|truncate:100}}"',
        category: 'review',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'View Response', type: 'link', url: '{{actionUrl}}', style: 'primary' }
        ]
      },
      review_reminder: {
        title: 'Review Your Recent Purchase',
        message: 'How was your experience with {{productName}}? Share your feedback to help other customers.',
        category: 'review',
        priority: 'low',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Write Review', type: 'link', url: '/reviews', style: 'primary' },
          { label: 'Skip', type: 'button', action: 'dismiss', style: 'secondary' }
        ]
      },
      review_helpful: {
        title: 'Your Review Was Helpful!',
        message: 'Other customers found your review of {{productName}} helpful.',
        category: 'review',
        priority: 'low',
        channels: { inApp: true }
      },

      // Dispute notifications
      dispute_created: {
        title: 'Dispute Created',
        message: 'Your dispute for order #{{orderNumber}} has been created and is under review.',
        category: 'dispute',
        priority: 'high',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'View Dispute', type: 'link', url: '/disputes/{{disputeId}}', style: 'primary' },
          { label: 'Add Evidence', type: 'button', action: 'add_evidence', style: 'secondary' }
        ]
      },
      dispute_received: {
        title: 'Dispute Filed Against Your Order',
        message: 'A dispute has been filed for order #{{orderNumber}}. Please respond with evidence.',
        category: 'dispute',
        priority: 'urgent',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'View Dispute', type: 'link', url: '/disputes/{{disputeId}}', style: 'primary' },
          { label: 'Respond Now', type: 'button', action: 'respond_dispute', style: 'danger' }
        ]
      },
      dispute_evidence_requested: {
        title: 'Additional Evidence Requested',
        message: 'Additional evidence is needed for your dispute. Please submit within 7 days.',
        category: 'dispute',
        priority: 'high',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'Submit Evidence', type: 'link', url: '/disputes/{{disputeId}}/evidence', style: 'primary' }
        ]
      },
      dispute_escalated: {
        title: 'Dispute Escalated for Review',
        message: 'Your dispute has been escalated to admin review for manual assessment.',
        category: 'dispute',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      dispute_admin_assigned: {
        title: 'Admin Assigned to Your Dispute',
        message: 'An admin has been assigned to review your dispute. You will receive updates soon.',
        category: 'dispute',
        priority: 'medium',
        channels: { inApp: true, email: true }
      },
      dispute_resolved: {
        title: 'Dispute Resolved',
        message: 'Your dispute for order #{{orderNumber}} has been resolved. {{resolution}}',
        category: 'dispute',
        priority: 'high',
        channels: { inApp: true, email: true, sms: true },
        actions: [
          { label: 'View Resolution', type: 'link', url: '/disputes/{{disputeId}}', style: 'primary' },
          { label: 'Appeal Decision', type: 'button', action: 'appeal_dispute', style: 'secondary' }
        ]
      },
      dispute_message_received: {
        title: 'New Message in Dispute',
        message: 'You have received a new message regarding your dispute for order #{{orderNumber}}.',
        category: 'dispute',
        priority: 'medium',
        channels: { inApp: true, email: true },
        actions: [
          { label: 'View Message', type: 'link', url: '/disputes/{{disputeId}}', style: 'primary' },
          { label: 'Reply', type: 'button', action: 'reply_dispute', style: 'secondary' }
        ]
      }
    };
  }

  /**
   * Create a notification
   * @param {Object} notificationData - Notification data
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        type,
        data = {},
        customTitle,
        customMessage,
        priority,
        channels,
        relatedEntity,
        scheduledFor,
        expiresAt
      } = notificationData;

      // Get template or use custom data
      const template = this.templates[type];
      if (!template && !customTitle) {
        throw new Error(`No template found for notification type: ${type}`);
      }

      // Create notification object
      const notificationObj = {
        userId,
        type,
        title: customTitle || template.title,
        message: customMessage || template.message,
        category: template?.category || 'system',
        priority: priority || template?.priority || 'medium',
        data,
        relatedEntity,
        scheduledFor,
        expiresAt,
        channels: {
          inApp: {
            enabled: channels?.inApp !== false && (template?.channels?.inApp || false),
            delivered: false
          },
          email: {
            enabled: channels?.email !== false && (template?.channels?.email || false),
            delivered: false
          },
          sms: {
            enabled: channels?.sms !== false && (template?.channels?.sms || false),
            delivered: false
          },
          push: {
            enabled: channels?.push !== false && (template?.channels?.push || false),
            delivered: false
          }
        },
        actions: template?.actions || []
      };

      const notification = new Notification(notificationObj);
      await notification.save();

      // Deliver notification immediately if not scheduled
      if (!scheduledFor || new Date() >= scheduledFor) {
        await this.deliverNotification(notification._id);
      }

      return notification;

    } catch (error) {
      logger.error('❌ Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Deliver notification through enabled channels
   * @param {string} notificationId - Notification ID
   */
  async deliverNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId)
        .populate('userId', 'email phone_number notification_preferences');

      if (!notification) {
        throw new Error('Notification not found');
      }

      const user = notification.userId;
      const deliveryPromises = [];

      // In-app notification (always delivered immediately)
      if (notification.channels.inApp.enabled) {
        deliveryPromises.push(this.deliverInApp(notification));
      }

      // Email notification
      if (notification.channels.email.enabled && user.email) {
        deliveryPromises.push(this.deliverEmail(notification, user));
      }

      // SMS notification
      if (notification.channels.sms.enabled && user.phone_number) {
        deliveryPromises.push(this.deliverSMS(notification, user));
      }

      // Push notification
      if (notification.channels.push.enabled) {
        deliveryPromises.push(this.deliverPush(notification, user));
      }

      await Promise.allSettled(deliveryPromises);
      
      return notification;

    } catch (error) {
      logger.error('❌ Failed to deliver notification:', error);
      throw error;
    }
  }

  /**
   * Deliver in-app notification
   * @param {Object} notification - Notification object
   */
  async deliverInApp(notification) {
    try {
      // Mark as delivered
      await notification.markAsDelivered('inApp');

      // Emit real-time notification if user is connected
      this.emitRealTimeNotification(notification.userId._id, notification.summary);

      console.log(`📱 In-app notification delivered to user ${notification.userId._id}`);
      return { success: true, channel: 'inApp' };

    } catch (error) {
      logger.error('❌ In-app notification delivery failed:', error);
      return { success: false, channel: 'inApp', error: error.message };
    }
  }

  /**
   * Deliver email notification with race condition protection
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   */
  async deliverEmail(notification, user) {
    try {
      const message = this.formatEmailMessage(notification);

      const result = await emailService.sendEmail(
        user.email,
        notification.title,
        message,
        notification.data
      );

      if (result.success) {
        // Use atomic update to prevent race condition
        await Notification.updateOne(
          { _id: notification._id },
          { 
            $set: {
              'channels.email.delivered': true,
              'channels.email.deliveredAt': new Date(),
              'channels.email.emailAddress': user.email
            }
          }
        );
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`📧 Email notification delivered to ${user.email}`);
        }
      }

      return { success: result.success, channel: 'email', messageId: result.messageId };

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error('❌ Email notification delivery failed:', error);
      }
      return { success: false, channel: 'email', error: error.message };
    }
  }

  /**
   * Deliver SMS notification
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   */
  async deliverSMS(notification, user) {
    try {
      const message = this.formatSMSMessage(notification);

      const result = await smsService.send(user.phone_number, message);

      if (result.success) {
        notification.channels.sms.phoneNumber = user.phone_number;
        await notification.markAsDelivered('sms');
        console.log(`📱 SMS notification delivered to ${user.phone_number}`);
      }

      return { success: result.success, channel: 'sms', messageId: result.messageId };

    } catch (error) {
      logger.error('❌ SMS notification delivery failed:', error);
      return { success: false, channel: 'sms', error: error.message };
    }
  }

  /**
   * Deliver push notification
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   */
  async deliverPush(notification, user) {
    try {
      // Mock push notification delivery
      // In a real implementation, this would use Firebase Cloud Messaging, 
      // Apple Push Notification Service, etc.
      
      await notification.markAsDelivered('push');
      console.log(`🔔 Push notification delivered to user ${user._id}`);

      return { success: true, channel: 'push' };

    } catch (error) {
      logger.error('❌ Push notification delivery failed:', error);
      return { success: false, channel: 'push', error: error.message };
    }
  }

  /**
   * Format email message
   * @param {Object} notification - Notification object
   */
  formatEmailMessage(notification) {
    let message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin: 0 0 16px 0;">
            ${notification.getIcon()} ${notification.title}
          </h2>
          <p style="color: #666; line-height: 1.5; margin: 0 0 20px 0;">
            ${notification.formattedMessage}
          </p>
    `;

    // Add action buttons if any
    if (notification.actions && notification.actions.length > 0) {
      message += '<div style="margin: 20px 0;">';
      notification.actions.forEach(action => {
        const buttonStyle = this.getEmailButtonStyle(action.style);
        if (action.type === 'link' && action.url) {
          message += `<a href="${action.url}" style="${buttonStyle}">${action.label}</a> `;
        } else {
          message += `<button style="${buttonStyle}">${action.label}</button> `;
        }
      });
      message += '</div>';
    }

    message += `
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This notification was sent from Blocmerce. 
            <a href="/unsubscribe" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `;

    return message;
  }

  /**
   * Format SMS message
   * @param {Object} notification - Notification object
   */
  formatSMSMessage(notification) {
    return `${notification.title}: ${notification.formattedMessage}`;
  }

  /**
   * Get email button style
   * @param {string} style - Button style
   */
  getEmailButtonStyle(style) {
    const styles = {
      primary: 'background: #007bff; color: white;',
      secondary: 'background: #6c757d; color: white;',
      success: 'background: #28a745; color: white;',
      danger: 'background: #dc3545; color: white;'
    };

    const baseStyle = 'padding: 10px 20px; border: none; border-radius: 4px; text-decoration: none; display: inline-block; margin: 0 5px 5px 0;';
    return baseStyle + (styles[style] || styles.primary);
  }

  /**
   * Emit real-time notification to connected users
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   */
  emitRealTimeNotification(userId, notification) {
    try {
      // If using Socket.io for real-time notifications
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification', notification);
      }

      // Store for potential websocket connection
      const userListeners = this.listeners.get(userId) || [];
      userListeners.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          logger.error('❌ Real-time notification callback error:', error);
        }
      });

    } catch (error) {
      logger.error('❌ Real-time notification emission failed:', error);
    }
  }

  /**
   * Subscribe to real-time notifications
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   */
  subscribe(userId, callback) {
    const userListeners = this.listeners.get(userId) || [];
    userListeners.push(callback);
    this.listeners.set(userId, userListeners);
  }

  /**
   * Unsubscribe from real-time notifications
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   */
  unsubscribe(userId, callback) {
    const userListeners = this.listeners.get(userId) || [];
    const filteredListeners = userListeners.filter(cb => cb !== callback);
    this.listeners.set(userId, filteredListeners);
  }

  // Convenience methods for specific notification types

  /**
   * Send payment notification
   */
  async sendPaymentNotification(userId, type, data) {
    return this.createNotification({
      userId,
      type,
      data,
      relatedEntity: {
        entityType: 'transaction',
        entityId: data.transactionId
      }
    });
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(userId, type, data, deviceInfo = {}) {
    return this.createNotification({
      userId,
      type,
      data,
      priority: 'high',
      deviceInfo
    });
  }

  /**
   * Send order notification
   */
  async sendOrderNotification(userId, type, data) {
    return this.createNotification({
      userId,
      type,
      data,
      relatedEntity: {
        entityType: 'order',
        entityId: data.orderId
      }
    });
  }

  /**
   * Process scheduled notifications
   */
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const scheduledNotifications = await Notification.find({
        status: 'pending',
        scheduledFor: { $lte: now }
      });

      for (const notification of scheduledNotifications) {
        await this.deliverNotification(notification._id);
      }

      console.log(`📅 Processed ${scheduledNotifications.length} scheduled notifications`);
      return scheduledNotifications.length;

    } catch (error) {
      logger.error('❌ Failed to process scheduled notifications:', error);
      return 0;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const result = await Notification.deleteOldNotifications(daysOld);
      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;

    } catch (error) {
      logger.error('❌ Failed to cleanup old notifications:', error);
      return 0;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService; 