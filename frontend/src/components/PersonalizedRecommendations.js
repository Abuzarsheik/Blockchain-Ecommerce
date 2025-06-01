import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, 
  Star, 
  Eye, 
  Heart, 
  ArrowRight,
  Zap,
  Target,
  ThumbsUp,
  Stars
} from 'lucide-react';
import './PersonalizedRecommendations.css';
import { logger } from '../utils/logger';

const PersonalizedRecommendations = ({ insights = {}, user }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [loading, setLoading] = useState(false);

  // Mock recommendations based on insights - using useMemo to prevent re-creation
  const mockRecommendations = useMemo(() => ({
    trending: [
      {
        id: 1,
        title: 'Trending in Digital Art',
        type: 'nft',
        image: '/api/placeholder/200/200',
        price: 2.5,
        score: 95,
        reason: 'Based on your art collection preferences'
      },
      {
        id: 2,
        title: 'Hot Gaming Assets',
        type: 'collection',
        image: '/api/placeholder/200/200',
        price: 1.8,
        score: 88,
        reason: 'Similar to your recent purchases'
      }
    ],
    similar: [
      {
        id: 3,
        title: 'Artists You Might Like',
        type: 'creator',
        image: '/api/placeholder/200/200',
        followers: 1500,
        score: 92,
        reason: 'Creates similar style to your favorites'
      },
      {
        id: 4,
        title: 'Related Collections',
        type: 'collection',
        image: '/api/placeholder/200/200',
        items: 120,
        score: 85,
        reason: 'Matches your collection patterns'
      }
    ],
    personalized: [
      {
        id: 5,
        title: 'Custom Pick for You',
        type: 'nft',
        image: '/api/placeholder/200/200',
        price: 3.2,
        score: 98,
        reason: 'Perfect match for your taste profile'
      },
      {
        id: 6,
        title: 'Exclusive Early Access',
        type: 'drop',
        image: '/api/placeholder/200/200',
        launchDate: '2024-01-15',
        score: 90,
        reason: 'From creators you follow'
      }
    ]
  }), []);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setRecommendations(mockRecommendations[activeCategory] || []);
        setLoading(false);
      }, 500);
    } catch (error) {
      logger.error('Failed to fetch recommendations:', error);
      setLoading(false);
    }
  }, [activeCategory, mockRecommendations]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'low';
  };

  const formatPrice = (price) => {
    return `${price} ETH`;
  };

  const handleRecommendationClick = (recommendation) => {
    // Handle navigation to recommendation
    console.log('Navigate to:', recommendation);
  };

  if (loading) {
    return (
      <div className="personalized-recommendations">
        <div className="recommendations-header">
          <h3>Personalized for You</h3>
        </div>
        <div className="loading-recommendations">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="recommendation-skeleton">
              <div className="skeleton-image"></div>
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
    <div className="personalized-recommendations">
      <div className="recommendations-header">
        <div className="header-title">
          <Stars size={20} />
          <h3>Personalized for You</h3>
        </div>
        <div className="insights-summary">
          <div className="insight-stat">
            <Stars size={16} />
            <span>Match Score: {insights.avgMatchScore || 87}%</span>
          </div>
          {insights.totalViews && (
            <span className="insight-stat">
              <Eye size={14} />
              {insights.totalViews} views
            </span>
          )}
          {insights.favoriteCategory && (
            <span className="insight-stat">
              <Heart size={14} />
              Loves {insights.favoriteCategory}
            </span>
          )}
        </div>
      </div>

      <div className="category-tabs">
        <button
          className={`tab-btn ${activeCategory === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveCategory('trending')}
        >
          <TrendingUp size={16} />
          Trending
        </button>
        <button
          className={`tab-btn ${activeCategory === 'similar' ? 'active' : ''}`}
          onClick={() => setActiveCategory('similar')}
        >
          <Target size={16} />
          Similar
        </button>
        <button
          className={`tab-btn ${activeCategory === 'personalized' ? 'active' : ''}`}
          onClick={() => setActiveCategory('personalized')}
        >
          <Zap size={16} />
          Just for You
        </button>
      </div>

      <div className="recommendations-list">
        {recommendations.map((recommendation) => (
          <div 
            key={recommendation.id} 
            className="recommendation-card"
            onClick={() => handleRecommendationClick(recommendation)}
          >
            <div className="recommendation-image">
              <img src={recommendation.image} alt={recommendation.title} />
              <div className={`match-score ${getScoreColor(recommendation.score)}`}>
                <Star size={12} />
                {recommendation.score}%
              </div>
            </div>
            
            <div className="recommendation-content">
              <h4 className="recommendation-title">{recommendation.title}</h4>
              <p className="recommendation-reason">{recommendation.reason}</p>
              
              <div className="recommendation-details">
                {recommendation.type === 'nft' && (
                  <span className="detail-item price">
                    {formatPrice(recommendation.price)}
                  </span>
                )}
                {recommendation.type === 'creator' && (
                  <span className="detail-item followers">
                    {recommendation.followers} followers
                  </span>
                )}
                {recommendation.type === 'collection' && (
                  <span className="detail-item items">
                    {recommendation.items} items
                  </span>
                )}
                {recommendation.type === 'drop' && (
                  <span className="detail-item launch">
                    Launches {recommendation.launchDate}
                  </span>
                )}
              </div>
              
              <div className="recommendation-actions">
                <button className="action-btn primary">
                  View Details
                  <ArrowRight size={14} />
                </button>
                <button className="action-btn secondary">
                  <ThumbsUp size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="empty-recommendations">
          <Stars size={48} />
          <h4>No recommendations available</h4>
          <p>Browse and interact with NFTs to get personalized recommendations!</p>
        </div>
      )}

      <div className="recommendations-footer">
        <button className="view-all-btn">
          View All Recommendations
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PersonalizedRecommendations; 