import '../styles/AdminDisputeResolution.css';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle,
  Clock,
  Eye,
  MessageSquare,
  DollarSign,
  User,
  Package,
  Calendar,
  Search,
  Scale,
  ArrowLeft,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getApiUrl } from '../config/api';
import { logError } from '../utils/logger.production';

const AdminDisputeResolution = () => {
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [resolution, setResolution] = useState('');

  const disputeStatuses = [
    { value: 'all', label: 'All Disputes', color: 'gray' },
    { value: 'open', label: 'Open', color: 'orange' },
    { value: 'investigating', label: 'Under Investigation', color: 'blue' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'closed', label: 'Closed', color: 'gray' }
  ];

  const priorityLevels = {
    high: { label: 'High', color: 'red' },
    medium: { label: 'Medium', color: 'orange' },
    low: { label: 'Low', color: 'blue' }
  };

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/admin/disputes'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDisputes(data.disputes || []);
      } else {
        throw new Error('Failed to fetch disputes');
      }
    } catch (error) {
      logError('Error fetching disputes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const filteredDisputes = disputes.filter(dispute => {
    const matchesFilter = filter === 'all' || dispute.status === filter;
    const matchesSearch = !searchTerm || 
      dispute.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.seller.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleResolveDispute = async (disputeId, resolution) => {
    try {
      const response = await fetch(getApiUrl(`/admin/disputes/${disputeId}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolution,
          adminNotes: resolutionNotes[disputeId] || ''
        })
      });

      if (response.ok) {
        toast.success('Dispute resolved successfully');
        fetchDisputes(); // Refresh the list
        setResolutionNotes(prev => ({
          ...prev,
          [disputeId]: ''
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to resolve dispute');
      }
    } catch (error) {
      logError('Error resolving dispute:', error);
      toast.error('Failed to resolve dispute');
    }
  };

  const handleStatusUpdate = async (disputeId, newStatus) => {
    try {
      const response = await fetch(getApiUrl(`/admin/disputes/${disputeId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Dispute status updated');
        fetchDisputes(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }
    } catch (error) {
      logError('Error updating status:', error);
      toast.error('Failed to update dispute status');
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

  const getStatusBadge = (status) => {
    const statusConfig = disputeStatuses.find(s => s.value === status) || disputeStatuses[0];
    return (
      <span className={`status-badge ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = priorityLevels[priority] || priorityLevels.low;
    return (
      <span className={`priority-badge ${priorityConfig.color}`}>
        {priorityConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="admin-dispute-resolution">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading disputes...</p>
        </div>
      </div>
    );
  }

  if (selectedDispute) {
    return (
      <div className="admin-dispute-resolution">
        <div className="dispute-detail">
          <div className="detail-header">
            <button 
              className="back-button"
              onClick={() => setSelectedDispute(null)}
            >
              <ArrowLeft size={20} />
              Back to Disputes
            </button>
            
            <div className="dispute-info">
              <div className="dispute-title">
                <h1>{selectedDispute.title}</h1>
                <span className="dispute-id">#{selectedDispute.id}</span>
              </div>
              
              <div className="dispute-meta">
                {getStatusBadge(selectedDispute.status)}
                {getPriorityBadge(selectedDispute.priority)}
                <span className="dispute-date">
                  <Calendar size={16} />
                  {formatDate(selectedDispute.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-content">
            <div className="dispute-overview">
              <div className="parties-info">
                <div className="party buyer">
                  <div className="party-header">
                    <User size={20} />
                    <h3>Buyer</h3>
                  </div>
                  <div className="party-details">
                    <p className="name">{selectedDispute.buyer.name}</p>
                    <p className="email">{selectedDispute.buyer.email}</p>
                  </div>
                </div>

                <div className="vs-divider">
                  <Scale size={24} />
                </div>

                <div className="party seller">
                  <div className="party-header">
                    <Package size={20} />
                    <h3>Seller</h3>
                  </div>
                  <div className="party-details">
                    <p className="name">{selectedDispute.seller.name}</p>
                    <p className="email">{selectedDispute.seller.email}</p>
                  </div>
                </div>
              </div>

              <div className="order-info">
                <h3>Order Details</h3>
                <div className="order-card">
                  <div className="order-header">
                    <span className="order-id">#{selectedDispute.order.id}</span>
                    <span className="order-amount">${selectedDispute.order.amount}</span>
                  </div>
                  <p className="product-name">{selectedDispute.order.product}</p>
                </div>
              </div>

              <div className="dispute-description">
                <h3>Dispute Description</h3>
                <p>{selectedDispute.description}</p>
              </div>
            </div>

            <div className="messages-section">
              <h3>
                <MessageSquare size={20} />
                Conversation History
              </h3>
              
              <div className="messages-list">
                {selectedDispute.messages && selectedDispute.messages.length > 0 ? (
                  selectedDispute.messages.map(message => (
                    <div key={message.id || Math.random()} className={`message ${message.sender || 'unknown'}`}>
                      <div className="message-header">
                        <span className="sender">{message.sender || 'Unknown'}</span>
                        <span className="timestamp">
                          {message.timestamp ? formatDate(message.timestamp) : 'Unknown time'}
                        </span>
                      </div>
                      <p className="message-content">{message.message || 'No message content'}</p>
                    </div>
                  ))
                ) : (
                  <div className="no-messages">
                    <p>No messages in this conversation yet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="resolution-section">
              <h3>
                <Scale size={20} />
                Dispute Resolution
              </h3>
              
              <div className="status-controls">
                <div className="status-selector">
                  <label>Update Status:</label>
                  <select 
                    value={selectedDispute.status}
                    onChange={(e) => handleStatusUpdate(selectedDispute.id, e.target.value)}
                  >
                    {disputeStatuses.slice(1).map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="resolution-form">
                <textarea
                  placeholder="Enter resolution details..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
                
                <div className="resolution-actions">
                  <button 
                    className="resolve-button"
                    onClick={() => handleResolveDispute(selectedDispute.id, resolution)}
                    disabled={!resolution.trim()}
                  >
                    Resolve Dispute
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dispute-resolution">
      <div className="dispute-header">
        <div className="header-content">
          <h1>🛡️ Dispute Resolution Center</h1>
          <p>Manage and resolve user disputes efficiently</p>
        </div>
      </div>

      <div className="dispute-controls">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search disputes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {disputeStatuses.map(status => (
            <button
              key={status.value}
              className={`filter-tab ${filter === status.value ? 'active' : ''} ${status.color}`}
              onClick={() => setFilter(status.value)}
            >
              {status.label}
              {status.value !== 'all' && (
                <span className="count">
                  {disputes.filter(d => d.status === status.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button className="export-button">
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="disputes-list">
        {filteredDisputes.length === 0 ? (
          <div className="no-disputes">
            <AlertTriangle size={48} />
            <h3>No Disputes Found</h3>
            <p>There are no disputes matching your current filters.</p>
          </div>
        ) : (
          filteredDisputes.map(dispute => (
            <div 
              key={dispute.id} 
              className="dispute-card"
              onClick={() => setSelectedDispute(dispute)}
            >
              <div className="dispute-header">
                <div className="dispute-title">
                  <h3>{dispute.title}</h3>
                  <span className="dispute-id">#{dispute.id}</span>
                </div>
                
                <div className="dispute-badges">
                  {getStatusBadge(dispute.status)}
                  {getPriorityBadge(dispute.priority)}
                </div>
              </div>

              <div className="dispute-content">
                <p className="dispute-description">{dispute.description}</p>
                
                <div className="dispute-parties">
                  <div className="party">
                    <User size={16} />
                    <span>{dispute.buyer.name}</span>
                  </div>
                  <span className="vs">vs</span>
                  <div className="party">
                    <Package size={16} />
                    <span>{dispute.seller.name}</span>
                  </div>
                </div>

                <div className="dispute-order">
                  <DollarSign size={16} />
                  <span>Order #{dispute.order.id} - ${dispute.order.amount}</span>
                </div>
              </div>

              <div className="dispute-footer">
                <div className="dispute-date">
                  <Clock size={16} />
                  {formatDate(dispute.createdAt)}
                </div>
                
                <div className="dispute-actions">
                  <button className="view-button">
                    <Eye size={16} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDisputeResolution; 