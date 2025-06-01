import { api } from '../../services/api';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 12, search = '', category = '', sortBy = 'created_at' } = {}) => {
    const response = await api.get('/products', {
      params: { page, limit, search, category, sortBy }
    });
    return response.data;
  }
);

export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  }
);

export const verifyProduct = createAsyncThunk(
  'products/verifyProduct',
  async (productId) => {
    const response = await api.get(`/products/${productId}/verify`);
    return { productId, verification: response.data };
  }
);

const initialState = {
  items: [],
  currentProduct: null,
  categories: [
    'Digital Art',
    'Gaming Assets',
    'Music & Audio',
    'Fashion',
    'Collectibles',
    'Virtual Real Estate',
    'Domain Names',
    'Photography'
  ],
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  },
  filters: {
    search: '',
    category: '',
    priceRange: [0, 1000],
    sortBy: 'created_at',
    verified: false
  },
  verifications: {}
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentProduct: (state, action) => {
      state.currentProduct = action.payload;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
    updateProductVerification: (state, action) => {
      const { productId, verified } = action.payload;
      state.verifications[productId] = verified;
      
      // Update in items array if present
      const productIndex = state.items.findIndex(p => p.id === productId);
      if (productIndex !== -1) {
        state.items[productIndex].blockchain_verified = verified;
      }
      
      // Update current product if it matches
      if (state.currentProduct && state.currentProduct.id === productId) {
        state.currentProduct.blockchain_verified = verified;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.totalItems,
          itemsPerPage: action.payload.itemsPerPage
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Fetch product by ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Verify product
      .addCase(verifyProduct.fulfilled, (state, action) => {
        const { productId, verification } = action.payload;
        state.verifications[productId] = verification;
      });
  }
});

export const { 
  setFilters, 
  clearFilters, 
  setCurrentProduct, 
  clearCurrentProduct,
  updateProductVerification 
} = productsSlice.actions;

export default productsSlice.reducer; 