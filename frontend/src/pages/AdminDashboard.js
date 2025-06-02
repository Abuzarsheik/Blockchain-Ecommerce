import '../styles/AdminDashboard.css';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart3,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  Activity,
  CheckCircle,
  Settings,
  Shield,
  User,
  Eye,
  FileText,
  MessageSquare,
  CreditCard,
  Globe,
  Database,
  Lock,
  Monitor,
  PieChart,
  UserCheck,
  Zap,
  Bell,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Trending
} from 'lucide-react';
import { logger } from '../utils/logger';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Enhanced Quick Actions with working links
  const quickActions = useMemo(() => [
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      color: 'blue',
      path: '/admin/users',
      count: stats?.users?.total || 0,
      trend: stats?.users?.new || 0,
      priority: 'high'
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'View detailed platform analytics',
      icon: BarChart3,
      color: 'green',
      path: '/admin/analytics',
      count: stats?.revenue?.total || 0,
      trend: stats?.revenue?.period || 0,
      priority: 'high'
    },
    {
      id: 'transactions',
      title: 'Transaction Monitor',
      description: 'Monitor payments and transactions',
      icon: CreditCard,
      color: 'purple',
      path: '/admin/transactions',
      count: stats?.transactions?.total || 0,
      trend: stats?.transactions?.period || 0,
      priority: 'medium'
    },
    {
      id: 'disputes',
      title: 'Dispute Resolution',
      description: 'Handle user disputes and issues',
      icon: AlertTriangle,
      color: 'orange',
      path: '/admin/disputes',
      count: stats?.disputes?.open || 0,
      trend: stats?.disputes?.resolved || 0,
      priority: 'high'
    },
    {
      id: 'security',
      title: 'Security Audit',
      description: 'Security logs and audit trail',
      icon: Shield,
      color: 'red',
      path: '/admin/security',
      count: 0,
      trend: 0,
      priority: 'medium'
    },
    {
      id: 'system-health',
      title: 'System Health',
      description: 'Monitor system performance',
      icon: Monitor,
      color: 'teal',
      path: '/admin/health',
      count: stats?.platformHealth?.orderFulfillmentRate || 0,
      trend: stats?.platformHealth?.userGrowthRate || 0,
      priority: 'medium'
    },
    {
      id: 'moderation',
      title: 'Content Moderation',
      description: 'Review and moderate content',
      icon: Eye,
      color: 'indigo',
      path: '/admin/moderation',
      count: 0,
      trend: 0,
      priority: 'low'
    },
    {
      id: 'settings',
      title: 'Platform Settings',
      description: 'Configure platform settings',
      icon: Settings,
      color: 'gray',
      path: '/admin/settings',
      count: 0,
      trend: 0,
      priority: 'low'
    }
  ], [stats]);

  // Quick Stats Cards
  const quickStats = useMemo(() => [
    {
      title: 'Total Revenue',
      value: stats?.revenue?.total || 0,
      change: stats?.revenue?.period || 0,
      icon: DollarSign,
      color: 'green',
      format: 'currency'
    },
    {
      title: 'Active Users',
      value: stats?.users?.active || 0,
      change: stats?.users?.new || 0,
      icon: Users,
      color: 'blue',
      format: 'number'
    },
    {
      title: 'Orders Today',
      value: stats?.orders?.period || 0,
      change: stats?.orders?.total || 0,
      icon: ShoppingCart,
      color: 'purple',
      format: 'number'
    },
    {
      title: 'Products Listed',
      value: stats?.products?.active || 0,
      change: stats?.products?.new || 0,
      icon: Package,
      color: 'orange',
      format: 'number'
    }
  ], [stats]);

  // API endpoints - connecting to real backend
  const apiEndpoints = useMemo(() => ({
    getDashboardStats: async (period) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/dashboard-stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    }
  }), []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiEndpoints.getDashboardStats(selectedPeriod);
      
      if (response.success) {
        setStats(response.data.stats);
        
        // Ensure activity data is properly structured
        const activityData = response.data.activity || [];
        const validActivity = activityData.filter(item => 
          item && typeof item === 'object' && !Array.isArray(item)
        ).map(item => ({
          type: item.type || 'default',
          description: item.description || item.message || 'Activity occurred',
          timestamp: item.timestamp || new Date().toISOString(),
          data: item.data || null
        }));
        
        setActivity(validActivity);
      } else {
        throw new Error(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      logger.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      
      // Set empty activity to prevent rendering errors
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, apiEndpoints]);

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

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
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

  const filteredActions = quickActions.filter(action => {
    if (activeFilter === 'all') return true;
    return action.priority === activeFilter;
  }).filter(action => {
    if (!quickSearch) return true;
    return action.title.toLowerCase().includes(quickSearch.toLowerCase()) ||
           action.description.toLowerCase().includes(quickSearch.toLowerCase());
  });

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
    <div className="admin-dashboard advanced-admin">
      <div className="admin-dashboard-container">
        {/* Enhanced Header */}
        <div className="dashboard-header enhanced-header">
          <div className="header-content">
            <div className="header-main">
              <h1>🛡️ Admin Control Center</h1>
              <p>Comprehensive platform management and monitoring</p>
            </div>
            <div className="header-badge">
              <span className="admin-badge">
                <Shield size={16} />
                Administrator
              </span>
            </div>
          </div>
          
          <div className="header-controls enhanced-controls">
            <div className="control-group">
              <div className="quick-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                />
              </div>
              
              <div className="filter-tabs">
                <button 
                  className={activeFilter === 'all' ? 'active' : ''} 
                  onClick={() => setActiveFilter('all')}
                >
                  All
                </button>
                <button 
                  className={activeFilter === 'high' ? 'active' : ''} 
                  onClick={() => setActiveFilter('high')}
                >
                  High Priority
                </button>
                <button 
                  className={activeFilter === 'medium' ? 'active' : ''} 
                  onClick={() => setActiveFilter('medium')}
                >
                  Medium
                </button>
              </div>
            </div>

            <div className="control-group">
              <div className="period-selector">
                <Calendar size={16} />
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
                <RefreshCw size={16} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              <button className="export-button">
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="quick-stats-grid">
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            const isPositive = stat.change >= 0;
            
            return (
              <div key={index} className={`quick-stat-card ${stat.color}`}>
                <div className="stat-header">
                  <div className={`stat-icon ${stat.color}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className={`trend-indicator ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {Math.abs(stat.change)}
                  </div>
                </div>
                <div className="stat-content">
                  <h3>{stat.title}</h3>
                  <div className="stat-value">
                    {stat.format === 'currency' ? formatCurrency(stat.value) : formatNumber(stat.value)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Quick Actions */}
        <div className="quick-actions-section enhanced-actions">
          <div className="section-header">
            <h2>🚀 Quick Actions</h2>
            <p>Access key administrative functions</p>
          </div>
          
          <div className="quick-actions-grid">
            {filteredActions.map((action) => {
              const IconComponent = action.icon;
              
              return (
                <Link 
                  key={action.id} 
                  to={action.path} 
                  className={`action-card ${action.color} priority-${action.priority}`}
                >
                  <div className="action-header">
                    <div className={`action-icon ${action.color}`}>
                      <IconComponent size={24} />
                    </div>
                    {action.priority === 'high' && (
                      <div className="priority-badge high">
                        <Zap size={12} />
                      </div>
                    )}
                  </div>
                  
                  <div className="action-content">
                    <h3>{action.title}</h3>
                    <p>{action.description}</p>
                    
                    {action.count > 0 && (
                      <div className="action-stats">
                        <span className="count">{formatNumber(action.count)}</span>
                        {action.trend > 0 && (
                          <span className="trend">
                            +{formatNumber(action.trend)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="action-arrow">
                    <ArrowUpRight size={16} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Platform Health Status */}
        <div className="health-status-section">
          <div className="section-header">
            <h2>📊 Platform Health</h2>
            <p>Real-time system performance metrics</p>
          </div>
          
          <div className="health-metrics">
            {stats?.platformHealth && Object.entries(stats.platformHealth).map(([key, value]) => {
              const status = getHealthStatus(key, value);
              
              return (
                <div key={key} className={`health-metric ${status}`}>
                  <div className="metric-header">
                    <span className="metric-name">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <span className={`status-indicator ${status}`}></span>
                  </div>
                  <div className="metric-value">
                    {typeof value === 'number' ? (
                      key.includes('Rate') || key.includes('Percentage') ? 
                        `${value.toFixed(1)}%` : 
                        key.includes('Value') ? formatCurrency(value) : value.toFixed(1)
                    ) : value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="activity-section enhanced-activity">
          <div className="section-header">
            <h2>⚡ Recent Activity</h2>
            <p>Latest platform events and user actions</p>
          </div>
          
          <div className="activity-feed">
            {activity.length > 0 ? (
              activity.slice(0, 10).map((item, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon-wrapper">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="activity-content">
                    <p className="activity-description">
                      {item.description || item.message || 'Activity occurred'}
                    </p>
                    <div className="activity-meta">
                      <span className="activity-time">
                        <Clock size={12} />
                        {item.timestamp ? formatDate(item.timestamp) : 'Unknown time'}
                      </span>
                      {item.data && (
                        <div className="activity-data">
                          {item.data.amount && (
                            <span className="amount">{formatCurrency(item.data.amount)}</span>
                          )}
                          {item.data.status && (
                            <span className={`status ${item.data.status}`}>{item.data.status}</span>
                          )}
                        </div>
                      )}
                    </div>
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

        {/* Quick Links Footer */}
        <div className="quick-links-footer">
          <div className="footer-section">
            <h3>User Management</h3>
            <div className="footer-links">
              <Link to="/admin/users">👥 Manage Users</Link>
              <Link to="/admin/users?filter=new">🆕 New Users</Link>
              <Link to="/admin/users?filter=sellers">🏪 Sellers</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Financial</h3>
            <div className="footer-links">
              <Link to="/admin/transactions">💳 Transactions</Link>
              <Link to="/admin/revenue">💰 Revenue Reports</Link>
              <Link to="/admin/disputes">⚖️ Disputes</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>System</h3>
            <div className="footer-links">
              <Link to="/admin/security">🔒 Security</Link>
              <Link to="/admin/health">🏥 System Health</Link>
              <Link to="/admin/settings">⚙️ Settings</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Content</h3>
            <div className="footer-links">
              <Link to="/admin/moderation">👁️ Moderation</Link>
              <Link to="/admin/analytics">📈 Analytics</Link>
              <Link to="/admin/reports">📋 Reports</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 