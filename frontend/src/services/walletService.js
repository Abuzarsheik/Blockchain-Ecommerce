import { ethers } from 'ethers';
import { blockchainService } from './blockchain';
import { api } from './api';

// Supported wallet types
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  TRUST_WALLET: 'trust_wallet',
  WALLET_CONNECT: 'wallet_connect'
};

// Supported cryptocurrencies
export const SUPPORTED_CURRENCIES = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    type: 'native',
    network: 'bitcoin'
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    type: 'native',
    network: 'ethereum'
  },
  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    type: 'erc20',
    network: 'ethereum',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Mainnet USDT
  }
};

// Network configurations
export const NETWORKS = {
  ethereum: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/your-project-id'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  bsc: {
    chainId: '0x38',
    chainName: 'Binance Smart Chain',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com']
  }
};

class WalletService {
  constructor() {
    this.connectedWallet = null;
    this.walletType = null;
    this.supportedWallets = [];
    this.transactionHistory = [];
    this.balances = {};
    this.isInitialized = false;
  }

  /**
   * Initialize wallet service and detect available wallets
   */
  async init() {
    try {
      await this.detectAvailableWallets();
      this.isInitialized = true;
      console.log('✅ Wallet service initialized');
      console.log('📱 Available wallets:', this.supportedWallets);
    } catch (error) {
      console.error('❌ Failed to initialize wallet service:', error);
    }
  }

  /**
   * Detect available wallets
   */
  async detectAvailableWallets() {
    this.supportedWallets = [];

    // Check for MetaMask
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      this.supportedWallets.push({
        type: WALLET_TYPES.METAMASK,
        name: 'MetaMask',
        icon: '🦊',
        installed: true
      });
    }

