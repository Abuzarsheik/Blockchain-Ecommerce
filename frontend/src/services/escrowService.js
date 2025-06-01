import { api } from './api';
import { blockchainService } from './blockchain';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

class EscrowService {
    constructor() {
        this.contract = null;
        this.isInitialized = false;
    }

    /**
     * Initialize escrow contract
     */
    async init() {
        try {
            if (!blockchainService.isInitialized) {
                await blockchainService.init();
            }

            // Contract ABI will be loaded from the deployed contract
            const contractABI = [
                // Essential functions for frontend interaction
                "function createEscrow(uint256 _orderId, address _seller, string memory _productHash, uint256 _deliveryDays) external payable",
                "function confirmDelivery(uint256 _escrowId, string memory _trackingInfo) external",
                "function confirmReceipt(uint256 _escrowId) external",
                "function raiseDispute(uint256 _escrowId, string memory _reason) external",
                "function autoReleaseFunds(uint256 _escrowId) external",
                "function getEscrow(uint256 _escrowId) external view returns (tuple(uint256 orderId, address buyer, address seller, uint256 amount, uint256 platformFee, uint8 state, uint256 createdAt, uint256 deliveryDeadline, uint256 disputeDeadline, string productHash, string trackingInfo, bool sellerConfirmed, bool buyerConfirmed, address disputeResolver, string disputeReason))",
                "function getBuyerEscrows(address _buyer) external view returns (uint256[])",
                "function getSellerEscrows(address _seller) external view returns (uint256[])",
                "function canAutoRelease(uint256 _escrowId) external view returns (bool)",
                
                // Events
                "event EscrowCreated(uint256 indexed escrowId, uint256 indexed orderId, address indexed buyer, address seller, uint256 amount)",
                "event DeliveryConfirmed(uint256 indexed escrowId, address indexed seller, string trackingInfo)",
                "event ReceiptConfirmed(uint256 indexed escrowId, address indexed buyer)",
                "event DisputeRaised(uint256 indexed escrowId, address indexed raiser, string reason)",
                "event FundsReleased(uint256 indexed escrowId, address indexed recipient, uint256 amount)"
            ];

            // Get contract address from environment or API
            const contractAddress = process.env.REACT_APP_ESCROW_CONTRACT_ADDRESS || await this.getContractAddress();
            
            if (contractAddress && blockchainService.provider) {
                this.contract = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    blockchainService.signer || blockchainService.provider
                );
                this.isInitialized = true;
            }
        } catch (error) {
            logger.error('❌ Failed to initialize escrow service:', error);
        }
    }

    /**
     * Get contract address from backend
     */
    async getContractAddress() {
        try {
            const response = await api.get('/escrow/stats');
            return response.data.stats?.contractAddress;
        } catch (error) {
            console.warn('Could not get contract address from backend');
            return null;
        }
    }

    /**
     * Create escrow for an order
     * @param {string} orderId - Order ID
     * @param {string} sellerAddress - Seller's wallet address
     * @param {number} deliveryDays - Expected delivery period
     * @returns {Object} Transaction result
     */
    async createEscrow(orderId, sellerAddress, deliveryDays = 14) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!blockchainService.account) {
                throw new Error('Wallet not connected');
            }

            // Get escrow creation data from backend
            const response = await api.post('/escrow/create', {
                orderId,
                sellerAddress,
                deliveryDays
            });

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            const { escrowData, contractAddress } = response.data.data;

            // Execute smart contract transaction
            const tx = await this.contract.createEscrow(
                escrowData.orderId,
                sellerAddress,
                escrowData.productHash,
                deliveryDays,
                {
                    value: escrowData.amountInWei,
                    gasLimit: ethers.utils.hexlify(Math.ceil(parseInt(escrowData.estimatedGas) * 1.2))
                }
            );

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    orderId: escrowData.orderId,
                    amount: escrowData.amountInWei,
                    contractAddress
                },
                wait: async () => await tx.wait()
            };
        } catch (error) {
            logger.error('Create escrow error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Confirm delivery (seller action)
     * @param {number} escrowId - Escrow ID
     * @param {string} trackingInfo - Delivery tracking information
     * @returns {Object} Transaction result
     */
    async confirmDelivery(escrowId, trackingInfo) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!blockchainService.account) {
                throw new Error('Wallet not connected');
            }

            // Get transaction data from backend
            const response = await api.post(`/escrow/${escrowId}/confirm-delivery`, {
                trackingInfo
            });

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            const { transactionData } = response.data;

            // Execute smart contract transaction
            const tx = await this.contract.confirmDelivery(escrowId, trackingInfo, {
                gasLimit: ethers.utils.hexlify(Math.ceil(parseInt(transactionData.estimatedGas) * 1.2))
            });

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    escrowId,
                    trackingInfo
                },
                wait: async () => await tx.wait()
            };
        } catch (error) {
            logger.error('Confirm delivery error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Confirm receipt (buyer action)
     * @param {number} escrowId - Escrow ID
     * @returns {Object} Transaction result
     */
    async confirmReceipt(escrowId) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!blockchainService.account) {
                throw new Error('Wallet not connected');
            }

            // Get transaction data from backend
            const response = await api.post(`/escrow/${escrowId}/confirm-receipt`);

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            const { transactionData } = response.data;

            // Execute smart contract transaction
            const tx = await this.contract.confirmReceipt(escrowId, {
                gasLimit: ethers.utils.hexlify(Math.ceil(parseInt(transactionData.estimatedGas) * 1.2))
            });

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    escrowId
                },
                wait: async () => await tx.wait()
            };
        } catch (error) {
            logger.error('Confirm receipt error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Raise dispute
     * @param {number} escrowId - Escrow ID
     * @param {string} reason - Dispute reason
     * @returns {Object} Transaction result
     */
    async raiseDispute(escrowId, reason) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!blockchainService.account) {
                throw new Error('Wallet not connected');
            }

            // Get transaction data from backend
            const response = await api.post(`/escrow/${escrowId}/dispute`, {
                reason
            });

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            const { transactionData } = response.data;

            // Execute smart contract transaction
            const tx = await this.contract.raiseDispute(escrowId, reason, {
                gasLimit: ethers.utils.hexlify(Math.ceil(parseInt(transactionData.estimatedGas) * 1.2))
            });

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    escrowId,
                    reason
                },
                wait: async () => await tx.wait()
            };
        } catch (error) {
            logger.error('Raise dispute error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Auto-release funds
     * @param {number} escrowId - Escrow ID
     * @returns {Object} Transaction result
     */
    async autoReleaseFunds(escrowId) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!blockchainService.account) {
                throw new Error('Wallet not connected');
            }

            // Check if auto-release is possible
            const canReleaseResponse = await api.get(`/escrow/${escrowId}/can-auto-release`);
            if (!canReleaseResponse.data.canAutoRelease) {
                throw new Error('Auto-release not possible for this escrow');
            }

            // Get transaction data from backend
            const response = await api.post(`/escrow/${escrowId}/auto-release`);

            if (!response.data.success) {
                throw new Error(response.data.error);
            }

            const { transactionData } = response.data;

            // Execute smart contract transaction
            const tx = await this.contract.autoReleaseFunds(escrowId, {
                gasLimit: ethers.utils.hexlify(Math.ceil(parseInt(transactionData.estimatedGas) * 1.2))
            });

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    escrowId
                },
                wait: async () => await tx.wait()
            };
        } catch (error) {
            logger.error('Auto-release funds error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get escrow details
     * @param {number} escrowId - Escrow ID
     * @returns {Object} Escrow details
     */
    async getEscrow(escrowId) {
        try {
            const response = await api.get(`/escrow/${escrowId}`);
            return response.data;
        } catch (error) {
            logger.error('Get escrow error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Get user's escrows
     * @param {string} role - 'buyer' or 'seller'
     * @returns {Object} User's escrows
     */
    async getUserEscrows(role = 'buyer') {
        try {
            const response = await api.get(`/escrow/user/${role}`);
            return response.data;
        } catch (error) {
            logger.error('Get user escrows error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                escrows: []
            };
        }
    }

    /**
     * Get transaction status
     * @param {string} txHash - Transaction hash
     * @returns {Object} Transaction status
     */
    async getTransactionStatus(txHash) {
        try {
            const response = await api.get(`/escrow/transaction/${txHash}`);
            return response.data;
        } catch (error) {
            logger.error('Get transaction status error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Check if escrow can be auto-released
     * @param {number} escrowId - Escrow ID
     * @returns {Object} Auto-release status
     */
    async canAutoRelease(escrowId) {
        try {
            const response = await api.get(`/escrow/${escrowId}/can-auto-release`);
            return response.data;
        } catch (error) {
            logger.error('Can auto-release error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                canAutoRelease: false
            };
        }
    }

    /**
     * Get contract statistics (admin only)
     * @returns {Object} Contract statistics
     */
    async getContractStats() {
        try {
            const response = await api.get('/escrow/stats');
            return response.data;
        } catch (error) {
            logger.error('Get contract stats error:', error);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * Get escrow state name
     * @param {number} state - State number
     * @returns {string} State name
     */
    getEscrowStateName(state) {
        const states = [
            'PENDING',
            'DELIVERED',
            'CONFIRMED',
            'DISPUTED',
            'RESOLVED',
            'COMPLETED',
            'REFUNDED',
            'EXPIRED'
        ];
        return states[state] || 'UNKNOWN';
    }

    /**
     * Get state display info
     * @param {string} state - Escrow state
     * @returns {Object} Display information
     */
    getStateDisplayInfo(state) {
        const stateInfo = {
            'PENDING': {
                color: 'orange',
                icon: '⏳',
                description: 'Waiting for delivery'
            },
            'DELIVERED': {
                color: 'blue',
                icon: '📦',
                description: 'Delivered, awaiting confirmation'
            },
            'CONFIRMED': {
                color: 'green',
                icon: '✅',
                description: 'Receipt confirmed'
            },
            'DISPUTED': {
                color: 'red',
                icon: '⚠️',
                description: 'Under dispute'
            },
            'RESOLVED': {
                color: 'purple',
                icon: '⚖️',
                description: 'Dispute resolved'
            },
            'COMPLETED': {
                color: 'green',
                icon: '🎉',
                description: 'Funds released to seller'
            },
            'REFUNDED': {
                color: 'gray',
                icon: '💰',
                description: 'Funds refunded to buyer'
            },
            'EXPIRED': {
                color: 'gray',
                icon: '⏰',
                description: 'Auto-released due to timeout'
            }
        };

        return stateInfo[state] || {
            color: 'gray',
            icon: '❓',
            description: 'Unknown state'
        };
    }

    /**
     * Format amount for display
     * @param {string} amount - Amount in wei
     * @returns {string} Formatted amount
     */
    formatAmount(amount) {
        try {
            return ethers.utils.formatEther(amount);
        } catch (error) {
            return '0';
        }
    }

    /**
     * Parse amount to wei
     * @param {string} amount - Amount in ETH
     * @returns {string} Amount in wei
     */
    parseAmount(amount) {
        try {
            return ethers.utils.parseEther(amount.toString()).toString();
        } catch (error) {
            return '0';
        }
    }

    /**
     * Listen for escrow events
     * @param {Function} callback - Event callback
     */
    async startEventListener(callback) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            // Listen for EscrowCreated events
            this.contract.on('EscrowCreated', (escrowId, orderId, buyer, seller, amount, event) => {
                callback('EscrowCreated', {
                    escrowId: escrowId.toString(),
                    orderId: orderId.toString(),
                    buyer,
                    seller,
                    amount: amount.toString(),
                    amountInETH: ethers.utils.formatEther(amount),
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber
                });
            });

            // Listen for other events...
            this.contract.on('DeliveryConfirmed', (escrowId, seller, trackingInfo, event) => {
                callback('DeliveryConfirmed', {
                    escrowId: escrowId.toString(),
                    seller,
                    trackingInfo,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('ReceiptConfirmed', (escrowId, buyer, event) => {
                callback('ReceiptConfirmed', {
                    escrowId: escrowId.toString(),
                    buyer,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('DisputeRaised', (escrowId, raiser, reason, event) => {
                callback('DisputeRaised', {
                    escrowId: escrowId.toString(),
                    raiser,
                    reason,
                    transactionHash: event.transactionHash
                });
            });

            this.contract.on('FundsReleased', (escrowId, recipient, amount, event) => {
                callback('FundsReleased', {
                    escrowId: escrowId.toString(),
                    recipient,
                    amount: amount.toString(),
                    amountInETH: ethers.utils.formatEther(amount),
                    transactionHash: event.transactionHash
                });
            });

        } catch (error) {
            logger.error('Start event listener error:', error);
        }
    }

    /**
     * Stop event listeners
     */
    stopEventListener() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
    }
}

// Create singleton instance
export const escrowService = new EscrowService();
export default escrowService; 