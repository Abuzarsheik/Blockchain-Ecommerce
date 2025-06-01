const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    constructor() {
        this.stripe = stripe;
    }

    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            logger.error('Payment intent creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return {
                success: paymentIntent.status === 'succeeded',
                status: paymentIntent.status,
                paymentIntent
            };
        } catch (error) {
            logger.error('Payment confirmation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createCustomer(email, name, metadata = {}) {
        try {
            const customer = await this.stripe.customers.create({
                email,
                name,
                metadata
            });

            return {
                success: true,
                customer
            };
        } catch (error) {
            logger.error('Customer creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async handleWebhook(body, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            return {
                success: true,
                event
            };
        } catch (error) {
            logger.error('Webhook error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new PaymentService(); 