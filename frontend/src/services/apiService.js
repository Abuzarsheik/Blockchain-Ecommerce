import { apiEndpoints } from './api';
import { toast } from 'react-toastify';

/**
 * Centralized API Service Manager
 * Provides standardized methods for frontend-backend communication
 */


class ApiService {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // Generic method with caching support
  async request(key, apiCall, options = {}) {
    const { 
      cache = false, 
      cacheTTL = 300000, // 5 minutes default
      showError = true,
      showSuccess = false,
      successMessage = '',
      loadingMessage = ''
    } = options;

    // Return cached data if available and not expired
    if (cache && this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // Prevent duplicate requests
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    try {
      if (loadingMessage) {
        toast.info(loadingMessage);
      }

      const requestPromise = apiCall();
      this.pendingRequests.set(key, requestPromise);

      const result = await requestPromise;

      // Cache successful results
      if (cache) {
        this.cache.set(key, {
          data: result,
          timestamp: Date.now()
        });
      }

      if (showSuccess && successMessage) {
        toast.success(successMessage);
      }

      return result;

    } catch (error) {
      if (showError) {
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           error.message || 
                           'An unexpected error occurred';
        toast.error(errorMessage);
      }
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  // Clear cache
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Auth Services
  auth = {
    login: async (credentials) => {
      const result = await this.request('auth.login', 
        () => apiEndpoints.login(credentials),
        { 
          showSuccess: true, 
          successMessage: 'Welcome back!',
          showError: true 
        }
      );
      
      if (result.token) {
        localStorage.setItem('token', result.token);
        this.clearCache(); // Clear all cache on login
      }
      
      return result;
    },

    register: async (userData) => {
      const result = await this.request('auth.register',
        () => apiEndpoints.register(userData),
        {
          showSuccess: true,
          successMessage: 'Account created successfully!',
          showError: true
        }
      );
      
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      
      return result;
    },

    logout: async () => {
      try {
        await apiEndpoints.logout();
      } catch (error) {
        // Continue with logout even if API call fails
      } finally {
        localStorage.removeItem('token');
        this.clearCache();
        toast.success('Logged out successfully');
      }
    },

    getProfile: () => this.request('auth.profile', 
      () => apiEndpoints.getProfile(),
      { cache: true, cacheTTL: 600000 } // 10 minutes
    ),

    updateProfile: async (userData) => {
      const result = await this.request('auth.updateProfile',
        () => apiEndpoints.updateProfile(userData),
        {
          showSuccess: true,
          successMessage: 'Profile updated successfully!',
          showError: true
        }
      );
      
      this.clearCache('auth.profile');
      return result;
    }
  };

  // Product Services
  products = {
    getAll: (params = {}) => this.request(
      `products.list.${JSON.stringify(params)}`,
      () => apiEndpoints.getProducts(params),
      { cache: true, cacheTTL: 180000 } // 3 minutes
    ),

    getById: (id) => this.request(
      `products.${id}`,
      () => apiEndpoints.getProduct(id),
      { cache: true, cacheTTL: 300000 } // 5 minutes
    ),

    create: async (productData) => {
      const result = await this.request('products.create',
        () => apiEndpoints.createProduct(productData),
        {
          showSuccess: true,
          successMessage: 'Product created successfully!',
          showError: true
        }
      );
      
      this.clearCache('products.list');
      return result;
    },

    update: async (id, productData) => {
      const result = await this.request(`products.update.${id}`,
        () => apiEndpoints.updateProduct(id, productData),
        {
          showSuccess: true,
          successMessage: 'Product updated successfully!',
          showError: true
        }
      );
      
      this.clearCache('products.');
      return result;
    },

    delete: async (id) => {
      const result = await this.request(`products.delete.${id}`,
        () => apiEndpoints.deleteProduct(id),
        {
          showSuccess: true,
          successMessage: 'Product deleted successfully!',
          showError: true
        }
      );
      
      this.clearCache('products.');
      return result;
    },

    getByCategory: (category, params = {}) => this.request(
      `products.category.${category}.${JSON.stringify(params)}`,
      () => apiEndpoints.getProductsByCategory(category, params),
      { cache: true, cacheTTL: 300000 }
    ),

    getBySeller: (sellerId, params = {}) => this.request(
      `products.seller.${sellerId}.${JSON.stringify(params)}`,
      () => apiEndpoints.getProductsBySeller(sellerId, params),
      { cache: true, cacheTTL: 180000 }
    ),

    search: (query, params = {}) => this.request(
      `products.search.${query}.${JSON.stringify(params)}`,
      () => apiEndpoints.searchProducts(query, params),
      { cache: true, cacheTTL: 60000 } // 1 minute for search results
    )
  };

  // Order Services
  orders = {
    getAll: (params = {}) => this.request(
      `orders.list.${JSON.stringify(params)}`,
      () => apiEndpoints.getOrders(params),
      { cache: true, cacheTTL: 60000 } // 1 minute
    ),

    getById: (id) => this.request(
      `orders.${id}`,
      () => apiEndpoints.getOrder(id),
      { cache: true, cacheTTL: 30000 } // 30 seconds
    ),

    create: async (orderData) => {
      const result = await this.request('orders.create',
        () => apiEndpoints.createOrder(orderData),
        {
          showSuccess: true,
          successMessage: 'Order created successfully!',
          showError: true
        }
      );
      
      this.clearCache('orders.');
      this.clearCache('cart');
      return result;
    },

    updateStatus: async (id, status) => {
      const result = await this.request(`orders.updateStatus.${id}`,
        () => apiEndpoints.updateOrderStatus(id, status),
        {
          showSuccess: true,
          successMessage: 'Order status updated!',
          showError: true
        }
      );
      
      this.clearCache('orders.');
      return result;
    }
  };

  // Cart Services
  cart = {
    get: () => this.request(
      'cart.items',
      () => apiEndpoints.getCart(),
      { cache: true, cacheTTL: 30000 } // 30 seconds
    ),

    add: async (productId, quantity = 1) => {
      const result = await this.request('cart.add',
        () => apiEndpoints.addToCart(productId, quantity),
        {
          showSuccess: true,
          successMessage: 'Added to cart!',
          showError: true
        }
      );
      
      this.clearCache('cart');
      return result;
    },

    update: async (itemId, quantity) => {
      const result = await this.request('cart.update',
        () => apiEndpoints.updateCartItem(itemId, quantity),
        { showError: true }
      );
      
      this.clearCache('cart');
      return result;
    },

    remove: async (itemId) => {
      const result = await this.request('cart.remove',
        () => apiEndpoints.removeFromCart(itemId),
        {
          showSuccess: true,
          successMessage: 'Removed from cart!',
          showError: true
        }
      );
      
      this.clearCache('cart');
      return result;
    },

    clear: async () => {
      const result = await this.request('cart.clear',
        () => apiEndpoints.clearCart(),
        {
          showSuccess: true,
          successMessage: 'Cart cleared!',
          showError: true
        }
      );
      
      this.clearCache('cart');
      return result;
    },

    getCount: () => this.request(
      'cart.count',
      () => apiEndpoints.getCartCount(),
      { cache: true, cacheTTL: 30000 }
    )
  };

  // Notification Services
  notifications = {
    getAll: (params = {}) => this.request(
      `notifications.list.${JSON.stringify(params)}`,
      () => apiEndpoints.getNotifications(params),
      { cache: true, cacheTTL: 60000 }
    ),

    markRead: async (id) => {
      const result = await this.request('notifications.markRead',
        () => apiEndpoints.markNotificationRead(id),
        { showError: true }
      );
      
      this.clearCache('notifications.');
      return result;
    },

    markAllRead: async () => {
      const result = await this.request('notifications.markAllRead',
        () => apiEndpoints.markAllNotificationsRead(),
        {
          showSuccess: true,
          successMessage: 'All notifications marked as read!',
          showError: true
        }
      );
      
      this.clearCache('notifications.');
      return result;
    }
  };

  // Review Services
  reviews = {
    getForProduct: (productId, params = {}) => this.request(
      `reviews.product.${productId}.${JSON.stringify(params)}`,
      () => apiEndpoints.getReviews(productId, params),
      { cache: true, cacheTTL: 300000 }
    ),

    create: async (reviewData) => {
      const result = await this.request('reviews.create',
        () => apiEndpoints.createReview(reviewData),
        {
          showSuccess: true,
          successMessage: 'Review submitted successfully!',
          showError: true
        }
      );
      
      this.clearCache('reviews.');
      this.clearCache('products.');
      return result;
    }
  };

  // Admin Services
  admin = {
    getDashboardStats: (period = '30d') => this.request(
      `admin.stats.${period}`,
      () => apiEndpoints.getDashboardStats(period),
      { cache: true, cacheTTL: 300000 }
    ),

    getUsers: (params = {}) => this.request(
      `admin.users.${JSON.stringify(params)}`,
      () => apiEndpoints.getUsers(params),
      { cache: true, cacheTTL: 180000 }
    ),

    updateUser: async (id, userData) => {
      const result = await this.request(`admin.updateUser.${id}`,
        () => apiEndpoints.updateUser(id, userData),
        {
          showSuccess: true,
          successMessage: 'User updated successfully!',
          showError: true
        }
      );
      
      this.clearCache('admin.users');
      return result;
    }
  };

  // Utility Services
  utils = {
    getCategories: () => this.request(
      'categories.all',
      () => apiEndpoints.getCategories(),
      { cache: true, cacheTTL: 3600000 } // 1 hour
    ),

    uploadFile: async (file, type = 'general') => {
      return this.request('file.upload',
        () => apiEndpoints.uploadFile(file, type),
        {
          showSuccess: true,
          successMessage: 'File uploaded successfully!',
          showError: true,
          loadingMessage: 'Uploading file...'
        }
      );
    },

    healthCheck: () => this.request(
      'health.check',
      () => apiEndpoints.healthCheck(),
      { cache: true, cacheTTL: 60000 }
    )
  };
}

// Create singleton instance
const apiService = new ApiService();

export default apiService; 