// API Configuration for Blocmerce Frontend
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:5000',
  FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000',
  
  // API Endpoints
  ENDPOINTS: {
    // Products
    PRODUCTS: '/products',
    MY_PRODUCTS: '/products/my',
    PRODUCT_CATEGORIES: '/products/categories',
    
    // Orders
    ORDERS: '/orders',
    
    // Users & Admin
    ADMIN_USERS: '/admin/users',
    ADMIN_DASHBOARD: '/admin/dashboard-stats',
    ADMIN_DISPUTES: '/admin/disputes',
    
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/users/profile',
    
    // Other
    UPLOAD: '/upload',
    NOTIFICATIONS: '/notifications'
  },
  
  // Request timeout
  TIMEOUT: 30000,
  
  // File upload limits
  UPLOAD_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  }
};

// Helper functions
export const getApiUrl = (endpoint = '') => {
  return `${API_CONFIG.API_BASE_URL}${endpoint}`;
};

export const getFullUrl = (path = '') => {
  return `${API_CONFIG.BASE_URL}${path}`;
};

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_CONFIG.BASE_URL}${imagePath}`;
};

export const getWebSocketUrl = (path = '') => {
  return `${API_CONFIG.WS_URL}${path}`;
};

export default API_CONFIG; 