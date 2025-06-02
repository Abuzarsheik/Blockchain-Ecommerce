import '../styles/Dashboard.css';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Star, TrendingUp, CheckCircle } from 'lucide-react';
import PersonalizedRecommendations from '../components/PersonalizedRecommendations';
import RecentActivity from '../components/RecentActivity';
import NFTShowcase from '../components/NFTShowcase';
import { logger } from '../utils/logger';
import { api, apiEndpoints } from '../services/api';

const Dashboard = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { items } = useSelector(state => state.cart);
  const navigate = useNavigate();
  
  // Redirect admins to admin dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    // Buyer stats
    totalSpent: 0,
    totalOrders: 0,
    wishlistItems: 0,
    completedOrders: 0,
    pendingOrders: 0,
    // Seller stats
    totalRevenue: 0,
    totalSales: 0,
    productsListed: 0,
    ordersReceived: 0,
    averageRating: 0,
    pendingPayouts: 0,
    profile: {
      completionPercentage: 0
    }
  });

  // Check if user is a seller
  const isSeller = user?.userType === 'seller';
  const userTypeLabel = isSeller ? 'Seller' : 'Buyer';

  // Check if user is new (account created less than 7 days ago)
  const isNewUser = user ? (() => {
    if (!user.createdAt) return true;
    const accountDate = new Date(user.createdAt);
    const now = new Date();
    const daysDiff = (now - accountDate) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  })() : true;

  // Check if user profile is complete
  const checkProfileCompletion = () => {
    if (!user) return false;
    
    // Define required fields for a complete profile
    const requiredFields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phoneNumber,
      user.address?.street,
      user.address?.city,
      user.address?.country
    ];
    
    // Check if all required fields are filled
    const isComplete = requiredFields.every(field => field && field.trim() !== '');
    
    // Also check if user has uploaded an avatar
    const hasAvatar = user.avatar && user.avatar !== '';
    
    return {
      isComplete: isComplete && hasAvatar,
      missingFields: !isComplete,
      hasAvatar
    };
  };

  const profileStatus = checkProfileCompletion();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user data
      const userResponse = await api.get('/users/me');
      const userData = userResponse.data.data;
      
      // Determine if user is a seller
      const isSellerUser = userData.userType === 'seller';

      // Fetch stats based on user type
      let statsData = {};
      if (isSellerUser) {
        // Fetch seller statistics
        try {
          const sellerStatsResponse = await api.get('/users/seller-stats');
          statsData = sellerStatsResponse.data.data;
        } catch (error) {
          console.error('Error fetching seller stats:', error);
          logger.error('Failed to fetch seller statistics', { error });
          // Use default values
          statsData = {
            totalRevenue: 0,
            totalSales: 0,
            productsListed: 0,
            ordersReceived: 0,
            averageRating: 0,
            pendingPayouts: 0
          };
        }
      } else {
        // Fetch buyer statistics (existing logic)
        let totalSpent = 0;
        let totalOrders = 0;
        let wishlistCount = 0;

        try {
          const ordersResponse = await api.get('/orders');
          if (ordersResponse.data.success) {
            const orders = ordersResponse.data.data;
            totalOrders = orders.length;
            totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
          }
        } catch (error) {
          logger.error('Failed to fetch orders for dashboard', { error });
        }

        try {
          const wishlistResponse = await apiEndpoints.getWishlist();
          if (wishlistResponse.success) {
            wishlistCount = wishlistResponse.data.length;
          }
        } catch (error) {
          logger.error('Failed to fetch wishlist for dashboard', { error });
        }

        statsData = {
          totalSpent,
          totalOrders,
          wishlistItems: wishlistCount,
          completedOrders: totalOrders,
          pendingOrders: 0,
        };
      }

      setUserStats(prevStats => ({
        ...prevStats,
        ...statsData
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      logger.error('Dashboard data fetch failed', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch user profile and orders in parallel
        const [ordersResponse, wishlistResponse] = await Promise.all([
          api.get('/orders').catch(err => ({ data: { orders: [] } })), // Use correct endpoint
          apiEndpoints.getWishlist().catch(err => ({ count: 0 })) // Use apiEndpoints and handle error gracefully
        ]);

        if (ordersResponse?.data?.orders) {
          const orders = ordersResponse.data.orders;
          const completedOrders = orders.filter(order => order.status === 'completed');
          const pendingOrders = orders.filter(order => ['pending', 'processing', 'shipped'].includes(order.status));
          const totalSpent = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

          setUserStats(prev => ({
            ...prev,
            totalOrders: orders.length,
            completedOrders: completedOrders.length,
            pendingOrders: pendingOrders.length,
            totalSpent: totalSpent,
            wishlistItems: wishlistResponse?.count || 0
          }));
        }

      } catch (error) {
        logger.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="auth-prompt">
        <h2>Please log in to access your dashboard</h2>
        <Link to="/login" className="login-link">Go to Login</Link>
      </div>
    );
  }

  const getWelcomeMessage = () => {
    const baseMessage = isNewUser 
      ? `Welcome to Blocmerce, ${user?.firstName || 'User'}! 🎉`
      : `Welcome back, ${user?.firstName || 'User'}! 👋`;
    
    const subtitle = isSeller 
      ? (isNewUser 
          ? "Let's get you started selling on our marketplace" 
          : "Your seller dashboard awaits")
      : (isNewUser 
          ? "Let's get you started on your blockchain marketplace journey" 
          : "Your marketplace journey continues");
    
    return {
      title: baseMessage,
      subtitle: subtitle
    };
  };

  return (
    <div className="dashboard enhanced-dashboard">
      <div className="dashboard-header enhanced-header">
        <div className="welcome-animation">
          <div className="welcome-content">
            <h1 className="dashboard-title">{`${userTypeLabel} Dashboard`}</h1>
            <div className="welcome-message">
              <h2>{getWelcomeMessage().title}</h2>
              <p>{getWelcomeMessage().subtitle}</p>
            </div>
          </div>
        </div>
        {isNewUser && (
          <div className="new-user-banner">
            <div className="banner-content">
              <h3>🚀 Getting Started</h3>
              <p>
                {isSeller 
                  ? "Start selling on our marketplace! List your first product and reach customers worldwide."
                  : "Explore trending products, add items to your wishlist, and start shopping!"
                }
              </p>
              <div className="quick-start-actions">
                {isSeller ? (
                  // Seller Actions
                  <>
                    <Link to="/create-product" className="enhanced-action-btn primary">
                      <div className="btn-icon">
                        <Search size={20} />
                      </div>
                      <div className="btn-content">
                        <span className="btn-title">List Your First Product</span>
                        <span className="btn-subtitle">Start selling today</span>
                      </div>
                      <div className="btn-arrow">
                        <TrendingUp size={16} />
                      </div>
                    </Link>
                    <Link to="/seller/analytics" className="enhanced-action-btn secondary">
                      <div className="btn-icon">
                        <TrendingUp size={20} />
                      </div>
                      <div className="btn-content">
                        <span className="btn-title">View Analytics</span>
                        <span className="btn-subtitle">Track your performance</span>
                      </div>
                      <div className="btn-arrow">
                        <CheckCircle size={16} />
                      </div>
                    </Link>
                  </>
                ) : (
                  // Buyer Actions
                  <>
                    <Link to="/catalog" className="enhanced-action-btn primary">
                      <div className="btn-icon">
                        <Search size={20} />
                      </div>
                      <div className="btn-content">
                        <span className="btn-title">Browse Products</span>
                        <span className="btn-subtitle">Discover amazing items</span>
                      </div>
                      <div className="btn-arrow">
                        <TrendingUp size={16} />
                      </div>
                    </Link>
                    {/* Only show profile completion button if profile is not complete */}
                    {!profileStatus.isComplete ? (
                      <Link to="/profile-settings" className="enhanced-action-btn secondary">
                        <div className="btn-icon">
                          <User size={20} />
                        </div>
                        <div className="btn-content">
                          <span className="btn-title">Complete Profile</span>
                          <span className="btn-subtitle">Personalize your account</span>
                        </div>
                        <div className="btn-arrow">
                          <Star size={16} />
                        </div>
                      </Link>
                    ) : (
                      <Link to="/profile-settings" className="enhanced-action-btn secondary">
                        <div className="btn-icon">
                          <User size={20} />
                        </div>
                        <div className="btn-content">
                          <span className="btn-title">View Profile</span>
                          <span className="btn-subtitle">Manage your account settings</span>
                        </div>
                        <div className="btn-arrow">
                          <CheckCircle size={16} />
                        </div>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Show profile completion banner for any user with incomplete profile */}
        {!profileStatus.isComplete && isNewUser && (
          <div className="profile-completion-banner">
            <div className="banner-content">
              <h3>📝 Complete Your Profile</h3>
              <p>Add missing information to get the most out of your Blocmerce experience</p>
              <Link to="/profile-settings" className="enhanced-action-btn warning">
                <div className="btn-icon">
                  <User size={20} />
                </div>
                <div className="btn-content">
                  <span className="btn-title">Complete Profile</span>
                  <span className="btn-subtitle">Add missing details</span>
                </div>
                <div className="btn-arrow">
                  <Star size={16} />
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-stats enhanced-stats">
        {isSeller ? (
          // Seller Stats
          <>
            <div className="stat-card animated-stat">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Total Revenue</h3>
                <p className="stat-value">
                  {loading ? 'Loading...' : `$${userStats.totalRevenue || 0}`}
                </p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>Products Listed</h3>
                <p className="stat-value">
                  {loading ? 'Loading...' : userStats.productsListed || 0}
                </p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">🛒</div>
              <div className="stat-info">
                <h3>Orders Received</h3>
                <p className="stat-value">{userStats.ordersReceived || 0}</p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <h3>Average Rating</h3>
                <p className="stat-value">{userStats.averageRating || 0.0}/5.0</p>
              </div>
            </div>
          </>
        ) : (
          // Buyer Stats
          <>
            <div className="stat-card animated-stat">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Total Spent</h3>
                <p className="stat-value">
                  {loading ? 'Loading...' : `$${userStats.totalSpent || 0}`}
                </p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <h3>Orders Placed</h3>
                <p className="stat-value">
                  {loading ? 'Loading...' : userStats.totalOrders || 0}
                </p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">❤️</div>
              <div className="stat-info">
                <h3>Wishlist Items</h3>
                <p className="stat-value">{userStats.wishlistItems || 0}</p>
              </div>
            </div>
            <div className="stat-card animated-stat">
              <div className="stat-icon">🛒</div>
              <div className="stat-info">
                <h3>Cart Items</h3>
                <p className="stat-value">{items.length}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-content enhanced-content">
        <div className="left-panel">
          <PersonalizedRecommendations 
            insights={{ 
              avgMatchScore: 87, 
              totalViews: userStats.profileViews || 0, 
              favoriteCategory: userStats.favoriteCategory || 'Digital Art' 
            }}
            user={user}
            realProducts={[]}
            isNewUser={isNewUser}
          />
          
          {/* Only show recent activity if user has activities */}
          {(userStats.hasActivities || !isNewUser) && (
            <RecentActivity 
              hasRealData={userStats.hasActivities}
              isNewUser={isNewUser}
            />
          )}
          
          {/* Show getting started guide for new users */}
          {isNewUser && (
            <div className="getting-started-section">
              <h3>🎯 Getting Started Guide</h3>
              <div className="guide-steps">
                <div className="guide-step">
                  <span className="step-number">1</span>
                  <div className="step-content">
                    <h4>Explore Products</h4>
                    <p>Browse our marketplace to discover amazing items</p>
                    <Link to="/catalog" className="step-link">Start Exploring →</Link>
                  </div>
                </div>
                <div className="guide-step">
                  <span className="step-number">2</span>
                  <div className="step-content">
                    <h4>Create Your Wishlist</h4>
                    <p>Save items you love for later</p>
                    <Link to="/wishlist" className="step-link">View Wishlist →</Link>
                  </div>
                </div>
                <div className="guide-step">
                  <span className="step-number">3</span>
                  <div className="step-content">
                    <h4>Make Your First Purchase</h4>
                    <p>Add items to cart and checkout securely</p>
                    <Link to="/cart" className="step-link">View Cart →</Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="right-panel">
          {/* Only show NFT showcase if user has NFTs or is not new */}
          {(userStats.hasNFTs || !isNewUser) && (
            <NFTShowcase 
              nftData={userStats.nftData}
              salesData={userStats.salesData}
              loading={loading}
              hasRealData={userStats.hasNFTs}
              isNewUser={isNewUser}
            />
          )}
          
          {/* Show marketplace highlights for new users instead of empty NFT collection */}
          {isNewUser && !userStats.hasNFTs && (
            <div className="marketplace-highlights">
              <h3>🌟 Marketplace Highlights</h3>
              <p>Discover what's trending in our marketplace</p>
              <div className="highlights-grid">
                {/* Placeholder for product highlights */}
                <div className="highlight-card">
                  <div className="highlight-image">
                    <div className="placeholder-image">📷</div>
                  </div>
                  <div className="highlight-info">
                    <h4>Sample Product</h4>
                    <p className="highlight-price">$99.99</p>
                    <p className="highlight-seller">by Verified Seller</p>
                  </div>
                </div>
              </div>
              <Link to="/catalog" className="view-all-highlights">
                View All Products →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 