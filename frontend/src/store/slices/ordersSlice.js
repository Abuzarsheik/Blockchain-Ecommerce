import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Async thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ page = 1, limit = 10 } = {}) => {
    const response = await api.get('/orders', {
      params: { page, limit }
    });
    return response.data;
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  }
);

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const processPayment = createAsyncThunk(
  'orders/processPayment',
  async ({ orderId, paymentMethodId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/orders/${orderId}/payment`, {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

const initialState = {
  items: [],
  currentOrder: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  },
  paymentLoading: false,
  paymentError: null
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
      state.paymentError = null;
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      const orderIndex = state.items.findIndex(order => order.id === orderId);
      if (orderIndex !== -1) {
        state.items[orderIndex].payment_status = status;
      }
      if (state.currentOrder && state.currentOrder.id === orderId) {
        state.currentOrder.payment_status = status;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.orders || [];
        if (action.payload.pagination) {
          state.pagination = {
            currentPage: action.payload.pagination.current_page,
            totalPages: action.payload.pagination.total_pages,
            totalItems: action.payload.pagination.total_items,
            itemsPerPage: action.payload.pagination.items_per_page
          };
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload.order;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        state.items.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Process payment
      .addCase(processPayment.pending, (state) => {
        state.paymentLoading = true;
        state.paymentError = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.paymentLoading = false;
        if (state.currentOrder) {
          state.currentOrder = { ...state.currentOrder, ...action.payload };
        }
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.paymentLoading = false;
        state.paymentError = action.payload;
      });
  }
});

export const { 
  clearCurrentOrder, 
  clearError, 
  updateOrderStatus 
} = ordersSlice.actions;

export default ordersSlice.reducer; 