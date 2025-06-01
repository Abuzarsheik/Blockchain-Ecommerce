import React, { useState, useEffect } from 'react';
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
import DataVisualizationDashboard from '../components/DataVisualization';
import { usePersonalization } from '../utils/personalization';
import '../styles/Dashboard.css';
import { useAuth } from '../contexts/AuthContext';
import PersonalizedRecommendations from '../components/PersonalizedRecommendations';
import RecentActivity from '../components/RecentActivity';
import NFTShowcase from '../components/NFTShowcase';

const Dashboard = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const { items } = useSelector(state => state.cart);
  const { insights } = usePersonalization();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    nftData: [],
    salesData: [],
    totalRevenue: 0,
    totalSales: 0,
    averagePrice: 0
  });

  useEffect(() => {
    // TODO: Replace with actual API calls to fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // const response = await dashboardAPI.getData(user.id, dateRange);
        // setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchDashboardData();
    }
  }, [authUser, dateRange]);

  if (!isAuthenticated) {
    return (
      <div className="auth-prompt">
        <h2>Please log in to access your dashboard</h2>
        <Link to="/login" className="login-link">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.firstName || 'User'}!</h1>
        <p>Your blockchain marketplace journey continues</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="stat-value">
            {loading ? 'Loading...' : `${dashboardData.totalRevenue} ETH`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Items Sold</h3>
          <p className="stat-value">
            {loading ? 'Loading...' : dashboardData.totalSales}
          </p>
        </div>
        <div className="stat-card">
          <h3>Average Price</h3>
          <p className="stat-value">
            {loading ? 'Loading...' : `${dashboardData.averagePrice} ETH`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Cart Items</h3>
          <p className="stat-value">{items.length}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="left-panel">
          <PersonalizedRecommendations insights={insights} />
          <RecentActivity />
        </div>

        <div className="right-panel">
          <NFTShowcase 
            nftData={dashboardData.nftData}
            salesData={dashboardData.salesData}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 