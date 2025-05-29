import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Package, Calendar, DollarSign, Eye, ArrowRight } from 'lucide-react';
import { fetchOrders } from '../store/slices/ordersSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { getNFTImageUrl, handleImageError } from '../utils/imageUtils';
import '../styles/OrderHistory.css';

const OrderHistory = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { items: orders, loading, error } = useSelector(state => state.orders);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchOrders());
    }
  }, [dispatch, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="order-history-unauthorized">
        <Package size={64} className="unauthorized-icon" />
        <h2>Please Login</h2>
        <p>You need to be logged in to view your order history.</p>
        <Link to="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-history-loading">
        <LoadingSpinner />
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history-error">
        <h2>Error Loading Orders</h2>
        <p>{error}</p>
        <button onClick={() => dispatch(fetchOrders())} className="btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="order-history">
      <div className="order-history-container">
        <div className="order-history-header">
          <h1>Order History</h1>
          <p>Track and manage all your NFT purchases</p>
        </div>

        {orders.length === 0 ? (
          <div className="order-history-empty">
            <Package size={64} className="empty-icon" />
            <h3>No Orders Yet</h3>
            <p>You haven't made any purchases yet. Start exploring our marketplace!</p>
            <Link to="/catalog" className="btn-primary">
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id || order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3 className="order-id">#{order.orderNumber || order.id}</h3>
                    <span className="order-date">
                      <Calendar size={16} />
                      {formatDate(order.created_at || order.createdAt || order.date)}
                    </span>
                  </div>
                  <div className={`order-status ${getStatusColor(order.status)}`}>
                    {order.status || 'Pending'}
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-items">
                    <Package size={16} />
                    <span>{order.items?.length || 1} item{(order.items?.length || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="order-total">
                    <DollarSign size={16} />
                    <span className="amount">${(order.total || order.amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="order-items-preview">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="item-preview">
                        {item.image && (
                          <img 
                            src={getNFTImageUrl(item.image)} 
                            alt={item.name} 
                            className="item-image"
                            onError={handleImageError}
                          />
                        )}
                        <div className="item-info">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">Qty: {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="more-items">
                        +{order.items.length - 3} more
                      </div>
                    )}
                  </div>
                )}

                <div className="order-actions">
                  <Link 
                    to={`/orders/${order._id || order.id}`} 
                    className="btn-secondary"
                  >
                    <Eye size={16} />
                    View Details
                  </Link>
                  
                  {order.status === 'delivered' && (
                    <button className="btn-outline">
                      Leave Review
                    </button>
                  )}
                  
                  {['pending', 'processing', 'shipped'].includes(order.status?.toLowerCase()) && (
                    <button className="btn-outline">
                      Track Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="order-history-footer">
          <Link to="/dashboard" className="back-link">
            <ArrowRight size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory; 