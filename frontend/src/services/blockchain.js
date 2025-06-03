import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';

// Smart Contract ABIs
const ESCROW_CONTRACT_ABI = [
  "constructor(address _seller, address _buyer, uint256 _amount, bytes32 _productHash, uint256 _escrowDuration)",
  "function releasePayment() external",
  "function refund() external", 
  "function confirmDelivery() external",
  "function raiseDispute() external",
  "function resolveDispute(bool _refundToBuyer) external",
  "function getContractDetails() external view returns (address, address, uint256, bytes32, uint256, uint8)",
  "event PaymentReleased(address indexed seller, uint256 amount)",
  "event PaymentRefunded(address indexed buyer, uint256 amount)",
  "event DeliveryConfirmed(address indexed buyer)",
  "event DisputeRaised(address indexed initiator)",
  "event DisputeResolved(bool refundToBuyer)",
  "enum EscrowState { Active, Completed, Refunded, Disputed }"
];

const ESCROW_FACTORY_ABI = [
  "function createEscrow(address _seller, address _buyer, uint256 _amount, bytes32 _productHash, uint256 _escrowDuration) external payable returns (address)",
  "function getEscrowsByBuyer(address _buyer) external view returns (address[])",
  "function getEscrowsBySeller(address _seller) external view returns (address[])",
  "event EscrowCreated(address indexed escrowContract, address indexed buyer, address indexed seller, uint256 amount)"
];

