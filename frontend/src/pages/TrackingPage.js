import '../styles/TrackingPage.css';
import LoadingSpinner from '../components/LoadingSpinner';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { 
  Package, 
  Search, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

const TrackingPage = () => {
  const { trackingNumber: urlTrackingNumber } = useParams();
  const navigate = useNavigate();
  
  const [trackingNumber, setTrackingNumber] = useState(urlTrackingNumber || '');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch(`/api/tracking/${trackingNumber.trim()}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No shipment found with this tracking number');
        }
        throw new Error('Failed to fetch tracking information');
      }

      const data = await response.json();
      setTrackingData(data);
      
      // Update URL without page reload
      window.history.pushState(null, '', `/track/${trackingNumber.trim()}`);
    } catch (err) {
      setError(err.message);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  }, [trackingNumber]);

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

  // Auto-search if tracking number is in URL
  useEffect(() => {
    if (urlTrackingNumber && !searched) {
      handleSearch({ preventDefault: () => {} });
    }
  }, [urlTrackingNumber, searched, handleSearch]);

  const shipment = trackingData?.shipment;
  const events = trackingData?.tracking_events || [];
  const latestEvent = trackingData?.latest_event;

  return (
    <div className="tracking-page">
      <div className="tracking-page-container">
        {/* Header */}
        <div className="tracking-page-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
            Back to Home
          </button>
          
          <div className="header-content">
            <h1>Track Your Shipment</h1>
            <p>Enter your tracking number to get real-time updates on your order</p>
          </div>
        </div>

        {/* Search Form */}
        <div className="tracking-search-card">
          <form onSubmit={handleSearch} className="tracking-search-form">
            <div className="search-input-group">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g., 1Z999AA1234567890)"
                className="tracking-input"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="search-button"
                disabled={loading || !trackingNumber.trim()}
              >
                {loading ? <RefreshCw className="spinning" size={20} /> : 'Track'}
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="tracking-error-card">
            <AlertCircle size={48} />
            <h3>Unable to Track Shipment</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="btn-secondary">
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="tracking-loading-card">
            <LoadingSpinner />
            <p>Searching for your shipment...</p>
          </div>
        )}

        {/* Tracking Results */}
        {trackingData && shipment && (
          <div className="tracking-results">
            {/* Shipment Summary */}
            <div className="shipment-summary-card">
              <div className="shipment-header">
                <div className="shipment-info">
                  <h2>Order #{shipment.orderNumber}</h2>
                  <div className="tracking-number-display">
                    <strong>Tracking: </strong>
                    <span>{shipment.tracking_number}</span>
                    {shipment.tracking_url && (
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
                  {shipment.carrier && (
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
                  {getStatusIcon(shipment.status)}
                  <div className="status-text">
                    <span className="status-label">{shipment.status?.replace('_', ' ')}</span>
                    {latestEvent && (
                      <span className="status-description">{latestEvent.description}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="delivery-summary">
                {shipment.estimated_delivery && (
                  <div className="delivery-info">
                    <Calendar size={16} />
                    <div>
                      <span className="label">Estimated Delivery</span>
                      <span className="date">{formatDate(shipment.estimated_delivery)}</span>
                    </div>
                  </div>
                )}
                
                {shipment.delivered_at && (
                  <div className="delivery-info delivered">
                    <CheckCircle size={16} />
                    <div>
                      <span className="label">Delivered</span>
                      <span className="date">{formatDate(shipment.delivered_at)}</span>
                    </div>
                  </div>
                )}

                {trackingData.delivery_address && (
                  <div className="delivery-info">
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

            {/* Tracking Timeline */}
            <div className="tracking-timeline-card">
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

            {/* Seller Information */}
            {trackingData.seller && (
              <div className="seller-info-card">
                <h3>Seller Information</h3>
                <div className="seller-details">
                  <Package size={16} />
                  <span>{trackingData.seller.name}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="tracking-help-card">
          <h3>Need Help?</h3>
          <p>If you have questions about your shipment or need assistance, we're here to help.</p>
          <div className="help-actions">
            <a href="mailto:support@example.com" className="help-link">
              Email Support
            </a>
            <a href="/faq" className="help-link">
              View FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage; 