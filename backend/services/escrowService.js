const Order = require('../models/Order');
const User = require('../models/User');
const crypto = require('crypto');
const escrowContractABI = require('../contracts/EscrowContract.json');
const { ethers } = require('ethers');

class EscrowService {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.wallet = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Initialize provider (ethers v6 syntax)
            this.provider = new ethers.JsonRpcProvider(
                process.env.RPC_URL || 'http://localhost:8545'
            );

            // Initialize wallet for contract interactions
            if (process.env.ESCROW_PRIVATE_KEY) {
                this.wallet = new ethers.Wallet(process.env.ESCROW_PRIVATE_KEY, this.provider);
            }

            // Initialize contract
            if (process.env.ESCROW_CONTRACT_ADDRESS) {
                this.contract = new ethers.Contract(
                    process.env.ESCROW_CONTRACT_ADDRESS,
                    escrowContractABI.abi,
                    this.wallet || this.provider
                );
            }

            this.isInitialized = true;
        } catch (error) {
            logger.error('❌ Failed to initialize escrow service:', error);
        }
    }

    /**
     * Create escrow for an order
     * @param {Object} orderData - Order details
     * @param {string} buyerAddress - Buyer's wallet address
     * @param {string} sellerAddress - Seller's wallet address
     * @param {number} deliveryDays - Expected delivery period
     * @returns {Object} Escrow creation result
     */
    async createEscrow(orderData, buyerAddress, sellerAddress, deliveryDays = 14) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            // Generate product hash for verification
            const productHash = this.generateProductHash(orderData);

            // Convert price to wei (assuming price is in ETH)
            const amountInWei = ethers.parseEther(orderData.total.toString());

            // Estimate gas for the transaction
            const gasEstimate = await this.contract.estimateGas.createEscrow(
                orderData.id,
                sellerAddress,
                productHash,
                deliveryDays,
                { value: amountInWei, from: buyerAddress }
            );

            const gasPrice = await this.provider.getGasPrice();
            const gasCost = gasEstimate * gasPrice;

            return {
                success: true,
                escrowData: {
                    orderId: orderData.id,
                    productHash,
                    amountInWei: amountInWei.toString(),
                    deliveryDays,
                    estimatedGas: gasEstimate.toString(),
                    gasPrice: gasPrice.toString(),
                    gasCost: gasCost.toString(),
                    gasCostInETH: ethers.formatEther(gasCost)
                },
                contractAddress: this.contract.address,
                buyerAddress,
                sellerAddress
            };
        } catch (error) {
            logger.error('Escrow creation error:', error);
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    /**
     * Get escrow details by ID
     * @param {number} escrowId - Escrow ID from smart contract
     * @returns {Object} Escrow details
     */
    async getEscrow(escrowId) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            const escrow = await this.contract.getEscrow(escrowId);
            
            return {
                success: true,
                escrow: {
                    escrowId,
                    orderId: escrow.orderId.toString(),
                    buyer: escrow.buyer,
                    seller: escrow.seller,
                    amount: escrow.amount.toString(),
                    amountInETH: ethers.formatEther(escrow.amount),
                    platformFee: escrow.platformFee.toString(),
                    platformFeeInETH: ethers.formatEther(escrow.platformFee),
                    state: this.getEscrowStateName(escrow.state),
                    stateValue: escrow.state,
                    createdAt: new Date(Number(escrow.createdAt) * 1000),
                    deliveryDeadline: new Date(Number(escrow.deliveryDeadline) * 1000),
                    disputeDeadline: new Date(Number(escrow.disputeDeadline) * 1000),
                    productHash: escrow.productHash,
                    trackingInfo: escrow.trackingInfo,
                    sellerConfirmed: escrow.sellerConfirmed,
                    buyerConfirmed: escrow.buyerConfirmed,
                    disputeResolver: escrow.disputeResolver,
                    disputeReason: escrow.disputeReason
                }
            };
        } catch (error) {
            logger.error('Get escrow error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get escrows for a user (buyer or seller)
     * @param {string} userAddress - User's wallet address
     * @param {string} role - 'buyer' or 'seller'
     * @returns {Array} List of escrow IDs
     */
    async getUserEscrows(userAddress, role = 'buyer') {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            let escrowIds;
            if (role === 'buyer') {
                escrowIds = await this.contract.getBuyerEscrows(userAddress);
            } else {
                escrowIds = await this.contract.getSellerEscrows(userAddress);
            }

            // Convert BigNumber array to string array
            const ids = escrowIds.map(id => id.toString());

            // Get detailed information for each escrow
            const escrows = [];
            for (const id of ids) {
                const escrowResult = await this.getEscrow(id);
                if (escrowResult.success) {
                    escrows.push(escrowResult.escrow);
                }
            }

            return {
                success: true,
                escrows,
                totalCount: escrows.length
            };
        } catch (error) {
            logger.error('Get user escrows error:', error);
            return {
                success: false,
                error: error.message,
                escrows: []
            };
        }
    }

    /**
     * Confirm delivery (seller action)
     * @param {number} escrowId - Escrow ID
     * @param {string} trackingInfo - Delivery tracking information
     * @param {string} sellerAddress - Seller's wallet address
     * @returns {Object} Transaction details
     */
    async confirmDelivery(escrowId, trackingInfo, sellerAddress) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            // Estimate gas
            const gasEstimate = await this.contract.estimateGas.confirmDelivery(
                escrowId,
                trackingInfo,
                { from: sellerAddress }
            );

            return {
                success: true,
                transactionData: {
                    escrowId,
                    trackingInfo,
                    estimatedGas: gasEstimate.toString(),
                    contractAddress: this.contract.address
                }
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
     * @param {string} buyerAddress - Buyer's wallet address
     * @returns {Object} Transaction details
     */
    async confirmReceipt(escrowId, buyerAddress) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            // Estimate gas
            const gasEstimate = await this.contract.estimateGas.confirmReceipt(
                escrowId,
                { from: buyerAddress }
            );

            return {
                success: true,
                transactionData: {
                    escrowId,
                    estimatedGas: gasEstimate.toString(),
                    contractAddress: this.contract.address
                }
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
     * @param {string} userAddress - User's wallet address
     * @returns {Object} Transaction details
     */
    async raiseDispute(escrowId, reason, userAddress) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            // Estimate gas
            const gasEstimate = await this.contract.estimateGas.raiseDispute(
                escrowId,
                reason,
                { from: userAddress }
            );

            return {
                success: true,
                transactionData: {
                    escrowId,
                    reason,
                    estimatedGas: gasEstimate.toString(),
                    contractAddress: this.contract.address
                }
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
     * Resolve dispute (admin only)
     * @param {number} escrowId - Escrow ID
     * @param {boolean} favorBuyer - True to favor buyer, false to favor seller
     * @returns {Object} Transaction result
     */
    async resolveDispute(escrowId, favorBuyer) {
        try {
            if (!this.contract || !this.wallet) {
                throw new Error('Escrow contract or admin wallet not initialized');
            }

            // Execute transaction (admin wallet required)
            const tx = await this.contract.connect(this.wallet).resolveDispute(
                escrowId,
                favorBuyer
            );

            return {
                success: true,
                transaction: {
                    hash: tx.hash,
                    escrowId,
                    favorBuyer,
                    gasLimit: tx.gasLimit?.toString(),
                    gasPrice: tx.gasPrice?.toString()
                }
            };
        } catch (error) {
            logger.error('Resolve dispute error:', error);
            return {
                success: false,
                error: error.message
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
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            const canRelease = await this.contract.canAutoRelease(escrowId);
            
            return {
                success: true,
                canAutoRelease: canRelease,
                escrowId
            };
        } catch (error) {
            logger.error('Check auto-release error:', error);
            return {
                success: false,
                error: error.message,
                canAutoRelease: false
            };
        }
    }

    /**
     * Auto-release funds
     * @param {number} escrowId - Escrow ID
     * @param {string} userAddress - Address calling the auto-release
     * @returns {Object} Transaction details
     */
    async autoReleaseFunds(escrowId, userAddress) {
        try {
            if (!this.contract) {
                throw new Error('Escrow contract not initialized');
            }

            // Estimate gas
            const gasEstimate = await this.contract.estimateGas.autoReleaseFunds(
                escrowId,
                { from: userAddress }
            );

            return {
                success: true,
                transactionData: {
                    escrowId,
                    estimatedGas: gasEstimate.toString(),
                    contractAddress: this.contract.address
                }
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
     * Get transaction status
     * @param {string} txHash - Transaction hash
     * @returns {Object} Transaction status
     */
    async getTransactionStatus(txHash) {
        try {
            if (!this.provider) {
                throw new Error('Provider not initialized');
            }

            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (receipt) {
                const currentBlock = await this.provider.getBlockNumber();
                const confirmations = currentBlock - receipt.blockNumber;

                return {
                    success: true,
                    status: receipt.status === 1 ? 'success' : 'failed',
                    blockNumber: receipt.blockNumber,
                    confirmations,
                    gasUsed: receipt.gasUsed.toString(),
                    events: this.parseEscrowEvents(receipt.logs)
                };
            } else {
                return {
                    success: true,
                    status: 'pending',
                    confirmations: 0
                };
            }
        } catch (error) {
            logger.error('Get transaction status error:', error);
            return {
                success: false,
                error: error.message,
                status: 'error'
            };
        }
    }

    /**
     * Listen for escrow events
     * @param {Function} callback - Event handler function
     */
    startEventListener(callback) {
        if (!this.contract) {
            console.error('Contract not initialized for event listening');
            return;
        }

        // Listen for EscrowCreated events
        this.contract.on('EscrowCreated', (escrowId, orderId, buyer, seller, amount, event) => {
            callback('EscrowCreated', {
                escrowId: escrowId.toString(),
                orderId: orderId.toString(),
                buyer,
                seller,
                amount: amount.toString(),
                amountInETH: ethers.formatEther(amount),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });

        // Listen for DeliveryConfirmed events
        this.contract.on('DeliveryConfirmed', (escrowId, seller, trackingInfo, event) => {
            callback('DeliveryConfirmed', {
                escrowId: escrowId.toString(),
                seller,
                trackingInfo,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });

        // Listen for ReceiptConfirmed events
        this.contract.on('ReceiptConfirmed', (escrowId, buyer, event) => {
            callback('ReceiptConfirmed', {
                escrowId: escrowId.toString(),
                buyer,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });

        // Listen for DisputeRaised events
        this.contract.on('DisputeRaised', (escrowId, raiser, reason, event) => {
            callback('DisputeRaised', {
                escrowId: escrowId.toString(),
                raiser,
                reason,
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });

        // Listen for FundsReleased events
        this.contract.on('FundsReleased', (escrowId, recipient, amount, event) => {
            callback('FundsReleased', {
                escrowId: escrowId.toString(),
                recipient,
                amount: amount.toString(),
                amountInETH: ethers.formatEther(amount),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });

    }

    /**
     * Stop event listeners
     */
    stopEventListener() {
        if (this.contract) {
            this.contract.removeAllListeners();
        }
    }

    /**
     * Generate product hash for verification
     * @param {Object} orderData - Order data
     * @returns {string} Product hash
     */
    generateProductHash(orderData) {
        const productData = {
            orderId: orderData.id,
            items: orderData.items || [],
            total: orderData.total,
            timestamp: Date.now()
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(productData))
            .digest('hex');
    }

    /**
     * Get escrow state name from numeric value
     * @param {number} state - Numeric state value
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
     * Parse escrow events from transaction logs
     * @param {Array} logs - Transaction logs
     * @returns {Array} Parsed events
     */
    parseEscrowEvents(logs) {
        const events = [];
        
        try {
            logs.forEach(log => {
                try {
                    const parsedLog = this.contract.interface.parseLog(log);
                    events.push({
                        name: parsedLog.name,
                        args: parsedLog.args,
                        signature: parsedLog.signature
                    });
                } catch (e) {
                    // Log might not be from our contract
                }
            });
        } catch (error) {
            logger.error('Error parsing events:', error);
        }

        return events;
    }

    /**
     * Get contract statistics
     * @returns {Object} Contract statistics
     */
    async getContractStats() {
        try {
            if (!this.contract) {
                throw new Error('Contract not initialized');
            }

            const escrowCounter = await this.contract.escrowCounter();
            const platformFeeRate = await this.contract.platformFeeRate();
            const defaultDeliveryPeriod = await this.contract.defaultDeliveryPeriod();
            const disputePeriod = await this.contract.disputePeriod();
            const autoReleaseTimeout = await this.contract.autoReleaseTimeout();

            return {
                success: true,
                stats: {
                    totalEscrows: escrowCounter.toString(),
                    platformFeeRate: platformFeeRate.toString(),
                    platformFeePercentage: (Number(platformFeeRate) / 100).toFixed(2) + '%',
                    defaultDeliveryPeriod: Math.floor(Number(defaultDeliveryPeriod) / 86400) + ' days',
                    disputePeriod: Math.floor(Number(disputePeriod) / 86400) + ' days',
                    autoReleaseTimeout: Math.floor(Number(autoReleaseTimeout) / 86400) + ' days',
                    contractAddress: this.contract.address
                }
            };
        } catch (error) {
            logger.error('Get contract stats error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const escrowService = new EscrowService();

module.exports = escrowService; 