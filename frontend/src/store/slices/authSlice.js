import { api } from '../../services/api';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, twoFactorCode }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { 
        email, 
        password,
        ...(twoFactorCode && { twoFactorCode })
      });
      
      // Only set token if login is complete (not requiring 2FA)
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      // Handle different error scenarios
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Login failed';
        const statusCode = error.response.status;
        
        // Handle specific status codes
        switch (statusCode) {
          case 401:
            return rejectWithValue('Invalid email or password. Please check your credentials.');
          case 423:
            return rejectWithValue('Account temporarily locked due to too many failed attempts. Please try again later.');
          case 429:
            return rejectWithValue('Too many login attempts. Please wait before trying again.');
          case 500:
            return rejectWithValue('Server error. Please try again later.');
          default:
            return rejectWithValue(errorMessage);
        }
      } else if (error.request) {
        // Network error
        return rejectWithValue('Network error. Please check your connection and try again.');
      } else {
        // Other error
        return rejectWithValue('An unexpected error occurred. Please try again.');
      }
    }
  }
);

export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  async ({ tempToken, twoFactorCode }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-2fa', { 
        tempToken, 
        twoFactorCode 
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.message || '2FA verification failed';
        const statusCode = error.response.status;
        
        switch (statusCode) {
          case 401:
            return rejectWithValue('Invalid 2FA code. Please try again.');
          case 400:
            return rejectWithValue('Invalid or expired 2FA session. Please login again.');
          case 429:
            return rejectWithValue('Too many 2FA attempts. Please wait before trying again.');
          default:
            return rejectWithValue(errorMessage);
        }
      } else if (error.request) {
        return rejectWithValue('Network error. Please check your connection and try again.');
      } else {
        return rejectWithValue('An unexpected error occurred. Please try again.');
      }
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ firstName, lastName, username, email, password, userType }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', { 
        firstName, 
        lastName, 
        username, 
        email, 
        password, 
        userType 
      });
      // Don't store token automatically - user should login manually after registration
      // localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return rejectWithValue('No token found');
      }
      
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to load user';
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = {
          ...action.payload.user,
          userId: action.payload.user._id || action.payload.user.id || action.payload.user.userId
        };
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      
      // Verify 2FA
      .addCase(verify2FA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = {
          ...action.payload.user,
          userId: action.payload.user._id || action.payload.user.id || action.payload.user.userId
        };
        state.token = action.payload.token;
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        // Don't automatically authenticate user after registration
        // User should login manually after successful registration
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = {
          ...action.payload,
          userId: action.payload._id || action.payload.id || action.payload.userId
        };
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        // Only clear auth state if token is actually invalid (401)
        // Don't clear for network errors or other issues
        if (action.payload === 'No token found' || action.payload?.includes('401') || action.payload?.includes('invalid') || action.payload?.includes('expired')) {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          localStorage.removeItem('token');
        }
        state.error = action.payload;
      });
  }
});

export const { logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer; 