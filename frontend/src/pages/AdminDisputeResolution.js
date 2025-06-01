import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Package,
  DollarSign,
  FileText,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
  Shield,
  Scale,
  Gavel,
  Flag,
  Users
} from 'lucide-react';
import { apiEndpoints } from '../services/api';
import '../styles/AdminDisputeResolution.css';

const AdminDisputeResolution = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDisputes, setTotalDisputes] = useState(0);
  const disputesPerPage = 20;

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [expandedDisputes, setExpandedDisputes] = useState(new Set());

  // Communication
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Resolution
  const [resolutionData, setResolutionData] = useState({
    decision: '',
    reason: '',
    refundAmount: 0,
    compensationAmount: 0,
    notes: ''
  });

  const disputeCategories = [
    'item_not_received',
    'item_not_as_described', 
    'item_damaged',
    'wrong_item_sent',
    'late_delivery',
    'seller_communication',
    'payment_issue',
    'refund_request',
    'shipping_issue',
    'quality_issue',
    'counterfeit_item',
    'other'
  ];

  const disputeStatuses = [
    'open',
    'in_review',
    'pending_response',
    'escalated',
    'resolved',
    'closed'
  ];

  const priorityLevels = [
    'low',
    'medium', 
    'high',
    'urgent'
  ];

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: disputesPerPage,
        sortBy,
        sortOrder: 'desc'
      };

      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (assigneeFilter !== 'all') params.assignee = assigneeFilter;

      const response = await apiEndpoints.getAdminDisputes(params);
      setDisputes(response.data.disputes);
      setTotalPages(response.data.pagination.total_pages);
      setTotalDisputes(response.data.pagination.total_disputes);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      setError(err.response?.data?.error || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, categoryFilter, priorityFilter, assigneeFilter, sortBy]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleDisputeAction = async (disputeId, action, data = {}) => {
    try {
      setLoadingActions(prev => ({ ...prev, [disputeId]: action }));

      switch (action) {
        case 'assign':
          await apiEndpoints.assignDispute(disputeId, data.adminId);
          break;
        case 'escalate':
          await apiEndpoints.escalateDispute(disputeId, data);
          break;
        case 'resolve':
          await apiEndpoints.resolveDispute(disputeId, data);
          break;
        case 'close':
          await apiEndpoints.closeDispute(disputeId, data);
          break;
        case 'updatePriority':
          await apiEndpoints.updateDisputePriority(disputeId, data.priority);
          break;
        default:
          throw new Error('Invalid action');
      }

      await fetchDisputes();
      if (selectedDispute && selectedDispute._id === disputeId) {
        const updatedDispute = await apiEndpoints.getDispute(disputeId);
        setSelectedDispute(updatedDispute.data);
      }

    } catch (err) {
      console.error(`Failed to ${action} dispute:`, err);
      alert(err.response?.data?.error || `Failed to ${action} dispute`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [disputeId]: false }));
    }
  };

  const handleSendMessage = async (disputeId) => {
    if (!messageText.trim() && selectedFiles.length === 0) return;

    try {
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('type', 'admin_message');
      
      selectedFiles.forEach((file, index) => {
        formData.append(`attachments`, file);
      });

      await apiEndpoints.addDisputeMessage(disputeId, formData);
      
      setMessageText('');
      setSelectedFiles([]);
      
      // Refresh dispute data
      if (selectedDispute && selectedDispute._id === disputeId) {
        const updatedDispute = await apiEndpoints.getDispute(disputeId);
        setSelectedDispute(updatedDispute.data);
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err.response?.data?.error || 'Failed to send message');
    }
  };

  const handleResolveDispute = async (disputeId) => {
    if (!resolutionData.decision || !resolutionData.reason) {
      alert('Please provide decision and reason for resolution');
      return;
    }

    await handleDisputeAction(disputeId, 'resolve', resolutionData);
    setResolutionData({
      decision: '',
      reason: '',
      refundAmount: 0,
      compensationAmount: 0,
      notes: ''
    });
  };

  const toggleDisputeExpansion = (disputeId) => {
    const newExpanded = new Set(expandedDisputes);
    if (newExpanded.has(disputeId)) {
      newExpanded.delete(disputeId);
    } else {
      newExpanded.add(disputeId);
    }
    setExpandedDisputes(newExpanded);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock className="status-icon open" />;
      case 'in_review':
        return <Eye className="status-icon in-review" />;
      case 'pending_response':
        return <MessageSquare className="status-icon pending" />;
      case 'escalated':
        return <AlertTriangle className="status-icon escalated" />;
      case 'resolved':
        return <CheckCircle className="status-icon resolved" />;
      case 'closed':
        return <XCircle className="status-icon closed" />;
      default:
        return <Clock className="status-icon default" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const priorityClass = `priority-badge ${priority}`;
    return <span className={priorityClass}>{priority.toUpperCase()}</span>;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'item_not_received':
      case 'late_delivery':
        return <Package />;
      case 'payment_issue':
      case 'refund_request':
        return <DollarSign />;
      case 'seller_communication':
        return <MessageSquare />;
      default:
        return <AlertTriangle />;
    }
  };

  if (loading) {
    return (
      <div className="admin-dispute-resolution">
        <div className="dispute-loading">
          <div className="loading-spinner"></div>
          <p>Loading dispute resolution dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dispute-resolution">
        <div className="dispute-error">
          <AlertTriangle size={48} />
          <h2>Error Loading Disputes</h2>
          <p>{error}</p>
          <button onClick={fetchDisputes} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dispute-resolution">
      <div className="dispute-container">
        {/* Header */}
        <div className="dispute-header">
          <div className="header-content">
            <h1>Dispute Resolution Center</h1>
            <p>Manage platform disputes and resolution processes</p>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Disputes</span>
              <span className="stat-value">{totalDisputes}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Open</span>
              <span className="stat-value">{disputes.filter(d => d.status === 'open').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">In Review</span>
              <span className="stat-value">{disputes.filter(d => d.status === 'in_review').length}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="dispute-controls">
          <div className="search-section">
            <div className="search-input-group">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search disputes by ID, user, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
            >
              <Filter size={16} />
              Filters
              <ChevronDown size={16} />
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-group">
                  <label>Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    {disputeStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Category</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {disputeCategories.map(category => (
                      <option key={category} value={category}>
                        {category.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Priority</label>
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                    <option value="all">All Priorities</option>
                    {priorityLevels.map(priority => (
                      <option key={priority} value={priority}>
                        {priority.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="created_at">Date Created</option>
                    <option value="updated_at">Last Updated</option>
                    <option value="priority">Priority</option>
                    <option value="disputedAmount">Amount</option>
                  </select>
                </div>
              </div>

              <div className="filter-actions">
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setCategoryFilter('all');
                    setPriorityFilter('all');
                    setAssigneeFilter('all');
                  }}
                  className="reset-filters-btn"
                >
                  <RefreshCw size={14} />
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Disputes List */}
        <div className="disputes-list">
          {disputes.length > 0 ? (
            disputes.map((dispute) => (
              <div key={dispute._id} className="dispute-card">
                <div className="dispute-header-row">
                  <div className="dispute-main-info">
                    <button 
                      onClick={() => toggleDisputeExpansion(dispute._id)}
                      className="expand-button"
                    >
                      {expandedDisputes.has(dispute._id) ? 
                        <ChevronDown size={16} /> : 
                        <ChevronRight size={16} />
                      }
                    </button>
                    
                    <div className="dispute-id-info">
                      <h3>#{dispute._id.slice(-8)}</h3>
                      <span className="dispute-category">
                        {getCategoryIcon(dispute.category)}
                        {dispute.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="dispute-status-info">
                      {getStatusIcon(dispute.status)}
                      <span className="status-text">{dispute.status.replace('_', ' ')}</span>
                      {getPriorityBadge(dispute.priority)}
                    </div>
                  </div>

                  <div className="dispute-meta">
                    <div className="dispute-amount">
                      {formatCurrency(dispute.disputedAmount || dispute.orderAmount)}
                    </div>
                    <div className="dispute-date">
                      {formatDate(dispute.createdAt)}
                    </div>
                  </div>

                  <div className="dispute-actions">
                    <button 
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setShowDisputeModal(true);
                      }}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </button>
                    
                    {dispute.status === 'open' && (
                      <button 
                        onClick={() => handleDisputeAction(dispute._id, 'assign', { adminId: 'current_admin' })}
                        className="action-btn assign"
                        title="Assign to Me"
                        disabled={loadingActions[dispute._id]}
                      >
                        <User size={14} />
                      </button>
                    )}

                    {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                      <button 
                        onClick={() => handleDisputeAction(dispute._id, 'escalate')}
                        className="action-btn escalate"
                        title="Escalate"
                        disabled={loadingActions[dispute._id]}
                      >
                        <Flag size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {expandedDisputes.has(dispute._id) && (
                  <div className="dispute-expanded-content">
                    <div className="dispute-details">
                      <div className="detail-section">
                        <h4>Description</h4>
                        <p>{dispute.description}</p>
                      </div>

                      <div className="detail-section">
                        <h4>Participants</h4>
                        <div className="participants">
                          <div className="participant">
                            <User size={16} />
                            <span>Buyer: {dispute.buyer?.username || 'N/A'}</span>
                          </div>
                          <div className="participant">
                            <Users size={16} />
                            <span>Seller: {dispute.seller?.username || 'N/A'}</span>
                          </div>
                          {dispute.assignedAdmin && (
                            <div className="participant">
                              <Shield size={16} />
                              <span>Admin: {dispute.assignedAdmin.username}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {dispute.evidence && dispute.evidence.length > 0 && (
                        <div className="detail-section">
                          <h4>Evidence</h4>
                          <div className="evidence-list">
                            {dispute.evidence.map((evidence, index) => (
                              <div key={index} className="evidence-item">
                                <FileText size={16} />
                                <span>{evidence.filename}</span>
                                <button className="download-btn">
                                  <Download size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="quick-actions">
                        {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setShowDisputeModal(true);
                              }}
                              className="btn-primary"
                            >
                              <Gavel size={16} />
                              Resolve Dispute
                            </button>
                            
                            <button 
                              onClick={() => {
                                setSelectedDispute(dispute);
                                setShowDisputeModal(true);
                              }}
                              className="btn-secondary"
                            >
                              <MessageSquare size={16} />
                              Communicate
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-disputes">
              <Scale size={48} />
              <h3>No Disputes Found</h3>
              <p>No disputes match your current filters.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {((currentPage - 1) * disputesPerPage) + 1} to {Math.min(currentPage * disputesPerPage, totalDisputes)} of {totalDisputes} disputes
            </div>
            
            <div className="pagination-controls">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <div className="pagination-pages">
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const page = Math.max(1, currentPage - 2) + index;
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dispute Detail Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="dispute-modal-overlay">
          <div className="dispute-modal">
            <div className="dispute-modal-header">
              <h2>Dispute Resolution - #{selectedDispute._id.slice(-8)}</h2>
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="dispute-modal-content">
              {/* Dispute Information */}
              <div className="modal-section">
                <h3>Dispute Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Status</label>
                    <div className="status-display">
                      {getStatusIcon(selectedDispute.status)}
                      <span>{selectedDispute.status.replace('_', ' ')}</span>
                      {getPriorityBadge(selectedDispute.priority)}
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Category</label>
                    <span>{selectedDispute.category.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="info-item">
                    <label>Amount in Dispute</label>
                    <span>{formatCurrency(selectedDispute.disputedAmount || selectedDispute.orderAmount)}</span>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <span>{formatDate(selectedDispute.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Communication */}
              <div className="modal-section">
                <h3>Communication</h3>
                <div className="communication-area">
                  <div className="messages-list">
                    {selectedDispute.messages && selectedDispute.messages.length > 0 ? (
                      selectedDispute.messages.map((message, index) => (
                        <div key={index} className={`message ${message.type}`}>
                          <div className="message-header">
                            <strong>{message.sender?.username || 'System'}</strong>
                            <span className="message-time">{formatDate(message.timestamp)}</span>
                          </div>
                          <p>{message.content}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                              {message.attachments.map((attachment, idx) => (
                                <div key={idx} className="attachment">
                                  <FileText size={14} />
                                  <span>{attachment.filename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>No messages yet.</p>
                    )}
                  </div>

                  <div className="message-compose">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message to the parties involved..."
                      rows={3}
                    />
                    <div className="message-actions">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                        style={{ display: 'none' }}
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="upload-btn">
                        <Upload size={16} />
                        Attach Files
                      </label>
                      <button 
                        onClick={() => handleSendMessage(selectedDispute._id)}
                        className="send-btn"
                        disabled={!messageText.trim() && selectedFiles.length === 0}
                      >
                        <Send size={16} />
                        Send Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution */}
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                <div className="modal-section">
                  <h3>Resolution</h3>
                  <div className="resolution-form">
                    <div className="form-group">
                      <label>Decision</label>
                      <select 
                        value={resolutionData.decision}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, decision: e.target.value }))}
                      >
                        <option value="">Select Decision</option>
                        <option value="favor_buyer">Favor Buyer</option>
                        <option value="favor_seller">Favor Seller</option>
                        <option value="partial_refund">Partial Refund</option>
                        <option value="no_action">No Action Required</option>
                        <option value="escalate_further">Escalate Further</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Reason for Decision</label>
                      <textarea
                        value={resolutionData.reason}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Explain the reasoning behind your decision..."
                        rows={3}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Refund Amount</label>
                        <input
                          type="number"
                          value={resolutionData.refundAmount}
                          onChange={(e) => setResolutionData(prev => ({ ...prev, refundAmount: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div className="form-group">
                        <label>Compensation Amount</label>
                        <input
                          type="number"
                          value={resolutionData.compensationAmount}
                          onChange={(e) => setResolutionData(prev => ({ ...prev, compensationAmount: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Additional Notes</label>
                      <textarea
                        value={resolutionData.notes}
                        onChange={(e) => setResolutionData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any additional notes or instructions..."
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="dispute-modal-footer">
              <button 
                onClick={() => setShowDisputeModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                <>
                  <button 
                    onClick={() => handleDisputeAction(selectedDispute._id, 'escalate')}
                    className="btn-warning"
                    disabled={loadingActions[selectedDispute._id]}
                  >
                    <Flag size={16} />
                    Escalate
                  </button>
                  
                  <button 
                    onClick={() => handleResolveDispute(selectedDispute._id)}
                    className="btn-primary"
                    disabled={!resolutionData.decision || !resolutionData.reason || loadingActions[selectedDispute._id]}
                  >
                    {loadingActions[selectedDispute._id] ? (
                      <RefreshCw size={16} className="spinning" />
                    ) : (
                      <Gavel size={16} />
                    )}
                    Resolve Dispute
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDisputeResolution; 