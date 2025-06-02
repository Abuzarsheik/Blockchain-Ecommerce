import '../styles/AdminUserManagement.css';
import React, { useState, useEffect, useCallback } from 'react';
import { apiEndpoints } from '../services/api';
import { 
  User, 
  Search, 
  Filter, 
  Shield, 
  Ban, 
  CheckCircle, 
  Eye,
  Calendar,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Unlock,
  Edit,
  Users,
  UserCheck,
  UserX,
  Package,
  ShoppingCart,
  Star
} from 'lucide-react';
import { logger } from '../utils/logger';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    userType: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 20,
    totalPages: 1,
    totalUsers: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`http://localhost:5000/api/admin/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setPagination(prev => ({
          ...prev,
          ...data.data.pagination
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (userId, updates) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchUsers(); // Refresh the list
        setShowUserModal(false);
        setSelectedUser(null);
        alert('User updated successfully!');
      } else {
        throw new Error(data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Failed to update user:', err);
      alert(err.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (user) => {
    if (!user.isActive) {
      return <span className="status-badge inactive"><XCircle size={14} /> Inactive</span>;
    }
    if (user.emailVerification?.isVerified) {
      return <span className="status-badge verified"><CheckCircle size={14} /> Verified</span>;
    }
    return <span className="status-badge pending"><Clock size={14} /> Pending</span>;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="role-badge admin"><Shield size={14} /> Admin</span>;
      case 'moderator':
        return <span className="role-badge moderator"><UserCheck size={14} /> Moderator</span>;
      default:
        return <span className="role-badge user"><Users size={14} /> User</span>;
    }
  };

  const UserModal = ({ user, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      userType: user.userType || 'buyer',
      role: user.role || 'user',
      isActive: user.isActive !== false
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onUpdate(user._id, formData);
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Edit User: {user.username}</h2>
            <button onClick={onClose} className="close-button">×</button>
          </div>
          
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>User Type</label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                Active Account
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button type="submit" disabled={updating} className="save-button">
                {updating ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-user-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-user-management">
        <div className="error-container">
          <AlertTriangle size={48} />
          <h2>Error Loading Users</h2>
          <p>{error}</p>
          <button onClick={fetchUsers} className="retry-button">
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-user-management">
      <div className="page-header">
        <div className="header-content">
          <h1><Users size={32} /> User Management</h1>
          <p>Manage and monitor all platform users</p>
        </div>
        <button onClick={fetchUsers} className="refresh-button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users by name, email, or username..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>

          <select
            value={filters.userType}
            onChange={(e) => handleFilterChange('userType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="createdAt">Date Joined</option>
            <option value="firstName">Name</option>
            <option value="email">Email</option>
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type & Role</th>
              <th>Status</th>
              <th>Stats</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.firstName} {user.lastName}</div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="badges">
                    <span className={`type-badge ${user.userType}`}>
                      {user.userType === 'seller' ? <Package size={14} /> : <ShoppingCart size={14} />}
                      {user.userType}
                    </span>
                    {getRoleBadge(user.role)}
                  </div>
                </td>
                <td>
                  {getStatusBadge(user)}
                </td>
                <td>
                  <div className="user-stats">
                    {user.userType === 'seller' ? (
                      <>
                        <span><Package size={14} /> {user.stats?.productCount || 0} products</span>
                        <span><ShoppingCart size={14} /> {user.stats?.orderCount || 0} orders</span>
                      </>
                    ) : (
                      <span><ShoppingCart size={14} /> {user.stats?.orderCount || 0} orders</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="date-info">
                    <Calendar size={14} />
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      className="action-button edit"
                      title="Edit User"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => alert('View user details - Feature coming soon!')}
                      className="action-button view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h3>No users found</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
            className="pagination-button"
          >
            Previous
          </button>

          <div className="page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="total-count">({pagination.totalUsers} total users)</span>
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}

      {showUserModal && selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={updateUser}
        />
      )}
    </div>
  );
};

export default AdminUserManagement; 