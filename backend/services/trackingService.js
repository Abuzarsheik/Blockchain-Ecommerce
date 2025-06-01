            const db = require('../config/database');
            const emailService = require('./emailService');
const axios = require('axios');
const crypto = require('crypto');

class TrackingService {
    constructor() {
        this.providers = {
            dhl: {
                baseUrl: 'https://api-eu.dhl.com/track/shipments',
                apiKey: process.env.DHL_API_KEY
            },
            fedex: {
                baseUrl: 'https://apis.fedex.com/track/v1/trackingnumbers',
                apiKey: process.env.FEDEX_API_KEY
            },
            ups: {
                baseUrl: 'https://onlinetools.ups.com/track/v1/details',
                apiKey: process.env.UPS_API_KEY
            },
            local: {
                baseUrl: process.env.LOCAL_COURIER_API || 'http://localhost:8080/api/tracking'
            }
        };
        
        this.trackingStatuses = {
            CREATED: 'Order Created',
            PROCESSING: 'Processing Order',
            PICKED_UP: 'Picked Up',
            IN_TRANSIT: 'In Transit',
            OUT_FOR_DELIVERY: 'Out for Delivery',
            DELIVERED: 'Delivered',
            FAILED_DELIVERY: 'Failed Delivery Attempt',
            RETURNED: 'Returned to Sender',
            CANCELLED: 'Cancelled'
        };
    }

    /**
     * Generate unique tracking number
     */
    generateTrackingNumber(prefix = 'BLOC') {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `${prefix}${timestamp.slice(-8)}${random}`;
    }

    /**
     * Create new shipment tracking
     */
    async createShipment(orderData) {
        try {
            const trackingNumber = this.generateTrackingNumber();
            
            const shipment = {
                trackingNumber,
                orderId: orderData.orderId,
                nftId: orderData.nftId,
                seller: orderData.seller,
                buyer: orderData.buyer,
                status: this.trackingStatuses.CREATED,
                provider: orderData.provider || 'local',
                service: orderData.service || 'standard',
                estimatedDelivery: this.calculateEstimatedDelivery(orderData.service),
                origin: orderData.origin,
                destination: orderData.destination,
                weight: orderData.weight || 0,
                dimensions: orderData.dimensions || {},
                value: orderData.value || 0,
                history: [{
                    status: this.trackingStatuses.CREATED,
                    timestamp: new Date(),
                    location: orderData.origin?.city || 'Origin',
                    description: 'Shipment created and ready for pickup'
                }],
                metadata: {
                    created: new Date(),
                    lastUpdated: new Date(),
                    autoUpdate: true
                }
            };

            // Store in database (assuming MongoDB)
            await db.collection('shipments').insertOne(shipment);

            // Integrate with external provider if not local
            if (orderData.provider && orderData.provider !== 'local') {
                await this.createExternalShipment(shipment, orderData.provider);
            }

            return {
                success: true,
                trackingNumber,
                shipment,
                estimatedDelivery: shipment.estimatedDelivery
            };

        } catch (error) {
            logger.error('Shipment creation error:', error);
            throw new Error(`Failed to create shipment: ${error.message}`);
        }
    }

