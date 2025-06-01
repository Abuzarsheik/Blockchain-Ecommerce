const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const notificationService = require('./notificationService');

class DisputeService {
    constructor() {
        this.assessmentCriteria = this.initializeAssessmentCriteria();
        this.autoResolutionThresholds = {
            highConfidence: 85,
            mediumConfidence: 70,
            lowConfidence: 50
        };
    }

    /**
     * Initialize automated assessment criteria
     */
    initializeAssessmentCriteria() {
        return {
            // Delivery-related criteria
            delivery_confirmation: {
                weight: 25,
                check: async (dispute, order) => {
                    return {
                        result: Boolean(order.tracking_number && order.status === 'delivered'),
                        details: order.tracking_number ? 'Tracking number available' : 'No tracking information',
                        confidence: order.tracking_number ? 90 : 20
                    };
                }
            },

            // Timeline criteria
            delivery_timeline: {
                weight: 20,
                check: async (dispute, order) => {
                    if (!order.estimated_delivery) {return { result: false, details: 'No delivery estimate', confidence: 50 };}
                    
                    const now = new Date();
                    const isLate = now > new Date(order.estimated_delivery);
                    const daysLate = isLate ? Math.floor((now - new Date(order.estimated_delivery)) / (1000 * 60 * 60 * 24)) : 0;
                    
                    return {
                        result: !isLate || daysLate < 7,
                        details: isLate ? `Delivery ${daysLate} days late` : 'Delivered on time',
                        confidence: isLate ? Math.max(30, 90 - daysLate * 10) : 95
                    };
                }
            },

            // Communication history
            seller_responsiveness: {
                weight: 15,
                check: async (dispute, order) => {
                    // Check if seller has responded to previous issues
                    const reviews = await Review.find({ seller_id: order.seller_id });
                    const responseRate = reviews.length > 0 
                        ? reviews.filter(r => r.seller_response?.content).length / reviews.length 
                        : 0;
                    
                    return {
                        result: responseRate > 0.7,
                        details: `Seller response rate: ${Math.round(responseRate * 100)}%`,
                        confidence: 80
                    };
                }
            },

            // Order value and user history
            transaction_value: {
                weight: 10,
                check: async (dispute, order) => {
                    const isHighValue = order.total > 500;
                    return {
                        result: !isHighValue, // Low value orders can be auto-resolved more easily
                        details: `Order value: $${order.total}`,
                        confidence: isHighValue ? 40 : 85
                    };
                }
            },

            // Buyer history
            buyer_credibility: {
                weight: 15,
                check: async (dispute, order) => {
                    const buyer = await User.findById(dispute.buyer_id);
                    const buyerDisputes = await Dispute.countDocuments({ 
                        buyer_id: dispute.buyer_id,
                        status: 'resolved'
                    });
                    
                    const buyerOrders = await Order.countDocuments({ user_id: dispute.buyer_id });
                    const disputeRate = buyerOrders > 0 ? buyerDisputes / buyerOrders : 1;
                    
                    return {
                        result: disputeRate < 0.1, // Less than 10% dispute rate
                        details: `Buyer dispute rate: ${Math.round(disputeRate * 100)}%`,
                        confidence: disputeRate < 0.05 ? 90 : 60
                    };
                }
            },

            // Seller history
            seller_credibility: {
                weight: 15,
                check: async (dispute, order) => {
                    const sellerDisputes = await Dispute.countDocuments({ 
                        seller_id: dispute.seller_id,
                        status: 'resolved'
                    });
                    
                    const sellerOrders = await Order.countDocuments({ 
                        'items.product_id': { $in: await this.getSellerProducts(dispute.seller_id) }
                    });
                    
                    const disputeRate = sellerOrders > 0 ? sellerDisputes / sellerOrders : 0;
                    
                    return {
                        result: disputeRate < 0.05, // Less than 5% dispute rate
                        details: `Seller dispute rate: ${Math.round(disputeRate * 100)}%`,
                        confidence: disputeRate < 0.02 ? 95 : 70
                    };
                }
            }
        };
    }

