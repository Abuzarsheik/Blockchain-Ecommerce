import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request counter for retry logic
let retryCount = {};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.requestId = `${config.method}-${config.url}-${Date.now()}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    // Clear retry count on success
    if (response.config.requestId) {
      delete retryCount[response.config.requestId];
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle network errors with retry
    if (!error.response && originalRequest && !originalRequest._retry) {
      const requestId = originalRequest.requestId;
      const currentRetryCount = retryCount[requestId] || 0;
      
      if (currentRetryCount < 3) {
        retryCount[requestId] = currentRetryCount + 1;
        originalRequest._retry = true;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * currentRetryCount));
        
        return api(originalRequest);
      }
    }
    
    // Handle specific error codes
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Only auto-logout for 401 errors that aren't from the auth endpoints
          if (!error.config?.url?.includes('/auth/')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            toast.error('Session expired. Please log in again.');
          }
          break;
          
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
          
        case 404:
          if (!error.config?.suppressNotFound) {
            toast.error('Resource not found.');
          }
          break;
          
        case 429:
          toast.error('Too many requests. Please wait a moment.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          if (data?.error?.message) {
            toast.error(data.error.message);
          } else if (data?.message) {
            toast.error(data.message);
          }
      }
    } else {
      // Network error
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Helper function for handling API responses
const handleResponse = (response) => {
  if (response.data.success === false) {
    throw new Error(response.data.error?.message || 'Request failed');
  }
  return response.data;
};

// API endpoints
export const apiEndpoints = {
  // Auth
  login: (credentials) => api.post('/auth/login', credentials).then(handleResponse),
  register: (userData) => api.post('/auth/register', userData).then(handleResponse),
  getProfile: () => api.get('/auth/me').then(handleResponse),
  updateProfile: (userData) => api.put('/auth/profile', userData).then(handleResponse),
  logout: () => api.post('/auth/logout').then(handleResponse),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(handleResponse),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }).then(handleResponse),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword }).then(handleResponse),

  // Products
  getProducts: (params) => api.get('/products', { params }).then(handleResponse),
  getProduct: (id) => api.get(`/products/${id}`).then(handleResponse),
  createProduct: (productData) => api.post('/products', productData).then(handleResponse),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData).then(handleResponse),
  deleteProduct: (id) => api.delete(`/products/${id}`).then(handleResponse),
  verifyProduct: (id) => api.get(`/products/${id}/verify`).then(handleResponse),
  getProductHistory: (id) => api.get(`/products/${id}/history`).then(handleResponse),
  getProductsByCategory: (category, params) => api.get(`/products/category/${category}`, { params }).then(handleResponse),
  getProductsBySeller: (sellerId, params) => api.get(`/products/seller/${sellerId}`, { params }).then(handleResponse),
  getProductReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }).then(handleResponse),
  uploadProductImages: (productId, formData) => api.post(`/products/${productId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(handleResponse),

  // Orders
  getOrders: (params) => api.get('/orders', { params }).then(handleResponse),
  getOrder: (id) => api.get(`/orders/${id}`).then(handleResponse),
  createOrder: (orderData) => api.post('/orders', orderData).then(handleResponse),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { status }).then(handleResponse),
  cancelOrder: (id, reason) => api.put(`/orders/${id}/cancel`, { reason }).then(handleResponse),
  processPayment: (id, paymentData) => api.post(`/orders/${id}/payment`, paymentData).then(handleResponse),
  getOrderHistory: (params) => api.get('/orders/history', { params }).then(handleResponse),

  // Payments
  getPaymentMethods: () => api.get('/payments/methods').then(handleResponse),
  addPaymentMethod: (methodData) => api.post('/payments/methods', methodData).then(handleResponse),
  removePaymentMethod: (id) => api.delete(`/payments/methods/${id}`).then(handleResponse),
  getTransactions: (params) => api.get('/payments/transactions', { params }).then(handleResponse),
  getTransaction: (id) => api.get(`/payments/transactions/${id}`).then(handleResponse),
  createPaymentIntent: (orderData) => api.post('/payments/create-intent', orderData).then(handleResponse),
  confirmPayment: (intentId, paymentData) => api.post(`/payments/confirm/${intentId}`, paymentData).then(handleResponse),

  // Reviews
  getReviews: (productId, params) => api.get(`/products/${productId}/reviews`, { params }).then(handleResponse),
  createReview: (reviewData) => api.post('/reviews', reviewData).then(handleResponse),
  updateReview: (id, reviewData) => api.put(`/reviews/${id}`, reviewData).then(handleResponse),
  deleteReview: (id) => api.delete(`/reviews/${id}`).then(handleResponse),
  likeReview: (id) => api.post(`/reviews/${id}/like`).then(handleResponse),
  reportReview: (id, reason) => api.post(`/reviews/${id}/report`, { reason }).then(handleResponse),

  // Blockchain
  verifyOnChain: (productId) => api.get(`/blockchain/verify/${productId}`).then(handleResponse),
  getTransactionStatus: (txHash) => api.get(`/blockchain/transaction/${txHash}`).then(handleResponse),
  submitReviewOnChain: (reviewData) => api.post('/blockchain/review', reviewData).then(handleResponse),
  getWalletBalance: (address) => api.get(`/blockchain/balance/${address}`).then(handleResponse),
  connectWallet: (walletData) => api.post('/blockchain/connect-wallet', walletData).then(handleResponse),

  // Cart
  getCart: () => api.get('/cart').then(handleResponse),
  addToCart: (productId, quantity) => api.post('/cart/add', { productId, quantity }).then(handleResponse),
  updateCartItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }).then(handleResponse),
  removeFromCart: (itemId) => api.delete(`/cart/items/${itemId}`).then(handleResponse),
  clearCart: () => api.delete('/cart').then(handleResponse),
  getCartCount: () => api.get('/cart/count').then(handleResponse),

  // Notifications
  getNotifications: (params) => api.get('/notifications', { params }).then(handleResponse),
  markNotificationRead: (id) => api.put(`/notifications/${id}/read`).then(handleResponse),
  markAllNotificationsRead: () => api.put('/notifications/read-all').then(handleResponse),
  deleteNotification: (id) => api.delete(`/notifications/${id}`).then(handleResponse),
  getNotificationSettings: () => api.get('/notifications/settings').then(handleResponse),
  updateNotificationSettings: (settings) => api.put('/notifications/settings', settings).then(handleResponse),

  // Profile & User Management
  getUserStats: (userId) => api.get(`/users/${userId}/stats`).then(handleResponse),
  updateUserPreferences: (preferences) => api.put('/users/preferences', preferences).then(handleResponse),
  getUserPreferences: () => api.get('/users/preferences').then(handleResponse),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(handleResponse),
  enableTwoFactor: () => api.post('/auth/2fa/enable').then(handleResponse),
  disableTwoFactor: (token) => api.post('/auth/2fa/disable', { token }).then(handleResponse),
  verifyTwoFactor: (token) => api.post('/auth/2fa/verify', { token }).then(handleResponse),

  // Search & Categories
  searchProducts: (query, params) => api.get('/search/products', { params: { q: query, ...params } }).then(handleResponse),
  getCategories: () => api.get('/categories').then(handleResponse),
  getCategoryProducts: (categoryId, params) => api.get(`/categories/${categoryId}/products`, { params }).then(handleResponse),
  getPopularProducts: (params) => api.get('/products/popular', { params }).then(handleResponse),
  getFeaturedProducts: (params) => api.get('/products/featured', { params }).then(handleResponse),

  // Wishlist
  getWishlist: () => api.get('/wishlist').then(handleResponse),
  addToWishlist: (productId) => api.post('/wishlist/add', { productId }).then(handleResponse),
  removeFromWishlist: (productId) => api.delete(`/wishlist/remove/${productId}`).then(handleResponse),
  clearWishlist: () => api.delete('/wishlist/clear').then(handleResponse),

  // Admin endpoints
  getDashboardStats: (period) => api.get('/admin/dashboard/stats', { params: { period } }).then(handleResponse),
  getDashboardActivity: (limit) => api.get('/admin/dashboard/activity', { params: { limit } }).then(handleResponse),
  getUsers: (params) => api.get('/admin/users', { params }).then(handleResponse),
  getUser: (id) => api.get(`/admin/users/${id}`).then(handleResponse),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData).then(handleResponse),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`).then(handleResponse),
  banUser: (id, reason) => api.post(`/admin/users/${id}/ban`, { reason }).then(handleResponse),
  getPendingKyc: (params) => api.get('/admin/kyc/pending', { params }).then(handleResponse),
  reviewKyc: (userId, reviewData) => api.post(`/admin/kyc/${userId}/review`, reviewData).then(handleResponse),
  getDisputes: (params) => api.get('/disputes/admin/dashboard', { params }).then(handleResponse),
  getAdminDisputes: (params) => api.get('/admin/disputes', { params }).then(handleResponse),
  getDispute: (id) => api.get(`/disputes/${id}`).then(handleResponse),
  assignDispute: (id, adminId) => api.post(`/disputes/${id}/assign`, { adminId }).then(handleResponse),
  escalateDispute: (id, data) => api.post(`/disputes/${id}/escalate`, data).then(handleResponse),
  resolveDispute: (id, resolutionData) => api.post(`/disputes/${id}/resolve`, resolutionData).then(handleResponse),
  closeDispute: (id, data) => api.post(`/disputes/${id}/close`, data).then(handleResponse),
  updateDisputePriority: (id, priority) => api.put(`/disputes/${id}/priority`, { priority }).then(handleResponse),
  addDisputeMessage: (id, messageData) => api.post(`/disputes/${id}/messages`, messageData).then(handleResponse),
  updateDisputeNotes: (id, notes) => api.put(`/disputes/${id}/admin-notes`, { notes }).then(handleResponse),

  // NFTs
  getNFTs: (params) => api.get('/nfts', { params }).then(handleResponse),
  getNFT: (id) => api.get(`/nfts/${id}`).then(handleResponse),
  createNFT: (nftData) => api.post('/nfts', nftData).then(handleResponse),
  updateNFT: (id, nftData) => api.put(`/nfts/${id}`, nftData).then(handleResponse),
  deleteNFT: (id) => api.delete(`/nfts/${id}`).then(handleResponse),
  likeNFT: (id) => api.post(`/nfts/${id}/like`).then(handleResponse),
  mintNFT: (nftData) => api.post('/nfts/mint', nftData).then(handleResponse),
  transferNFT: (id, toAddress) => api.post(`/nfts/${id}/transfer`, { toAddress }).then(handleResponse),

  // Analytics
  getAnalytics: (params) => api.get('/admin/analytics', { params }).then(handleResponse),
  exportAnalyticsReport: (params) => api.get('/admin/analytics/export', { params, responseType: 'blob' }),
  getUserAnalytics: (userId, params) => api.get(`/analytics/user/${userId}`, { params }).then(handleResponse),
  getProductAnalytics: (productId, params) => api.get(`/analytics/product/${productId}`, { params }).then(handleResponse),

  // Security & Audit Trail
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }).then(handleResponse),
  exportAuditLog: (params) => api.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
  getSmartContracts: (params) => api.get('/admin/smart-contracts', { params }).then(handleResponse),
  getSmartContract: (id) => api.get(`/admin/smart-contracts/${id}`).then(handleResponse),
  requestContractAudit: (id) => api.post(`/admin/smart-contracts/${id}/audit`).then(handleResponse),
  updateContractStatus: (id, status) => api.put(`/admin/smart-contracts/${id}/status`, { status }).then(handleResponse),
  getSecurityEvents: (params) => api.get('/admin/security-events', { params }).then(handleResponse),
  createSecurityEvent: (eventData) => api.post('/admin/security-events', eventData).then(handleResponse),
  updateSecurityEvent: (id, eventData) => api.put(`/admin/security-events/${id}`, eventData).then(handleResponse),
  getSecurityReport: (params) => api.get('/admin/security-report', { params }).then(handleResponse),

  // Audit Trail Logging
  logUserAction: (actionData) => api.post('/audit/log', actionData).then(handleResponse),
  logSystemEvent: (eventData) => api.post('/audit/system-event', eventData).then(handleResponse),
  logSecurityEvent: (eventData) => api.post('/audit/security-event', eventData).then(handleResponse),

  // File Upload
  uploadFile: (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(handleResponse);
  },

  // Health Check
  healthCheck: () => api.get('/health').then(handleResponse),
  getSystemStatus: () => api.get('/system/status').then(handleResponse),
};

// Export for backward compatibility
export default api; 