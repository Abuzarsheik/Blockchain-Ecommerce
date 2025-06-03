import '../styles/Dashboard.css';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  User, 
  TrendingUp, 
  ShoppingCart,
  Heart,
  Package,
  CreditCard,
  ArrowRight,
  Wallet,
  Award,
  UserPlus,
  RefreshCw,
  Star,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
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
    totalSpent: 0,
    totalOrders: 0,
    wishlistItems: 0,
    completedOrders: 0,
    pendingOrders: 0,
    recentOrders: [],
    savedAmount: 0,
    loyaltyPoints: 0,
    profileCompleteness: 75
  });

  const [recentProducts, setRecentProducts] = useState([]);

  // Check if user is new (account created less than 7 days ago)
  const isNewUser = user ? (() => {
    if (!user.createdAt) return true;
    const accountDate = new Date(user.createdAt);
    const now = new Date();
    const daysDiff = (now - accountDate) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  })() : true;

  const calculateProfileCompleteness = useCallback(() => {
    if (!user) return 0;
    const fields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phone,
      user.avatar,
      user.address?.street,
      user.address?.city
    ];
    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }, [user]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user stats
      const [ordersResponse, wishlistResponse, productsResponse] = await Promise.all([
        api.get('/orders').catch(() => ({ data: { orders: [] } })),
        apiEndpoints.getWishlist().catch(() => ({ count: 0, data: [] })),
        api.get('/products?limit=6').catch(() => ({ data: { products: [] } }))
      ]);

      const orders = ordersResponse?.data?.orders || [];
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const pendingOrders = orders.filter(order => ['pending', 'processing', 'shipped'].includes(order.status));
      const totalSpent = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const savedAmount = Math.round(totalSpent * 0.15); // Estimated savings

      setUserStats(prev => ({
        ...prev,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        totalSpent: totalSpent,
        savedAmount: savedAmount,
        wishlistItems: wishlistResponse?.count || wishlistResponse?.data?.length || 0,
        recentOrders: orders.slice(0, 3),
        loyaltyPoints: Math.round(totalSpent * 10), // 10 points per dollar
        profileCompleteness: calculateProfileCompleteness()
      }));

      setRecentProducts(productsResponse?.data?.products?.slice(0, 4) || []);

    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateProfileCompleteness]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [user, isAuthenticated, fetchDashboardData]);

  if (!isAuthenticated) {
    return (
      <div className="auth-prompt">
        <div className="auth-prompt-content">
          <div className="auth-icon">🔐</div>
          <h2>Welcome to Blocmerce</h2>
          <p>Please log in to access your personalized dashboard</p>
          <Link to="/login" className="auth-btn primary">
            <User size={20} />
            Log In
          </Link>
          <Link to="/register" className="auth-btn secondary">
            <UserPlus size={20} />
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "blue" }) => (
    <div className={`modern-stat-card ${color}`}>
      <div className="stat-card-header">
        <div className="stat-icon-wrapper">
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`trend ${trend > 0 ? 'positive' : 'negative'}`}>
            <TrendingUp size={16} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="stat-card-content">
        <h3>{title}</h3>
        <div className="stat-value">{value}</div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );

  const QuickActionCard = ({ icon: Icon, title, description, path, color = "blue" }) => (
    <Link to={path} className={`quick-action-card ${color}`}>
      <div className="action-icon">
        <Icon size={24} />
      </div>
      <div className="action-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <ArrowRight size={20} className="action-arrow" />
    </Link>
  );

  return (
    <div className="modern-dashboard">
      {/* Header Section */}
      <div className="dashboard-header-modern">
        <div className="header-content">
          <div className="welcome-section">
            <div className="user-greeting">
              <h1>Welcome back, {user?.firstName || 'User'}! 👋</h1>
              <p className="greeting-subtitle">
                {isNewUser 
                  ? "Let's get you started on your blockchain marketplace journey" 
                  : "Here's what's happening with your account today"
                }
              </p>
            </div>
            <div className="header-actions">
              <button 
                onClick={fetchDashboardData} 
                className="refresh-btn"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                Refresh
              </button>
              <Link to="/profile-settings" className="profile-btn">
                <User size={18} />
                Profile
              </Link>
            </div>
          </div>

          {/* Profile Completion Banner */}
          {userStats.profileCompleteness < 100 && (
            <div className="completion-banner">
              <div className="completion-info">
                <div className="completion-icon">
                  <User size={20} />
                </div>
                <div>
                  <h4>Complete Your Profile</h4>
                  <p>You're {userStats.profileCompleteness}% done</p>
                </div>
              </div>
              <div className="completion-progress">
                <div 
                  className="progress-bar"
                  style={{ width: `${userStats.profileCompleteness}%` }}
                ></div>
              </div>
              <Link to="/profile-settings" className="complete-btn">
                Complete
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid-modern">
        <StatCard
          icon={CreditCard}
          title="Total Spent"
          value={`$${userStats.totalSpent.toLocaleString()}`}
          subtitle="Lifetime purchases"
          color="blue"
          trend={5}
        />
        <StatCard
          icon={Package}
          title="Orders"
          value={userStats.totalOrders}
          subtitle={`${userStats.completedOrders} completed`}
          color="green"
        />
        <StatCard
          icon={Heart}
          title="Wishlist"
          value={userStats.wishlistItems}
          subtitle="Saved for later"
          color="pink"
        />
        <StatCard
          icon={Award}
          title="Loyalty Points"
          value={userStats.loyaltyPoints.toLocaleString()}
          subtitle={`$${userStats.savedAmount} saved`}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid-modern">
        {/* Quick Actions */}
        <div className="dashboard-section quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
            <p>Get things done faster</p>
          </div>
          <div className="quick-actions-grid">
            <QuickActionCard
              icon={Search}
              title="Browse Products"
              description="Discover new items"
              path="/catalog"
              color="blue"
            />
            <QuickActionCard
              icon={ShoppingCart}
              title="View Cart"
              description={`${items.length} items waiting`}
              path="/cart"
              color="green"
            />
            <QuickActionCard
              icon={Heart}
              title="My Wishlist"
              description="Items you love"
              path="/wishlist"
              color="pink"
            />
            <QuickActionCard
              icon={Wallet}
              title="Wallet"
              description="Manage crypto payments"
              path="/wallet"
              color="purple"
            />
          </div>
        </div>

        {/* Recent Orders */}
        <div className="dashboard-section recent-orders-section">
          <div className="section-header">
            <h2>Recent Orders</h2>
            <Link to="/orders" className="view-all">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          {userStats.recentOrders.length > 0 ? (
            <div className="orders-list-modern">
              {userStats.recentOrders.map((order, index) => (
                <div key={order.id || index} className="order-item-modern">
                  <div className="order-info">
                    <div className="order-header">
                      <span className="order-id">#{order.orderNumber || `ORD-${index + 1}`}</span>
                      <span className={`order-status ${order.status}`}>
                        {order.status || 'pending'}
                      </span>
                    </div>
                    <p className="order-items">
                      {order.items?.length || 1} items • ${order.totalAmount || 0}
                    </p>
                    <span className="order-date">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                  <Link to={`/orders/${order.id}`} className="order-arrow">
                    <ArrowRight size={20} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Package size={48} />
              <h3>No Orders Yet</h3>
              <p>Start shopping to see your orders here</p>
              <Link to="/catalog" className="empty-action-btn">
                Browse Products
              </Link>
            </div>
          )}
        </div>

        {/* Trending Products */}
        <div className="dashboard-section trending-section">
          <div className="section-header">
            <h2>Trending Products</h2>
            <Link to="/catalog?sort=trending" className="view-all">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="products-grid-compact">
            {recentProducts.map((product, index) => (
              <Link 
                key={product.id || index} 
                to={`/product/${product.id}`}
                className="product-card-compact"
              >
                <div className="product-image">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} />
                  ) : (
                    <div className="placeholder-image">
                      <Package size={24} />
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <h4>{product.name || `Product ${index + 1}`}</h4>
                  <p className="product-price">${product.price || '99.99'}</p>
                  <div className="product-rating">
                    <Star size={14} fill="currentColor" />
                    <span>{product.rating || '4.5'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="dashboard-section activity-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <span className="activity-count">{userStats.totalOrders + userStats.wishlistItems} activities</span>
          </div>
          <div className="activity-feed">
            {userStats.recentOrders.length > 0 ? (
              userStats.recentOrders.slice(0, 3).map((order, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon completed">
                    <CheckCircle size={16} />
                  </div>
                  <div className="activity-content">
                    <p>Order #{order.orderNumber || `ORD-${index + 1}`} placed</p>
                    <span className="activity-time">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <Clock size={32} />
                <p>Your activity will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Getting Started for New Users */}
      {isNewUser && (
        <div className="getting-started-modern">
          <div className="getting-started-header">
            <Zap size={24} />
            <h2>Getting Started Guide</h2>
            <p>Complete these steps to make the most of Blocmerce</p>
          </div>
          <div className="getting-started-steps">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Explore the Marketplace</h4>
                <p>Browse thousands of products from verified sellers</p>
                <Link to="/catalog" className="step-action">Start Exploring</Link>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Connect Your Wallet</h4>
                <p>Set up crypto payments for secure transactions</p>
                <Link to="/wallet" className="step-action">Connect Wallet</Link>
              </div>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Make Your First Purchase</h4>
                <p>Complete your profile and start shopping</p>
                <Link to="/profile-settings" className="step-action">Complete Profile</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 