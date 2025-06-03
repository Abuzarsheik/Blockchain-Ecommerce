import './BlockchainVerifier.css';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Shield, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Package,
  DollarSign,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  RefreshCw,
  Database
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiUrl } from '../config/api';
import { blockchainService } from '../services/blockchain';
import { logger } from '../utils/logger';

const BlockchainVerifier = () => {
  const { txHash } = useParams();
  const navigate = useNavigate();
  
  // Helper function to clean transaction hash (remove :1, :2, etc. suffixes)
  const cleanTxHash = (hash) => {
    if (!hash) return hash;
    // Remove any trailing :number pattern that might be added by routing issues
    return hash.replace(/:(\d+)$/, '');
  };
  
  const [searchHash, setSearchHash] = useState(cleanTxHash(txHash) || '');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (txHash) {
      const cleanedHash = cleanTxHash(txHash);
      setSearchHash(cleanedHash);
      handleVerifyTransaction(cleanedHash);
    }
  }, [txHash]);

  const handleVerifyTransaction = async (hash = searchHash) => {
    const cleanedHash = cleanTxHash(hash);
    if (!cleanedHash.trim()) {
      toast.error('Please enter a transaction hash or contract address');
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationData(null);
    setContractData(null);
    setOrderData(null);

    try {
      // First, check our backend database
      const backendResponse = await fetch(getApiUrl(`/blockchain/verify/${cleanedHash}`));
      const backendData = await backendResponse.json();

      if (backendData.success) {
        setVerificationData(backendData);
        
        // If we have an order ID, fetch order details
        if (backendData.transaction?.orderId) {
          try {
            const orderResponse = await fetch(getApiUrl(`/orders/${backendData.transaction.orderId}`), {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const orderData = await orderResponse.json();
            if (orderData.success) {
              setOrderData(orderData.order);
            }
          } catch (orderError) {
            logger.warn('Could not fetch order details:', orderError);
          }
        }

        // Try to get smart contract details if it's a contract address
        if (cleanedHash.length === 42 && cleanedHash.startsWith('0x')) {
          try {
            const contractDetails = await blockchainService.getEscrowDetails(cleanedHash);
            setContractData({
              address: cleanedHash,
              details: contractDetails
            });
          } catch (contractError) {
            logger.warn('Could not fetch contract details:', contractError);
          }
        }
      } else {
        setError(backendData.error || 'Transaction not found in our database');
      }

    } catch (error) {
      logger.error('Verification failed:', error);
      setError('Failed to verify transaction. Please check the hash and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatCurrency = (value) => {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? '0.00' : numValue.toFixed(4);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <RefreshCw className="text-yellow-500" size={20} />;
    }
  };

  const getEtherscanUrl = (hash, type = 'tx') => {
    const baseUrl = 'https://etherscan.io';
    return `${baseUrl}/${type}/${hash}`;
  };

  return (
    <div className="blockchain-verifier">
      <div className="verifier-container">
        <div className="verifier-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div>
            <h1>🔗 Blockchain Verifier</h1>
            <p>Verify transactions, smart contracts, and check order blockchain integration</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-input-group">
            <Search size={20} />
            <input
              type="text"
              placeholder="Enter transaction hash or contract address (0x...)"
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyTransaction()}
            />
            <button 
              onClick={() => handleVerifyTransaction()}
              disabled={loading}
              className="verify-button"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : 'Verify'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-card">
            <AlertCircle size={24} />
            <div>
              <h3>Verification Failed</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Verification Results */}
        {verificationData && (
          <div className="verification-results">
            
            {/* Database Record */}
            <div className="result-card">
              <div className="card-header">
                <Database size={24} />
                <h3>Database Record</h3>
                {getStatusIcon(verificationData.verification?.database ? 'verified' : 'failed')}
              </div>
              
              <div className="verification-grid">
                <div className="verification-item">
                  <span className="label">Transaction Hash:</span>
                  <span className="value hash-value">
                    {verificationData.txHash}
                    <button onClick={() => copyToClipboard(verificationData.txHash)}>
                      <Copy size={16} />
                    </button>
                  </span>
                </div>
                
                <div className="verification-item">
                  <span className="label">Database Status:</span>
                  <span className={`status ${verificationData.verification?.database ? 'verified' : 'not-found'}`}>
                    {verificationData.verification?.database ? 'Found' : 'Not Found'}
                  </span>
                </div>
                
                <div className="verification-item">
                  <span className="label">Blockchain Record:</span>
                  <span className={`status ${verificationData.verification?.blockchain ? 'verified' : 'not-found'}`}>
                    {verificationData.verification?.blockchain ? 'Recorded' : 'Not Recorded'}
                  </span>
                </div>
                
                <div className="verification-item">
                  <span className="label">Immutable:</span>
                  <span className={`status ${verificationData.verification?.immutable ? 'verified' : 'not-verified'}`}>
                    {verificationData.verification?.immutable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {verificationData.blockchainRecord && (
                <div className="blockchain-details">
                  <h4>Blockchain Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Type:</span>
                      <span>{verificationData.blockchainRecord.type}</span>
                    </div>
                    <div className="detail-item">
                      <span>Amount:</span>
                      <span>{formatCurrency(verificationData.blockchainRecord.amount)} {verificationData.blockchainRecord.currency}</span>
                    </div>
                    <div className="detail-item">
                      <span>Block Number:</span>
                      <span>{verificationData.blockchainRecord.blockNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span>Gas Used:</span>
                      <span>{verificationData.blockchainRecord.gasUsed || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span>Recorded At:</span>
                      <span>{new Date(verificationData.blockchainRecord.recordedAt).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span>Merkle Root:</span>
                      <span className="hash-value">
                        {verificationData.blockchainRecord.merkleRoot ? 
                          formatAddress(verificationData.blockchainRecord.merkleRoot) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Contract Details */}
            {contractData && (
              <div className="result-card">
                <div className="card-header">
                  <Shield size={24} />
                  <h3>Smart Contract</h3>
                  <CheckCircle className="text-green-500" size={20} />
                </div>
                
                <div className="contract-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Contract Address:</span>
                      <span className="hash-value">
                        {contractData.address}
                        <button onClick={() => copyToClipboard(contractData.address)}>
                          <Copy size={16} />
                        </button>
                        <a 
                          href={getEtherscanUrl(contractData.address, 'address')}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Seller:</span>
                      <span className="hash-value">{formatAddress(contractData.details.seller)}</span>
                    </div>
                    <div className="detail-item">
                      <span>Buyer:</span>
                      <span className="hash-value">{formatAddress(contractData.details.buyer)}</span>
                    </div>
                    <div className="detail-item">
                      <span>Amount:</span>
                      <span>{contractData.details.amount} ETH</span>
                    </div>
                    <div className="detail-item">
                      <span>State:</span>
                      <span className={`status state-${contractData.details.state}`}>
                        {['Created', 'Active', 'Completed', 'Disputed', 'Refunded'][contractData.details.state] || 'Unknown'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span>Escrow Duration:</span>
                      <span>{Math.floor(contractData.details.escrowDuration / (24 * 60 * 60))} days</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Information */}
            {orderData && (
              <div className="result-card">
                <div className="card-header">
                  <Package size={24} />
                  <h3>Order Information</h3>
                  {getStatusIcon(orderData.status)}
                </div>
                
                <div className="order-details">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span>Order Number:</span>
                      <span>#{orderData.orderNumber}</span>
                    </div>
                    <div className="detail-item">
                      <span>Total Amount:</span>
                      <span>${formatCurrency(orderData.total)}</span>
                    </div>
                    <div className="detail-item">
                      <span>Payment Method:</span>
                      <span>{orderData.payment_method}</span>
                    </div>
                    <div className="detail-item">
                      <span>Payment Status:</span>
                      <span className={`status ${orderData.payment_status}`}>{orderData.payment_status}</span>
                    </div>
                    <div className="detail-item">
                      <span>Order Status:</span>
                      <span className={`status ${orderData.status}`}>{orderData.status}</span>
                    </div>
                    <div className="detail-item">
                      <span>Created:</span>
                      <span>{new Date(orderData.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {orderData.items && (
                    <div className="order-items">
                      <h4>Items ({orderData.items.length})</h4>
                      {orderData.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <span>{item.name}</span>
                          <span>Qty: {item.quantity}</span>
                          <span>${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="external-links">
              <h3>🔍 External Verification</h3>
              <div className="link-buttons">
                <a 
                  href={getEtherscanUrl(verificationData.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-btn"
                >
                  <ExternalLink size={16} />
                  View on Etherscan
                </a>
                {contractData && (
                  <a 
                    href={getEtherscanUrl(contractData.address, 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link-btn"
                  >
                    <Shield size={16} />
                    Contract on Etherscan
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="info-panel">
          <div className="info-card">
            <Shield size={24} />
            <div>
              <h3>How Blockchain Verification Works</h3>
              <ul>
                <li>🔗 Every transaction is recorded immutably in our database</li>
                <li>🛡️ Smart contracts provide escrow protection</li>
                <li>📝 All records include cryptographic signatures</li>
                <li>🌐 External verification available on blockchain explorers</li>
                <li>🔍 Transparent and auditable transaction history</li>
              </ul>
            </div>
          </div>
          
          <div className="info-card">
            <FileText size={24} />
            <div>
              <h3>What You Can Verify</h3>
              <ul>
                <li>📋 Transaction hashes from orders</li>
                <li>🤝 Smart contract addresses for escrow</li>
                <li>💰 Payment confirmations and amounts</li>
                <li>📦 Order status and blockchain integration</li>
                <li>🔐 Cryptographic proof of authenticity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainVerifier; 