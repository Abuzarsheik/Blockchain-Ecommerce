import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  ShoppingCart, 
  DollarSign,
  Users,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from 'lucide-react';
import './InteractiveDashboard.css';

const InteractiveDashboard = ({ userType = 'buyer' }) => {
  const [selectedMetric, setSelectedMetric] = useState('sales');
  const [timeRange, setTimeRange] = useState('7d');
  const [animatedValues, setAnimatedValues] = useState({});

  // Mock data - replace with real API calls
  const mockData = {
    overview: {
      totalSales: 125.4,
      totalVolume: 1250.8,
      nftsSold: 45,
      avgPrice: 2.8,
      topCollection: 'Crypto Punks',
      growthRate: 15.3
    },
    salesData: {
      '24h': [2.1, 3.2, 1.8, 4.5, 2.9, 3.7, 5.2, 2.4, 3.1, 4.8, 2.6, 3.9],
      '7d': [15.2, 18.7, 22.1, 16.8, 25.3, 19.6, 28.4, 21.9, 17.5, 24.8, 20.3, 26.7],
      '30d': [145, 168, 192, 156, 203, 178, 225, 189, 167, 198, 182, 211]
    },
    topNFTs: [
      { id: 1, name: 'Digital Dreams #42', sales: 12, volume: 24.8, image: '/images/nft1.jpg' },
      { id: 2, name: 'Cosmic Cat #156', sales: 8, volume: 18.5, image: '/images/nft2.jpg' },
      { id: 3, name: 'Future Vision #23', sales: 6, volume: 15.2, image: '/images/nft3.jpg' },
      { id: 4, name: 'Abstract Art #89', sales: 5, volume: 12.7, image: '/images/nft4.jpg' }
    ],
    categoryBreakdown: [
      { category: 'Art', percentage: 35, value: 437.5, color: '#3b82f6' },
      { category: 'Gaming', percentage: 28, value: 350, color: '#10b981' },
      { category: 'Music', percentage: 20, value: 250, color: '#f59e0b' },
      { category: 'Sports', percentage: 12, value: 150, color: '#ef4444' },
      { category: 'Other', percentage: 5, value: 62.5, color: '#8b5cf6' }
    ]
  };

  // Animate numbers
  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      setAnimatedValues({
        totalSales: mockData.overview.totalSales * easedProgress,
        totalVolume: mockData.overview.totalVolume * easedProgress,
        nftsSold: Math.floor(mockData.overview.nftsSold * easedProgress),
        avgPrice: mockData.overview.avgPrice * easedProgress,
        growthRate: mockData.overview.growthRate * easedProgress
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, []);

  const chartData = useMemo(() => {
    return mockData.salesData[timeRange] || [];
  }, [timeRange]);

  const MetricCard = ({ title, value, change, icon: Icon, trend, format = 'number' }) => {
    const formatValue = (val) => {
      switch (format) {
        case 'currency':
          return `$${val.toFixed(1)}K`;
        case 'eth':
          return `${val.toFixed(1)} ETH`;
        case 'percentage':
          return `${val.toFixed(1)}%`;
        default:
          return Math.floor(val).toLocaleString();
      }
    };

    return (
      <div className="metric-card">
        <div className="metric-header">
          <div className="metric-icon">
            <Icon size={24} />
          </div>
          <div className={`metric-trend ${trend}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        <div className="metric-content">
          <h3 className="metric-title">{title}</h3>
          <div className="metric-value">
            {formatValue(value)}
          </div>
        </div>
        <div className="metric-sparkline">
          {/* Mini chart would go here */}
          <div className="sparkline-bars">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="sparkline-bar"
                style={{ 
                  height: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const InteractiveChart = () => {
    const maxValue = Math.max(...chartData);
    
    return (
      <div className="interactive-chart">
        <div className="chart-header">
          <h3>Sales Volume</h3>
          <div className="time-range-selector">
            {['24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                className={`range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div className="chart-container">
          <div className="chart-grid">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid-line" />
            ))}
          </div>
          
          <div className="chart-bars">
            {chartData.map((value, index) => (
              <div
                key={index}
                className="chart-bar"
                style={{
                  height: `${(value / maxValue) * 100}%`,
                  animationDelay: `${index * 0.1}s`
                }}
                title={`${value} ETH`}
              >
                <div className="bar-tooltip">
                  {value} ETH
                </div>
              </div>
            ))}
          </div>
          
          <div className="chart-overlay">
            <svg width="100%" height="100%">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <polyline
                points={chartData.map((value, index) => 
                  `${(index / (chartData.length - 1)) * 100},${100 - (value / maxValue) * 80}`
                ).join(' ')}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                className="trend-line"
              />
              {chartData.map((value, index) => (
                <circle
                  key={index}
                  cx={`${(index / (chartData.length - 1)) * 100}%`}
                  cy={`${100 - (value / maxValue) * 80}%`}
                  r="4"
                  fill="#3b82f6"
                  className="data-point"
                  style={{ animationDelay: `${index * 0.1 + 0.5}s` }}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  const CategoryDonut = () => {
    let cumulativePercentage = 0;
    
    return (
      <div className="category-donut">
        <h3>Sales by Category</h3>
        <div className="donut-container">
          <svg viewBox="0 0 200 200" className="donut-chart">
            <defs>
              {mockData.categoryBreakdown.map((item, index) => (
                <linearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={item.color} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={item.color} stopOpacity="1" />
                </linearGradient>
              ))}
            </defs>
            {mockData.categoryBreakdown.map((item, index) => {
              const startAngle = cumulativePercentage * 3.6;
              const endAngle = (cumulativePercentage + item.percentage) * 3.6;
              cumulativePercentage += item.percentage;
              
              const startX = 100 + 70 * Math.cos((startAngle - 90) * Math.PI / 180);
              const startY = 100 + 70 * Math.sin((startAngle - 90) * Math.PI / 180);
              const endX = 100 + 70 * Math.cos((endAngle - 90) * Math.PI / 180);
              const endY = 100 + 70 * Math.sin((endAngle - 90) * Math.PI / 180);
              
              const largeArcFlag = item.percentage > 50 ? 1 : 0;
              
              return (
                <path
                  key={index}
                  d={`M 100 100 L ${startX} ${startY} A 70 70 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                  fill={`url(#gradient-${index})`}
                  className="donut-segment"
                  style={{ animationDelay: `${index * 0.2}s` }}
                  title={`${item.category}: ${item.percentage}%`}
                />
              );
            })}
            <circle cx="100" cy="100" r="35" fill="white" />
            <text x="100" y="95" textAnchor="middle" className="donut-center-text">Total</text>
            <text x="100" y="110" textAnchor="middle" className="donut-center-value">1.25K ETH</text>
          </svg>
          
          <div className="donut-legend">
            {mockData.categoryBreakdown.map((item, index) => (
              <div key={index} className="legend-item">
                <div 
                  className="legend-color" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="legend-label">{item.category}</span>
                <span className="legend-value">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const TopNFTsList = () => (
    <div className="top-nfts-list">
      <h3>Top Performing NFTs</h3>
      <div className="nft-list">
        {mockData.topNFTs.map((nft, index) => (
          <div key={nft.id} className="nft-item" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="nft-rank">#{index + 1}</div>
            <div className="nft-image">
              <img src={nft.image} alt={nft.name} />
              <div className="nft-overlay">
                <Eye size={16} />
              </div>
            </div>
            <div className="nft-info">
              <h4>{nft.name}</h4>
              <div className="nft-stats">
                <span className="sales">{nft.sales} sales</span>
                <span className="volume">{nft.volume} ETH</span>
              </div>
            </div>
            <div className="nft-trend">
              <TrendingUp size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="interactive-dashboard">
      <div className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <div className="dashboard-controls">
          <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
            <option value="sales">Sales</option>
            <option value="volume">Volume</option>
            <option value="users">Users</option>
            <option value="revenue">Revenue</option>
          </select>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Total Sales"
          value={animatedValues.totalSales || 0}
          change={15.3}
          trend="up"
          icon={DollarSign}
          format="eth"
        />
        <MetricCard
          title="Volume"
          value={animatedValues.totalVolume || 0}
          change={8.7}
          trend="up"
          icon={Activity}
          format="currency"
        />
        <MetricCard
          title="NFTs Sold"
          value={animatedValues.nftsSold || 0}
          change={12.4}
          trend="up"
          icon={ShoppingCart}
        />
        <MetricCard
          title="Avg Price"
          value={animatedValues.avgPrice || 0}
          change={-3.2}
          trend="down"
          icon={Star}
          format="eth"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-section">
          <InteractiveChart />
        </div>
        <div className="chart-section">
          <CategoryDonut />
        </div>
      </div>

      <div className="bottom-section">
        <TopNFTsList />
      </div>
    </div>
  );
};

export default InteractiveDashboard; 