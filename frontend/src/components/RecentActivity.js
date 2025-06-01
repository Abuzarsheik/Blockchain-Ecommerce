import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ShoppingCart, 
  Heart, 
  Eye, 
  Star, 
  TrendingUp,
  User,
  Package,
  CreditCard,
  Gift,
  MessageCircle,
  Activity
} from 'lucide-react';
import './RecentActivity.css';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  // Mock recent activities - using useMemo to prevent re-creation
  const mockActivities = useMemo(() => [
    {
      id: 1,
      type: 'purchase',
      title: 'Purchased NFT',
      description: 'Digital Dreams #42',
      value: '2.5 ETH',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      icon: ShoppingCart,
      status: 'completed',
      image: '/api/placeholder/40/40'
    },
    {
      id: 2,
      type: 'like',
      title: 'Liked NFT',
      description: 'Cosmic Cat Collection',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      icon: Heart,
      status: 'completed',
      image: '/api/placeholder/40/40'
    },
    {
      id: 3,
      type: 'sale',
      title: 'NFT Sold',
      description: 'Abstract Vision #12',
      value: '1.8 ETH',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      icon: TrendingUp,
      status: 'completed',
      image: '/api/placeholder/40/40'
    },
    {
      id: 4,
      type: 'view',
      title: 'Viewed Collection',
      description: 'Futuristic Cities',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      icon: Eye,
      status: 'completed'
    },
    {
      id: 5,
      type: 'follow',
      title: 'New Follower',
      description: 'CryptoArtist123 followed you',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      icon: User,
      status: 'completed'
    },
    {
      id: 6,
      type: 'bid',
      title: 'Bid Placed',
      description: 'Neon Lights Collection',
      value: '0.5 ETH',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      icon: Package,
      status: 'pending',
      image: '/api/placeholder/40/40'
    },
    {
      id: 7,
      type: 'review',
      title: 'Left Review',
      description: 'Rated Digital Art #23',
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1.5 days ago
      icon: Star,
      status: 'completed'
    },
    {
      id: 8,
      type: 'comment',
      title: 'Comment Added',
      description: 'Commented on Pixel Warriors',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      icon: MessageCircle,
      status: 'completed'
    }
  ], []);

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setActivities(mockActivities);
      setLoading(false);
    }, 500);
  }, [mockActivities]);

  const getActivityIcon = (type) => {
    const icons = {
      purchase: ShoppingCart,
      sale: TrendingUp,
      like: Heart,
      view: Eye,
      follow: User,
      bid: Package,
      review: Star,
      comment: MessageCircle,
      payment: CreditCard,
      gift: Gift
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type, status) => {
    if (status === 'pending') return 'pending';
    if (status === 'failed') return 'failed';
    
    const colors = {
      purchase: 'purchase',
      sale: 'sale',
      like: 'like',
      view: 'view',
      follow: 'follow',
      bid: 'bid',
      review: 'review',
      comment: 'comment'
    };
    return colors[type] || 'default';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Recent Activity</h3>
        </div>
        <div className="loading-activities">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="activity-skeleton">
              <div className="skeleton-icon"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <div className="activity-header">
        <h3>Recent Activity</h3>
        <div className="activity-filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Activities</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
            <option value="like">Likes</option>
            <option value="view">Views</option>
            <option value="follow">Follows</option>
            <option value="bid">Bids</option>
          </select>
        </div>
      </div>

      <div className="activity-list">
        {filteredActivities.map((activity) => {
          const IconComponent = getActivityIcon(activity.type);
          return (
            <div 
              key={activity.id} 
              className={`activity-item ${getActivityColor(activity.type, activity.status)}`}
            >
              <div className="activity-icon">
                <IconComponent size={18} />
              </div>
              
              <div className="activity-content">
                <div className="activity-main">
                  <h4 className="activity-title">{activity.title}</h4>
                  <p className="activity-description">{activity.description}</p>
                </div>
                
                <div className="activity-meta">
                  {activity.value && (
                    <span className="activity-value">{activity.value}</span>
                  )}
                  <span className="activity-time">
                    <Clock size={12} />
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
              </div>

              {activity.image && (
                <div className="activity-image">
                  <img src={activity.image} alt="" />
                </div>
              )}

              {activity.status === 'pending' && (
                <div className="activity-status pending">
                  <div className="status-indicator"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="empty-activity">
          <Activity size={48} />
          <h4>No Activities Yet</h4>
          <p>Start exploring NFTs to see your activity here!</p>
        </div>
      )}

      <div className="activity-footer">
        <button className="view-all-btn">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity; 