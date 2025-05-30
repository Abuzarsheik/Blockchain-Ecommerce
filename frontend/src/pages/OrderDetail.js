import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Package, 
  Calendar, 
  DollarSign, 
  MapPin, 
  CreditCard, 
  Truck, 
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';
import { fetchOrderById } from '../store/slices/ordersSlice';
import { getNFTImageUrl, handleImageError } from '../utils/imageUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderTracking from '../components/OrderTracking';
import '../styles/OrderDetail.css';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentOrder: order, loading, error } = useSelector(state => state.orders);
  const [showTracking, setShowTracking] = useState(false);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
        return <Clock className="status-icon pending" />;
      case 'processing':
        return <Package className="status-icon processing" />;
      case 'ready_to_ship':
        return <Package className="status-icon ready" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="status-icon shipped" />;
      case 'out_for_delivery':
        return <Truck className="status-icon out-for-delivery" />;
      case 'delivered':
        return <CheckCircle className="status-icon delivered" />;
      case 'cancelled':
      case 'returned':
        return <AlertCircle className="status-icon cancelled" />;
      default:
        return <Clock className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'status-delivered';
      case 'shipped':
      case 'in_transit':
      case 'out_for_delivery':
        return 'status-shipped';
      case 'processing':
      case 'ready_to_ship':
        return 'status-processing';
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasTrackingInfo = () => {
    return order?.shipping_info?.tracking_number || order?.tracking_number;
  };

  const isTrackableStatus = () => {
    const trackableStatuses = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    return trackableStatuses.includes(order?.status?.toLowerCase());
  };

  if (loading) {
    return (
      <div className="order-detail-loading">
        <LoadingSpinner />
        <p>Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail-error">
        <AlertCircle size={64} />
        <h2>Error Loading Order</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-not-found">
        <Package size={64} />
        <h2>Order Not Found</h2>
        <p>The order you're looking for doesn't exist or you don't have permission to view it.</p>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="order-detail">
      <div className="order-detail-container">
        {/* Header */}
        <div className="order-detail-header">
          <button className="back-button" onClick={() => navigate('/orders')}>
            <ArrowLeft size={20} />
            Back to Orders
          </button>
          <div className="order-title">
            <h1>Order #{order.orderNumber}</h1>
            <div className={`order-status ${getStatusClass(order.status)}`}>
              {getStatusIcon(order.status)}
              <span>{order.status?.replace('_', ' ') || 'Pending'}</span>
            </div>
          </div>
        </div>

        <div className="order-detail-content">
          {/* Order Summary */}
          <div className="order-summary-card">
            <h2>Order Summary</h2>
            <div className="order-info-grid">
              <div className="info-item">
                <Calendar size={16} />
                <div>
                  <span className="label">Order Date</span>
                  <span className="value">{formatDate(order.created_at)}</span>
                </div>
              </div>
              <div className="info-item">
                <DollarSign size={16} />
                <div>
                  <span className="label">Total Amount</span>
                  <span className="value">${order.total.toFixed(2)}</span>
                </div>
              </div>
              <div className="info-item">
                <CreditCard size={16} />
                <div>
                  <span className="label">Payment Method</span>
                  <span className="value">
                    {order.payment_method === 'card' ? 'Credit Card' : 
                     order.payment_method === 'crypto' ? 'Cryptocurrency' : 
                     order.payment_method === 'escrow' ? 'Escrow' : 'Unknown'}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <Package size={16} />
                <div>
                  <span className="label">Payment Status</span>
                  <span className={`value ${order.payment_status}`}>{order.payment_status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking Info */}
          {(hasTrackingInfo() || order.shipping_info) && (
            <div className="shipping-tracking-card">
              <h2>Shipping & Tracking</h2>
              <div className="shipping-info-grid">
                {order.shipping_info?.carrier && (
                  <div className="info-item">
                    <Truck size={16} />
                    <div>
                      <span className="label">Carrier</span>
                      <span className="value">
                        {order.shipping_info.carrier.toUpperCase()}
                        {order.shipping_info.service_type && ` - ${order.shipping_info.service_type}`}
                      </span>
                    </div>
                  </div>
                )}
                
                {hasTrackingInfo() && (
                  <div className="info-item">
                    <Package size={16} />
                    <div>
                      <span className="label">Tracking Number</span>
                      <span className="value tracking-number">
                        {order.shipping_info?.tracking_number || order.tracking_number}
                        {order.shipping_info?.tracking_url && (
                          <a 
                            href={order.shipping_info.tracking_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="external-tracking-link"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {order.shipped_at && (
                  <div className="info-item">
                    <Calendar size={16} />
                    <div>
                      <span className="label">Shipped Date</span>
                      <span className="value">{formatDate(order.shipped_at)}</span>
                    </div>
                  </div>
                )}

                {(order.shipping_info?.estimated_delivery || order.estimated_delivery) && (
                  <div className="info-item">
                    <Calendar size={16} />
                    <div>
                      <span className="label">Estimated Delivery</span>
                      <span className="value">
                        {formatDate(order.shipping_info?.estimated_delivery || order.estimated_delivery)}
                      </span>
                    </div>
                  </div>
                )}

                {order.delivered_at && (
                  <div className="info-item delivered">
                    <CheckCircle size={16} />
                    <div>
                      <span className="label">Delivered</span>
                      <span className="value">{formatDate(order.delivered_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {hasTrackingInfo() && isTrackableStatus() && (
                <div className="tracking-actions">
                  <button 
                    onClick={() => setShowTracking(true)} 
                    className="btn-primary track-button"
                  >
                    <Truck size={16} />
                    Track Package
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Order Items */}
          <div className="order-items-card">
            <h2>Order Items ({order.items?.length || 0})</h2>
            <div className="order-items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-image">
                    <img 
                      src={getNFTImageUrl(item.image)} 
                      alt={item.name}
                      onError={handleImageError}
                    />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-category">{item.category}</p>
                    <div className="item-price-qty">
                      <span className="quantity">Qty: {item.quantity}</span>
                      <span className="price">${item.price.toFixed(2)} each</span>
                    </div>
                  </div>
                  <div className="item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              {order.discount > 0 && (
                <div className="price-row discount">
                  <span>Discount</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="price-row">
                <span>Shipping</span>
                <span>${order.shipping_cost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="price-row">
                <span>Tax</span>
                <span>${order.tax?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="price-row total">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Billing & Shipping Info */}
          <div className="address-info-grid">
            {/* Billing Information */}
            <div className="address-card">
              <h3>
                <User size={16} />
                Billing Information
              </h3>
              {order.billing_info && (
                <div className="address-details">
                  <p className="name">{order.billing_info.firstName} {order.billing_info.lastName}</p>
                  <p className="contact">
                    <Mail size={14} />
                    {order.billing_info.email}
                  </p>
                  <p className="contact">
                    <Phone size={14} />
                    {order.billing_info.phone}
                  </p>
                  <div className="address">
                    <MapPin size={14} />
                    <div>
                      <p>{order.billing_info.address}</p>
                      <p>{order.billing_info.city}, {order.billing_info.state} {order.billing_info.zipCode}</p>
                      <p>{order.billing_info.country}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Shipping Information */}
            <div className="address-card">
              <h3>
                <Truck size={16} />
                Shipping Information
              </h3>
              {order.shipping_address && (
                <div className="address-details">
                  <p className="name">
                    {order.shipping_address.firstName} {order.shipping_address.lastName}
                  </p>
                  {order.shipping_address.company && (
                    <p className="company">{order.shipping_address.company}</p>
                  )}
                  <div className="address">
                    <MapPin size={14} />
                    <div>
                      <p>{order.shipping_address.street}</p>
                      {order.shipping_address.street2 && <p>{order.shipping_address.street2}</p>}
                      <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}</p>
                      <p>{order.shipping_address.country}</p>
                    </div>
                  </div>
                  {order.shipping_address.phone && (
                    <p className="contact">
                      <Phone size={14} />
                      {order.shipping_address.phone}
                    </p>
                  )}
                  {order.shipping_address.delivery_instructions && (
                    <div className="delivery-instructions">
                      <strong>Delivery Instructions:</strong>
                      <p>{order.shipping_address.delivery_instructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="order-actions">
            {hasTrackingInfo() && isTrackableStatus() && (
              <button 
                onClick={() => setShowTracking(true)} 
                className="btn-secondary"
              >
                <Truck size={16} />
                Track Package
              </button>
            )}
            <Link to="/support" className="btn-outline">
              Need Help?
            </Link>
            {order.status === 'delivered' && (
              <button className="btn-primary">
                Leave Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Modal */}
      {showTracking && (
        <OrderTracking 
          orderId={order._id}
          trackingNumber={order.shipping_info?.tracking_number || order.tracking_number}
          onClose={() => setShowTracking(false)}
        />
      )}
    </div>
  );
};

export default OrderDetail; 