    // Check for Trust Wallet
    if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
      this.supportedWallets.push({
        type: WALLET_TYPES.TRUST_WALLET,
        name: 'Trust Wallet',
        icon: '🛡️',
        installed: true
      });
    }

    // WalletConnect (always available)
    this.supportedWallets.push({
      type: WALLET_TYPES.WALLET_CONNECT,
      name: 'WalletConnect',
      icon: '🔗',
      installed: true
    });

    return this.supportedWallets;
  }

  /**
   * Connect to a specific wallet
   * @param {string} walletType - Type of wallet to connect
   */
  async connectWallet(walletType = WALLET_TYPES.METAMASK) {
    try {
      this.walletType = walletType;

      switch (walletType) {
        case WALLET_TYPES.METAMASK:
          return await this.connectMetaMask();
        case WALLET_TYPES.TRUST_WALLET:
          return await this.connectTrustWallet();
        case WALLET_TYPES.WALLET_CONNECT:
          return await this.connectWalletConnect();
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Connect MetaMask wallet
   */
  async connectMetaMask() {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      throw new Error('MetaMask not installed');
    }

    try {
      await blockchainService.init();
      const account = await blockchainService.connectWallet();
      
      this.connectedWallet = {
        address: account,
        type: WALLET_TYPES.METAMASK,
        name: 'MetaMask'
      };

      await this.loadBalances();
      await this.recordConnection();

      return this.connectedWallet;
    } catch (error) {
      throw new Error(`Failed to connect MetaMask: ${error.message}`);
    }
  }

  /**
   * Connect Trust Wallet
   */
  async connectTrustWallet() {
    if (!window.ethereum || !window.ethereum.isTrust) {
      throw new Error('Trust Wallet not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      this.connectedWallet = {
        address: accounts[0],
        type: WALLET_TYPES.TRUST_WALLET,
        name: 'Trust Wallet'
      };

      await this.loadBalances();
      await this.recordConnection();

      return this.connectedWallet;
    } catch (error) {
      throw new Error(`Failed to connect Trust Wallet: ${error.message}`);
    }
  }

  /**
   * Connect WalletConnect (placeholder for future implementation)
   */
  async connectWalletConnect() {
    // This would implement WalletConnect integration
    throw new Error('WalletConnect integration coming soon');
  }

  /**
   * Load balances for all supported currencies
   */
  async loadBalances() {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      this.balances = {};

      // Load ETH balance
      const ethBalance = await blockchainService.getBalance(this.connectedWallet.address);
      this.balances.ETH = {
        balance: ethBalance,
        currency: SUPPORTED_CURRENCIES.ETH,
        usdValue: await this.getUSDValue('ETH', ethBalance)
      };

      // Load USDT balance (ERC-20)
      if (SUPPORTED_CURRENCIES.USDT.contractAddress) {
        const usdtBalance = await this.getERC20Balance(
          SUPPORTED_CURRENCIES.USDT.contractAddress,
          this.connectedWallet.address
        );
        this.balances.USDT = {
          balance: usdtBalance,
          currency: SUPPORTED_CURRENCIES.USDT,
          usdValue: await this.getUSDValue('USDT', usdtBalance)
        };
      }

      // Load BTC balance (would require external API)
      this.balances.BTC = {
        balance: '0',
        currency: SUPPORTED_CURRENCIES.BTC,
        usdValue: 0,
        note: 'Bitcoin integration requires external service'
      };

      return this.balances;
    } catch (error) {
      console.error('Failed to load balances:', error);
      throw error;
    }
  }

  /**
   * Get ERC-20 token balance
   * @param {string} contractAddress - Token contract address
   * @param {string} walletAddress - Wallet address
   */
  async getERC20Balance(contractAddress, walletAddress) {
    try {
      const erc20ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ];

      const contract = new ethers.Contract(
        contractAddress,
        erc20ABI,
        blockchainService.provider
      );

      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Failed to get ERC-20 balance:', error);
      return '0';
    }
  }

  /**
   * Get USD value for cryptocurrency
   * @param {string} currency - Currency symbol
   * @param {string} amount - Amount in crypto
   */
  async getUSDValue(currency, amount) {
    try {
      // This would integrate with a price API like CoinGecko
      const mockPrices = {
        ETH: 2000,
        BTC: 35000,
        USDT: 1
      };

      const price = mockPrices[currency] || 0;
      return parseFloat(amount) * price;
    } catch (error) {
      console.error('Failed to get USD value:', error);
      return 0;
    }
  }

  /**
   * Process payment with selected cryptocurrency
   * @param {Object} paymentData - Payment information
   */
  async processPayment(paymentData) {
    const { amount, currency, recipient, orderId, description } = paymentData;

    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    try {
      let transaction;

      switch (currency) {
        case 'ETH':
          transaction = await this.sendETH(recipient, amount);
          break;
        case 'USDT':
          transaction = await this.sendERC20(
            SUPPORTED_CURRENCIES.USDT.contractAddress,
            recipient,
            amount
          );
          break;
        case 'BTC':
          throw new Error('Bitcoin payments require external integration');
        default:
          throw new Error(`Unsupported currency: ${currency}`);
      }

      // Record transaction
      const transactionRecord = {
        orderId,
        txHash: transaction.hash,
        from: this.connectedWallet.address,
        to: recipient,
        amount,
        currency,
        description,
        status: 'pending',
        timestamp: new Date().toISOString(),
        type: 'payment'
      };

      await this.recordTransaction(transactionRecord);

      // Wait for confirmation
      const receipt = await transaction.wait();
      
      // Update transaction status
      transactionRecord.status = receipt.status === 1 ? 'confirmed' : 'failed';
      transactionRecord.blockNumber = receipt.blockNumber;
      transactionRecord.gasUsed = receipt.gasUsed.toString();

      await this.updateTransaction(transactionRecord);

      return {
        success: true,
        transaction: transactionRecord,
        receipt
      };

    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Send ETH transaction
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in ETH
   */
  async sendETH(to, amount) {
    if (!blockchainService.signer) {
      throw new Error('No signer available');
    }

    try {
      const tx = await blockchainService.signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount),
        gasLimit: 21000
      });

      return tx;
    } catch (error) {
      throw new Error(`ETH transaction failed: ${error.message}`);
    }
  }

  /**
   * Send ERC-20 token transaction
   * @param {string} contractAddress - Token contract address
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in tokens
   */
  async sendERC20(contractAddress, to, amount) {
    if (!blockchainService.signer) {
      throw new Error('No signer available');
    }

    try {
      const erc20ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ];

      const contract = new ethers.Contract(
        contractAddress,
        erc20ABI,
        blockchainService.signer
      );

      const decimals = await contract.decimals();
      const tokenAmount = ethers.utils.parseUnits(amount, decimals);

      const tx = await contract.transfer(to, tokenAmount);
      return tx;
    } catch (error) {
      throw new Error(`ERC-20 transaction failed: ${error.message}`);
    }
  }

  /**
   * Process withdrawal to user's wallet
   * @param {Object} withdrawalData - Withdrawal information
   */
  async processWithdrawal(withdrawalData) {
    const { amount, currency, destinationAddress } = withdrawalData;

    try {
      // This would typically involve:
      // 1. Validating withdrawal request
      // 2. Checking platform balances
      // 3. Creating withdrawal transaction
      // 4. Recording transaction for transparency

      const transactionRecord = {
        txHash: '0x' + Math.random().toString(16).substr(2, 64), // Mock transaction
        from: 'platform_wallet',
        to: destinationAddress,
        amount,
        currency,
        status: 'pending',
        timestamp: new Date().toISOString(),
        type: 'withdrawal'
      };

      await this.recordTransaction(transactionRecord);

      return {
        success: true,
        transaction: transactionRecord
      };
    } catch (error) {
      console.error('Withdrawal processing failed:', error);
      throw error;
    }
  }

  /**
   * Record transaction on blockchain and backend
   * @param {Object} transaction - Transaction data
   */
  async recordTransaction(transaction) {
    try {
      // Record in local storage for immediate access
      this.transactionHistory.push(transaction);
      localStorage.setItem('walletTransactions', JSON.stringify(this.transactionHistory));

      // Record in backend database
      await api.post('/payments/transactions', transaction);

      // Record transaction hash for blockchain verification
      if (transaction.txHash && transaction.txHash !== 'pending') {
        await api.post('/blockchain/record-transaction', {
          txHash: transaction.txHash,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          orderId: transaction.orderId
        });
      }

      return transaction;
    } catch (error) {
      console.error('Failed to record transaction:', error);
      // Don't throw here as the transaction might still be valid
    }
  }

  /**
   * Update transaction status
   * @param {Object} transaction - Updated transaction data
   */
  async updateTransaction(transaction) {
    try {
      // Update local storage
      const index = this.transactionHistory.findIndex(tx => tx.txHash === transaction.txHash);
      if (index !== -1) {
        this.transactionHistory[index] = transaction;
        localStorage.setItem('walletTransactions', JSON.stringify(this.transactionHistory));
      }

      // Update backend
      await api.put(`/payments/transactions/${transaction.txHash}`, transaction);

      return transaction;
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }
  }

  /**
   * Get transaction history
   * @param {string} address - Wallet address (optional)
   */
  async getTransactionHistory(address = null) {
    try {
      const walletAddress = address || this.connectedWallet?.address;
      
      if (!walletAddress) {
        return [];
      }

      // Get from backend
      const response = await api.get(`/payments/transactions/${walletAddress}`);
      this.transactionHistory = response.data.transactions || [];

      return this.transactionHistory;
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      
      // Fallback to local storage
      const stored = localStorage.getItem('walletTransactions');
      return stored ? JSON.parse(stored) : [];
    }
  }

  /**
   * Record wallet connection for analytics
   */
  async recordConnection() {
    try {
      if (!this.connectedWallet) return;

      await api.post('/analytics/wallet-connection', {
        walletType: this.connectedWallet.type,
        address: this.connectedWallet.address,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record wallet connection:', error);
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    this.connectedWallet = null;
    this.walletType = null;
    this.balances = {};
    this.transactionHistory = [];
    
    // Clear blockchain service connection
    blockchainService.account = null;
    blockchainService.signer = null;

    localStorage.removeItem('connectedWallet');
    
    console.log('🔌 Wallet disconnected');
  }

  /**
   * Get current wallet info
   */
  getWalletInfo() {
    return {
      connected: !!this.connectedWallet,
      wallet: this.connectedWallet,
      balances: this.balances,
      supportedWallets: this.supportedWallets,
      supportedCurrencies: SUPPORTED_CURRENCIES
    };
  }

  /**
   * Switch network
   * @param {string} networkName - Network to switch to
   */
  async switchNetwork(networkName) {
    const network = NETWORKS[networkName];
    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }]
      });

      return true;
    } catch (error) {
      // If network is not added, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network]
        });
        return true;
      }
      throw error;
    }
  }

  /**
   * Format currency amount for display
   * @param {string} amount - Amount to format
   * @param {string} currency - Currency symbol
   */
  formatAmount(amount, currency) {
    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    if (!currencyInfo) return amount;

    const num = parseFloat(amount);
    if (isNaN(num)) return '0';

    return num.toFixed(currencyInfo.decimals > 4 ? 4 : currencyInfo.decimals);
  }

  /**
   * Validate wallet address
   * @param {string} address - Address to validate
   * @param {string} currency - Currency type
   */
  isValidAddress(address, currency = 'ETH') {
    if (currency === 'BTC') {
      // Bitcoin address validation would go here
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
             /^bc1[a-z0-9]{39,59}$/.test(address);
    } else {
      // Ethereum address validation
      return blockchainService.isValidAddress(address);
    }
  }
}

// Create singleton instance
export const walletService = new WalletService();
export default walletService; 