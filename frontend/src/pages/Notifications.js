import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings, ShoppingBag, Star, MessageSquare, AlertCircle, Mail } from 'lucide-react';
import '../styles/Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  // Mock notifications data - replace with API call
  useEffect(() => {
    const mockNotifications = [
      {
        id: 1,
        type: 'order',
        title: 'Order Shipped',
        message: 'Your product "Bluetooth Speakers" has been shipped',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        icon: ShoppingBag,
        color: 'blue'
      },
      {
        id: 2,
        type: 'review',
        title: 'New Review',
        message: 'You received a 5-star review for "Electronics Collection"',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: false,
        icon: Star,
        color: 'yellow'
      },
      {
        id: 3,
        type: 'message',
        title: 'New Message',
        message: 'You have a new message from buyer about "Smart Watch"',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        read: true,
        icon: MessageSquare,
        color: 'green'
      },
      {
        id: 4,
        type: 'system',
        title: 'Account Verification',
        message: 'Your seller verification has been approved',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        read: true,
        icon: Check,
        color: 'green'
      },
      {
        id: 5,
        type: 'alert',
        title: 'Price Alert',
        message: 'Product you\'re watching dropped in price by 15%',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
        read: false,
        icon: AlertCircle,
        color: 'red'
      }
    ];

    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-left">
            <Bell size={24} />
            <h1>Notifications</h1>
            <span className="notification-count">
              {notifications.filter(n => !n.read).length} unread
            </span>
          </div>
          <div className="header-actions">
            <button 
              onClick={markAllAsRead}
              className="mark-all-read-btn"
              disabled={notifications.every(n => n.read)}
            >
              <Check size={16} />
              Mark All Read
            </button>
            <button className="settings-btn">
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter(n => !n.read).length})
          </button>
          <button 
            className={`filter-btn ${filter === 'order' ? 'active' : ''}`}
            onClick={() => setFilter('order')}
          >
            Orders
          </button>
          <button 
            className={`filter-btn ${filter === 'message' ? 'active' : ''}`}
            onClick={() => setFilter('message')}
          >
            Messages
          </button>
          <button 
            className={`filter-btn ${filter === 'system' ? 'active' : ''}`}
            onClick={() => setFilter('system')}
          >
            System
          </button>
        </div>

        {/* Notifications List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="no-notifications">
              <Bell size={48} />
              <h3>No notifications found</h3>
              <p>You're all caught up! No {filter === 'all' ? '' : filter} notifications to show.</p>
            </div>
          ) : (
            filteredNotifications.map(notification => {
              const IconComponent = notification.icon;
              return (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                >
                  <div className={`notification-icon ${notification.color}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4>{notification.title}</h4>
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                  <div className="notification-actions">
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="mark-read-btn"
                        title="Mark as read"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.id)}
                      className="delete-btn"
                      title="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notification Settings */}
        <div className="notification-settings">
          <h3>Notification Preferences</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <div className="setting-info">
                <Mail size={20} />
                <div>
                  <h4>Email Notifications</h4>
                  <p>Receive notifications via email</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <Bell size={20} />
                <div>
                  <h4>Push Notifications</h4>
                  <p>Browser push notifications</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <ShoppingBag size={20} />
                <div>
                  <h4>Order Updates</h4>
                  <p>Notifications about your orders</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <Star size={20} />
                <div>
                  <h4>Reviews & Ratings</h4>
                  <p>When you receive reviews</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications; 