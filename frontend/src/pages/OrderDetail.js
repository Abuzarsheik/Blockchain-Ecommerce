import '../styles/OrderDetail.css';
import LoadingSpinner from '../components/LoadingSpinner';
import OrderTracking from '../components/OrderTracking';
import React, { useEffect, useState } from 'react';
import { fetchOrderById } from '../store/slices/ordersSlice';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';

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
  ExternalLink,
  Shield,
  Link as LinkIcon,
  Eye,
  Copy,
  Info,
  Zap,
  Lock
} from 'lucide-react';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentOrder: order, loading, error } = useSelector(state => state.orders);
  const [showTracking, setShowTracking] = useState(false);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (orderId) {
      console.log('🔍 Fetching order with ID:', orderId);
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId]);

  // Debug: Log order data when it changes
  useEffect(() => {
    if (order) {
      console.log('📦 Order Data Received:', order);
      console.log('🔗 Blockchain Fields Check:', {
        blockchainTx: order.blockchainTx,
        escrowId: order.escrowId,
        escrow_tx_hash: order.escrow_tx_hash,
        escrow_id: order.escrow_id,
        payment_method: order.payment_method
      });
    }
  }, [order]);

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
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
  };

  const hasTrackingInfo = () => {
    return order?.shipping_info?.tracking_number || order?.tracking_number;
  };

  const isTrackableStatus = () => {
    const trackableStatuses = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    return trackableStatuses.includes(order?.status?.toLowerCase());
  };

  const hasBlockchainData = () => {
    const result = order?.blockchainTx || order?.escrowId || order?.escrow_tx_hash;
    
    // Debug: Log blockchain data check
    console.log('🔍 Blockchain Data Check:', {
      orderNumber: order?.orderNumber,
      blockchainTx: order?.blockchainTx,
      escrowId: order?.escrowId,  
      escrow_tx_hash: order?.escrow_tx_hash,
      hasData: !!result
    });
    
    return result;
  };

  const isEscrowOrder = () => {
    return order?.payment_method === 'escrow' || order?.escrowId || order?.escrow_id;
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getBlockchainExplorerUrl = (txHash, network = 'ethereum') => {
    const explorers = {
      ethereum: `https://etherscan.io/tx/${txHash}`,
      sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      mumbai: `https://mumbai.polygonscan.com/tx/${txHash}`,
      bsc: `https://bscscan.com/tx/${txHash}`,
      bscTestnet: `https://testnet.bscscan.com/tx/${txHash}`
    };
    
    return explorers[network] || explorers.ethereum;
  };

  const getContractExplorerUrl = (contractAddress, network = 'ethereum') => {
    const explorers = {
      ethereum: `https://etherscan.io/address/${contractAddress}`,
      sepolia: `https://sepolia.etherscan.io/address/${contractAddress}`,
      polygon: `https://polygonscan.com/address/${contractAddress}`,
      mumbai: `https://mumbai.polygonscan.com/address/${contractAddress}`,
      bsc: `https://bscscan.com/address/${contractAddress}`,
      bscTestnet: `https://testnet.bscscan.com/address/${contractAddress}`
    };
    
    return explorers[network] || explorers.ethereum;
  };

  const getCurrentNetwork = () => {
    const networkId = process.env.REACT_APP_NETWORK_ID || '11155111';
    const networks = {
      '1': 'ethereum',
      '11155111': 'sepolia',
      '137': 'polygon', 
      '80001': 'mumbai',
      '56': 'bsc',
      '97': 'bscTestnet'
    };
    
    return networks[networkId] || 'sepolia';
  };

  const getNetworkDisplayName = () => {
    const network = getCurrentNetwork();
    const names = {
      ethereum: 'Ethereum Mainnet',
      sepolia: 'Sepolia Testnet',
      polygon: 'Polygon Mainnet',
      mumbai: 'Mumbai Testnet',
      bsc: 'BSC Mainnet',
      bscTestnet: 'BSC Testnet'
    };
    
    return names[network] || 'Unknown Network';
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
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
                  <span className="value">${formatCurrency(order.total)}</span>
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

          {/* Enhanced Blockchain Verification Section */}
          {hasBlockchainData() && (
            <div className="blockchain-verification-card">
              <div className="blockchain-header">
                <div className="blockchain-title">
                  <Shield size={24} className="blockchain-shield-icon" />
                  <div>
                    <h2>Blockchain Verification</h2>
                    <p className="blockchain-subtitle">
                      This order is secured and verified on the {getNetworkDisplayName()}
                    </p>
                  </div>
                </div>
                <div className="blockchain-status-badge">
                  <CheckCircle size={16} />
                  <span>Verified</span>
                </div>
              </div>

              <div className="verification-description">
                <Info size={16} />
                <div>
                  <p>
                    Your transaction is permanently recorded on the blockchain, providing complete 
                    transparency and immutability. Use the verification tools below to independently 
                    confirm your order's authenticity.
                  </p>
                </div>
              </div>
              
              <div className="blockchain-info-grid">
                {(order.blockchainTx || order.escrow_tx_hash) && (
                  <div className="blockchain-item transaction-item">
                    <div className="blockchain-item-header">
                      <div className="item-icon">
                        <LinkIcon size={20} />
                      </div>
                      <div className="item-title">
                        <h3>Transaction Hash</h3>
                        <p>Blockchain transaction identifier</p>
                      </div>
                    </div>
                    
                    <div className="blockchain-item-content">
                      <div className="hash-display">
                        <span className="hash-value">
                          {formatHash(order.blockchainTx || order.escrow_tx_hash)}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(order.blockchainTx || order.escrow_tx_hash, 'tx')}
                          className="copy-button"
                          title="Copy full transaction hash"
                        >
                          <Copy size={14} />
                          {copySuccess === 'tx' && <span className="copy-success">Copied!</span>}
                        </button>
                      </div>
                      
                      <div className="blockchain-actions">
                        <Link 
                          to={`/blockchain/verify/${order.blockchainTx || order.escrow_tx_hash}`}
                          className="btn-verify internal"
                        >
                          <Eye size={16} />
                          <span>Verify Transaction</span>
                        </Link>
                        <a 
                          href={getBlockchainExplorerUrl(order.blockchainTx || order.escrow_tx_hash, getCurrentNetwork())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-verify external"
                        >
                          <ExternalLink size={16} />
                          <span>View on Explorer</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {order.escrowId && (
                  <div className="blockchain-item escrow-item">
                    <div className="blockchain-item-header">
                      <div className="item-icon escrow-icon">
                        <Shield size={20} />
                      </div>
                      <div className="item-title">
                        <h3>Smart Contract Escrow</h3>
                        <p>Secure fund management contract</p>
                      </div>
                    </div>
                    
                    <div className="blockchain-item-content">
                      <div className="hash-display">
                        <span className="hash-value">
                          {formatHash(order.escrowId)}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(order.escrowId, 'escrow')}
                          className="copy-button"
                          title="Copy contract address"
                        >
                          <Copy size={14} />
                          {copySuccess === 'escrow' && <span className="copy-success">Copied!</span>}
                        </button>
                      </div>
                      
                      <div className="blockchain-actions">
                        <Link 
                          to={`/escrow/details/${order.escrowId}`}
                          className="btn-verify internal"
                        >
                          <Eye size={16} />
                          <span>View Contract Details</span>
                        </Link>
                        <a 
                          href={getContractExplorerUrl(order.escrowId, getCurrentNetwork())}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-verify external"
                        >
                          <ExternalLink size={16} />
                          <span>View on Explorer</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {isEscrowOrder() && (
                  <div className="blockchain-item security-features-item">
                    <div className="blockchain-item-header">
                      <div className="item-icon security-icon">
                        <Lock size={20} />
                      </div>
                      <div className="item-title">
                        <h3>Security Guarantees</h3>
                        <p>Blockchain-powered protection</p>
                      </div>
                    </div>
                    
                    <div className="blockchain-item-content">
                      <div className="security-features">
                        <div className="feature">
                          <CheckCircle size={16} className="feature-icon" />
                          <div className="feature-content">
                            <span className="feature-title">Escrow Protection</span>
                            <span className="feature-desc">Funds secured in smart contract</span>
                          </div>
                        </div>
                        <div className="feature">
                          <Zap size={16} className="feature-icon" />
                          <div className="feature-content">
                            <span className="feature-title">Instant Verification</span>
                            <span className="feature-desc">Real-time blockchain confirmation</span>
                          </div>
                        </div>
                        <div className="feature">
                          <Shield size={16} className="feature-icon" />
                          <div className="feature-content">
                            <span className="feature-title">Dispute Resolution</span>
                            <span className="feature-desc">Automated conflict handling</span>
                          </div>
                        </div>
                        <div className="feature">
                          <Package size={16} className="feature-icon" />
                          <div className="feature-content">
                            <span className="feature-title">Delivery Guarantee</span>
                            <span className="feature-desc">Complete buyer protection</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="verification-footer">
                <div className="network-info">
                  <div className="network-badge">
                    <div className="network-indicator"></div>
                    <span>{getNetworkDisplayName()}</span>
                  </div>
                  <span className="network-desc">
                    All transactions are publicly verifiable and immutable
                  </span>
                </div>
                
                <div className="help-section">
                  <AlertCircle size={16} />
                  <div>
                    <span className="help-text">
                      Need help understanding blockchain verification?
                    </span>
                    <Link to="/help" className="help-link">
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
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
                      src={getImageUrl(item.image)} 
                      alt={item.name}
                      onError={handleImageError}
                    />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-category">{item.category}</p>
                    <div className="item-price-qty">
                      <span className="quantity">Qty: {item.quantity}</span>
                      <span className="price">${formatCurrency(item.price)} each</span>
                    </div>
                  </div>
                  <div className="item-total">
                    ${formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>${formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="price-row discount">
                  <span>Discount</span>
                  <span>-${formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="price-row">
                <span>Shipping</span>
                <span>${formatCurrency(order.shipping_cost)}</span>
              </div>
              <div className="price-row">
                <span>Tax</span>
                <span>${formatCurrency(order.tax)}</span>
              </div>
              <div className="price-row total">
                <span>Total</span>
                <span>${formatCurrency(order.total)}</span>
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