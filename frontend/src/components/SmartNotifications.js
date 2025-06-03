import '../styles/theme.css';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { 
  Bell, 
  X, 
  Star, 
  ShoppingCart, 
  DollarSign, 
  User, 
  Shield,
  Heart,
  Check,
  Settings,
  Filter
} from 'lucide-react';
import { logger } from '../utils/logger';
import { getWebSocketUrl } from '../config/api';

// Notification types configuration - moved outside component to prevent re-renders
const notificationTypes = {
  bid: {
    icon: <DollarSign size={16} />,
    color: 'blue',
    title: 'New Bid'
  },
  sale: {
    icon: <ShoppingCart size={16} />,
    color: 'green',
    title: 'Sale Completed'
  },
  follow: {
    icon: <User size={16} />,
    color: 'purple',
    title: 'New Follower'
  },
  like: {
    icon: <Heart size={16} />,
    color: 'red',
    title: 'Product Liked'
  },
  system: {
    icon: <Shield size={16} />,
    color: 'gray',
    title: 'System Update'
  },
  feature: {
    icon: <Star size={16} />,
    color: 'yellow',
    title: 'Featured'
  }
};

// Mock data for development
const mockNotifications = [
  {
    id: 1,
    type: 'bid',
    title: 'New offer on your product',
    message: 'Someone made an offer of $199.99 on "Wireless Gaming Headset"',
    timestamp: new Date(Date.now() - 300000),
    read: false,
    priority: 'high'
  },
  {
    id: 2,
    type: 'sale',
    title: 'Product sold successfully',
    message: '"Vintage Leather Wallet" has been sold for $75.99',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
    priority: 'high'
  },
  {
    id: 3,
    type: 'follow',
    title: 'New follower',
    message: 'ElectronicsStore started following you',
    timestamp: new Date(Date.now() - 7200000),
    read: true,
    priority: 'low'
  }
];

const SmartNotifications = ({ isOpen, onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const notificationRef = useRef(null);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || mockNotifications);
      }
    } catch (error) {
      logger.error('Failed to fetch notifications:', error);
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (userId && isOpen) {
      // Connect to WebSocket for real-time notifications
      const ws = new WebSocket(getWebSocketUrl(`/notifications/${userId}`));
      
      ws.onopen = () => {
        setIsConnected(true);
        logger.info('WebSocket connected for notifications');
      };
      
      ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        setNotifications(prev => [notification, ...prev]);
        
        // Show toast for important notifications
        if (notification.priority === 'high') {
          toast.success(notification.message, {
            icon: notificationTypes[notification.type]?.icon
          });
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        logger.info('WebSocket disconnected');
      };
      
      ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      wsRef.current = ws;
      
      return () => {
        ws.close();
      };
    }
  }, [userId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(prev =>
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      logger.error('Failed to delete notification:', error);
    }
  }, []);

  // Filter notifications with memoization for performance
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      if (filter === 'unread') return !notif.read;
      if (filter === 'all') return true;
      return notif.type === filter;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="notification-backdrop" onClick={onClose} />
      
      {/* Notification Panel */}
      <div className="notification-panel" ref={notificationRef}>
        <div className="notification-header">
          <div className="header-title">
            <Bell size={20} />
            <h2>Notifications</h2>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          
          <div className="header-actions">
            <button onClick={markAllAsRead} className="mark-all-read-btn">
              <Check size={16} />
              Mark all read
            </button>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="notification-filters">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
            <option value="bid">Bids</option>
            <option value="sale">Sales</option>
            <option value="follow">Follows</option>
            <option value="system">System</option>
          </select>

          <button className="preferences-btn">
            <Settings size={16} />
            Preferences
          </button>
        </div>

        <div className="notification-list">
          {loading ? (
            <NotificationSkeleton />
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                type={notificationTypes[notification.type]}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          ) : (
            <div className="empty-notifications">
              <Bell size={48} className="empty-icon" />
              <h3>No notifications</h3>
              <p>You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="notification-footer">
          <button className="footer-btn">
            <Settings size={16} />
            Manage Preferences
          </button>
          <button className="footer-btn">
            <Filter size={16} />
            Advanced Filters
          </button>
        </div>
      </div>

      <style jsx>{`
        .notification-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: var(--z-modal-backdrop);
        }

        .notification-panel {
          position: fixed;
          top: 70px;
          right: var(--space-4);
          width: 400px;
          max-height: 600px;
          background: white;
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--gray-200);
          z-index: var(--z-modal);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .notification-header {
          padding: var(--space-4);
          border-bottom: 1px solid var(--gray-200);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--gray-50);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .header-title h2 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .unread-badge {
          background: var(--danger-500);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: var(--border-radius-full);
          min-width: 18px;
          text-align: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .mark-all-read-btn {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          background: var(--primary-100);
          color: var(--primary-700);
          border: none;
          border-radius: var(--border-radius-lg);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mark-all-read-btn:hover {
          background: var(--primary-200);
        }

        .close-btn {
          padding: var(--space-2);
          background: transparent;
          border: none;
          color: var(--gray-500);
          cursor: pointer;
          border-radius: var(--border-radius-lg);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--gray-200);
          color: var(--gray-700);
        }

        .notification-filters {
          padding: var(--space-3) var(--space-4);
          border-bottom: 1px solid var(--gray-200);
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .filter-select {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          background: white;
          font-size: 0.875rem;
        }

        .preferences-btn {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          background: transparent;
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          color: var(--gray-600);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
        }

        .preferences-btn:hover {
          background: var(--gray-50);
          border-color: var(--gray-400);
        }

        .notification-list {
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
        }

        .empty-notifications {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          text-align: center;
        }

        .empty-icon {
          color: var(--gray-300);
          margin-bottom: var(--space-4);
        }

        .empty-notifications h3 {
          margin: 0 0 var(--space-2) 0;
          color: var(--gray-600);
        }

        .empty-notifications p {
          margin: 0;
          color: var(--gray-500);
          font-size: 0.875rem;
        }

        .notification-footer {
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--gray-200);
          display: flex;
          gap: var(--space-2);
          background: var(--gray-50);
        }

        .footer-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          background: transparent;
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          color: var(--gray-600);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all var(--transition-fast);
        }

        .footer-btn:hover {
          background: white;
          border-color: var(--primary-300);
          color: var(--primary-600);
        }

        @media (max-width: 640px) {
          .notification-panel {
            top: 0;
            right: 0;
            left: 0;
            width: auto;
            max-height: 100vh;
            border-radius: 0;
          }

          .notification-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .footer-btn {
            font-size: 0.8rem;
            padding: var(--space-2);
          }
        }
      `}</style>
    </>
  );
};

