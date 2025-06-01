import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign,
  Package,
  Shield,
  Activity,
  User,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import { apiEndpoints } from '../services/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResponse, activityResponse] = await Promise.all([
        apiEndpoints.getDashboardStats(selectedPeriod),
        apiEndpoints.getDashboardActivity(20)
      ]);

      setStats(statsResponse.data);
      setActivity(activityResponse.data.activities);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registration':
        return <User className="activity-icon user" />;
      case 'order_created':
        return <ShoppingCart className="activity-icon order" />;
      case 'dispute_created':
        return <AlertTriangle className="activity-icon dispute" />;
      case 'transaction':
        return <DollarSign className="activity-icon transaction" />;
      default:
        return <Activity className="activity-icon default" />;
    }
  };

  const getHealthStatus = (metric, value) => {
    const thresholds = {
      userGrowthRate: { good: 5, warning: 2 },
      orderFulfillmentRate: { good: 85, warning: 70 },
      disputeRate: { good: 2, warning: 5 },
      averageOrderValue: { good: 50, warning: 25 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'neutral';

    if (metric === 'disputeRate') {
      // Lower is better for dispute rate
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'danger';
    } else {
      // Higher is better for other metrics
      if (value >= threshold.good) return 'good';
      if (value >= threshold.warning) return 'warning';
      return 'danger';
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-error">
          <AlertTriangle size={48} />
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Admin Dashboard</h1>
            <p>Platform overview and management tools</p>
          </div>
          
          <div className="header-controls">
            <div className="period-selector">
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="period-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
            
            <button 
              onClick={handleRefresh}
              className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
              disabled={refreshing}
            >
              <Activity size={16} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users />
            </div>
            <div className="stat-content">
              <h3>Total Users</h3>
              <div className="stat-value">{stats.users.total.toLocaleString()}</div>
              <div className="stat-meta">
                <span className="stat-change positive">+{stats.users.new}</span> new this {selectedPeriod}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <ShoppingCart />
            </div>
            <div className="stat-content">
              <h3>Total Orders</h3>
              <div className="stat-value">{stats.orders.total.toLocaleString()}</div>
              <div className="stat-meta">
                <span className="stat-change">{stats.orders.pending}</span> pending
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <DollarSign />
            </div>
            <div className="stat-content">
              <h3>Revenue</h3>
              <div className="stat-value">{formatCurrency(stats.revenue.total)}</div>
              <div className="stat-meta">
                Avg: {formatCurrency(stats.revenue.averageOrderValue)}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <AlertTriangle />
            </div>
            <div className="stat-content">
              <h3>Open Disputes</h3>
              <div className="stat-value">{stats.disputes.open}</div>
              <div className="stat-meta">
                <span className="stat-change positive">{stats.disputes.resolved}</span> resolved
              </div>
            </div>
          </div>
        </div>

        {/* Platform Health */}
        <div className="health-section">
          <h2>Platform Health</h2>
          <div className="health-grid">
            <div className="health-card">
              <div className="health-header">
                <TrendingUp size={20} />
                <span>User Growth Rate</span>
              </div>
              <div className={`health-value ${getHealthStatus('userGrowthRate', stats.platformHealth.userGrowthRate)}`}>
                {stats.platformHealth.userGrowthRate}%
              </div>
            </div>

            <div className="health-card">
              <div className="health-header">
                <CheckCircle size={20} />
                <span>Order Fulfillment</span>
              </div>
              <div className={`health-value ${getHealthStatus('orderFulfillmentRate', stats.platformHealth.orderFulfillmentRate)}`}>
                {stats.platformHealth.orderFulfillmentRate}%
              </div>
            </div>

            <div className="health-card">
              <div className="health-header">
                <Shield size={20} />
                <span>Dispute Rate</span>
              </div>
              <div className={`health-value ${getHealthStatus('disputeRate', stats.platformHealth.disputeRate)}`}>
                {stats.platformHealth.disputeRate}%
              </div>
            </div>

            <div className="health-card">
              <div className="health-header">
                <BarChart3 size={20} />
                <span>Avg Order Value</span>
              </div>
              <div className={`health-value ${getHealthStatus('averageOrderValue', stats.platformHealth.averageOrderValue)}`}>
                {formatCurrency(stats.platformHealth.averageOrderValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <a href="/admin/users" className="action-card">
              <Users size={24} />
              <div className="action-content">
                <h3>User Management</h3>
                <p>Manage user accounts and KYC verification</p>
              </div>
            </a>

            <a href="/admin/disputes" className="action-card">
              <AlertTriangle size={24} />
              <div className="action-content">
                <h3>Dispute Resolution Center</h3>
                <p>Handle disputes, review evidence, and resolution tools</p>
              </div>
            </a>

            <a href="/admin/orders" className="action-card">
              <Package size={24} />
              <div className="action-content">
                <h3>Order Management</h3>
                <p>Monitor and manage platform orders</p>
              </div>
            </a>

            <a href="/admin/analytics" className="action-card">
              <BarChart3 size={24} />
              <div className="action-content">
                <h3>Analytics</h3>
                <p>Detailed platform analytics and reports</p>
              </div>
            </a>

            <a href="/admin/settings" className="action-card">
              <Settings size={24} />
              <div className="action-content">
                <h3>System Settings</h3>
                <p>Platform configuration and settings</p>
              </div>
            </a>

            <a href="/admin/security" className="action-card">
              <Shield size={24} />
              <div className="action-content">
                <h3>Security Center</h3>
                <p>Security monitoring and alerts</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-feed">
            {activity.length > 0 ? (
              activity.map((item, index) => (
                <div key={index} className="activity-item">
                  {getActivityIcon(item.type)}
                  <div className="activity-content">
                    <p className="activity-description">{item.description}</p>
                    <span className="activity-time">{formatDate(item.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <Activity size={48} />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="detailed-stats">
          <div className="stats-row">
            <div className="stats-section">
              <h3>User Statistics</h3>
              <div className="stats-list">
                <div className="stats-item">
                  <span>Active Users</span>
                  <span>{stats.users.active.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>Verified Users</span>
                  <span>{stats.users.verified.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>Verification Rate</span>
                  <span>{stats.users.verificationRate}%</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Transaction Statistics</h3>
              <div className="stats-list">
                <div className="stats-item">
                  <span>Total Transactions</span>
                  <span>{stats.transactions.total.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>Period Transactions</span>
                  <span>{stats.transactions.period.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>Transaction Volume</span>
                  <span>{formatCurrency(stats.transactions.volume)}</span>
                </div>
              </div>
            </div>

            <div className="stats-section">
              <h3>Product Statistics</h3>
              <div className="stats-list">
                <div className="stats-item">
                  <span>Total Products</span>
                  <span>{stats.products.total.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>Active Products</span>
                  <span>{stats.products.active.toLocaleString()}</span>
                </div>
                <div className="stats-item">
                  <span>New Products</span>
                  <span>{stats.products.new.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 