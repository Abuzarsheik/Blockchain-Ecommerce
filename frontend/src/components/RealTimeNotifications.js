import './RealTimeNotifications.css';
import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, Check, Info, ShoppingCart, Heart, Users, TrendingUp, Star } from 'lucide-react';

const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  ERROR: 'error',
  SALE: 'sale',
  LIKE: 'like',
  FOLLOW: 'follow',
  PRICE_ALERT: 'price_alert',
  NEW_PRODUCT: 'new_product'
};

const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.SUCCESS]: Check,
  [NOTIFICATION_TYPES.WARNING]: Info,
  [NOTIFICATION_TYPES.INFO]: Info,
  [NOTIFICATION_TYPES.ERROR]: Info,
  [NOTIFICATION_TYPES.SALE]: ShoppingCart,
  [NOTIFICATION_TYPES.LIKE]: Heart,
  [NOTIFICATION_TYPES.FOLLOW]: Users,
  [NOTIFICATION_TYPES.PRICE_ALERT]: TrendingUp,
  [NOTIFICATION_TYPES.NEW_PRODUCT]: Star
};

const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    desktopEnabled: true,
    emailEnabled: false
  });

  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Play sound effect
    if (settings.soundEnabled) {
      // Sound implementation would go here
    }

    // Vibration effect
    if (settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Desktop notification
    if (settings.desktopEnabled && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }

    // Auto-remove after 10 seconds for non-priority notifications
    if (notification.priority !== 'high') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 10000);
    }
  }, [settings]);

  const simulateRealTimeNotifications = useCallback(() => {
    // Mock real-time notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of notification
        addNotification(generateMockNotification());
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [addNotification]);

  useEffect(() => {
    const cleanup = simulateRealTimeNotifications();
    
    return cleanup;
  }, [simulateRealTimeNotifications]);

  const generateMockNotification = () => {
    const types = Object.values(NOTIFICATION_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const messages = {
      [NOTIFICATION_TYPES.SALE]: [
        'Your product "Wireless Headphones" sold for $149.99',
        'Someone purchased your "Vintage Leather Bag" for $89.99'
      ],
      [NOTIFICATION_TYPES.LIKE]: [
        'Your "Gaming Keyboard" received 5 new likes',
        'Someone added your product to their wishlist'
      ],
      [NOTIFICATION_TYPES.FOLLOW]: [
        'TechStore123 started following you',
        'You have 3 new followers'
      ],
      [NOTIFICATION_TYPES.PRICE_ALERT]: [
        'Electronics category prices increased 15%',
        'Your watchlist item "Smart Watch" price dropped'
      ],
      [NOTIFICATION_TYPES.NEW_PRODUCT]: [
        'New product from your favorite seller!',
        'Fresh arrival: "Summer Collection" items'
      ]
    };

    const typeMessages = messages[randomType] || ['New notification'];
    const message = typeMessages[Math.floor(Math.random() * typeMessages.length)];

    return {
      id: Date.now(),
      type: randomType,
      title: randomType.replace('_', ' ').toUpperCase(),
      message,
      timestamp: new Date(),
      priority: Math.random() > 0.5 ? 'high' : 'medium',
      isRead: false
    };
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setSettings(prev => ({ 
        ...prev, 
        desktopEnabled: permission === 'granted' 
      }));
    }
  };

  useEffect(() => {
    if (settings.desktopEnabled && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, [settings.desktopEnabled]);

  return (
    <div className="real-time-notifications">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="notification-button"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="mark-all-read">
                  <Check size={14} />
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="close-dropdown">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <Bell size={32} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => {
                const IconComponent = NOTIFICATION_ICONS[notification.type] || Info;
                return (
                  <div 
                    key={notification.id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="notification-icon">
                      <IconComponent size={16} />
                    </div>
                    <div className="notification-content">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <div className="unread-indicator" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 5 && (
            <div className="dropdown-footer">
              <button className="view-all-notifications">
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeNotifications; 