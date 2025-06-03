import '../styles/OrderHistory.css';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderTracking from '../components/OrderTracking';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Calendar, DollarSign, Eye, Truck, ExternalLink } from 'lucide-react';
import { fetchOrders } from '../store/slices/ordersSlice';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import { useDispatch, useSelector } from 'react-redux';

const OrderHistory = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { items: orders, loading, error } = useSelector(state => state.orders);
  const [trackingOrder, setTrackingOrder] = useState(null);

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
      case 'delivered':
        return 'status-delivered';
      case 'processing':
      case 'confirmed':
        return 'status-processing';
      case 'ready_to_ship':
        return 'status-ready';
      case 'shipped':
      case 'in_transit':
        return 'status-shipped';
      case 'out_for_delivery':
        return 'status-out-for-delivery';
      case 'cancelled':
      case 'returned':
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

  const formatCurrency = (value) => {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
  };

  const hasTrackingInfo = (order) => {
    return order.shipping_info?.tracking_number || order.tracking_number;
  };

  const isTrackableStatus = (status) => {
    const trackableStatuses = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    return trackableStatuses.includes(status?.toLowerCase());
  };

  const handleTrackOrder = (order) => {
    setTrackingOrder(order);
  };

  const getTrackingUrl = (order) => {
    if (order.shipping_info?.tracking_url) {
      return order.shipping_info.tracking_url;
    }
    
    const trackingNumber = order.shipping_info?.tracking_number || order.tracking_number;
    const carrier = order.shipping_info?.carrier?.toLowerCase();
    
    if (!trackingNumber || !carrier) return null;
    
    const trackingUrls = {
      'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'ups': `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`,
      'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
    };
    
    return trackingUrls[carrier] || null;
  };

  return (
    <div className="order-history">
      <div className="order-history-container">
        <div className="order-history-header">
          <h1>Order History</h1>
          <p>Track and manage all your NFT purchases</p>
        </div>

        {!orders || orders.length === 0 ? (
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
                    {order.status?.replace('_', ' ') || 'Pending'}
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-items">
                    <Package size={16} />
                    <span>{order.items?.length || 1} item{(order.items?.length || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="order-total">
                    <DollarSign size={16} />
                    <span className="amount">${formatCurrency(order.total || order.amount || 0)}</span>
                  </div>
                </div>

                {/* Tracking Information */}
                {hasTrackingInfo(order) && (
                  <div className="order-tracking-info">
                    <div className="tracking-details">
                      <Truck size={16} />
                      <div className="tracking-text">
                        <span className="tracking-label">
                          {order.shipping_info?.carrier?.toUpperCase() || 'Tracking'}
                        </span>
                        <span className="tracking-number">
                          {order.shipping_info?.tracking_number || order.tracking_number}
                        </span>
                      </div>
                    </div>
                    {order.shipping_info?.estimated_delivery && (
                      <div className="estimated-delivery">
                        <Calendar size={14} />
                        <span>Est. {formatDate(order.shipping_info.estimated_delivery)}</span>
                      </div>
                    )}
                  </div>
                )}

                {order.items && order.items.length > 0 && (
                  <div className="order-items-preview">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="item-preview">
                        {item.image && (
                          <img 
                            src={getImageUrl(item.image)} 
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
                  
                  {hasTrackingInfo(order) && isTrackableStatus(order.status) && (
                    <>
                      <button 
                        onClick={() => handleTrackOrder(order)}
                        className="btn-outline track-btn"
                      >
                        <Truck size={16} />
                        Track Order
                      </button>
                      
                      {getTrackingUrl(order) && (
                        <a 
                          href={getTrackingUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline external-track-btn"
                        >
                          <ExternalLink size={16} />
                          Carrier Site
                        </a>
                      )}
                    </>
                  )}
                  
                  {order.status === 'delivered' && (
                    <button className="btn-outline">
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Modal */}
      {trackingOrder && (
        <OrderTracking 
          orderId={trackingOrder._id || trackingOrder.id}
          trackingNumber={trackingOrder.shipping_info?.tracking_number || trackingOrder.tracking_number}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderHistory; 