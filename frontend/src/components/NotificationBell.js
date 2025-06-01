import NotificationCenter from './NotificationCenter';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from './ui/Badge';
import { useSelector } from 'react-redux';
import { Bell, Check, X } from 'lucide-react';
import { logger } from '../utils/logger';
import { apiEndpoints as api } from '../services/api';

const NotificationBell = () => {
  const { user } = useSelector((state) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      startPolling();
    }

    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef.current &&
        !bellRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [user]);

  const startPolling = () => {
    // Poll for unread count every 30 seconds
    pollInterval.current = setInterval(() => {
      loadUnreadCount();
    }, 30000);
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      logger.error('Failed to load unread count:', error);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleBellClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        className={`relative p-2 rounded-full transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          showDropdown ? 'bg-gray-100' : ''
        }`}
        aria-label="Notifications"
        title={`${unreadCount} unread notifications`}
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1">
            <Badge
              variant="destructive"
              size="sm"
              className="min-w-[20px] h-5 text-xs flex items-center justify-center p-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </div>
        )}

        {/* Animated pulse for new notifications */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-400 animate-ping opacity-75"></div>
        )}
      </button>

      {/* Dropdown Notification Center */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 z-50"
          style={{ minWidth: '320px' }}
        >
          <NotificationCenter
            isDropdown={true}
            onClose={closeDropdown}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 