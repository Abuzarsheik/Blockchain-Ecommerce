const Order = require('../models/Order');
const axios = require('axios');
const notificationService = require('./notificationService');

class ShippingService {
    constructor() {
        this.carriers = {
            fedex: {
                name: 'FedEx',
                apiUrl: process.env.FEDEX_API_URL || 'https://apis.fedex.com',
                apiKey: process.env.FEDEX_API_KEY,
                apiSecret: process.env.FEDEX_API_SECRET,
                accountNumber: process.env.FEDEX_ACCOUNT_NUMBER
            },
            ups: {
                name: 'UPS',
                apiUrl: process.env.UPS_API_URL || 'https://onlinetools.ups.com',
                apiKey: process.env.UPS_API_KEY,
                userId: process.env.UPS_USER_ID,
                password: process.env.UPS_PASSWORD
            },
            dhl: {
                name: 'DHL',
                apiUrl: process.env.DHL_API_URL || 'https://api.dhl.com',
                apiKey: process.env.DHL_API_KEY
            },
            usps: {
                name: 'USPS',
                apiUrl: process.env.USPS_API_URL || 'https://secure.shippingapis.com',
                userId: process.env.USPS_USER_ID
            }
        };

        // Rate limiting for API calls
        this.rateLimits = new Map();
        this.lastAPICall = new Map();
    }

