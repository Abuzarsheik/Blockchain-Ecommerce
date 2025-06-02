import Web3 from 'web3';
import { ethers, BrowserProvider, formatEther, isAddress } from 'ethers';
import { logger } from '../utils/logger';

// Blockchain service for interacting with smart contracts
class BlockchainService {
  constructor() {
    this.web3 = null;
    this.provider = null;
    this.signer = null;
    this.account = null;
    this.networkId = null;
    this.contracts = new Map();
    this.isInitialized = false;
  }

  // Initialize Web3 and connect to MetaMask
  async init() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        this.web3 = new Web3(window.ethereum);
        this.provider = new BrowserProvider(window.ethereum);
        this.isInitialized = true;
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          this.account = accounts[0] || null;
          window.dispatchEvent(new CustomEvent('accountChanged', { detail: this.account }));
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
          window.location.reload();
        });

        return true;
      } catch (error) {
        logger.error('Failed to initialize Web3:', error);
        return false;
      }
    } else {
      console.warn('MetaMask not detected');
      return false;
    }
  }

  // Connect wallet
  async connectWallet() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      this.account = accounts[0];
      this.signer = await this.provider.getSigner();
      
      return this.account;
    } catch (error) {
      logger.error('Failed to connect wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  }

  // Get current account
  async getCurrentAccount() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      
      this.account = accounts[0] || null;
      return this.account;
    } catch (error) {
      logger.error('Failed to get current account:', error);
      return null;
    }
  }

  // Get network information
  async getNetwork() {
    if (!this.provider) return null;
    
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: Number(network.chainId),
        name: network.name,
      };
    } catch (error) {
      logger.error('Failed to get network:', error);
      return null;
    }
  }

  // Get account balance
  async getBalance(address = null) {
    if (!this.provider) return '0';
    
    try {
      const account = address || this.account;
      if (!account) return '0';
      
      const balance = await this.provider.getBalance(account);
      return formatEther(balance);
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return '0';
    }
  }

  // Initialize contract
  initContract(contractAddress, abi, contractName) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, this.signer || this.provider);
      this.contracts.set(contractName, contract);
      return contract;
    } catch (error) {
      logger.error(`Failed to initialize ${contractName} contract:`, error);
      throw error;
    }
  }

  // Verify product on blockchain
  async verifyProduct(productId) {
    try {
      // TODO: Implement actual blockchain verification
      // This should interact with your ProductRegistry contract
      
      throw new Error('Product verification not yet implemented');
    } catch (error) {
      logger.error('Failed to verify product:', error);
      throw error;
    }
  }

  // Get product history from blockchain
  async getProductHistory(productId) {
    try {
      // TODO: Implement actual blockchain history query
      // This should query blockchain events for the product
      // Example: const events = await this.contracts.ProductRegistry.getPastEvents('ProductEvent', {
      //   filter: { productId },
      //   fromBlock: 0,
      //   toBlock: 'latest'
      // });
      
      throw new Error('Product history retrieval not yet implemented');
    } catch (error) {
      logger.error('Failed to get product history:', error);
      throw error;
    }
  }

  // Submit review to blockchain
  async submitReview(productId, rating, content) {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Hash the review content
      // const contentHash = keccak256(toUtf8Bytes(content));
      
      // TODO: Implement actual blockchain review submission
      // This should interact with your ReviewSystem contract
      // Example: const tx = await this.contracts.ReviewSystem.submitReview(
      //   productId, rating, contentHash
      // );
      
      throw new Error('Review submission to blockchain not yet implemented');
    } catch (error) {
      logger.error('Failed to submit review:', error);
      throw error;
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (receipt) {
        return {
          status: receipt.status === 1 ? 'success' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          confirmations: await this.provider.getBlockNumber() - receipt.blockNumber
        };
      } else {
        return {
          status: 'pending',
          confirmations: 0
        };
      }
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      throw error;
    }
  }

  // Switch to correct network
  async switchNetwork(chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error) {
      logger.error('Failed to switch network:', error);
      throw error;
    }
  }

  // Add network to MetaMask
  async addNetwork(networkConfig) {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
      return true;
    } catch (error) {
      logger.error('Failed to add network:', error);
      throw error;
    }
  }

  // Format address for display
  formatAddress(address, length = 6) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-4)}`;
  }

  // Check if address is valid
  isValidAddress(address) {
    return isAddress(address);
  }
}

// Create singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService; 
