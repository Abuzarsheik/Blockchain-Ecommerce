import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import '../styles/SellerAnalytics.css';

const SellerAnalytics = () => {
    const { user } = useSelector(state => state.auth);
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState({
        totalRevenue: 0,
        totalSales: 0,
        ordersReceived: 0,
        averageRating: 0,
        pendingPayouts: 0,
        recentSales: [],
        monthlyEarnings: [],
        topProducts: []
    });

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            
            // Mock data for demonstration - replace with real API calls
            const mockData = {
                totalRevenue: 12450.75,
                totalSales: 87,
                ordersReceived: 92,
                averageRating: 4.6,
                pendingPayouts: 1250.30,
                recentSales: [
                    {
                        id: 1,
                        productName: 'Wireless Bluetooth Headphones',
                        buyerName: 'John Doe',
                        amount: 89.99,
                        date: '2024-01-02',
                        status: 'completed'
                    },
                    {
                        id: 2,
                        productName: 'Smart Fitness Watch',
                        buyerName: 'Jane Smith',
                        amount: 199.99,
                        date: '2024-01-01',
                        status: 'completed'
                    },
                    {
                        id: 3,
                        productName: 'USB-C Cable',
                        buyerName: 'Mike Johnson',
                        amount: 15.99,
                        date: '2023-12-30',
                        status: 'pending'
                    },
                    {
                        id: 4,
                        productName: 'Laptop Stand',
                        buyerName: 'Sarah Wilson',
                        amount: 45.99,
                        date: '2023-12-29',
                        status: 'completed'
                    },
                    {
                        id: 5,
                        productName: 'Phone Case',
                        buyerName: 'David Brown',
                        amount: 24.99,
                        date: '2023-12-28',
                        status: 'completed'
                    }
                ],
                monthlyEarnings: [
                    { month: 'Jan', earnings: 3450 },
                    { month: 'Feb', earnings: 2890 },
                    { month: 'Mar', earnings: 3210 },
                    { month: 'Apr', earnings: 2650 },
                    { month: 'May', earnings: 4120 },
                    { month: 'Jun', earnings: 3890 }
                ],
                topProducts: [
                    { name: 'Wireless Bluetooth Headphones', sales: 23, revenue: 2069.77 },
                    { name: 'Smart Fitness Watch', sales: 15, revenue: 2999.85 },
                    { name: 'Laptop Stand', sales: 18, revenue: 827.82 },
                    { name: 'Phone Case', sales: 31, revenue: 774.69 }
                ]
            };

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setAnalyticsData(mockData);
        } catch (error) {
            logger.error('Error fetching analytics:', error);
            console.error('Analytics fetch failed:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            completed: { color: '#10b981', bg: '#d1fae5', text: 'Completed' },
            pending: { color: '#f59e0b', bg: '#fef3c7', text: 'Pending' },
            cancelled: { color: '#ef4444', bg: '#fee2e2', text: 'Cancelled' }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        
        return (
            <span 
                className="status-badge"
                style={{ 
                    color: config.color, 
                    backgroundColor: config.bg,
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                }}
            >
                {config.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="seller-analytics-loading">
                <div className="loading-spinner"></div>
                <p>Loading your sales analytics...</p>
            </div>
        );
    }

    return (
        <div className="seller-analytics">
            <div className="analytics-header">
                <h1>📊 Sales Analytics</h1>
                <p>Track your performance and earnings</p>
                <button 
                    className="refresh-btn"
                    onClick={fetchAnalytics}
                    disabled={loading}
                >
                    🔄 Refresh Data
                </button>
            </div>

            {/* Key Metrics Cards */}
            <div className="metrics-grid">
                <div className="metric-card revenue">
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                        <h3>{formatCurrency(analyticsData.totalRevenue)}</h3>
                        <p>Total Revenue</p>
                        <span className="metric-trend positive">+12.5% from last month</span>
                    </div>
                </div>

                <div className="metric-card sales">
                    <div className="metric-icon">📦</div>
                    <div className="metric-content">
                        <h3>{analyticsData.totalSales}</h3>
                        <p>Total Sales</p>
                        <span className="metric-trend positive">+8 this month</span>
                    </div>
                </div>

                <div className="metric-card orders">
                    <div className="metric-icon">📋</div>
                    <div className="metric-content">
                        <h3>{analyticsData.ordersReceived}</h3>
                        <p>Orders Received</p>
                        <span className="metric-trend neutral">Same as last month</span>
                    </div>
                </div>

                <div className="metric-card rating">
                    <div className="metric-icon">⭐</div>
                    <div className="metric-content">
                        <h3>{analyticsData.averageRating}/5</h3>
                        <p>Average Rating</p>
                        <span className="metric-trend positive">Excellent performance</span>
                    </div>
                </div>

                <div className="metric-card pending">
                    <div className="metric-icon">💳</div>
                    <div className="metric-content">
                        <h3>{formatCurrency(analyticsData.pendingPayouts)}</h3>
                        <p>Pending Payouts</p>
                        <span className="metric-trend neutral">Processing</span>
                    </div>
                </div>

                <div className="metric-card conversion">
                    <div className="metric-icon">📈</div>
                    <div className="metric-content">
                        <h3>
                            {analyticsData.ordersReceived > 0 
                                ? Math.round((analyticsData.totalSales / analyticsData.ordersReceived) * 100)
                                : 0
                            }%
                        </h3>
                        <p>Conversion Rate</p>
                        <span className="metric-trend positive">Above average</span>
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="recent-sales-section">
                <h2>🛍️ Recent Sales</h2>
                <div className="sales-table-container">
                    <table className="sales-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Buyer</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analyticsData.recentSales.map(sale => (
                                <tr key={sale.id}>
                                    <td className="product-cell">
                                        <span className="product-name">{sale.productName}</span>
                                    </td>
                                    <td>{sale.buyerName}</td>
                                    <td className="amount-cell">{formatCurrency(sale.amount)}</td>
                                    <td>{formatDate(sale.date)}</td>
                                    <td>{getStatusBadge(sale.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="performance-summary">
                <div className="summary-section">
                    <h2>📈 Performance Overview</h2>
                    <div className="performance-stats">
                        <div className="stat-item">
                            <span className="stat-label">Average Order Value:</span>
                            <span className="stat-value">
                                {formatCurrency(
                                    analyticsData.totalSales > 0 
                                        ? analyticsData.totalRevenue / analyticsData.totalSales
                                        : 0
                                )}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Revenue per Product:</span>
                            <span className="stat-value">
                                {formatCurrency(
                                    analyticsData.topProducts.length > 0 
                                        ? analyticsData.totalRevenue / analyticsData.topProducts.length
                                        : 0
                                )}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Customer Satisfaction:</span>
                            <span className="stat-value">
                                {analyticsData.averageRating >= 4.5 ? 'Excellent' : 
                                 analyticsData.averageRating >= 4.0 ? 'Good' : 
                                 analyticsData.averageRating >= 3.0 ? 'Average' : 'Needs Improvement'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="top-products-section">
                    <h2>🏆 Top Performing Products</h2>
                    <div className="top-products-list">
                        {analyticsData.topProducts.map((product, index) => (
                            <div key={index} className="top-product-item">
                                <div className="product-rank">#{index + 1}</div>
                                <div className="product-info">
                                    <h4>{product.name}</h4>
                                    <div className="product-metrics">
                                        <span>{product.sales} sales</span>
                                        <span>{formatCurrency(product.revenue)} revenue</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>🚀 Quick Actions</h2>
                <div className="actions-grid">
                    <button className="action-btn">
                        📊 View Detailed Reports
                    </button>
                    <button className="action-btn">
                        💰 Request Payout
                    </button>
                    <button className="action-btn">
                        📧 Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SellerAnalytics; 