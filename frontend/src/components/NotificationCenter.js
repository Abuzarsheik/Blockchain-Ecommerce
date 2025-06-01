import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useSelector } from 'react-redux';
import { api } from '../services/api';

const NotificationCenter = ({ isDropdown = false, onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pollInterval = useRef(null);

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All', icon: '📄' },
    { value: 'transaction', label: 'Transactions', icon: '💳' },
    { value: 'security', label: 'Security', icon: '🔒' },
    { value: 'order', label: 'Orders', icon: '📦' },
    { value: 'system', label: 'System', icon: '⚙️' }
  ];

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      loadStats();
      
      // Set up polling for real-time updates
      startPolling();
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [user, activeFilter]);

  const startPolling = () => {
    // Poll for new notifications every 30 seconds
    pollInterval.current = setInterval(() => {
      loadUnreadCount();
      if (page === 1) {
        loadNotifications(true);
      }
    }, 30000);
  };

  const loadNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: isDropdown ? '10' : '20',
        ...(activeFilter !== 'all' && { category: activeFilter })
      });

      const response = await api.get(`/notifications?${params}`);
      
      if (response.data.success) {
        const newNotifications = response.data.notifications;
        
        if (page === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }
        
        setHasMore(response.data.pagination.hasNext);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/notifications/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/mark-all-read');
      
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      setNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count if it was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationAction = async (notificationId, action) => {
    try {
      const response = await api.post('/notifications/action', {
        notificationId,
        action
      });
      
      if (response.data.success) {
        // Mark as read and show success message
        markAsRead(notificationId);
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
      alert('Failed to process action');
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const changeFilter = (filter) => {
    setActiveFilter(filter);
    setPage(1);
    setNotifications([]);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-blue-500',
      high: 'text-orange-500',
      urgent: 'text-red-500'
    };
    return colors[priority] || colors.medium;
  };

  const getNotificationIcon = (type) => {
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
    
    return icons[type] || '📢';
  };

  if (isDropdown) {
    return (
      <div className="w-80 max-h-96 overflow-hidden bg-white border rounded-lg shadow-lg">
        {/* Dropdown Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant="ghost"
                className="p-1"
              >
                ✕
              </Button>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              size="sm"
              variant="outline"
              className="mt-2 w-full"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Dropdown Content */}
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications found
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {notification.timeAgo}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dropdown Footer */}
        <div className="p-3 border-t bg-gray-50">
          <Button
            onClick={() => {
              window.location.href = '/notifications';
              onClose();
            }}
            size="sm"
            variant="outline"
            className="w-full"
          >
            View All Notifications
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>🔔</span>
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <Badge variant="destructive">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} size="sm" variant="outline">
                Mark all as read
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Stats */}
      {!isDropdown && Object.keys(stats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div key={stat._id} className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stat.total}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {stat._id}
                  </div>
                  {stat.unread > 0 && (
                    <div className="text-xs text-red-600">
                      {stat.unread} unread
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => changeFilter(option.value)}
                variant={activeFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className="flex items-center space-x-1"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeFilter === 'all' ? 'All Notifications' : 
             `${filterOptions.find(f => f.value === activeFilter)?.label} Notifications`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <p>No notifications found</p>
              <p className="text-sm">When you receive notifications, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-semibold ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          <span className={`text-xs ${getPriorityColor(notification.priority)}`}>
                            {notification.priority.toUpperCase()}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{notification.timeAgo}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              notification.category === 'security' ? 'bg-red-100 text-red-800' :
                              notification.category === 'transaction' ? 'bg-green-100 text-green-800' :
                              notification.category === 'order' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {notification.category}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.actions.map((action, index) => (
                              <Button
                                key={index}
                                onClick={() => handleNotificationAction(notification.id, action.action)}
                                size="sm"
                                variant={action.style === 'danger' ? 'destructive' : 
                                        action.style === 'secondary' ? 'outline' : 'default'}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-4">
                      {!notification.isRead && (
                        <Button
                          onClick={() => markAsRead(notification.id)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteNotification(notification.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter; 