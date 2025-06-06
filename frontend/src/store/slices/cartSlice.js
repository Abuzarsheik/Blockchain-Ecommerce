import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiEndpoints } from '../../services/api';
import { logger } from '../../utils/logger';
import { migrateCartData, cleanCartItems } from '../../utils/cartUtils';

// Helper functions for localStorage
const saveCartToStorage = (cartState) => {
  try {
    const cartData = {
      items: cartState.items,
      subtotal: cartState.subtotal,
      discount: cartState.discount,
      tax: cartState.tax,
      shipping: cartState.shipping,
      total: cartState.total,
      itemCount: cartState.itemCount,
      coupon: cartState.coupon,
      shippingMethod: cartState.shippingMethod
    };
    localStorage.setItem('cart', JSON.stringify(cartData));
  } catch (error) {
    logger.error('Error saving cart to localStorage:', error);
  }
};

const loadCartFromStorage = () => {
  try {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
      const parsed = JSON.parse(cartData);
      const migrated = migrateCartData(parsed);
      
      if (migrated) {
        // Clean up any invalid items
        migrated.items = cleanCartItems(migrated.items);
        return migrated;
      }
    }
  } catch (error) {
    logger.error('Error loading cart from localStorage:', error);
    // Clear corrupted cart data
    localStorage.removeItem('cart');
  }
  return null;
};

// Load initial cart state from localStorage
const savedCart = loadCartFromStorage();

const initialState = {
  items: savedCart?.items || [],
  subtotal: savedCart?.subtotal || 0,
  discount: savedCart?.discount || 0,
  tax: savedCart?.tax || 0,
  shipping: savedCart?.shipping || 0,
  total: savedCart?.total || 0,
  itemCount: savedCart?.itemCount || 0,
  isOpen: false,
  coupon: savedCart?.coupon || null,
  shippingMethod: savedCart?.shippingMethod || 'standard',
  taxRate: 0.08 // 8% tax rate
};

// Async thunks
export const applyCoupon = createAsyncThunk(
  'cart/applyCoupon',
  async (couponCode) => {
    const response = await apiEndpoints.post('/cart/coupon', { code: couponCode });
    return response.data;
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { productId, name, price, image, category, quantity = 1, stock = 0 } = action.payload;
      
      // Enhanced logging for debugging
      console.log('addToCart action payload:', action.payload);
      console.log('Destructured productId:', productId);
      console.log('Available keys in payload:', Object.keys(action.payload));
      
      // Ensure proper product ID structure
      const normalizedProductId = productId || action.payload.product_id || action.payload.id;
      
      console.log('Normalized product ID:', normalizedProductId);
      
      if (!normalizedProductId) {
        console.error('Missing product ID in cart item:', action.payload);
        console.error('Checked fields: productId, product_id, id');
        return;
      }

      const existingItem = state.items.find(item => 
        (item.productId === normalizedProductId) || 
        (item.product_id === normalizedProductId)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          productId: normalizedProductId,
          product_id: normalizedProductId, // Ensure both fields are present
          name: name || 'Unnamed Product',
          price: parseFloat(price) || 0,
          image: image || '',
          category: category || 'General',
          quantity: parseInt(quantity) || 1,
          stock: parseInt(stock) || 0
        });
      }

      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
      state.subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      state.total = state.subtotal + state.tax + state.shipping - state.discount;
      state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
      
      // Save to localStorage
      saveCartToStorage(state);
    },
    
    removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(item => 
        item.productId !== productId && item.product_id !== productId
      );
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
      state.subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      state.total = state.subtotal + state.tax + state.shipping - state.discount;
      state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
      
      // Save to localStorage
      saveCartToStorage(state);
    },
    
    updateQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find(item => 
        item.productId === productId || item.product_id === productId
      );
      
      if (item && quantity > 0) {
        item.quantity = parseInt(quantity);
        state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
        state.subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
        state.total = state.subtotal + state.tax + state.shipping - state.discount;
        state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
        
        // Save to localStorage
        saveCartToStorage(state);
      }
    },
    
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.discount = 0;
      state.tax = 0;
      state.total = 0;
      state.itemCount = 0;
      state.coupon = null;
      localStorage.removeItem('cart');
    },
    
    clearCartOnLogout: (state) => {
      // Clear cart when user logs out (optional, depends on business logic)
      state.items = [];
      state.subtotal = 0;
      state.discount = 0;
      state.tax = 0;
      state.total = 0;
      state.itemCount = 0;
      state.coupon = null;
      localStorage.removeItem('cart');
    },
    
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    openCart: (state) => {
      state.isOpen = true;
    },
    
    closeCart: (state) => {
      state.isOpen = false;
    },

    removeCoupon: (state) => {
      state.coupon = null;
      state.discount = 0;
      state.total = state.subtotal + state.tax + state.shipping - state.discount;
      saveCartToStorage(state);
    },

    setShippingMethod: (state, action) => {
      state.shippingMethod = action.payload;
      state.total = state.subtotal + state.tax + state.shipping - state.discount;
      saveCartToStorage(state);
    },

    calculateShipping: (state) => {
      const hasDigitalOnly = state.items.every(item => item.isDigital);
      
      if (hasDigitalOnly) {
        state.shipping = 0;
        return;
      }

      switch (state.shippingMethod) {
        case 'standard':
          state.shipping = state.subtotal > 50 ? 0 : 5.99;
          break;
        case 'express':
          state.shipping = 12.99;
          break;
        case 'overnight':
          state.shipping = 24.99;
          break;
        default:
          state.shipping = 5.99;
      }
    },
    
    calculateTotals: (state) => {
      // Calculate subtotal
      state.subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      
      // Calculate discount
      if (state.coupon) {
        state.discount = (state.subtotal * state.coupon.discount) / 100;
      } else {
        state.discount = 0;
      }

      // Calculate shipping
      cartSlice.caseReducers.calculateShipping(state);
      
      // Calculate tax (on subtotal minus discount)
      const taxableAmount = state.subtotal - state.discount;
      state.tax = taxableAmount * state.taxRate;
      
      // Calculate total
      state.total = state.subtotal - state.discount + state.shipping + state.tax;
      
      // Calculate item count
      state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.coupon = action.payload;
        cartSlice.caseReducers.calculateTotals(state);
        saveCartToStorage(state);
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        // Handle coupon application failure
        logger.error('Failed to apply coupon:', action.error.message);
      });
  }
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  clearCartOnLogout,
  toggleCart,
  openCart,
  closeCart,
  removeCoupon,
  setShippingMethod,
  calculateTotals
} = cartSlice.actions;

export default cartSlice.reducer; 