    /**
     * Create a new dispute
     */
    async createDispute(disputeData, initiatedBy) {
        try {
            // Validate order and user eligibility
            const order = await Order.findById(disputeData.orderId)
                .populate('items.product_id');
            
            if (!order) {
                throw new Error('Order not found');
            }

            // Check if dispute already exists
            const existingDispute = await Dispute.findByOrder(disputeData.orderId);
            if (existingDispute) {
                throw new Error('Dispute already exists for this order');
            }

            // Determine buyer and seller
            let buyerId, sellerId;
            if (order.user_id.toString() === initiatedBy) {
                buyerId = initiatedBy;
                sellerId = order.items[0]?.product_id?.user_id || order.items[0]?.product_id?.seller;
            } else {
                // Seller initiating dispute (less common)
                sellerId = initiatedBy;
                buyerId = order.user_id;
            }

            // Get transaction for escrow amount
            const transaction = await Transaction.findOne({ orderId: disputeData.orderId });

            // Create dispute
            const dispute = new Dispute({
                order_id: disputeData.orderId,
                transaction_id: transaction?._id,
                buyer_id: buyerId,
                seller_id: sellerId,
                initiated_by: initiatedBy,
                category: disputeData.category,
                subcategory: disputeData.subcategory,
                description: disputeData.description,
                disputed_amount: disputeData.disputedAmount || order.total,
                escrow_amount: transaction?.amount || order.total,
                currency: transaction?.currency || 'USD',
                priority: this.calculatePriority(disputeData, order)
            });

            await dispute.save();

            // Lock funds in escrow if blockchain transaction
            if (transaction && transaction.type === 'escrow') {
                dispute.blockchain_locked = true;
                dispute.smart_contract_address = transaction.contractAddress;
                await dispute.save();
            }

            // Start automated assessment
            setTimeout(() => this.performAutomatedAssessment(dispute._id), 5000);

            // Send notifications
            await this.sendDisputeNotifications(dispute, 'created');

            // Populate data for response
            await dispute.populate('order_id buyer_id seller_id');

            return dispute;

        } catch (error) {
            logger.error('Create dispute error:', error);
            throw error;
        }
    }

    /**
     * Perform automated assessment of dispute
     */
    async performAutomatedAssessment(disputeId) {
        try {
            const dispute = await Dispute.findById(disputeId)
                .populate('order_id buyer_id seller_id');
            
            if (!dispute || dispute.status !== 'open') {
                return;
            }

            // Update status to under assessment
            await dispute.updateStatus('auto_assessment', null, 'Starting automated assessment', true);

            const order = dispute.order_id;
            const assessmentResults = [];
            let totalWeight = 0;
            let weightedScore = 0;

            // Run all assessment criteria
            for (const [criterionName, criterion] of Object.entries(this.assessmentCriteria)) {
                try {
                    const result = await criterion.check(dispute, order);
                    
                    assessmentResults.push({
                        criterion: criterionName,
                        result: result.result,
                        weight: criterion.weight,
                        details: result.details,
                        confidence: result.confidence || 70
                    });

                    totalWeight += criterion.weight;
                    if (result.result) {
                        weightedScore += criterion.weight * (result.confidence / 100);
                    }

                } catch (error) {
                    logger.error('Assessment criterion ${criterionName} failed:', error);
                    assessmentResults.push({
                        criterion: criterionName,
                        result: false,
                        weight: criterion.weight,
                        details: 'Assessment failed',
                        confidence: 0
                    });
                    totalWeight += criterion.weight;
                }
            }

            // Calculate overall confidence score
            const confidenceScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

            // Determine recommended action
            let recommendedAction;
            let reasoning;

            if (confidenceScore >= this.autoResolutionThresholds.highConfidence) {
                // High confidence - auto resolve
                if (dispute.category === 'item_not_received' && assessmentResults.find(r => r.criterion === 'delivery_confirmation')?.result) {
                    recommendedAction = 'auto_resolve_seller';
                    reasoning = 'High confidence that item was delivered based on tracking and seller history';
                } else if (dispute.category === 'late_delivery' && assessmentResults.find(r => r.criterion === 'delivery_timeline')?.result) {
                    recommendedAction = 'auto_resolve_seller';
                    reasoning = 'Delivery was within acceptable timeframe';
                } else {
                    recommendedAction = 'auto_resolve_buyer';
                    reasoning = 'Evidence supports buyer\'s claim';
                }
            } else if (confidenceScore >= this.autoResolutionThresholds.mediumConfidence) {
                // Medium confidence - request more info or escalate
                recommendedAction = 'request_more_info';
                reasoning = 'Medium confidence - additional evidence needed for resolution';
            } else {
                // Low confidence - escalate to admin
                recommendedAction = 'escalate_to_admin';
                reasoning = 'Low confidence score requires human review';
            }

            // Store assessment results
            await dispute.performAutoAssessment({
                criteria_checked: assessmentResults,
                confidence_score: confidenceScore,
                recommended_action: recommendedAction,
                reasoning: reasoning
            });

            // Execute recommended action
            await this.executeRecommendedAction(dispute, recommendedAction, reasoning, confidenceScore);

            return dispute;

        } catch (error) {
            logger.error('Automated assessment error:', error);
            
            // Fallback to manual review
            const dispute = await Dispute.findById(disputeId);
            if (dispute) {
                await dispute.updateStatus('admin_review', null, 'Automated assessment failed - escalated to admin', true);
            }
        }
    }

