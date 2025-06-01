import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
  Activity,
  Settings,
  Database,
  Lock,
  RefreshCw,
  Archive,
  Flag,
  Code,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { apiEndpoints } from '../services/api';
import '../styles/SecurityAuditTrail.css';

const SecurityAuditTrail = () => {
  const [activeTab, setActiveTab] = useState('audit-logs');
  const [auditLogs, setAuditLogs] = useState([]);
  const [smartContracts, setSmartContracts] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [userFilter, setUserFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);

  const actionTypes = [
    'user_login',
    'user_logout', 
    'profile_update',
    'password_change',
    'email_change',
    'kyc_submission',
    'kyc_approval',
    'kyc_rejection',
    'order_creation',
    'order_cancellation',
    'payment_processed',
    'payment_failed',
    'dispute_created',
    'dispute_resolved',
    'admin_action',
    'system_configuration',
    'smart_contract_deployment',
    'smart_contract_interaction',
    'security_breach_attempt',
    'suspicious_activity'
  ];

  const severityLevels = [
    'low',
    'medium',
    'high',
    'critical'
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        range: dateRange
      };

      if (searchTerm) params.search = searchTerm;
      if (actionFilter !== 'all') params.action = actionFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (userFilter !== 'all') params.user = userFilter;

      switch (activeTab) {
        case 'audit-logs':
          const auditResponse = await apiEndpoints.getAuditLogs(params);
          setAuditLogs(auditResponse.data.logs);
          setTotalPages(auditResponse.data.pagination.total_pages);
          setTotalItems(auditResponse.data.pagination.total_items);
          break;
          
        case 'smart-contracts':
          const contractsResponse = await apiEndpoints.getSmartContracts(params);
          setSmartContracts(contractsResponse.data.contracts);
          break;
          
        case 'security-events':
          const eventsResponse = await apiEndpoints.getSecurityEvents(params);
          setSecurityEvents(eventsResponse.data.events);
          setTotalPages(eventsResponse.data.pagination.total_pages);
          setTotalItems(eventsResponse.data.pagination.total_items);
          break;
          
        default:
          // Default case for unknown tab
          break;
      }
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
      setError(err.response?.data?.error || 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, searchTerm, actionFilter, severityFilter, dateRange, userFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportAuditLog = async () => {
    try {
      const params = {
        range: dateRange,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        search: searchTerm || undefined,
        format: 'csv'
      };

      const response = await apiEndpoints.exportAuditLog(params);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-log-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export audit log:', err);
      alert('Failed to export audit log');
    }
  };

  const handleContractAudit = async (contractId) => {
    try {
      await apiEndpoints.requestContractAudit(contractId);
      alert('Audit request submitted successfully');
      fetchData();
    } catch (err) {
      console.error('Failed to request audit:', err);
      alert('Failed to request audit');
    }
  };

  const toggleLogExpansion = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'user_login':
      case 'user_logout':
        return <User className="action-icon user" />;
      case 'profile_update':
      case 'password_change':
      case 'email_change':
        return <Settings className="action-icon profile" />;
      case 'kyc_submission':
      case 'kyc_approval':
      case 'kyc_rejection':
        return <Shield className="action-icon kyc" />;
      case 'order_creation':
      case 'order_cancellation':
        return <FileText className="action-icon order" />;
      case 'payment_processed':
      case 'payment_failed':
        return <Zap className="action-icon payment" />;
      case 'dispute_created':
      case 'dispute_resolved':
        return <AlertTriangle className="action-icon dispute" />;
      case 'admin_action':
      case 'system_configuration':
        return <Settings className="action-icon admin" />;
      case 'smart_contract_deployment':
      case 'smart_contract_interaction':
        return <Code className="action-icon contract" />;
      case 'security_breach_attempt':
      case 'suspicious_activity':
        return <Flag className="action-icon security" />;
      default:
        return <Activity className="action-icon default" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const severityClass = `severity-badge ${severity}`;
    return <span className={severityClass}>{severity.toUpperCase()}</span>;
  };

  const getContractStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="status-icon active" />;
      case 'pending_audit':
        return <Clock className="status-icon pending" />;
      case 'audit_failed':
        return <XCircle className="status-icon failed" />;
      case 'deprecated':
        return <Archive className="status-icon deprecated" />;
      default:
        return <Clock className="status-icon default" />;
    }
  };

  if (loading) {
    return (
      <div className="security-audit-trail">
        <div className="audit-loading">
          <div className="loading-spinner"></div>
          <p>Loading security and audit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-audit-trail">
        <div className="audit-error">
          <AlertTriangle size={48} />
          <h2>Error Loading Audit Data</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="security-audit-trail">
      <div className="audit-container">
        {/* Header */}
        <div className="audit-header">
          <div className="header-content">
            <h1>Security & Audit Trail</h1>
            <p>Comprehensive audit logging and smart contract security management</p>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={handleExportAuditLog}
              className="export-button"
            >
              <Download size={16} />
              Export Audit Log
            </button>
            
            <button 
              onClick={fetchData}
              className="refresh-button"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="audit-tabs">
          <button 
            onClick={() => setActiveTab('audit-logs')}
            className={`tab-button ${activeTab === 'audit-logs' ? 'active' : ''}`}
          >
            <Database size={16} />
            Audit Logs
          </button>
          
          <button 
            onClick={() => setActiveTab('smart-contracts')}
            className={`tab-button ${activeTab === 'smart-contracts' ? 'active' : ''}`}
          >
            <Code size={16} />
            Smart Contracts
          </button>
          
          <button 
            onClick={() => setActiveTab('security-events')}
            className={`tab-button ${activeTab === 'security-events' ? 'active' : ''}`}
          >
            <Shield size={16} />
            Security Events
          </button>
        </div>

        {/* Filters */}
        <div className="audit-controls">
          <div className="search-section">
            <div className="search-input-group">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search logs, contracts, or events..."
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
                  <label>Date Range</label>
                  <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                  </select>
                </div>

                {activeTab !== 'smart-contracts' && (
                  <>
                    <div className="filter-group">
                      <label>Action Type</label>
                      <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                        <option value="all">All Actions</option>
                        {actionTypes.map(action => (
                          <option key={action} value={action}>
                            {action.replace(/_/g, ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Severity</label>
                      <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                        <option value="all">All Severities</option>
                        {severityLevels.map(severity => (
                          <option key={severity} value={severity}>
                            {severity.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="filter-actions">
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setActionFilter('all');
                    setSeverityFilter('all');
                    setUserFilter('all');
                    setDateRange('7d');
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

        {/* Content */}
        <div className="audit-content">
          {activeTab === 'audit-logs' && (
            <div className="audit-logs-section">
              <div className="section-header">
                <h2>Audit Logs</h2>
                <p>Detailed trail of all critical system actions and user activities</p>
              </div>

              <div className="logs-list">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log._id} className="log-entry">
                      <div className="log-header">
                        <div className="log-main-info">
                          <button 
                            onClick={() => toggleLogExpansion(log._id)}
                            className="expand-button"
                          >
                            {expandedLogs.has(log._id) ? 
                              <ChevronDown size={16} /> : 
                              <ChevronRight size={16} />
                            }
                          </button>
                          
                          {getActionIcon(log.action)}
                          
                          <div className="log-info">
                            <h3>{log.action.replace(/_/g, ' ').toUpperCase()}</h3>
                            <p>{log.description}</p>
                          </div>
                        </div>

                        <div className="log-meta">
                          {getSeverityBadge(log.severity)}
                          <span className="log-user">{log.user?.username || 'System'}</span>
                          <span className="log-timestamp">{formatDate(log.timestamp)}</span>
                        </div>
                      </div>

                      {expandedLogs.has(log._id) && (
                        <div className="log-details">
                          <div className="details-grid">
                            <div className="detail-section">
                              <h4>User Information</h4>
                              <div className="detail-items">
                                <div className="detail-item">
                                  <span>User ID:</span>
                                  <span>{log.userId || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>Username:</span>
                                  <span>{log.user?.username || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>Email:</span>
                                  <span>{log.user?.email || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>IP Address:</span>
                                  <span>{log.ipAddress || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>User Agent:</span>
                                  <span>{log.userAgent || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="detail-section">
                              <h4>Action Details</h4>
                              <div className="detail-items">
                                <div className="detail-item">
                                  <span>Resource:</span>
                                  <span>{log.resource || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>Resource ID:</span>
                                  <span>{log.resourceId || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>Method:</span>
                                  <span>{log.method || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span>Status:</span>
                                  <span className={`status ${log.status}`}>{log.status}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="detail-section">
                              <h4>Additional Data</h4>
                              <pre className="metadata-display">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}

                          {log.changes && log.changes.length > 0 && (
                            <div className="detail-section">
                              <h4>Changes Made</h4>
                              <div className="changes-list">
                                {log.changes.map((change, index) => (
                                  <div key={index} className="change-item">
                                    <span className="change-field">{change.field}:</span>
                                    <span className="change-old">{change.oldValue || 'null'}</span>
                                    <span className="change-arrow">→</span>
                                    <span className="change-new">{change.newValue || 'null'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-logs">
                    <Database size={48} />
                    <h3>No Audit Logs Found</h3>
                    <p>No audit logs match your current filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'smart-contracts' && (
            <div className="smart-contracts-section">
              <div className="section-header">
                <h2>Smart Contract Audits</h2>
                <p>Monitor and manage smart contract security audits</p>
              </div>

              <div className="contracts-grid">
                {smartContracts.length > 0 ? (
                  smartContracts.map((contract) => (
                    <div key={contract._id} className="contract-card">
                      <div className="contract-header">
                        <div className="contract-info">
                          <h3>{contract.name}</h3>
                          <p>{contract.description}</p>
                        </div>
                        
                        <div className="contract-status">
                          {getContractStatusIcon(contract.status)}
                          <span className="status-text">{contract.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="contract-details">
                        <div className="contract-meta">
                          <div className="meta-item">
                            <span>Version:</span>
                            <span>{contract.version}</span>
                          </div>
                          <div className="meta-item">
                            <span>Network:</span>
                            <span>{contract.network}</span>
                          </div>
                          <div className="meta-item">
                            <span>Address:</span>
                            <span className="contract-address">{contract.address}</span>
                          </div>
                          <div className="meta-item">
                            <span>Deployed:</span>
                            <span>{formatDate(contract.deployedAt)}</span>
                          </div>
                        </div>

                        <div className="audit-info">
                          <div className="audit-stats">
                            <div className="stat-item">
                              <span>Last Audit:</span>
                              <span>{contract.lastAudit ? formatDate(contract.lastAudit.date) : 'Never'}</span>
                            </div>
                            <div className="stat-item">
                              <span>Vulnerabilities:</span>
                              <span className={`vuln-count ${contract.vulnerabilities > 0 ? 'warning' : 'success'}`}>
                                {contract.vulnerabilities}
                              </span>
                            </div>
                            <div className="stat-item">
                              <span>Risk Level:</span>
                              <span className={`risk-level ${contract.riskLevel}`}>{contract.riskLevel.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="contract-actions">
                        <button 
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowContractModal(true);
                          }}
                          className="action-btn view"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                        
                        <button 
                          onClick={() => handleContractAudit(contract._id)}
                          className="action-btn audit"
                          disabled={contract.status === 'pending_audit'}
                        >
                          <Shield size={14} />
                          Request Audit
                        </button>
                        
                        <a 
                          href={`https://etherscan.io/address/${contract.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn external"
                        >
                          <ExternalLink size={14} />
                          View on Explorer
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-contracts">
                    <Code size={48} />
                    <h3>No Smart Contracts Found</h3>
                    <p>No smart contracts have been deployed yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security-events' && (
            <div className="security-events-section">
              <div className="section-header">
                <h2>Security Events</h2>
                <p>Monitor security incidents and suspicious activities</p>
              </div>

              <div className="events-list">
                {securityEvents.length > 0 ? (
                  securityEvents.map((event) => (
                    <div key={event._id} className={`event-card ${event.severity}`}>
                      <div className="event-header">
                        <div className="event-icon">
                          {event.type === 'login_attempt' && <Lock />}
                          {event.type === 'suspicious_activity' && <Flag />}
                          {event.type === 'security_breach' && <AlertTriangle />}
                          {event.type === 'system_alert' && <Shield />}
                        </div>
                        
                        <div className="event-info">
                          <h3>{event.title}</h3>
                          <p>{event.description}</p>
                        </div>
                        
                        <div className="event-meta">
                          {getSeverityBadge(event.severity)}
                          <span className="event-timestamp">{formatDate(event.timestamp)}</span>
                        </div>
                      </div>

                      <div className="event-details">
                        <div className="event-data">
                          <div className="data-item">
                            <span>Source IP:</span>
                            <span>{event.sourceIp}</span>
                          </div>
                          <div className="data-item">
                            <span>User Agent:</span>
                            <span>{event.userAgent}</span>
                          </div>
                          <div className="data-item">
                            <span>Location:</span>
                            <span>{event.location || 'Unknown'}</span>
                          </div>
                          <div className="data-item">
                            <span>Status:</span>
                            <span className={`status ${event.status}`}>{event.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-events">
                    <Shield size={48} />
                    <h3>No Security Events Found</h3>
                    <p>No security events match your current filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {(activeTab !== 'smart-contracts' && totalPages > 1) && (
          <div className="pagination">
            <div className="pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
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

      {/* Contract Detail Modal */}
      {showContractModal && selectedContract && (
        <div className="contract-modal-overlay">
          <div className="contract-modal">
            <div className="contract-modal-header">
              <h2>Smart Contract Details - {selectedContract.name}</h2>
              <button 
                onClick={() => setShowContractModal(false)}
                className="close-button"
              >
                ×
              </button>
            </div>

            <div className="contract-modal-content">
              <div className="contract-info-grid">
                <div className="info-section">
                  <h3>Contract Information</h3>
                  <div className="info-items">
                    <div className="info-item">
                      <span>Name:</span>
                      <span>{selectedContract.name}</span>
                    </div>
                    <div className="info-item">
                      <span>Version:</span>
                      <span>{selectedContract.version}</span>
                    </div>
                    <div className="info-item">
                      <span>Network:</span>
                      <span>{selectedContract.network}</span>
                    </div>
                    <div className="info-item">
                      <span>Address:</span>
                      <span className="contract-address">{selectedContract.address}</span>
                    </div>
                    <div className="info-item">
                      <span>Compiler Version:</span>
                      <span>{selectedContract.compilerVersion}</span>
                    </div>
                  </div>
                </div>

                <div className="audit-history-section">
                  <h3>Audit History</h3>
                  {selectedContract.auditHistory && selectedContract.auditHistory.length > 0 ? (
                    <div className="audit-history-list">
                      {selectedContract.auditHistory.map((audit, index) => (
                        <div key={index} className="audit-history-item">
                          <div className="audit-date">{formatDate(audit.date)}</div>
                          <div className="audit-result">
                            <span className={`result ${audit.result}`}>{audit.result.toUpperCase()}</span>
                          </div>
                          <div className="audit-firm">{audit.firm}</div>
                          {audit.reportUrl && (
                            <a href={audit.reportUrl} target="_blank" rel="noopener noreferrer" className="audit-report">
                              View Report
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No audit history available</p>
                  )}
                </div>
              </div>

              {selectedContract.vulnerabilities > 0 && selectedContract.vulnerabilityDetails && (
                <div className="vulnerabilities-section">
                  <h3>Known Vulnerabilities</h3>
                  <div className="vulnerabilities-list">
                    {selectedContract.vulnerabilityDetails.map((vuln, index) => (
                      <div key={index} className={`vulnerability-item ${vuln.severity}`}>
                        <div className="vuln-header">
                          <span className="vuln-title">{vuln.title}</span>
                          <span className={`vuln-severity ${vuln.severity}`}>{vuln.severity.toUpperCase()}</span>
                        </div>
                        <p className="vuln-description">{vuln.description}</p>
                        {vuln.recommendation && (
                          <div className="vuln-recommendation">
                            <strong>Recommendation:</strong> {vuln.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="contract-modal-footer">
              <button 
                onClick={() => setShowContractModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              
              <button 
                onClick={() => handleContractAudit(selectedContract._id)}
                className="btn-primary"
                disabled={selectedContract.status === 'pending_audit'}
              >
                <Shield size={16} />
                Request New Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityAuditTrail; 