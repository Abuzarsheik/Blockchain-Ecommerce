import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { blockchainService } from '../../services/blockchain';

// Async thunks
export const verifyProductOnChain = createAsyncThunk(
  'blockchain/verifyProductOnChain',
  async (productId) => {
    const verification = await blockchainService.verifyProduct(productId);
    return { productId, verification };
  }
);

export const getProductHistory = createAsyncThunk(
  'blockchain/getProductHistory',
  async (productId) => {
    const history = await blockchainService.getProductHistory(productId);
    return { productId, history };
  }
);

export const submitReviewOnChain = createAsyncThunk(
  'blockchain/submitReviewOnChain',
  async ({ productId, rating, content }, { rejectWithValue }) => {
    try {
      const result = await blockchainService.submitReview(productId, rating, content);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const connectWallet = createAsyncThunk(
  'blockchain/connectWallet',
  async (_, { rejectWithValue }) => {
    try {
      const account = await blockchainService.connectWallet();
      return account;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  isConnected: false,
  account: null,
  network: null,
  balance: '0',
  verifications: {},
  productHistories: {},
  loading: false,
  error: null,
  transactionLoading: false,
  transactionError: null
};

const blockchainSlice = createSlice({
  name: 'blockchain',
  initialState,
  reducers: {
    setAccount: (state, action) => {
      state.account = action.payload;
      state.isConnected = !!action.payload;
    },
    setNetwork: (state, action) => {
      state.network = action.payload;
    },
    setBalance: (state, action) => {
      state.balance = action.payload;
    },
    disconnectWallet: (state) => {
      state.isConnected = false;
      state.account = null;
      state.balance = '0';
    },
    clearError: (state) => {
      state.error = null;
      state.transactionError = null;
    },
    updateVerification: (state, action) => {
      const { productId, verified } = action.payload;
      state.verifications[productId] = verified;
    }
  },
  extraReducers: (builder) => {
    builder
      // Verify product on chain
      .addCase(verifyProductOnChain.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyProductOnChain.fulfilled, (state, action) => {
        state.loading = false;
        const { productId, verification } = action.payload;
        state.verifications[productId] = verification;
      })
      .addCase(verifyProductOnChain.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Get product history
      .addCase(getProductHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProductHistory.fulfilled, (state, action) => {
        state.loading = false;
        const { productId, history } = action.payload;
        state.productHistories[productId] = history;
      })
      .addCase(getProductHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Submit review on chain
      .addCase(submitReviewOnChain.pending, (state) => {
        state.transactionLoading = true;
        state.transactionError = null;
      })
      .addCase(submitReviewOnChain.fulfilled, (state, action) => {
        state.transactionLoading = false;
        // Review submitted successfully
      })
      .addCase(submitReviewOnChain.rejected, (state, action) => {
        state.transactionLoading = false;
        state.transactionError = action.payload;
      })
      
      // Connect wallet
      .addCase(connectWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.isConnected = true;
        state.account = action.payload;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isConnected = false;
        state.account = null;
      });
  }
});

export const {
  setAccount,
  setNetwork,
  setBalance,
  disconnectWallet,
  clearError,
  updateVerification
} = blockchainSlice.actions;

export default blockchainSlice.reducer; 