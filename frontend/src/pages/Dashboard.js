import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ShoppingBag, 
  Package, 
  User, 
  Heart, 
  Settings, 
  TrendingUp,
  Wallet,
  Plus,
  ArrowRight
} from 'lucide-react';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { items } = useSelector(state => state.cart);

  // Mock data for demonstration
  const dashboardStats = {
    totalOrders: 24,
    totalSpent: 1247.50,
    nftsOwned: 18,
    watchlistItems: 5
  };

  const recentOrders = [
    {
      id: "ORD-2024-001",
      date: "2024-01-15",
      status: "Delivered",
      total: 89.99,
      items: 2
    },
    {
      id: "ORD-2024-002", 
      date: "2024-01-10",
      status: "Processing",
      total: 159.50,
      items: 1
    },
    {
      id: "ORD-2024-003",
      date: "2024-01-05",
      status: "Shipped",
      total: 299.99,
      items: 3
    }
  ];

  if (!isAuthenticated) {
    return (
      <div className="dashboard-unauthorized">
        <h2>Please Login</h2>
        <p>You need to be logged in to access your dashboard.</p>
        <Link to="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Welcome back, {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User'}!</h1>
          <p>Manage your account, track orders, and explore the marketplace</p>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <Package size={24} />
            <div className="stat-info">
              <span className="stat-number">{dashboardStats.totalOrders}</span>
              <span className="stat-label">Total Orders</span>
            </div>
          </div>
          
          <div className="stat-card">
            <Wallet size={24} />
            <div className="stat-info">
              <span className="stat-number">${dashboardStats.totalSpent}</span>
              <span className="stat-label">Total Spent</span>
            </div>
          </div>
          
          <div className="stat-card">
            <TrendingUp size={24} />
            <div className="stat-info">
              <span className="stat-number">{dashboardStats.nftsOwned}</span>
              <span className="stat-label">NFTs Owned</span>
            </div>
          </div>
          
          <div className="stat-card">
            <Heart size={24} />
            <div className="stat-info">
              <span className="stat-number">{dashboardStats.watchlistItems}</span>
              <span className="stat-label">Watchlist</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Quick Actions */}
          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="quick-actions">
              <Link to="/catalog" className="action-card">
                <ShoppingBag size={32} />
                <h3>Browse Marketplace</h3>
                <p>Discover new NFTs and digital assets</p>
                <ArrowRight size={16} />
              </Link>
              
              <Link to="/create" className="action-card">
                <Plus size={32} />
                <h3>Create NFT</h3>
                <p>Mint your own digital assets</p>
                <ArrowRight size={16} />
              </Link>
              
              <Link to="/profile" className="action-card">
                <User size={32} />
                <h3>Edit Profile</h3>
                <p>Update your account information</p>
                <ArrowRight size={16} />
              </Link>
              
              <Link to="/cart" className="action-card">
                <ShoppingBag size={32} />
                <h3>View Cart ({items.length})</h3>
                <p>Review items in your cart</p>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Orders</h2>
              <Link to="/orders" className="view-all-link">
                View All Orders <ArrowRight size={16} />
              </Link>
            </div>
            
            {recentOrders.length > 0 ? (
              <div className="orders-list">
                {recentOrders.map(order => (
                  <div key={order.id} className="order-item">
                    <div className="order-info">
                      <span className="order-id">{order.id}</span>
                      <span className="order-date">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div className="order-details">
                      <span className="order-items">{order.items} item{order.items > 1 ? 's' : ''}</span>
                      <span className="order-total">${order.total}</span>
                    </div>
                    <div className={`order-status ${order.status.toLowerCase()}`}>
                      {order.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-orders">
                <Package size={48} />
                <p>No orders yet</p>
                <Link to="/catalog" className="btn-secondary">Start Shopping</Link>
              </div>
            )}
          </div>

          {/* Account Management */}
          <div className="dashboard-section">
            <h2>Account Management</h2>
            <div className="account-links">
              <Link to="/profile" className="account-link">
                <User size={20} />
                <div>
                  <h4>Profile Settings</h4>
                  <p>Manage your personal information</p>
                </div>
              </Link>
              
              <Link to="/orders" className="account-link">
                <Package size={20} />
                <div>
                  <h4>Order History</h4>
                  <p>View all your past orders</p>
                </div>
              </Link>
              
              <Link to="/help" className="account-link">
                <Settings size={20} />
                <div>
                  <h4>Help & Support</h4>
                  <p>Get help with your account</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 