// Contract addresses (these should be deployed contracts)
const ESCROW_FACTORY_ADDRESS = process.env.REACT_APP_ESCROW_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.escrowFactory = null;
    this.initialized = false;
  }

  async init() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask or compatible wallet not found');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      // Initialize escrow factory contract
      this.escrowFactory = new ethers.Contract(
        ESCROW_FACTORY_ADDRESS,
        ESCROW_FACTORY_ABI,
        this.signer
      );

      this.initialized = true;
      logger.info('Blockchain service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  async createEscrowContract({
    buyerAddress,
    sellerAddress,
    amount,
    productHash,
    escrowDuration = 7 * 24 * 60 * 60, // 7 days default
    testingMode = false // Add testing mode parameter
  }) {
    try {
      await this.ensureInitialized();

      if (!ethers.isAddress(buyerAddress) || !ethers.isAddress(sellerAddress)) {
        throw new Error('Invalid wallet addresses provided');
      }

      const amountInWei = ethers.parseEther(amount.toString());
      
      logger.info('Creating escrow contract with params:', {
        buyer: buyerAddress,
        seller: sellerAddress,
        amount: amountInWei.toString(),
        productHash,
        duration: escrowDuration,
        testingMode
      });

      // TESTING MODE: Return mock contract data without blockchain transaction
      if (testingMode) {
        logger.warn('TESTING MODE: Skipping actual blockchain transaction');
        toast.info('🧪 TESTING MODE: Simulating smart contract creation...');
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generate mock contract data
        const mockContractAddress = ethers.getCreateAddress({
          from: ESCROW_FACTORY_ADDRESS,
          nonce: Math.floor(Math.random() * 1000000)
        });
        
        const mockTxHash = ethers.keccak256(ethers.toUtf8Bytes(
          `mock-tx-${Date.now()}-${Math.random()}`
        ));
        
        const mockResult = {
          contractAddress: mockContractAddress,
          transactionHash: mockTxHash,
          blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
          gasUsed: '180000'
        };

        logger.info('Mock escrow contract created:', mockResult);
        toast.success('🧪 Mock smart contract created for testing!');
        
        return mockResult;
      }

      // PRODUCTION MODE: Perform actual blockchain transaction
      const tx = await this.escrowFactory.createEscrow(
        sellerAddress,
        buyerAddress,
        amountInWei,
        productHash,
        escrowDuration,
        { value: amountInWei }
      );

      toast.info('⏳ Confirming transaction on blockchain...');
      
      const receipt = await tx.wait();
      
      // Extract escrow contract address from events
      const escrowCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = this.escrowFactory.interface.parseLog(log);
          return parsed.name === 'EscrowCreated';
        } catch {
          return false;
        }
      });

      if (!escrowCreatedEvent) {
        throw new Error('Failed to find escrow creation event');
      }

      const parsedEvent = this.escrowFactory.interface.parseLog(escrowCreatedEvent);
      const escrowContractAddress = parsedEvent.args.escrowContract;

      logger.info('Escrow contract created successfully:', {
        contractAddress: escrowContractAddress,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      });

      return {
        contractAddress: escrowContractAddress,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error('Failed to create escrow contract:', error);
      
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction was rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for transaction');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your connection');
      }
      
      throw error;
    }
  }

  async getEscrowContract(contractAddress) {
    try {
      await this.ensureInitialized();
      
      return new ethers.Contract(
        contractAddress,
        ESCROW_CONTRACT_ABI,
        this.signer
      );
    } catch (error) {
      logger.error('Failed to get escrow contract:', error);
      throw error;
    }
  }

  async getEscrowDetails(contractAddress) {
    try {
      const escrowContract = await this.getEscrowContract(contractAddress);
      const details = await escrowContract.getContractDetails();
      
      return {
        seller: details[0],
        buyer: details[1],
        amount: ethers.formatEther(details[2]),
        productHash: details[3],
        escrowDuration: details[4].toString(),
        state: details[5] // EscrowState enum
      };
    } catch (error) {
      logger.error('Failed to get escrow details:', error);
      throw error;
    }
  }

  async confirmDelivery(contractAddress) {
    try {
      const escrowContract = await this.getEscrowContract(contractAddress);
      const tx = await escrowContract.confirmDelivery();
      
      toast.info('⏳ Confirming delivery on blockchain...');
      const receipt = await tx.wait();
      
      logger.info('Delivery confirmed:', {
        contractAddress,
        transactionHash: tx.hash
      });

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Failed to confirm delivery:', error);
      throw error;
    }
  }

  async releasePayment(contractAddress) {
    try {
      const escrowContract = await this.getEscrowContract(contractAddress);
      const tx = await escrowContract.releasePayment();
      
      toast.info('⏳ Releasing payment on blockchain...');
      const receipt = await tx.wait();
      
      logger.info('Payment released:', {
        contractAddress,
        transactionHash: tx.hash
      });

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Failed to release payment:', error);
      throw error;
    }
  }

  async requestRefund(contractAddress) {
    try {
      const escrowContract = await this.getEscrowContract(contractAddress);
      const tx = await escrowContract.refund();
      
      toast.info('⏳ Processing refund on blockchain...');
      const receipt = await tx.wait();
      
      logger.info('Refund processed:', {
        contractAddress,
        transactionHash: tx.hash
      });

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Failed to process refund:', error);
      throw error;
    }
  }

  async raiseDispute(contractAddress) {
    try {
      const escrowContract = await this.getEscrowContract(contractAddress);
      const tx = await escrowContract.raiseDispute();
      
      toast.info('⏳ Raising dispute on blockchain...');
      const receipt = await tx.wait();
      
      logger.info('Dispute raised:', {
        contractAddress,
        transactionHash: tx.hash
      });

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Failed to raise dispute:', error);
      throw error;
    }
  }

  async getUserEscrows(userAddress, userType = 'buyer') {
    try {
      await this.ensureInitialized();
      
      let escrowAddresses;
      if (userType === 'buyer') {
        escrowAddresses = await this.escrowFactory.getEscrowsByBuyer(userAddress);
      } else {
        escrowAddresses = await this.escrowFactory.getEscrowsBySeller(userAddress);
      }

      const escrowDetails = await Promise.all(
        escrowAddresses.map(async (address) => {
          try {
            const details = await this.getEscrowDetails(address);
            return { address, ...details };
          } catch (error) {
            logger.error(`Failed to get details for escrow ${address}:`, error);
            return null;
          }
        })
      );

      return escrowDetails.filter(Boolean);
    } catch (error) {
      logger.error('Failed to get user escrows:', error);
      throw error;
    }
  }

  async getNetworkInfo() {
    try {
      await this.ensureInitialized();
      const network = await this.provider.getNetwork();
      
      return {
        chainId: network.chainId.toString(),
        name: network.name,
        currency: 'ETH'
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  async switchToEthereumMainnet() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }] // Ethereum mainnet
      });
    } catch (error) {
      logger.error('Failed to switch network:', error);
      throw error;
    }
  }

  async switchToPolygonMainnet() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }] // Polygon mainnet
      });
    } catch (error) {
      if (error.code === 4902) {
        // Network not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18
            },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/']
          }]
        });
      } else {
        throw error;
      }
    }
  }

  // Utility function to format addresses
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Utility function to format amounts
  formatAmount(amount, decimals = 4) {
    return parseFloat(amount).toFixed(decimals);
  }
}

export const blockchainService = new BlockchainService(); 