    /**
     * Execute the recommended action from automated assessment
     */
    async executeRecommendedAction(dispute, action, reasoning, confidenceScore) {
        try {
            switch (action) {
                case 'auto_resolve_buyer':
                    await this.autoResolveForBuyer(dispute, reasoning);
                    break;

                case 'auto_resolve_seller':
                    await this.autoResolveForSeller(dispute, reasoning);
                    break;

                case 'request_more_info':
                    await this.requestAdditionalEvidence(dispute, reasoning);
                    break;

                case 'escalate_to_admin':
                    await this.escalateToAdmin(dispute, reasoning);
                    break;

                default:
                    await this.escalateToAdmin(dispute, 'Unknown recommended action');
            }

        } catch (error) {
            logger.error('Execute recommended action error:', error);
            await this.escalateToAdmin(dispute, 'Failed to execute automated resolution');
        }
    }

    /**
     * Auto-resolve dispute in favor of buyer
     */
    async autoResolveForBuyer(dispute, reasoning) {
        const resolutionData = {
            decision: 'buyer_wins',
            refund_amount: dispute.disputed_amount,
            refund_percentage: 100,
            seller_compensation: 0,
            resolution_reason: reasoning
        };

        await dispute.setResolution(resolutionData, null, 'automated');
        await this.executeResolution(dispute);
        await this.sendDisputeNotifications(dispute, 'auto_resolved_buyer');
    }

    /**
     * Auto-resolve dispute in favor of seller
     */
    async autoResolveForSeller(dispute, reasoning) {
        const resolutionData = {
            decision: 'seller_wins',
            refund_amount: 0,
            refund_percentage: 0,
            seller_compensation: dispute.disputed_amount,
            resolution_reason: reasoning
        };

        await dispute.setResolution(resolutionData, null, 'automated');
        await this.executeResolution(dispute);
        await this.sendDisputeNotifications(dispute, 'auto_resolved_seller');
    }

    /**
     * Request additional evidence
     */
    async requestAdditionalEvidence(dispute, reasoning) {
        await dispute.updateStatus('pending_evidence', null, reasoning, true);
        
        // Set deadline for evidence submission
        dispute.response_deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await dispute.save();

        await this.sendDisputeNotifications(dispute, 'evidence_requested');
    }

    /**
     * Escalate dispute to admin review
     */
    async escalateToAdmin(dispute, reasoning) {
        dispute.requires_manual_review = true;
        await dispute.updateStatus('admin_review', null, reasoning, true);
        await this.sendDisputeNotifications(dispute, 'escalated_to_admin');
    }

