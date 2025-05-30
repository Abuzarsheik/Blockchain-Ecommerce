import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronDown,
  Eye,
  Lock,
  Unlock,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Edit,
  Ban,
  RefreshCw
} from 'lucide-react';
import { apiEndpoints } from '../services/api';
import '../styles/AdminUserManagement.css';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm, statusFilter, roleFilter, verificationFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: usersPerPage,
        sortBy,
        sortOrder
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      if (verificationFilter !== 'all') params.verification = verificationFilter;

      const response = await apiEndpoints.getUsers(params);
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.total_pages);
      setTotalUsers(response.data.pagination.total_users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action, data = {}) => {
    try {
      setLoadingActions(prev => ({ ...prev, [userId]: action }));

      switch (action) {
        case 'unlock':
          await apiEndpoints.unlockUser(userId);
          break;
        case 'update':
          await apiEndpoints.updateUser(userId, data);
          break;
        default:
          throw new Error('Invalid action');
      }

      await fetchUsers();
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
      alert(err.response?.data?.error || `Failed to ${action} user`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await apiEndpoints.getUser(userId);
      setSelectedUser(response.data);
      setShowUserModal(true);
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      alert('Failed to load user details');
    }
  };

  const getUserStatusBadge = (user) => {
    if (user.loginAttempts?.lockedUntil && new Date(user.loginAttempts.lockedUntil) > new Date()) {
      return <span className="status-badge locked">Locked</span>;
    }
    if (!user.isActive) {
      return <span className="status-badge inactive">Inactive</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  const getVerificationBadge = (user) => {
    switch (user.kyc?.status) {
      case 'approved':
        return (
          <span className="verification-badge verified">
            <CheckCircle size={14} />
            Verified
          </span>
        );
      case 'in_review':
        return (
          <span className="verification-badge pending">
            <Clock size={14} />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="verification-badge rejected">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="verification-badge unverified">
            <AlertTriangle size={14} />
            Unverified
          </span>
        );
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'admin', icon: Shield },
      moderator: { color: 'moderator', icon: Shield },
      user: { color: 'user', icon: User }
    };

    const config = roleConfig[role] || roleConfig.user;
    const Icon = config.icon;

    return (
      <span className={`role-badge ${config.color}`}>
        <Icon size={12} />
        {role}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRoleFilter('');
    setVerificationFilter('all');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-user-management">
        <div className="user-management-loading">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-user-management">
      <div className="user-management-container">
        {/* Header */}
        <div className="user-management-header">
          <div className="header-content">
            <h1>User Management</h1>
            <p>Manage platform users, accounts, and verification status</p>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Total Users</span>
              <span className="stat-value">{totalUsers.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="user-management-controls">
          <div className="search-section">
            <div className="search-input-group">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search users by name, email, or username..."
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
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="locked">Locked</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Role</label>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Verification</label>
                  <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
                    <option value="all">All Verification</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Sort By</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="created_at">Join Date</option>
                    <option value="lastLogin">Last Login</option>
                    <option value="firstName">First Name</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Order</label>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              <div className="filter-actions">
                <button onClick={resetFilters} className="reset-filters-btn">
                  Reset Filters
                </button>
                <button onClick={fetchUsers} className="apply-filters-btn">
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        {error ? (
          <div className="user-management-error">
            <AlertTriangle size={48} />
            <h3>Error Loading Users</h3>
            <p>{error}</p>
            <button onClick={fetchUsers} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Verification</th>
                    <th>Join Date</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="user-row">
                      <td className="user-info">
                        <div className="user-avatar">
                          {user.profile?.avatar ? (
                            <img src={user.profile.avatar} alt={user.firstName} />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="user-email">{user.email}</div>
                          <div className="user-username">@{user.username}</div>
                        </div>
                      </td>
                      
                      <td>
                        {getUserStatusBadge(user)}
                      </td>
                      
                      <td>
                        {getRoleBadge(user.role)}
                      </td>
                      
                      <td>
                        {getVerificationBadge(user)}
                      </td>
                      
                      <td>
                        <div className="date-info">
                          <Calendar size={14} />
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                      
                      <td>
                        <div className="date-info">
                          <Clock size={14} />
                          {formatDate(user.lastLogin)}
                        </div>
                      </td>
                      
                      <td>
                        <div className="user-actions">
                          <button
                            onClick={() => handleViewUser(user._id)}
                            className="action-btn view"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {user.loginAttempts?.lockedUntil && new Date(user.loginAttempts.lockedUntil) > new Date() && (
                            <button
                              onClick={() => handleUserAction(user._id, 'unlock')}
                              className="action-btn unlock"
                              title="Unlock Account"
                              disabled={loadingActions[user._id] === 'unlock'}
                            >
                              {loadingActions[user._id] === 'unlock' ? (
                                <RefreshCw size={16} className="spinning" />
                              ) : (
                                <Unlock size={16} />
                              )}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleUserAction(user._id, 'update', { isActive: !user.isActive })}
                            className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                            disabled={loadingActions[user._id] === 'update'}
                          >
                            {loadingActions[user._id] === 'update' ? (
                              <RefreshCw size={16} className="spinning" />
                            ) : user.isActive ? (
                              <Ban size={16} />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
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
          </>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onUpdate={() => {
            fetchUsers();
            setShowUserModal(false);
          }}
        />
      )}
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    role: user.role,
    isActive: user.isActive,
    adminNotes: user.admin_notes || ''
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      await apiEndpoints.updateUser(user._id, formData);
      onUpdate();
    } catch (err) {
      console.error('Failed to update user:', err);
      alert('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="user-modal-overlay" onClick={onClose}>
      <div className="user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-modal-header">
          <h2>{user.firstName} {user.lastName}</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="user-modal-content">
          <div className="user-modal-section">
            <h3>Basic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <span>{user.firstName} {user.lastName}</span>
              </div>
              <div className="info-item">
                <label>Username</label>
                <span>@{user.username}</span>
              </div>
              <div className="info-item">
                <label>Email</label>
                <span>{user.email}</span>
              </div>
              <div className="info-item">
                <label>User Type</label>
                <span>{user.userType}</span>
              </div>
              <div className="info-item">
                <label>Join Date</label>
                <span>{formatDate(user.created_at)}</span>
              </div>
              <div className="info-item">
                <label>Last Login</label>
                <span>{formatDate(user.lastLogin)}</span>
              </div>
            </div>
          </div>

          <div className="user-modal-section">
            <h3>Account Settings</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label>Role</label>
                {editMode ? (
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                ) : (
                  <span>{user.role}</span>
                )}
              </div>
              
              <div className="setting-item">
                <label>Status</label>
                {editMode ? (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                ) : (
                  <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                )}
              </div>
            </div>
          </div>

          {editMode && (
            <div className="user-modal-section">
              <h3>Admin Notes</h3>
              <textarea
                value={formData.adminNotes}
                onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                placeholder="Add admin notes..."
                rows={4}
              />
            </div>
          )}

          <div className="user-modal-section">
            <h3>KYC Information</h3>
            <div className="kyc-info">
              <div className="kyc-status">
                Status: <span className={`kyc-badge ${user.kyc?.status}`}>{user.kyc?.status || 'pending'}</span>
              </div>
              {user.kyc?.level && (
                <div className="kyc-level">
                  Level: <span>{user.kyc.level}</span>
                </div>
              )}
              {user.kyc?.submissionDate && (
                <div className="kyc-date">
                  Submitted: <span>{formatDate(user.kyc.submissionDate)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="user-modal-section">
            <h3>Recent Activity</h3>
            <div className="activity-summary">
              <div className="activity-item">
                <span>Orders:</span>
                <span>{user.activity?.orders?.length || 0}</span>
              </div>
              <div className="activity-item">
                <span>Transactions:</span>
                <span>{user.activity?.transactions?.length || 0}</span>
              </div>
              <div className="activity-item">
                <span>Disputes:</span>
                <span>{user.activity?.disputes?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="user-modal-footer">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-primary">
              <Edit size={16} />
              Edit User
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement; 