// Individual notification item component
const NotificationItem = ({ notification, type, onMarkRead, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`notification-icon ${type?.color}`}>
        {type?.icon}
      </div>
      
      <div className="notification-content">
        <div className="notification-title">
          {notification.title}
          {!notification.read && <span className="unread-dot" />}
        </div>
        <div className="notification-message">
          {notification.message}
        </div>
        <div className="notification-time">
          {formatTime(notification.timestamp)}
        </div>
      </div>

      {showActions && (
        <div className="notification-actions">
          {!notification.read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="action-btn read-btn"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="action-btn delete-btn"
            title="Delete"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <style jsx>{`
        .notification-item {
          display: flex;
          padding: var(--space-4);
          border-bottom: 1px solid var(--gray-100);
          transition: all var(--transition-fast);
          position: relative;
        }

        .notification-item:hover {
          background: var(--gray-50);
        }

        .notification-item.unread {
          background: var(--primary-50);
        }

        .notification-item.unread:hover {
          background: var(--primary-100);
        }

        .notification-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--border-radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: var(--space-3);
          flex-shrink: 0;
        }

        .notification-icon.blue {
          background: var(--primary-100);
          color: var(--primary-600);
        }

        .notification-icon.green {
          background: var(--success-50);
          color: var(--success-600);
        }

        .notification-icon.purple {
          background: rgba(139, 92, 246, 0.2);
          color: #8b5cf6;
        }

        .notification-icon.red {
          background: var(--danger-50);
          color: var(--danger-600);
        }

        .notification-icon.gray {
          background: var(--gray-100);
          color: var(--gray-600);
        }

        .notification-icon.yellow {
          background: var(--warning-50);
          color: var(--warning-600);
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--space-1);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .unread-dot {
          width: 6px;
          height: 6px;
          background: var(--primary-500);
          border-radius: var(--border-radius-full);
          flex-shrink: 0;
        }

        .notification-message {
          color: var(--gray-600);
          font-size: 0.875rem;
          line-height: 1.4;
          margin-bottom: var(--space-2);
        }

        .notification-time {
          color: var(--gray-400);
          font-size: 0.75rem;
        }

        .notification-actions {
          display: flex;
          gap: var(--space-1);
          align-items: flex-start;
        }

        .action-btn {
          padding: var(--space-1);
          background: transparent;
          border: none;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .read-btn {
          color: var(--success-600);
        }

        .read-btn:hover {
          background: var(--success-100);
        }

        .delete-btn {
          color: var(--gray-400);
        }

        .delete-btn:hover {
          background: var(--danger-100);
          color: var(--danger-600);
        }
      `}</style>
    </div>
  );
};

// Loading skeleton for notifications
const NotificationSkeleton = () => {
  return (
    <div className="notification-skeleton">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="skeleton-item">
          <div className="skeleton-icon loading-skeleton" />
          <div className="skeleton-content">
            <div className="skeleton-title loading-skeleton" />
            <div className="skeleton-message loading-skeleton" />
            <div className="skeleton-time loading-skeleton" />
          </div>
        </div>
      ))}

      <style jsx>{`
        .notification-skeleton {
          padding: var(--space-4);
        }

        .skeleton-item {
          display: flex;
          margin-bottom: var(--space-4);
        }

        .skeleton-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--border-radius-full);
          margin-right: var(--space-3);
        }

        .skeleton-content {
          flex: 1;
        }

        .skeleton-title {
          height: 16px;
          margin-bottom: var(--space-2);
          border-radius: var(--border-radius-sm);
        }

        .skeleton-message {
          height: 14px;
          width: 80%;
          margin-bottom: var(--space-2);
          border-radius: var(--border-radius-sm);
        }

        .skeleton-time {
          height: 12px;
          width: 60px;
          border-radius: var(--border-radius-sm);
        }
      `}</style>
    </div>
  );
};

export default SmartNotifications; 
