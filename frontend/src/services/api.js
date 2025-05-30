import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only auto-logout for 401 errors that aren't from the loadUser call
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me')) {
      // Token expired or invalid for non-auth requests
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (userData) => api.put('/auth/profile', userData),

  // Products
  getProducts: (params) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  verifyProduct: (id) => api.get(`/products/${id}/verify`),
  getProductHistory: (id) => api.get(`/products/${id}/history`),

  // Orders
  getOrders: (params) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  createOrder: (orderData) => api.post('/orders', orderData),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  processPayment: (id, paymentData) => api.post(`/orders/${id}/payment`, paymentData),

  // Reviews
  getReviews: (productId) => api.get(`/products/${productId}/reviews`),
  createReview: (reviewData) => api.post('/reviews', reviewData),
  updateReview: (id, reviewData) => api.put(`/reviews/${id}`, reviewData),
  deleteReview: (id) => api.delete(`/reviews/${id}`),

  // Blockchain
  verifyOnChain: (productId) => api.get(`/blockchain/verify/${productId}`),
  getTransactionStatus: (txHash) => api.get(`/blockchain/transaction/${txHash}`),
  submitReviewOnChain: (reviewData) => api.post('/blockchain/review', reviewData),

  // Cart (if needed for server-side cart)
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity) => api.post('/cart/add', { productId, quantity }),
  updateCartItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
  removeFromCart: (itemId) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete('/cart'),

  // Admin
  getDashboardStats: (period) => api.get('/admin/dashboard/stats', { params: { period } }),
  getDashboardActivity: (limit) => api.get('/admin/dashboard/activity', { params: { limit } }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  getPendingKyc: (params) => api.get('/admin/kyc/pending', { params }),
  reviewKyc: (userId, reviewData) => api.post(`/admin/kyc/${userId}/review`, reviewData),
  getDisputes: (params) => api.get('/disputes/admin/dashboard', { params }),
  getAdminDisputes: (params) => api.get('/admin/disputes', { params }),
  getDispute: (id) => api.get(`/disputes/${id}`),
  assignDispute: (id, adminId) => api.post(`/disputes/${id}/assign`, { adminId }),
  escalateDispute: (id, data) => api.post(`/disputes/${id}/escalate`, data),
  resolveDispute: (id, resolutionData) => api.post(`/disputes/${id}/resolve`, resolutionData),
  closeDispute: (id, data) => api.post(`/disputes/${id}/close`, data),
  updateDisputePriority: (id, priority) => api.put(`/disputes/${id}/priority`, { priority }),
  addDisputeMessage: (id, messageData) => api.post(`/disputes/${id}/messages`, messageData),
  updateDisputeNotes: (id, notes) => api.put(`/disputes/${id}/admin-notes`, { notes }),

  // NFTs
  getNFTs: (params) => api.get('/nfts', { params }),
  getNFT: (id) => api.get(`/nfts/${id}`),
  createNFT: (nftData) => api.post('/nfts', nftData),
  updateNFT: (id, nftData) => api.put(`/nfts/${id}`, nftData),
  deleteNFT: (id) => api.delete(`/nfts/${id}`),
  likeNFT: (id) => api.post(`/nfts/${id}/like`),

  // Analytics
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  exportAnalyticsReport: (params) => api.get('/admin/analytics/export', { params, responseType: 'blob' }),

  // Security & Audit Trail
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  exportAuditLog: (params) => api.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
  getSmartContracts: (params) => api.get('/admin/smart-contracts', { params }),
  getSmartContract: (id) => api.get(`/admin/smart-contracts/${id}`),
  requestContractAudit: (id) => api.post(`/admin/smart-contracts/${id}/audit`),
  updateContractStatus: (id, status) => api.put(`/admin/smart-contracts/${id}/status`, { status }),
  getSecurityEvents: (params) => api.get('/admin/security-events', { params }),
  createSecurityEvent: (eventData) => api.post('/admin/security-events', eventData),
  updateSecurityEvent: (id, eventData) => api.put(`/admin/security-events/${id}`, eventData),
  getSecurityReport: (params) => api.get('/admin/security-report', { params }),

  // Audit Trail Logging
  logUserAction: (actionData) => api.post('/audit/log', actionData),
  logSystemEvent: (eventData) => api.post('/audit/system-event', eventData),
  logSecurityEvent: (eventData) => api.post('/audit/security-event', eventData),
};

export default api; 