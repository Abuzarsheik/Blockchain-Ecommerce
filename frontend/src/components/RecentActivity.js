import React, { useState, useEffect } from 'react';
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

const RecentActivity = ({ hasRealData = false, isNewUser = false }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  // Show appropriate content based on user status
  useEffect(() => {
    if (isNewUser && !hasRealData) {
      // Don't show any activities for new users
      setActivities([]);
      return;
    }

    setLoading(true);
    // TODO: Fetch real user activities from API
    // For now, simulate with empty data for new users
    setTimeout(() => {
      if (hasRealData) {
        // Show real activities when user has actual data
        // This would come from API call: await api.get('/users/activities')
        setActivities([]);
      } else {
        setActivities([]);
      }
      setLoading(false);
    }, 300);
  }, [hasRealData, isNewUser]);

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

  // Don't render the component for new users without activities
  if (isNewUser && !hasRealData) {
    return null;
  }

  if (loading) {
    return (
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Recent Activity</h3>
        </div>
        <div className="loading-activities">
          {[...Array(3)].map((_, i) => (
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
    <div className="recent-activity enhanced-activity">
      <div className="activity-header">
        <h3>Recent Activity</h3>
        {activities.length > 0 && (
          <div className="activity-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Activities</option>
              <option value="purchase">Purchases</option>
              <option value="like">Likes</option>
              <option value="view">Views</option>
              <option value="review">Reviews</option>
              <option value="follow">Follows</option>
            </select>
          </div>
        )}
      </div>

      <div className="activities-list">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type);
            return (
              <div 
                key={activity.id} 
                className={`activity-item ${getActivityColor(activity.type, activity.status)}`}
              >
                <div className="activity-icon">
                  <IconComponent size={16} />
                </div>
                
                <div className="activity-content">
                  <div className="activity-main">
                    <h4 className="activity-title">{activity.title}</h4>
                    <p className="activity-description">{activity.description}</p>
                  </div>
                  
                  <div className="activity-meta">
                    <span className="activity-time">
                      <Clock size={12} />
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                    {activity.value && (
                      <span className="activity-value">{activity.value}</span>
                    )}
                  </div>
                </div>
                
                {activity.image && (
                  <div className="activity-image">
                    <img src={activity.image} alt="" />
                  </div>
                )}
                
                <div className={`activity-status ${activity.status}`}>
                  <div className="status-indicator"></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-activities">
            <div className="no-activities-content">
              <Activity size={48} />
              <h4>No Activity Yet</h4>
              <p>Start browsing and interacting with products to see your activity here!</p>
              <div className="activity-suggestions">
                <a href="/catalog" className="suggestion-link">
                  <ShoppingCart size={16} />
                  Browse Products
                </a>
                <a href="/wishlist" className="suggestion-link">
                  <Heart size={16} />
                  Create Wishlist
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity; 