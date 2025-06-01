import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Phone,
  Mail,
  User
} from 'lucide-react';
import '../styles/OrderTracking.css';

const OrderTracking = ({ orderId, trackingNumber, onClose }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrackingData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const endpoint = orderId 
        ? `/api/orders/${orderId}/tracking`
        : `/api/tracking/${trackingNumber}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracking information');
      }

      const data = await response.json();
      setTrackingData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, trackingNumber]);

  useEffect(() => {
    if (orderId || trackingNumber) {
      fetchTrackingData();
    }
  }, [orderId, trackingNumber, fetchTrackingData]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'confirmed':
      case 'processing':
        return <Clock className="status-icon processing" />;
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

  const getEventIcon = (eventType) => {
    switch (eventType?.toLowerCase()) {
      case 'pickup':
        return <Package className="event-icon pickup" />;
      case 'in_transit':
        return <Truck className="event-icon transit" />;
      case 'out_for_delivery':
        return <Truck className="event-icon delivery" />;
      case 'delivered':
        return <CheckCircle className="event-icon delivered" />;
      case 'attempted_delivery':
        return <AlertCircle className="event-icon attempted" />;
      case 'exception':
        return <AlertCircle className="event-icon exception" />;
      case 'returned':
        return <AlertCircle className="event-icon returned" />;
      default:
        return <MapPin className="event-icon default" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocation = (location) => {
    if (!location) return 'Location not available';
    
    const parts = [];
    if (location.facility) parts.push(location.facility);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Location not available';
  };

  const getCarrierLogo = (carrier) => {
    const logos = {
      'fedex': '/images/carriers/fedex-logo.png',
      'ups': '/images/carriers/ups-logo.png',
      'dhl': '/images/carriers/dhl-logo.png',
      'usps': '/images/carriers/usps-logo.png'
    };
    return logos[carrier?.toLowerCase()] || null;
  };

  if (loading) {
    return (
      <div className="tracking-modal">
        <div className="tracking-content">
          <div className="tracking-loading">
            <RefreshCw className="loading-spinner" />
            <p>Loading tracking information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-modal">
        <div className="tracking-content">
          <div className="tracking-error">
            <AlertCircle size={48} />
            <h3>Unable to Load Tracking</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={() => fetchTrackingData()} className="btn-primary">
                Try Again
              </button>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shipment = trackingData?.shipment || trackingData?.order;
  const events = trackingData?.tracking_events || [];
  const latestEvent = trackingData?.latest_event;

  return (
    <div className="tracking-modal">
      <div className="tracking-content">
        <div className="tracking-header">
          <div className="tracking-title">
            <h2>Track Your Order</h2>
            <button onClick={onClose} className="close-button">×</button>
          </div>
          
          <div className="tracking-summary">
            <div className="shipment-info">
              <div className="shipment-details">
                <h3>Order #{shipment?.orderNumber}</h3>
                <div className="tracking-number">
                  <strong>Tracking: </strong>
                  <span>{shipment?.tracking_number}</span>
                  {shipment?.tracking_url && (
                    <a 
                      href={shipment.tracking_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="external-link"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                {shipment?.carrier && (
                  <div className="carrier-info">
                    {getCarrierLogo(shipment.carrier) && (
                      <img 
                        src={getCarrierLogo(shipment.carrier)} 
                        alt={shipment.carrier}
                        className="carrier-logo"
                      />
                    )}
                    <span className="carrier-name">
                      {shipment.carrier.toUpperCase()}
                      {shipment.service_type && ` - ${shipment.service_type}`}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="current-status">
                {getStatusIcon(shipment?.status)}
                <div className="status-text">
                  <span className="status-label">{shipment?.status?.replace('_', ' ')}</span>
                  {latestEvent && (
                    <span className="status-description">{latestEvent.description}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="delivery-info">
              {shipment?.estimated_delivery && (
                <div className="delivery-date">
                  <Calendar size={16} />
                  <div>
                    <span className="label">Estimated Delivery</span>
                    <span className="date">{formatDate(shipment.estimated_delivery)}</span>
                  </div>
                </div>
              )}
              
              {shipment?.delivered_at && (
                <div className="delivery-date delivered">
                  <CheckCircle size={16} />
                  <div>
                    <span className="label">Delivered</span>
                    <span className="date">{formatDate(shipment.delivered_at)}</span>
                  </div>
                </div>
              )}

              {trackingData?.delivery_address && (
                <div className="delivery-address">
                  <MapPin size={16} />
                  <div>
                    <span className="label">Delivering to</span>
                    <span className="address">
                      {trackingData.delivery_address.city}, {trackingData.delivery_address.state} {trackingData.delivery_address.zipCode}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tracking-actions">
            <button 
              onClick={() => fetchTrackingData(true)} 
              className="refresh-button"
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'spinning' : ''} size={16} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="tracking-timeline">
          <h3>Tracking History</h3>
          
          {events.length > 0 ? (
            <div className="timeline">
              {events.map((event, index) => (
                <div key={index} className={`timeline-item ${index === 0 ? 'latest' : ''}`}>
                  <div className="timeline-marker">
                    {getEventIcon(event.event_type)}
                  </div>
                  
                  <div className="timeline-content">
                    <div className="event-header">
                      <h4>{event.status}</h4>
                      <span className="event-time">{formatDate(event.timestamp)}</span>
                    </div>
                    
                    <p className="event-description">{event.description}</p>
                    
                    {event.location && (
                      <div className="event-location">
                        <MapPin size={14} />
                        <span>{formatLocation(event.location)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-events">
              <Package size={48} />
              <p>No tracking events available yet</p>
              <span>Check back later for updates</span>
            </div>
          )}
        </div>

        {trackingData?.seller && (
          <div className="seller-info">
            <h3>Seller Information</h3>
            <div className="seller-details">
              <User size={16} />
              <span>{trackingData.seller.name}</span>
            </div>
          </div>
        )}

        <div className="tracking-footer">
          <div className="help-section">
            <h4>Need Help?</h4>
            <p>If you have questions about your shipment, contact our support team.</p>
            <div className="contact-options">
              <a href="mailto:support@example.com" className="contact-link">
                <Mail size={16} />
                Email Support
              </a>
              <a href="tel:+1234567890" className="contact-link">
                <Phone size={16} />
                Call Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking; 