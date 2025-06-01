import '../styles/AdminAnalytics.css';
import React, { useState, useEffect, useCallback } from 'react';
import { apiEndpoints } from '../services/api';
import { 
  TrendingUp, 
  BarChart3, 
  Calendar,
  Download,
  RefreshCw,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Activity,
  Target,
  PieChart
} from 'lucide-react';
import { logger } from '../utils/logger';

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [dateRange, setDateRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const metrics = [
    { key: 'revenue', label: 'Revenue', icon: DollarSign, color: '#10b981' },
    { key: 'users', label: 'Users', icon: Users, color: '#3b82f6' },
    { key: 'orders', label: 'Orders', icon: ShoppingCart, color: '#f59e0b' },
    { key: 'products', label: 'Products', icon: Package, color: '#8b5cf6' },
    { key: 'disputes', label: 'Disputes', icon: AlertTriangle, color: '#ef4444' },
    { key: 'traffic', label: 'Traffic', icon: Activity, color: '#06b6d4' }
  ];

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiEndpoints.getAnalytics({
        metric: selectedMetric,
        range: dateRange
      });

      setAnalytics(response.data);
    } catch (err) {
      logger.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleExportReport = async () => {
    try {
      const response = await apiEndpoints.exportAnalyticsReport({
        metric: selectedMetric,
        range: dateRange,
        format: 'csv'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${selectedMetric}-${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      logger.error('Failed to export report:', err);
      alert('Failed to export report');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US').format(number);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getMetricIcon = (metricKey) => {
    const metric = metrics.find(m => m.key === metricKey);
    if (!metric) return Activity;
    return metric.icon;
  };

  const getMetricColor = (metricKey) => {
    const metric = metrics.find(m => m.key === metricKey);
    return metric ? metric.color : '#6b7280';
  };

  if (loading) {
    return (
      <div className="admin-analytics">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-analytics">
        <div className="analytics-error">
          <AlertTriangle size={48} />
          <h2>Error Loading Analytics</h2>
          <p>{error}</p>
          <button onClick={fetchAnalytics} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics">
      <div className="analytics-container">
        {/* Header */}
        <div className="analytics-header">
          <div className="header-content">
            <h1>Platform Analytics</h1>
            <p>Comprehensive insights and performance metrics</p>
          </div>
          
          <div className="header-controls">
            <div className="date-range-selector">
              <Calendar size={16} />
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="date-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
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

            <button 
              onClick={handleExportReport}
              className="export-button"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="metric-selector">
          <h2>Select Metric</h2>
          <div className="metric-tabs">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`metric-tab ${selectedMetric === metric.key ? 'active' : ''}`}
                  style={{ 
                    '--metric-color': selectedMetric === metric.key ? metric.color : '#6b7280'
                  }}
                >
                  <Icon size={20} />
                  <span>{metric.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="key-metrics">
              <div className="metric-card primary">
                <div className="metric-icon" style={{ backgroundColor: getMetricColor(selectedMetric) }}>
                  {React.createElement(getMetricIcon(selectedMetric), { size: 24, color: 'white' })}
                </div>
                <div className="metric-content">
                  <h3>Total {metrics.find(m => m.key === selectedMetric)?.label}</h3>
                  <div className="metric-value">
                    {selectedMetric === 'revenue' 
                      ? formatCurrency(analytics.summary.total)
                      : formatNumber(analytics.summary.total)
                    }
                  </div>
                  <div className="metric-change">
                    <span className={`change ${analytics.summary.changePercentage >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercentage(analytics.summary.changePercentage)}
                    </span>
                    vs previous period
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <TrendingUp size={20} />
                  <span>Growth Rate</span>
                </div>
                <div className="metric-value">
                  {formatPercentage(analytics.summary.growthRate)}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <Target size={20} />
                  <span>Average Daily</span>
                </div>
                <div className="metric-value">
                  {selectedMetric === 'revenue' 
                    ? formatCurrency(analytics.summary.averageDaily)
                    : formatNumber(analytics.summary.averageDaily)
                  }
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <BarChart3 size={20} />
                  <span>Peak Value</span>
                </div>
                <div className="metric-value">
                  {selectedMetric === 'revenue' 
                    ? formatCurrency(analytics.summary.peak)
                    : formatNumber(analytics.summary.peak)
                  }
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-container main-chart">
                <div className="chart-header">
                  <h3>{metrics.find(m => m.key === selectedMetric)?.label} Trend</h3>
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: getMetricColor(selectedMetric) }}></div>
                      <span>Current Period</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#e5e7eb' }}></div>
                      <span>Previous Period</span>
                    </div>
                  </div>
                </div>
                <div className="chart-placeholder">
                  <BarChart3 size={48} style={{ color: getMetricColor(selectedMetric) }} />
                  <p>Time series chart for {metrics.find(m => m.key === selectedMetric)?.label.toLowerCase()}</p>
                  <small>Chart visualization would be rendered here using a charting library like Chart.js or D3</small>
                </div>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Distribution</h3>
                </div>
                <div className="chart-placeholder">
                  <PieChart size={48} style={{ color: getMetricColor(selectedMetric) }} />
                  <p>Distribution breakdown</p>
                  <small>Pie chart showing category distribution</small>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="breakdown-section">
              <h3>Detailed Breakdown</h3>
              <div className="breakdown-grid">
                {analytics.breakdown && analytics.breakdown.map((item, index) => (
                  <div key={index} className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="breakdown-label">{item.label}</span>
                      <span className="breakdown-value">
                        {selectedMetric === 'revenue' 
                          ? formatCurrency(item.value)
                          : formatNumber(item.value)
                        }
                      </span>
                    </div>
                    <div className="breakdown-bar">
                      <div 
                        className="breakdown-fill"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: getMetricColor(selectedMetric)
                        }}
                      ></div>
                    </div>
                    <div className="breakdown-meta">
                      <span>{item.percentage.toFixed(1)}% of total</span>
                      <span className={`breakdown-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercentage(item.change)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            {analytics.topPerformers && (
              <div className="performers-section">
                <h3>Top Performers</h3>
                <div className="performers-list">
                  {analytics.topPerformers.map((performer, index) => (
                    <div key={index} className="performer-item">
                      <div className="performer-rank">#{index + 1}</div>
                      <div className="performer-info">
                        <h4>{performer.name}</h4>
                        <p>{performer.category}</p>
                      </div>
                      <div className="performer-stats">
                        <div className="performer-value">
                          {selectedMetric === 'revenue' 
                            ? formatCurrency(performer.value)
                            : formatNumber(performer.value)
                          }
                        </div>
                        <div className="performer-change">
                          <span className={`change ${performer.change >= 0 ? 'positive' : 'negative'}`}>
                            {formatPercentage(performer.change)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights and Recommendations */}
            {analytics.insights && (
              <div className="insights-section">
                <h3>Insights & Recommendations</h3>
                <div className="insights-list">
                  {analytics.insights.map((insight, index) => (
                    <div key={index} className={`insight-item ${insight.type}`}>
                      <div className="insight-icon">
                        {insight.type === 'positive' && <TrendingUp size={20} />}
                        {insight.type === 'warning' && <AlertTriangle size={20} />}
                        {insight.type === 'info' && <Activity size={20} />}
                      </div>
                      <div className="insight-content">
                        <h4>{insight.title}</h4>
                        <p>{insight.description}</p>
                        {insight.recommendation && (
                          <div className="insight-recommendation">
                            <strong>Recommendation:</strong> {insight.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics; 