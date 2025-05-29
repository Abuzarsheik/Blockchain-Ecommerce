import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Verified, ExternalLink, Clock, User, Hash } from 'lucide-react';
import { verifyProductOnChain, getProductHistory } from '../store/slices/blockchainSlice';
import LoadingSpinner from './LoadingSpinner';
import '../styles/BlockchainVerification.css';

const BlockchainVerification = ({ productId, onClose }) => {
  const dispatch = useDispatch();
  const { verifications, productHistories, loading } = useSelector(state => state.blockchain);
  const [activeTab, setActiveTab] = useState('verification');

  useEffect(() => {
    if (!verifications[productId]) {
      dispatch(verifyProductOnChain(productId));
    }
    if (!productHistories[productId]) {
      dispatch(getProductHistory(productId));
    }
  }, [dispatch, productId, verifications, productHistories]);

  const verification = verifications[productId];
  const history = productHistories[productId] || [];

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openTransaction = (txHash) => {
    // Open transaction in blockchain explorer
    window.open(`https://polygonscan.com/tx/${txHash}`, '_blank');
  };

  return (
    <div className="blockchain-verification-overlay">
      <div className="verification-modal">
        <div className="modal-header">
          <h3>Blockchain Verification</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <Verified size={16} />
            Verification
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={16} />
            History
          </button>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-container">
              <LoadingSpinner />
              <p>Loading blockchain data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'verification' && (
                <div className="verification-content">
                  {verification ? (
                    <>
                      <div className="verification-status">
                        <div className="status-icon verified">
                          <Verified size={24} />
                        </div>
                        <div className="status-text">
                          <h4>Verified on Blockchain</h4>
                          <p>This product has been verified and registered on the blockchain</p>
                        </div>
                      </div>

                      <div className="verification-details">
                        <div className="detail-item">
                          <label>Transaction Hash:</label>
                          <div className="detail-value">
                            <Hash size={14} />
                            <span>{formatAddress(verification.txHash)}</span>
                            <button 
                              className="external-link"
                              onClick={() => openTransaction(verification.txHash)}
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="detail-item">
                          <label>Verified By:</label>
                          <div className="detail-value">
                            <User size={14} />
                            <span>{formatAddress(verification.manufacturer)}</span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <label>Verification Date:</label>
                          <div className="detail-value">
                            <Clock size={14} />
                            <span>{formatDate(verification.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="verification-info">
                        <h5>What does this mean?</h5>
                        <ul>
                          <li>Product authenticity is guaranteed by blockchain technology</li>
                          <li>Ownership and transaction history is transparent and immutable</li>
                          <li>Product metadata is stored on IPFS for decentralized access</li>
                          <li>Smart contracts ensure secure and automated transactions</li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <div className="verification-status">
                      <div className="status-icon unverified">
                        <X size={24} />
                      </div>
                      <div className="status-text">
                        <h4>Not Verified</h4>
                        <p>This product has not been verified on the blockchain</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="history-content">
                  {history.length > 0 ? (
                    <div className="history-timeline">
                      {history.map((event, index) => (
                        <div key={index} className="timeline-item">
                          <div className="timeline-marker"></div>
                          <div className="timeline-content">
                            <div className="event-header">
                              <h5>{event.event}</h5>
                              <span className="event-date">
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                            <div className="event-details">
                              <div className="detail-row">
                                <span>Transaction:</span>
                                <button 
                                  className="tx-link"
                                  onClick={() => openTransaction(event.txHash)}
                                >
                                  {formatAddress(event.txHash)}
                                  <ExternalLink size={12} />
                                </button>
                              </div>
                              {event.manufacturer && (
                                <div className="detail-row">
                                  <span>Manufacturer:</span>
                                  <span>{formatAddress(event.manufacturer)}</span>
                                </div>
                              )}
                              {event.verifier && (
                                <div className="detail-row">
                                  <span>Verifier:</span>
                                  <span>{formatAddress(event.verifier)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-history">
                      <Clock size={48} />
                      <h4>No History Available</h4>
                      <p>No blockchain events found for this product</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockchainVerification; 