    /**
     * Assign dispute to admin
     */
    async assignDisputeToAdmin(disputeId, adminId) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                throw new Error('Dispute not found');
            }

            await dispute.assignAdmin(adminId);
            await this.sendDisputeNotifications(dispute, 'admin_assigned');

            return dispute;

        } catch (error) {
            logger.error('Assign dispute to admin error:', error);
            throw error;
        }
    }

    /**
     * Add evidence to dispute
     */
    async addEvidence(disputeId, evidenceData, uploadedBy) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                throw new Error('Dispute not found');
            }

            // Verify user is involved in dispute
            if (dispute.buyer_id.toString() !== uploadedBy && 
                dispute.seller_id.toString() !== uploadedBy &&
                !dispute.assigned_admin?.toString() === uploadedBy) {
                throw new Error('Unauthorized to add evidence');
            }

            await dispute.addEvidence(evidenceData, uploadedBy);
            
            // If dispute was pending evidence, move to review
            if (dispute.status === 'pending_evidence') {
                await dispute.updateStatus('under_review', uploadedBy, 'Evidence submitted - reviewing');
            }

            await this.sendDisputeNotifications(dispute, 'evidence_added');

            return dispute;

        } catch (error) {
            logger.error('Add evidence error:', error);
            throw error;
        }
    }

    /**
     * Add message to dispute
     */
    async addMessage(disputeId, senderId, message, isAdmin = false) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                throw new Error('Dispute not found');
            }

            await dispute.addMessage(senderId, message, isAdmin);
            await this.sendDisputeNotifications(dispute, 'message_added');

            return dispute;

        } catch (error) {
            logger.error('Add message error:', error);
            throw error;
        }
    }

    /**
     * Admin resolves dispute manually
     */
    async adminResolveDispute(disputeId, resolutionData, adminId) {
        try {
            const dispute = await Dispute.findById(disputeId);
            if (!dispute) {
                throw new Error('Dispute not found');
            }

            // Verify admin authorization
            const admin = await User.findById(adminId);
            if (!admin || admin.role !== 'admin') {
                throw new Error('Unauthorized - admin access required');
            }

            await dispute.setResolution(resolutionData, adminId, 'admin_manual');
            await this.executeResolution(dispute);
            await this.sendDisputeNotifications(dispute, 'admin_resolved');

            return dispute;

        } catch (error) {
            logger.error('Admin resolve dispute error:', error);
            throw error;
        }
    }

    /**
     * Execute resolution (refunds, payments, etc.)
     */
    async executeResolution(dispute) {
        try {
            const resolution = dispute.resolution;
            
            if (resolution.refund_amount > 0) {
                // Process refund to buyer
                await this.processRefund(dispute.buyer_id, resolution.refund_amount, dispute.currency);
            }

            if (resolution.seller_compensation > 0) {
                // Release funds to seller
                await this.releaseFundsToSeller(dispute.seller_id, resolution.seller_compensation, dispute.currency);
            }

            // Execute blockchain resolution if applicable
            if (dispute.blockchain_locked && dispute.smart_contract_address) {
                await this.executeBlockchainResolution(dispute);
            }

            // Apply additional actions
            if (resolution.additional_actions && resolution.additional_actions.length > 0) {
                await this.executeAdditionalActions(resolution.additional_actions);
            }

            // Update dispute status
            await dispute.updateStatus('resolved', resolution.resolved_by, 'Resolution executed successfully');

            // Update order status if needed
            await this.updateOrderStatus(dispute.order_id, resolution.decision);

        } catch (error) {
            logger.error('Execute resolution error:', error);
            throw error;
        }
    }

    /**
     * Process refund to buyer
     */
    async processRefund(buyerId, amount, currency) {
        try {
            // This would integrate with your payment system
            console.log(`Processing refund: ${amount} ${currency} to buyer ${buyerId}`);
            
            // Create refund transaction record
            // await transactionService.createRefund(buyerId, amount, currency);
            
        } catch (error) {
            logger.error('Process refund error:', error);
            throw error;
        }
    }

    /**
     * Release funds to seller
     */
    async releaseFundsToSeller(sellerId, amount, currency) {
        try {
            console.log(`Releasing funds: ${amount} ${currency} to seller ${sellerId}`);
            
            // Create release transaction record
            // await transactionService.releaseFunds(sellerId, amount, currency);
            
        } catch (error) {
            logger.error('Release funds error:', error);
            throw error;
        }
    }

    /**
     * Execute blockchain resolution
     */
    async executeBlockchainResolution(dispute) {
        try {
            // This would interact with smart contracts
            console.log(`Executing blockchain resolution for dispute ${dispute.dispute_id}`);
            
            // Example: Call smart contract resolution function
            // const txHash = await smartContractService.resolveDispute(
            //     dispute.smart_contract_address,
            //     dispute.resolution.decision === 'buyer_wins' ? 'refund' : 'release'
            // );
            
            // dispute.resolution_tx_hash = txHash;
            // await dispute.save();
            
        } catch (error) {
            logger.error('Execute blockchain resolution error:', error);
            throw error;
        }
    }

    /**
     * Execute additional actions (warnings, suspensions, etc.)
     */
    async executeAdditionalActions(actions) {
        try {
            for (const action of actions) {
                switch (action.action) {
                    case 'account_warning':
                        await this.issueAccountWarning(action.target_user, action.details);
                        break;
                    case 'account_suspension':
                        await this.suspendAccount(action.target_user, action.details);
                        break;
                    case 'seller_rating_impact':
                        await this.impactSellerRating(action.target_user, action.details);
                        break;
                    case 'dispute_fee':
                        await this.chargeDisputeFee(action.target_user, action.details);
                        break;
                }
            }
        } catch (error) {
            logger.error('Execute additional actions error:', error);
        }
    }

    /**
     * Update order status based on resolution
     */
    async updateOrderStatus(orderId, decision) {
        try {
            let newStatus;
            switch (decision) {
                case 'buyer_wins':
                    newStatus = 'cancelled';
                    break;
                case 'seller_wins':
                    newStatus = 'delivered';
                    break;
                default:
                    return; // No status change needed
            }

            await Order.findByIdAndUpdate(orderId, { status: newStatus });

        } catch (error) {
            logger.error('Update order status error:', error);
        }
    }

    /**
     * Send dispute-related notifications
     */
    async sendDisputeNotifications(dispute, type) {
        try {
            const notificationMap = {
                created: {
                    buyer: { type: 'dispute_created', message: 'Your dispute has been created and is under review' },
                    seller: { type: 'dispute_received', message: 'A dispute has been filed against your order' }
                },
                evidence_requested: {
                    both: { type: 'dispute_evidence_requested', message: 'Additional evidence requested for your dispute' }
                },
                escalated_to_admin: {
                    both: { type: 'dispute_escalated', message: 'Your dispute has been escalated for admin review' }
                },
                admin_assigned: {
                    both: { type: 'dispute_admin_assigned', message: 'An admin has been assigned to review your dispute' }
                },
                auto_resolved_buyer: {
                    buyer: { type: 'dispute_resolved', message: 'Your dispute has been resolved in your favor' },
                    seller: { type: 'dispute_resolved', message: 'Dispute resolved - refund issued to buyer' }
                },
                auto_resolved_seller: {
                    buyer: { type: 'dispute_resolved', message: 'Dispute resolved - claim not substantiated' },
                    seller: { type: 'dispute_resolved', message: 'Your dispute has been resolved in your favor' }
                },
                admin_resolved: {
                    both: { type: 'dispute_resolved', message: 'Your dispute has been resolved by admin review' }
                }
            };

            const notifications = notificationMap[type];
            if (!notifications) {return;}

            if (notifications.buyer) {
                await notificationService.createNotification({
                    userId: dispute.buyer_id,
                    type: notifications.buyer.type,
                    customMessage: notifications.buyer.message,
                    data: { disputeId: dispute.dispute_id, orderId: dispute.order_id }
                });
            }

            if (notifications.seller) {
                await notificationService.createNotification({
                    userId: dispute.seller_id,
                    type: notifications.seller.type,
                    customMessage: notifications.seller.message,
                    data: { disputeId: dispute.dispute_id, orderId: dispute.order_id }
                });
            }

            if (notifications.both) {
                await notificationService.createNotification({
                    userId: dispute.buyer_id,
                    type: notifications.both.type,
                    customMessage: notifications.both.message,
                    data: { disputeId: dispute.dispute_id, orderId: dispute.order_id }
                });

                await notificationService.createNotification({
                    userId: dispute.seller_id,
                    type: notifications.both.type,
                    customMessage: notifications.both.message,
                    data: { disputeId: dispute.dispute_id, orderId: dispute.order_id }
                });
            }

        } catch (error) {
            logger.error('Send dispute notifications error:', error);
        }
    }

    /**
     * Helper methods
     */
    calculatePriority(disputeData, order) {
        if (order.total > 1000) {return 'high';}
        if (disputeData.category === 'item_not_received') {return 'high';}
        if (disputeData.category === 'payment_issue') {return 'urgent';}
        return 'medium';
    }

    async getSellerProducts(sellerId) {
        // This would get products for a seller - placeholder
        return [];
    }

    async issueAccountWarning(userId, details) {
        console.log(`Issuing warning to user ${userId}: ${details}`);
    }

    async suspendAccount(userId, details) {
        console.log(`Suspending account ${userId}: ${details}`);
    }

    async impactSellerRating(sellerId, details) {
        console.log(`Impacting seller rating for ${sellerId}: ${details}`);
    }

    async chargeDisputeFee(userId, details) {
        console.log(`Charging dispute fee to ${userId}: ${details}`);
    }

    /**
     * Get disputes for admin dashboard
     */
    async getAdminDisputes(options = {}) {
        try {
            return await Dispute.findAdminDisputes(options);
        } catch (error) {
            logger.error('Get admin disputes error:', error);
            throw error;
        }
    }

    /**
     * Get user's disputes
     */
    async getUserDisputes(userId, options = {}) {
        try {
            return await Dispute.findUserDisputes(userId, options);
        } catch (error) {
            logger.error('Get user disputes error:', error);
            throw error;
        }
    }

    /**
     * Get dispute statistics
     */
    async getDisputeStatistics(timeframe = 30) {
        try {
            return await Dispute.getDisputeStats(timeframe);
        } catch (error) {
            logger.error('Get dispute statistics error:', error);
            throw error;
        }
    }
}

module.exports = new DisputeService(); 