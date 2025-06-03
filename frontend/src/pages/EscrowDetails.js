import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Calendar, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  Package,
  Eye,
  Copy,
  RefreshCw,
  Activity,
  TrendingUp,
  Lock,
  Unlock,
  Zap
} from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { getApiUrl } from '../config/api';
import './EscrowDetails.css';

const EscrowDetails = () => {
  const { escrowId } = useParams();
  const navigate = useNavigate();
  
  // Helper function to clean escrow ID (remove :1, :2, etc. suffixes)
  const cleanEscrowId = (id) => {
    if (!id) return id;
    // Remove any trailing :number pattern that might be added by routing issues
    return id.replace(/:(\d+)$/, '');
  };
  
  // Clean the escrowId parameter
  const cleanedEscrowId = cleanEscrowId(escrowId);
  
  const [escrowData, setEscrowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (cleanedEscrowId) {
      fetchEscrowDetails();
    }
  }, [cleanedEscrowId]);

  const fetchEscrowDetails = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(getApiUrl(`/escrow/details/${cleanedEscrowId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEscrowData(data.escrow);
        if (showRefreshLoader) {
          toast.success('Escrow data refreshed successfully');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch escrow details');
      }
    } catch (error) {
      console.error('Error fetching escrow details:', error);
      setError(error.message || 'Failed to load escrow details');
      toast.error('Failed to load escrow details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEscrowDetails(true);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatCurrency = (value, currency = 'ETH') => {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : `${numValue.toFixed(6)} ${currency}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStateIcon = (state) => {
    switch (state?.toLowerCase()) {
      case 'active':
        return <Activity className="text-blue-500" size={20} />;
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'refunded':
        return <TrendingUp className="text-yellow-500" size={20} />;
      case 'disputed':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'locked':
        return <Lock className="text-purple-500" size={20} />;
      case 'released':
        return <Unlock className="text-green-500" size={20} />;
      default:
        return <Shield className="text-gray-500" size={20} />;
    }
  };

  const getStateClass = (state) => {
    switch (state?.toLowerCase()) {
      case 'active': return 'state-active';
      case 'completed': return 'state-completed';
      case 'refunded': return 'state-refunded';
      case 'disputed': return 'state-disputed';
      case 'locked': return 'state-locked';
      case 'released': return 'state-released';
      default: return 'state-unknown';
    }
  };

  const getStateDescription = (state) => {
    switch (state?.toLowerCase()) {
      case 'active': return 'Funds are secured and awaiting delivery confirmation';
      case 'completed': return 'Transaction completed successfully, funds released';
      case 'refunded': return 'Transaction refunded, funds returned to buyer';
      case 'disputed': return 'Dispute in progress, awaiting resolution';
      case 'locked': return 'Funds are locked in smart contract';
      case 'released': return 'Funds have been released from escrow';
      default: return 'Unknown state';
    }
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

  const getExplorerUrl = (address, type = 'address') => {
    const network = getCurrentNetwork();
    const explorers = {
      ethereum: `https://etherscan.io/${type}/${address}`,
      sepolia: `https://sepolia.etherscan.io/${type}/${address}`,
      polygon: `https://polygonscan.com/${type}/${address}`,
      mumbai: `https://mumbai.polygonscan.com/${type}/${address}`,
      bsc: `https://bscscan.com/${type}/${address}`,
      bscTestnet: `https://testnet.bscscan.com/${type}/${address}`
    };
    
    return explorers[network] || explorers.sepolia;
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

  if (loading) {
    return (
      <div className="escrow-details-loading">
        <div className="loading-content">
          <LoadingSpinner size="large" />
          <h3>Loading Escrow Details</h3>
          <p>Fetching smart contract information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="escrow-details-error">
        <AlertCircle size={64} className="error-icon" />
        <h2>Unable to Load Escrow</h2>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          <button onClick={() => fetchEscrowDetails()} className="btn-primary">
            <RefreshCw size={16} />
            Try Again
          </button>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!escrowData) {
    return (
      <div className="escrow-details-not-found">
        <Shield size={64} className="not-found-icon" />
        <h2>Escrow Contract Not Found</h2>
        <p>The escrow contract you're looking for doesn't exist or you don't have permission to view it.</p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="escrow-details">
      <div className="escrow-details-container">
        {/* Enhanced Header */}
        <div className="escrow-details-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          
          <div className="escrow-title-section">
            <div className="escrow-main-title">
              <div className="title-icon">
                <Shield size={32} />
              </div>
              <div className="title-content">
                <h1>Smart Contract Escrow</h1>
                <p className="title-subtitle">Secured on {getNetworkDisplayName()}</p>
              </div>
            </div>
            
            <div className="header-actions">
              <button 
                className="refresh-button" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              <div className={`escrow-state-badge ${getStateClass(escrowData.state)}`}>
                {getStateIcon(escrowData.state)}
                <div className="state-info">
                  <span className="state-name">{escrowData.state || 'Unknown'}</span>
                  <span className="state-desc">{getStateDescription(escrowData.state)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="escrow-details-content">
          {/* Enhanced Contract Overview */}
          <div className="contract-overview-card">
            <div className="card-header">
              <div className="header-icon">
                <FileText size={24} />
              </div>
              <div className="header-content">
                <h2>Contract Overview</h2>
                <p>Essential smart contract information</p>
              </div>
            </div>
            
            <div className="contract-info-grid">
              <div className="info-item primary">
                <div className="item-icon">
                  <Shield size={20} />
                </div>
                <div className="item-content">
                  <span className="label">Contract Address</span>
                  <div className="address-value">
                    <span className="full-address">{cleanedEscrowId}</span>
                    <span className="short-address">{formatAddress(cleanedEscrowId)}</span>
                    <div className="address-actions">
                      <button 
                        onClick={() => copyToClipboard(cleanedEscrowId, 'contract')}
                        className="copy-btn"
                        title="Copy address"
                      >
                        <Copy size={14} />
                        {copySuccess === 'contract' && <span className="copy-feedback">Copied!</span>}
                      </button>
                      <a 
                        href={getExplorerUrl(cleanedEscrowId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="external-btn"
                        title="View on blockchain explorer"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="info-item">
                <div className="item-icon">
                  <DollarSign size={20} />
                </div>
                <div className="item-content">
                  <span className="label">Escrow Amount</span>
                  <span className="value amount-value">
                    {formatCurrency(escrowData.amount || escrowData.amountInETH)}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <div className="item-icon">
                  <Calendar size={20} />
                </div>
                <div className="item-content">
                  <span className="label">Created</span>
                  <span className="value">
                    {formatDate(escrowData.createdAt)}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <div className="item-icon">
                  <Package size={20} />
                </div>
                <div className="item-content">
                  <span className="label">Related Order</span>
                  <span className="value">
                    {escrowData.orderId ? (
                      <Link to={`/orders/${escrowData.orderId}`} className="order-link">
                        <Package size={14} />
                        Order #{escrowData.orderNumber || escrowData.orderId.slice(-8)}
                      </Link>
                    ) : (
                      <span className="no-link">Not linked</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Parties Involved */}
          <div className="parties-card">
            <div className="card-header">
              <div className="header-icon">
                <Users size={24} />
              </div>
              <div className="header-content">
                <h2>Transaction Parties</h2>
                <p>Addresses involved in this escrow</p>
              </div>
            </div>
            
            <div className="parties-grid">
              <div className="party-item buyer-party">
                <div className="party-header">
                  <div className="party-icon buyer-icon">
                    <Users size={20} />
                  </div>
                  <div className="party-info">
                    <span className="party-role">Buyer</span>
                    <span className="party-desc">Funds provider</span>
                  </div>
                </div>
                <div className="party-address-section">
                  <div className="party-address">
                    <span className="full-address">{escrowData.buyer}</span>
                    <span className="short-address">{formatAddress(escrowData.buyer)}</span>
                  </div>
                  <div className="party-actions">
                    <button 
                      onClick={() => copyToClipboard(escrowData.buyer, 'buyer')}
                      className="copy-btn"
                    >
                      <Copy size={14} />
                      {copySuccess === 'buyer' && <span className="copy-feedback">Copied!</span>}
                    </button>
                    <a 
                      href={getExplorerUrl(escrowData.buyer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-btn"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="party-item seller-party">
                <div className="party-header">
                  <div className="party-icon seller-icon">
                    <Package size={20} />
                  </div>
                  <div className="party-info">
                    <span className="party-role">Seller</span>
                    <span className="party-desc">Service provider</span>
                  </div>
                </div>
                <div className="party-address-section">
                  <div className="party-address">
                    <span className="full-address">{escrowData.seller}</span>
                    <span className="short-address">{formatAddress(escrowData.seller)}</span>
                  </div>
                  <div className="party-actions">
                    <button 
                      onClick={() => copyToClipboard(escrowData.seller, 'seller')}
                      className="copy-btn"
                    >
                      <Copy size={14} />
                      {copySuccess === 'seller' && <span className="copy-feedback">Copied!</span>}
                    </button>
                    <a 
                      href={getExplorerUrl(escrowData.seller)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-btn"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {escrowData.arbitrator && escrowData.arbitrator !== '0x0000000000000000000000000000000000000000' && (
                <div className="party-item arbitrator-party">
                  <div className="party-header">
                    <div className="party-icon arbitrator-icon">
                      <Shield size={20} />
                    </div>
                    <div className="party-info">
                      <span className="party-role">Arbitrator</span>
                      <span className="party-desc">Dispute resolver</span>
                    </div>
                  </div>
                  <div className="party-address-section">
                    <div className="party-address">
                      <span className="full-address">{escrowData.arbitrator}</span>
                      <span className="short-address">{formatAddress(escrowData.arbitrator)}</span>
                    </div>
                    <div className="party-actions">
                      <button 
                        onClick={() => copyToClipboard(escrowData.arbitrator, 'arbitrator')}
                        className="copy-btn"
                      >
                        <Copy size={14} />
                        {copySuccess === 'arbitrator' && <span className="copy-feedback">Copied!</span>}
                      </button>
                      <a 
                        href={getExplorerUrl(escrowData.arbitrator)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="external-btn"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Status Timeline */}
          <div className="status-timeline-card">
            <div className="card-header">
              <div className="header-icon">
                <Activity size={24} />
              </div>
              <div className="header-content">
                <h2>Transaction Timeline</h2>
                <p>Chronological events and status updates</p>
              </div>
            </div>
            
            <div className="timeline-container">
              <div className="timeline-item completed">
                <div className="timeline-icon">
                  <CheckCircle size={20} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">Escrow Contract Created</span>
                    <span className="timeline-date">
                      {formatDate(escrowData.createdAt)}
                    </span>
                  </div>
                  <p className="timeline-desc">Smart contract deployed and funds secured</p>
                </div>
              </div>

              {escrowData.sellerConfirmed && (
                <div className="timeline-item completed">
                  <div className="timeline-icon">
                    <Package size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Seller Confirmed Order</span>
                      <span className="timeline-date">Product preparation started</span>
                    </div>
                    <p className="timeline-desc">Seller acknowledged order and began fulfillment</p>
                  </div>
                </div>
              )}

              {escrowData.trackingInfo && (
                <div className="timeline-item completed">
                  <div className="timeline-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Delivery Initiated</span>
                      <span className="timeline-date">In transit</span>
                    </div>
                    <p className="timeline-desc">
                      Tracking: {escrowData.trackingInfo}
                    </p>
                  </div>
                </div>
              )}

              {escrowData.buyerConfirmed && (
                <div className="timeline-item completed">
                  <div className="timeline-icon">
                    <CheckCircle size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Delivery Confirmed</span>
                      <span className="timeline-date">Buyer satisfaction verified</span>
                    </div>
                    <p className="timeline-desc">Buyer confirmed receipt and satisfaction</p>
                  </div>
                </div>
              )}

              {escrowData.state === 'disputed' && (
                <div className="timeline-item disputed">
                  <div className="timeline-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Dispute Raised</span>
                      <span className="timeline-date">Arbitration required</span>
                    </div>
                    <p className="timeline-desc">
                      {escrowData.disputeReason || 'Dispute details not provided'}
                    </p>
                  </div>
                </div>
              )}

              {escrowData.state === 'completed' && (
                <div className="timeline-item completed final">
                  <div className="timeline-icon">
                    <Zap size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Transaction Completed</span>
                      <span className="timeline-date">Funds released successfully</span>
                    </div>
                    <p className="timeline-desc">Escrow completed, funds released to seller</p>
                  </div>
                </div>
              )}

              {escrowData.state === 'refunded' && (
                <div className="timeline-item refunded final">
                  <div className="timeline-icon">
                    <TrendingUp size={20} />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-title">Funds Refunded</span>
                      <span className="timeline-date">Money returned to buyer</span>
                    </div>
                    <p className="timeline-desc">Transaction cancelled, full refund processed</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {(escrowData.productHash || escrowData.trackingInfo || escrowData.hasSmartContractData) && (
            <div className="additional-info-card">
              <div className="card-header">
                <div className="header-icon">
                  <FileText size={24} />
                </div>
                <div className="header-content">
                  <h2>Additional Details</h2>
                  <p>Extended contract and transaction information</p>
                </div>
              </div>
              
              <div className="additional-info-grid">
                {escrowData.productHash && (
                  <div className="info-item">
                    <div className="item-icon">
                      <FileText size={20} />
                    </div>
                    <div className="item-content">
                      <span className="label">Product Hash</span>
                      <div className="hash-display">
                        <span className="hash-value">{escrowData.productHash}</span>
                        <button 
                          onClick={() => copyToClipboard(escrowData.productHash, 'productHash')}
                          className="copy-btn"
                        >
                          <Copy size={14} />
                          {copySuccess === 'productHash' && <span className="copy-feedback">Copied!</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {escrowData.trackingInfo && (
                  <div className="info-item">
                    <div className="item-icon">
                      <Package size={20} />
                    </div>
                    <div className="item-content">
                      <span className="label">Shipping Information</span>
                      <span className="value tracking-info">{escrowData.trackingInfo}</span>
                    </div>
                  </div>
                )}

                {escrowData.hasSmartContractData && (
                  <div className="info-item">
                    <div className="item-icon">
                      <Shield size={20} />
                    </div>
                    <div className="item-content">
                      <span className="label">Data Source</span>
                      <span className="value contract-data-badge">
                        <CheckCircle size={16} />
                        Live Smart Contract Data
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Actions */}
          <div className="escrow-actions">
            <Link to={`/blockchain/verify/${cleanedEscrowId}`} className="btn-primary">
              <Eye size={18} />
              <span>Verify on Blockchain</span>
            </Link>
            
            <a 
              href={getExplorerUrl(cleanedEscrowId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <ExternalLink size={18} />
              <span>View on {getNetworkDisplayName().split(' ')[0]} Explorer</span>
            </a>

            {escrowData.orderId && (
              <Link to={`/orders/${escrowData.orderId}`} className="btn-outline">
                <Package size={18} />
                <span>View Order Details</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowDetails; 