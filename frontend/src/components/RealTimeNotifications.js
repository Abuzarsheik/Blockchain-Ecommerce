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
  NEW_NFT: 'new_nft'
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
  [NOTIFICATION_TYPES.NEW_NFT]: Star
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
        'Your NFT "Neon Dreams" sold for 1.8 ETH',
        'Someone purchased your "Abstract Vision" for 0.5 ETH'
      ],
      [NOTIFICATION_TYPES.LIKE]: [
        'Your "Digital Art #23" received 5 new likes',
        'Someone added your NFT to their wishlist'
      ],
      [NOTIFICATION_TYPES.FOLLOW]: [
        'CryptoArtist123 started following you',
        'You have 3 new followers'
      ],
      [NOTIFICATION_TYPES.PRICE_ALERT]: [
        'Bored Apes floor price increased 25%',
        'Your watchlist item "Pixel Art" price dropped'
      ],
      [NOTIFICATION_TYPES.NEW_NFT]: [
        'New NFT from your favorite creator!',
        'Fresh drop: "Futuristic City" collection'
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

      <style jsx>{`
        .real-time-notifications {
          position: relative;
        }

        .notification-button {
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #e74c3c;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.125rem 0.375rem;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 350px;
          max-height: 500px;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-top: 0.5rem;
          overflow: hidden;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f1f3f4;
          background: #f8f9fa;
        }

        .dropdown-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .mark-all-read {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: none;
          color: #667eea;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .mark-all-read:hover {
          background: #f0f4ff;
        }

        .close-dropdown {
          background: none;
          border: none;
          color: #7f8c8d;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-dropdown:hover {
          background: #f1f3f4;
          color: #495057;
        }

        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .empty-notifications {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          color: #7f8c8d;
          text-align: center;
        }

        .empty-notifications p {
          margin: 1rem 0 0;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #f8f9fa;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .notification-item:hover {
          background: #f8f9fa;
        }

        .notification-item.unread {
          background: rgba(102, 126, 234, 0.05);
          border-left: 3px solid #667eea;
        }

        .notification-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #f1f3f4;
          border-radius: 50%;
          color: #667eea;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-content h4 {
          margin: 0 0 0.25rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .notification-content p {
          margin: 0 0 0.25rem;
          font-size: 0.8rem;
          color: #5a6c7d;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 0.7rem;
          color: #95a5a6;
        }

        .unread-indicator {
          position: absolute;
          top: 50%;
          right: 1rem;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
        }

        .dropdown-footer {
          padding: 1rem;
          border-top: 1px solid #f1f3f4;
          background: #f8f9fa;
        }

        .view-all-notifications {
          width: 100%;
          background: none;
          border: none;
          color: #667eea;
          padding: 0.75rem;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .view-all-notifications:hover {
          background: #f0f4ff;
          color: #5a67d8;
        }

        @media (max-width: 768px) {
          .notification-dropdown {
            position: fixed;
            top: 70px;
            left: 1rem;
            right: 1rem;
            width: auto;
            max-height: 70vh;
          }
        }
      `}</style>
    </div>
  );
};

export default RealTimeNotifications; 