    /**
     * Get real-time tracking information for an order
     */
    async getTrackingInfo(orderId) {
        try {
            const order = await Order.findById(orderId)
                .populate('user_id', 'firstName lastName email phone')
                .populate('seller_id', 'firstName lastName businessName email');

            if (!order) {
                throw new Error('Order not found');
            }

            const trackingNumber = order.shipping_info?.tracking_number || order.tracking_number;
            if (!trackingNumber) {
                throw new Error('No tracking number found for this order');
            }

            const carrier = order.shipping_info?.carrier;
            if (!carrier) {
                throw new Error('No carrier information found');
            }

            // Get tracking info from carrier
            const trackingData = await this.fetchTrackingFromCarrier(carrier, trackingNumber);
            
            // Update order with new tracking events
            if (trackingData.events && trackingData.events.length > 0) {
                await this.updateOrderWithTrackingEvents(order, trackingData.events);
            }

            return {
                success: true,
                order: {
                    orderNumber: order.orderNumber,
                    status: order.status,
                    tracking_number: trackingNumber,
                    carrier: carrier,
                    tracking_url: order.getTrackingURL()
                },
                shipping_info: order.shipping_info,
                tracking_events: order.tracking_events,
                latest_event: order.getLatestTrackingEvent(),
                tracking_data: trackingData
            };

        } catch (error) {
            logger.error('Get tracking info error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch tracking information from carrier API
     */
    async fetchTrackingFromCarrier(carrier, trackingNumber) {
        try {
            switch (carrier.toLowerCase()) {
                case 'fedex':
                    return await this.getFedExTracking(trackingNumber);
                case 'ups':
                    return await this.getUPSTracking(trackingNumber);
                case 'dhl':
                    return await this.getDHLTracking(trackingNumber);
                case 'usps':
                    return await this.getUSPSTracking(trackingNumber);
                default:
                    // For unsupported carriers, return basic info
                    return {
                        carrier: carrier,
                        tracking_number: trackingNumber,
                        status: 'tracking_not_available',
                        events: []
                    };
            }
        } catch (error) {
            logger.error('Error fetching tracking from ${carrier}:', error);
            return {
                carrier: carrier,
                tracking_number: trackingNumber,
                status: 'tracking_error',
                error: error.message,
                events: []
            };
        }
    }

    /**
     * FedEx API integration
     */
    async getFedExTracking(trackingNumber) {
        const config = this.carriers.fedex;
        if (!config.apiKey) {
            throw new Error('FedEx API credentials not configured');
        }

        // Check rate limiting
        if (!this.canMakeAPICall('fedex')) {
            throw new Error('Rate limit exceeded for FedEx API');
        }

        try {
            // Get OAuth token first
            const tokenResponse = await axios.post(`${config.apiUrl}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: config.apiKey,
                client_secret: config.apiSecret
            });

            const accessToken = tokenResponse.data.access_token;

            // Make tracking request
            const trackingResponse = await axios.post(`${config.apiUrl}/track/v1/trackingnumbers`, {
                includeDetailedScans: true,
                trackingInfo: [{
                    trackingNumberInfo: {
                        trackingNumber: trackingNumber
                    }
                }]
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit('fedex');

            const trackingData = trackingResponse.data.output.completeTrackResults[0];
            return this.parseFedExTracking(trackingData);

        } catch (error) {
            if (error.response?.status === 429) {
                this.updateRateLimit('fedex', true);
            }
            throw error;
        }
    }

    /**
     * UPS API integration
     */
    async getUPSTracking(trackingNumber) {
        const config = this.carriers.ups;
        if (!config.apiKey) {
            throw new Error('UPS API credentials not configured');
        }

        if (!this.canMakeAPICall('ups')) {
            throw new Error('Rate limit exceeded for UPS API');
        }

        try {
            const response = await axios.get(`${config.apiUrl}/api/track/v1/details/${trackingNumber}`, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit('ups');
            return this.parseUPSTracking(response.data);

        } catch (error) {
            if (error.response?.status === 429) {
                this.updateRateLimit('ups', true);
            }
            throw error;
        }
    }

    /**
     * DHL API integration
     */
    async getDHLTracking(trackingNumber) {
        const config = this.carriers.dhl;
        if (!config.apiKey) {
            throw new Error('DHL API credentials not configured');
        }

        if (!this.canMakeAPICall('dhl')) {
            throw new Error('Rate limit exceeded for DHL API');
        }

        try {
            const response = await axios.get(`${config.apiUrl}/track/shipments`, {
                params: {
                    trackingNumber: trackingNumber
                },
                headers: {
                    'DHL-API-Key': config.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit('dhl');
            return this.parseDHLTracking(response.data);

        } catch (error) {
            if (error.response?.status === 429) {
                this.updateRateLimit('dhl', true);
            }
            throw error;
        }
    }

    /**
     * USPS API integration
     */
    async getUSPSTracking(trackingNumber) {
        const config = this.carriers.usps;
        if (!config.userId) {
            throw new Error('USPS API credentials not configured');
        }

        if (!this.canMakeAPICall('usps')) {
            throw new Error('Rate limit exceeded for USPS API');
        }

        try {
            const xml = `
                <TrackFieldRequest USERID="${config.userId}">
                    <TrackID ID="${trackingNumber}"></TrackID>
                </TrackFieldRequest>
            `;

            const response = await axios.get(`${config.apiUrl}/ShippingAPI.dll`, {
                params: {
                    API: 'TrackV2',
                    XML: xml
                }
            });

            this.updateRateLimit('usps');
            return this.parseUSPSTracking(response.data);

        } catch (error) {
            if (error.response?.status === 429) {
                this.updateRateLimit('usps', true);
            }
            throw error;
        }
    }

    /**
     * Parse FedEx tracking response
     */
    parseFedExTracking(data) {
        const trackingInfo = data.trackResults[0];
        const events = [];

        if (trackingInfo.scanEvents) {
            for (const scan of trackingInfo.scanEvents) {
                events.push({
                    timestamp: new Date(scan.date + 'T' + scan.time),
                    status: scan.eventDescription,
                    description: scan.eventDescription,
                    location: {
                        city: scan.scanLocation?.city,
                        state: scan.scanLocation?.stateOrProvinceCode,
                        country: scan.scanLocation?.countryCode
                    },
                    carrier_status: scan.eventType,
                    event_type: this.mapFedExEventType(scan.eventType)
                });
            }
        }

        return {
            carrier: 'fedex',
            tracking_number: trackingInfo.trackingNumber,
            status: trackingInfo.latestStatusDetail?.description,
            estimated_delivery: trackingInfo.estimatedDeliveryTimeWindow?.window?.begin,
            events: events.reverse() // Most recent first
        };
    }

    /**
     * Parse UPS tracking response
     */
    parseUPSTracking(data) {
        const shipment = data.trackResponse?.shipment?.[0];
        const events = [];

        if (shipment?.package?.[0]?.activity) {
            for (const activity of shipment.package[0].activity) {
                events.push({
                    timestamp: new Date(activity.date + 'T' + activity.time),
                    status: activity.status?.description,
                    description: activity.status?.description,
                    location: {
                        city: activity.location?.address?.city,
                        state: activity.location?.address?.stateProvinceCode,
                        country: activity.location?.address?.countryCode
                    },
                    carrier_status: activity.status?.code,
                    event_type: this.mapUPSEventType(activity.status?.code)
                });
            }
        }

        return {
            carrier: 'ups',
            tracking_number: shipment?.package?.[0]?.trackingNumber,
            status: shipment?.package?.[0]?.currentStatus?.description,
            estimated_delivery: shipment?.package?.[0]?.deliveryDate?.[0]?.date,
            events: events
        };
    }

    /**
     * Parse DHL tracking response
     */
    parseDHLTracking(data) {
        const shipment = data.shipments?.[0];
        const events = [];

        if (shipment?.events) {
            for (const event of shipment.events) {
                events.push({
                    timestamp: new Date(event.timestamp),
                    status: event.description,
                    description: event.description,
                    location: {
                        city: event.location?.address?.addressLocality,
                        country: event.location?.address?.countryCode
                    },
                    carrier_status: event.statusCode,
                    event_type: this.mapDHLEventType(event.statusCode)
                });
            }
        }

        return {
            carrier: 'dhl',
            tracking_number: shipment?.id,
            status: shipment?.status?.description,
            estimated_delivery: shipment?.estimatedTimeOfDelivery,
            events: events.reverse()
        };
    }

    /**
     * Parse USPS tracking response
     */
    parseUSPSTracking(xmlData) {
        // This would require XML parsing for USPS
        // For now, return a basic structure
        return {
            carrier: 'usps',
            tracking_number: '',
            status: 'tracking_not_available',
            events: []
        };
    }

    /**
     * Map carrier-specific event types to our standard types
     */
    mapFedExEventType(fedexType) {
        const mapping = {
            'PU': 'pickup',
            'IT': 'in_transit',
            'OD': 'out_for_delivery',
            'DL': 'delivered',
            'DE': 'exception'
        };
        return mapping[fedexType] || 'in_transit';
    }

    mapUPSEventType(upsCode) {
        const mapping = {
            'M': 'pickup',
            'I': 'in_transit',
            'O': 'out_for_delivery',
            'D': 'delivered',
            'X': 'exception'
        };
        return mapping[upsCode] || 'in_transit';
    }

    mapDHLEventType(dhlCode) {
        const mapping = {
            'PU': 'pickup',
            'IT': 'in_transit',
            'DF': 'out_for_delivery',
            'OK': 'delivered',
            'EX': 'exception'
        };
        return mapping[dhlCode] || 'in_transit';
    }

    /**
     * Update order with new tracking events
     */
    async updateOrderWithTrackingEvents(order, events) {
        const existingEventTimestamps = new Set(
            order.tracking_events.map(e => e.timestamp.getTime())
        );

        let hasNewEvents = false;

        for (const event of events) {
            const eventTime = new Date(event.timestamp).getTime();
            
            if (!existingEventTimestamps.has(eventTime)) {
                await order.addTrackingEvent(event);
                hasNewEvents = true;

                // Send notification for important events
                if (['delivered', 'out_for_delivery', 'exception'].includes(event.event_type)) {
                    await this.sendTrackingNotification(order, event);
                }
            }
        }

        return hasNewEvents;
    }

    /**
     * Send tracking notification to customer
     */
    async sendTrackingNotification(order, event) {
        try {
            const notificationType = {
                'delivered': 'package_delivered',
                'out_for_delivery': 'package_out_for_delivery',
                'exception': 'package_delivery_exception'
            }[event.event_type];

            if (notificationType && order.user_id) {
                await notificationService.sendOrderNotification(order.user_id._id, notificationType, {
                    orderNumber: order.orderNumber,
                    trackingNumber: order.shipping_info?.tracking_number || order.tracking_number,
                    carrier: order.shipping_info?.carrier,
                    status: event.status,
                    description: event.description,
                    location: event.location,
                    estimatedDelivery: order.shipping_info?.estimated_delivery
                });
            }
        } catch (error) {
            logger.error('Error sending tracking notification:', error);
        }
    }

    /**
     * Rate limiting helpers
     */
    canMakeAPICall(carrier) {
        const now = Date.now();
        const limit = this.rateLimits.get(carrier);
        
        if (!limit) {return true;}
        
        // Check if enough time has passed since rate limit
        return now > limit.resetTime;
    }

    updateRateLimit(carrier, isRateLimited = false) {
        const now = Date.now();
        
        if (isRateLimited) {
            // Set rate limit for 1 hour
            this.rateLimits.set(carrier, {
                resetTime: now + (60 * 60 * 1000),
                callCount: 0
            });
        }
        
        this.lastAPICall.set(carrier, now);
    }

    /**
     * Bulk update tracking for multiple orders
     */
    async updateAllOrderTracking() {
        try {
            const orders = await Order.getOrdersNeedingTrackingUpdate();
            const results = {
                total: orders.length,
                updated: 0,
                errors: 0
            };

            for (const order of orders) {
                try {
                    const trackingResult = await this.getTrackingInfo(order._id);
                    if (trackingResult.success) {
                        results.updated++;
                    } else {
                        results.errors++;
                    }
                } catch (error) {
                    logger.error('Error updating tracking for order ${order.orderNumber}:', error);
                    results.errors++;
                }

                // Add delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return results;

        } catch (error) {
            logger.error('Error in bulk tracking update:', error);
            throw error;
        }
    }

    /**
     * Create shipping label (for sellers)
     */
    async createShippingLabel(orderId, shippingOptions) {
        try {
            const order = await Order.findById(orderId)
                .populate('user_id')
                .populate('seller_id');

            if (!order) {
                throw new Error('Order not found');
            }

            // This would integrate with shipping APIs to create labels
            // For now, return a mock response
            const labelData = {
                tracking_number: this.generateTrackingNumber(shippingOptions.carrier),
                label_url: `https://example.com/labels/${orderId}.pdf`,
                carrier: shippingOptions.carrier,
                service_type: shippingOptions.service_type,
                cost: shippingOptions.cost || 0
            };

            // Update order with shipping info
            await order.updateShippingInfo({
                carrier: shippingOptions.carrier,
                service_type: shippingOptions.service_type,
                tracking_number: labelData.tracking_number,
                shipped_date: new Date(),
                estimated_delivery: this.calculateEstimatedDelivery(shippingOptions)
            });

            return {
                success: true,
                label: labelData,
                order: order
            };

        } catch (error) {
            logger.error('Create shipping label error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate mock tracking number
     */
    generateTrackingNumber(carrier) {
        const prefix = {
            'fedex': '1Z',
            'ups': '1Z',
            'dhl': 'DHL',
            'usps': '9400'
        }[carrier] || 'TRK';

        const randomNum = Math.random().toString(36).substring(2, 15).toUpperCase();
        return `${prefix}${randomNum}`;
    }

    /**
     * Calculate estimated delivery date
     */
    calculateEstimatedDelivery(shippingOptions) {
        const businessDays = {
            'standard': 5,
            'expedited': 3,
            'overnight': 1,
            'two_day': 2
        }[shippingOptions.service_type?.toLowerCase()] || 5;

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + businessDays);
        
        return deliveryDate;
    }

    /**
     * Get shipping rates from carriers
     */
    async getShippingRates(fromAddress, toAddress, packageInfo) {
        const rates = [];

        // Mock shipping rates - in production, this would call carrier APIs
        const mockRates = [
            {
                carrier: 'fedex',
                service_type: 'FedEx Ground',
                cost: 12.50,
                estimated_days: 5,
                currency: 'USD'
            },
            {
                carrier: 'fedex',
                service_type: 'FedEx 2Day',
                cost: 25.00,
                estimated_days: 2,
                currency: 'USD'
            },
            {
                carrier: 'ups',
                service_type: 'UPS Ground',
                cost: 11.75,
                estimated_days: 5,
                currency: 'USD'
            },
            {
                carrier: 'usps',
                service_type: 'Priority Mail',
                cost: 8.50,
                estimated_days: 3,
                currency: 'USD'
            }
        ];

        return {
            success: true,
            rates: mockRates
        };
    }
}

module.exports = new ShippingService(); 