    /**
     * Track shipment by tracking number
     */
    async trackShipment(trackingNumber) {
        try {
            let shipment = await db.collection('shipments').findOne({ trackingNumber });

            if (!shipment) {
                throw new Error('Tracking number not found');
            }

            // Update from external provider if applicable
            if (shipment.provider !== 'local' && shipment.metadata.autoUpdate) {
                const externalUpdate = await this.getExternalTracking(
                    trackingNumber, 
                    shipment.provider
                );
                
                if (externalUpdate.success) {
                    shipment = await this.updateShipmentStatus(
                        trackingNumber, 
                        externalUpdate.data
                    );
                }
            }

            return {
                success: true,
                trackingNumber,
                currentStatus: shipment.status,
                estimatedDelivery: shipment.estimatedDelivery,
                history: shipment.history,
                details: {
                    origin: shipment.origin,
                    destination: shipment.destination,
                    provider: shipment.provider,
                    service: shipment.service
                }
            };

        } catch (error) {
            logger.error('Tracking error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update shipment status
     */
    async updateShipmentStatus(trackingNumber, updateData) {
        try {
            const shipment = await db.collection('shipments').findOne({ trackingNumber });

            if (!shipment) {
                throw new Error('Shipment not found');
            }

            const update = {
                status: updateData.status || shipment.status,
                'metadata.lastUpdated': new Date()
            };

            // Add to history if status changed
            if (updateData.status && updateData.status !== shipment.status) {
                const historyEntry = {
                    status: updateData.status,
                    timestamp: new Date(),
                    location: updateData.location || 'Unknown',
                    description: updateData.description || `Status updated to ${updateData.status}`
                };

                update.$push = { history: historyEntry };
            }

            // Update estimated delivery if provided
            if (updateData.estimatedDelivery) {
                update.estimatedDelivery = new Date(updateData.estimatedDelivery);
            }

            await db.collection('shipments').updateOne(
                { trackingNumber },
                { $set: update, $push: update.$push }
            );

            // Send notification to buyer
            await this.sendTrackingNotification(trackingNumber, updateData);

            return await db.collection('shipments').findOne({ trackingNumber });

        } catch (error) {
            logger.error('Status update error:', error);
            throw new Error(`Failed to update shipment status: ${error.message}`);
        }
    }

    /**
     * Get external tracking data
     */
    async getExternalTracking(trackingNumber, provider) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig || !providerConfig.apiKey) {
                return { success: false, error: 'Provider not configured' };
            }

            const response = await axios.get(`${providerConfig.baseUrl}/${trackingNumber}`, {
                headers: {
                    'Authorization': `Bearer ${providerConfig.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            return {
                success: true,
                data: this.normalizeProviderData(response.data, provider)
            };

        } catch (error) {
            logger.error('${provider} tracking error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Normalize data from different providers
     */
    normalizeProviderData(data, provider) {
        const normalized = {
            status: this.trackingStatuses.IN_TRANSIT,
            location: 'Unknown',
            description: 'Package in transit'
        };

        switch (provider) {
            case 'dhl':
                if (data.shipments && data.shipments[0]) {
                    const shipment = data.shipments[0];
                    normalized.status = this.mapDHLStatus(shipment.status);
                    normalized.location = shipment.events?.[0]?.location?.address?.addressLocality || 'Unknown';
                    normalized.description = shipment.events?.[0]?.description || normalized.description;
                }
                break;

            case 'fedex':
                if (data.output?.completeTrackResults?.[0]) {
                    const track = data.output.completeTrackResults[0];
                    normalized.status = this.mapFedExStatus(track.latestStatusDetail?.code);
                    normalized.location = track.latestStatusDetail?.scanLocation?.city || 'Unknown';
                    normalized.description = track.latestStatusDetail?.description || normalized.description;
                }
                break;

            case 'ups':
                if (data.trackResponse?.shipment?.[0]) {
                    const shipment = data.trackResponse.shipment[0];
                    normalized.status = this.mapUPSStatus(shipment.deliveryInformation?.location);
                    normalized.location = shipment.deliveryInformation?.location || 'Unknown';
                    normalized.description = shipment.deliveryInformation?.description || normalized.description;
                }
                break;

            default:
                // Local provider format
                normalized.status = data.status || normalized.status;
                normalized.location = data.location || normalized.location;
                normalized.description = data.description || normalized.description;
        }

        return normalized;
    }

    /**
     * Map provider-specific statuses to our standard statuses
     */
    mapDHLStatus(status) {
        const statusMap = {
            'pre-transit': this.trackingStatuses.PROCESSING,
            'transit': this.trackingStatuses.IN_TRANSIT,
            'delivered': this.trackingStatuses.DELIVERED,
            'returned': this.trackingStatuses.RETURNED
        };
        return statusMap[status?.toLowerCase()] || this.trackingStatuses.IN_TRANSIT;
    }

    mapFedExStatus(code) {
        const statusMap = {
            'OC': this.trackingStatuses.PROCESSING,
            'PU': this.trackingStatuses.PICKED_UP,
            'IT': this.trackingStatuses.IN_TRANSIT,
            'OD': this.trackingStatuses.OUT_FOR_DELIVERY,
            'DL': this.trackingStatuses.DELIVERED
        };
        return statusMap[code] || this.trackingStatuses.IN_TRANSIT;
    }

    mapUPSStatus(status) {
        const statusMap = {
            'Order Processed': this.trackingStatuses.PROCESSING,
            'Pickup': this.trackingStatuses.PICKED_UP,
            'In Transit': this.trackingStatuses.IN_TRANSIT,
            'Out For Delivery': this.trackingStatuses.OUT_FOR_DELIVERY,
            'Delivered': this.trackingStatuses.DELIVERED
        };
        return statusMap[status] || this.trackingStatuses.IN_TRANSIT;
    }

    /**
     * Calculate estimated delivery date
     */
    calculateEstimatedDelivery(service = 'standard') {
        const now = new Date();
        const deliveryDays = {
            'express': 1,
            'priority': 2,
            'standard': 5,
            'economy': 7
        };

        const days = deliveryDays[service] || 5;
        const estimatedDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        
        return estimatedDate;
    }

    /**
     * Create external shipment
     */
    async createExternalShipment(shipment, provider) {
        try {
            const providerConfig = this.providers[provider];
            if (!providerConfig || !providerConfig.apiKey) {
                console.warn(`Provider ${provider} not configured`);
                return;
            }

            const shipmentData = {
                reference: shipment.trackingNumber,
                origin: shipment.origin,
                destination: shipment.destination,
                weight: shipment.weight,
                dimensions: shipment.dimensions,
                service: shipment.service,
                value: shipment.value
            };

            const response = await axios.post(
                `${providerConfig.baseUrl}/create`,
                shipmentData,
                {
                    headers: {
                        'Authorization': `Bearer ${providerConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ External shipment created with ${provider}:`, response.data);

        } catch (error) {
            logger.error('Failed to create external shipment with ${provider}:', error.message);
        }
    }

    /**
     * Send tracking notification
     */
    async sendTrackingNotification(trackingNumber, updateData) {
        try {
            const shipment = await db.collection('shipments').findOne({ trackingNumber });
            
            if (!shipment) {return;}

            // Get user email
            const user = await db.collection('users').findOne({ _id: shipment.buyer });
            if (!user?.email) {return;}

            
            await emailService.sendTrackingUpdate({
                to: user.email,
                trackingNumber,
                status: updateData.status,
                location: updateData.location,
                description: updateData.description,
                estimatedDelivery: shipment.estimatedDelivery
            });

        } catch (error) {
            logger.error('Notification error:', error);
        }
    }

    /**
     * Get all shipments for user
     */
    async getUserShipments(userId, role = 'buyer') {
        try {
            const query = role === 'seller' ? { seller: userId } : { buyer: userId };
            
            const shipments = await db.collection('shipments')
                .find(query)
                .sort({ 'metadata.created': -1 })
                .toArray();

            return {
                success: true,
                shipments: shipments.map(s => ({
                    trackingNumber: s.trackingNumber,
                    orderId: s.orderId,
                    status: s.status,
                    estimatedDelivery: s.estimatedDelivery,
                    provider: s.provider,
                    created: s.metadata.created
                }))
            };

        } catch (error) {
            logger.error('Get user shipments error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get delivery proof (photos, signatures, etc.)
     */
    async getDeliveryProof(trackingNumber) {
        try {
            const shipment = await db.collection('shipments').findOne({ trackingNumber });

            if (!shipment) {
                throw new Error('Shipment not found');
            }

            if (shipment.status !== this.trackingStatuses.DELIVERED) {
                return { success: false, error: 'Package not yet delivered' };
            }

            // Check if we have delivery proof
            const proof = shipment.deliveryProof || {};

            return {
                success: true,
                deliveryProof: {
                    deliveredAt: proof.deliveredAt || 'Unknown',
                    signature: proof.signature || null,
                    photo: proof.photo || null,
                    deliveredTo: proof.deliveredTo || 'Recipient',
                    location: proof.location || 'Delivery address'
                }
            };

        } catch (error) {
            logger.error('Delivery proof error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const trackingService = new TrackingService();

module.exports = trackingService; 