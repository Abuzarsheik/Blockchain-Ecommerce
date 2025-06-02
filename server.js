const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const cors = require('cors');

// Load environment variables first
dotenv.config();

// Service imports
const emailService = require('./backend/services/emailService');
const ipfsService = require('./backend/services/ipfsService');
const escrowService = require('./backend/services/escrowService');
const paymentService = require('./backend/services/paymentService');

// Route imports
const adminRoutes = require('./backend/routes/admin');
const auditRoutes = require('./backend/routes/audit');
const authRoutes = require('./backend/routes/auth');
const blockchainRoutes = require('./backend/routes/blockchain');
const disputeRoutes = require('./backend/routes/disputes');
const escrowRoutes = require('./backend/routes/escrow');
const ipfsRoutes = require('./backend/routes/ipfs');
const monitoringRoutes = require('./backend/routes/monitoring');
const notificationRoutes = require('./backend/routes/notifications');
const orderRoutes = require('./backend/routes/orders');
const paymentRoutes = require('./backend/routes/payments');
const productRoutes = require('./backend/routes/products');
const profileRoutes = require('./backend/routes/profile');
const reviewRoutes = require('./backend/routes/reviews');
const trackingRoutes = require('./backend/routes/tracking');
const userRoutes = require('./backend/routes/users');
const wishlistRoutes = require('./backend/routes/wishlist');

// Config imports
const logger = require('./backend/config/logger');
const { globalErrorHandler } = require('./backend/utils/errorHandler');
const { initDatabase } = require('./backend/config/database');
const { performanceMiddleware } = require('./backend/middleware/monitoring');

// Initialize logger first

const app = express();

// ===========================================
// 🚀 ENHANCED SERVICE INITIALIZATION
// ===========================================

// Initialize all services
const serviceStatus = {
    database: 'initializing',
    email: 'initializing',
    ipfs: 'initializing',
    blockchain: 'initializing',
    stripe: 'initializing',
    escrow: 'initializing',
    payments: 'initializing'
};

// Initialize services async with proper error handling
const initializeServices = async () => {
    console.log('🚀 Initializing Blocmerce services...\n');

    // Initialize Database first
    try {
        await initDatabase();
        serviceStatus.database = 'connected';
        console.log('✅ Database service ready');
    } catch (error) {
        serviceStatus.database = 'failed';
        console.log('❌ Database initialization failed:', error.message);
        throw error; // Re-throw to stop server if DB fails
    }

    // Initialize Email Service
    if (process.env.EMAIL_SERVICE_ENABLED === 'true' && process.env.SMTP_USER) {
        try {
            await emailService.init();
            serviceStatus.email = 'connected';
            console.log('✅ Email service ready');
        } catch (error) {
            serviceStatus.email = 'development_mode';
            console.log('⚠️  Email service: Development mode');
        }
    } else {
        serviceStatus.email = 'development_mode';
        console.log('⚠️  Email service: Development mode');
    }

    // Initialize IPFS Service
    try {
        await ipfsService.init();
        serviceStatus.ipfs = 'connected';
        console.log('✅ IPFS service ready');
    } catch (error) {
        serviceStatus.ipfs = 'fallback_mode';
        console.log('⚠️  IPFS service: Fallback mode (local storage)');
    }

    // Initialize Blockchain Service
    try {
        // For development, just set as development mode
        serviceStatus.blockchain = 'development_mode';
        console.log('⚠️  Blockchain service: Development mode');
    } catch (error) {
        serviceStatus.blockchain = 'development_mode';
        console.log('⚠️  Blockchain service: Development mode');
    }

    // Initialize Stripe
    try {
        // For development, just set as development mode
        serviceStatus.stripe = 'development_mode';
        console.log('⚠️  Payment service: Development mode');
    } catch (error) {
        serviceStatus.stripe = 'development_mode';
        console.log('⚠️  Payment service: Development mode');
    }

    // Initialize Escrow
    try {
        await escrowService.init();
        serviceStatus.escrow = 'active';
        console.log('✅ Escrow service ready');
    } catch (error) {
        serviceStatus.escrow = 'failed';
        console.log('❌ Escrow service failed:', error.message);
    }

    // Initialize Payments
    try {
        await paymentService.init();
        serviceStatus.payments = 'active';
        console.log('✅ Payment processing ready');
    } catch (error) {
        serviceStatus.payments = 'failed';
        console.log('❌ Payment processing failed:', error.message);
    }

    console.log('\n🎯 All services initialized successfully!');
};

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const kycUploadsDir = path.join(uploadsDir, 'kyc');
const avatarUploadsDir = path.join(uploadsDir, 'avatars');
const productUploadsDir = path.join(uploadsDir, 'products');
const disputeUploadsDir = path.join(uploadsDir, 'disputes');
const reviewUploadsDir = path.join(uploadsDir, 'reviews');
const ipfsFallbackDir = path.join(uploadsDir, 'ipfs-fallback');

// Create directories
[uploadsDir, kycUploadsDir, avatarUploadsDir, 
 productUploadsDir, disputeUploadsDir, reviewUploadsDir, ipfsFallbackDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`📁 Created directory: ${dir}`);
    }
});

// ===========================================
// 🛡️ ENHANCED MIDDLEWARE CONFIGURATION
// ===========================================

// Security warning middleware (only warn once)
let securityWarningsShown = false;
app.use((req, res, next) => {
    if (!securityWarningsShown) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
            console.log('⚠️  Using default JWT secret - NOT suitable for production');
        }
        if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-session-secret') {
            console.log('⚠️  Using default session secret - NOT suitable for production');
        }
        securityWarningsShown = true;
    }
    next();
});

// Enhanced CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, 'https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (simplified for development)
app.use((req, res, next) => {
    // Simple request logging without verbose JSON
    next();
});

// Performance monitoring
app.use(performanceMiddleware);

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===========================================
// 📊 API DOCUMENTATION
// ===========================================

// ===========================================
// 📊 ENHANCED HEALTH CHECK ENDPOINTS
// ===========================================

// Comprehensive health check endpoint
app.get('/api/health', (req, res) => {
    const healthStatus = {
        status: 'OK',
        message: 'Blocmerce Backend Server is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        services: {
            database: serviceStatus.database || 'connected',
            email: serviceStatus.email || 'development_mode',
            ipfs: serviceStatus.ipfs || 'fallback_mode',
            blockchain: serviceStatus.blockchain || 'development_mode',
            stripe: serviceStatus.stripe || 'development_mode',
            escrow: serviceStatus.escrow || 'active',
            payments: serviceStatus.payments || 'active'
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };

    res.json(healthStatus);
});

// Simple ping endpoint
app.get('/api/ping', (req, res) => {
    res.json({ 
        message: 'Pong! Server is responsive', 
        timestamp: new Date().toISOString() 
    });
});

// ===========================================
// 🛣️ API ROUTES CONFIGURATION
// ===========================================

// Apply routes with error handling
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/monitoring', monitoringRoutes);

// ===========================================
// 🚨 API ERROR HANDLING (BEFORE STATIC FILES)
// ===========================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            type: 'NOT_FOUND',
            message: `API endpoint '${req.originalUrl}' not found`,
            timestamp: new Date().toISOString()
        }
    });
});

// ===========================================
// 🔗 STATIC FILE SERVING (AFTER API ROUTES)
// ===========================================

// Serve frontend build files (if exists)
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    
    // Handle React routing (serve index.html for all NON-API routes only)
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
            res.sendFile(path.join(frontendBuildPath, 'index.html'));
        } else {
            // This should not happen since API 404 is handled above
            res.status(404).json({
                success: false,
                error: {
                    type: 'NOT_FOUND',
                    message: `API endpoint '${req.originalUrl}' not found`,
                    timestamp: new Date().toISOString()
                }
            });
        }
    });
    
    logger.info('✅ Frontend build ready');
} else {
    logger.warn('⚠️ Frontend build not found');
}

// ===========================================
// 🚨 FINAL ERROR HANDLING
// ===========================================

// Global error handler (MUST be last middleware)
app.use(globalErrorHandler);

// ===========================================
// 🚀 SERVER STARTUP WITH PORT MANAGEMENT
// ===========================================

// Start the server
initializeServices().then(() => {
    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
        console.log('\n' + '='.repeat(50));
        console.log('🚀 BLOCMERCE SERVER READY');
        console.log('='.repeat(50));
        console.log(`📍 Server: http://localhost:${PORT}`);
        console.log(`📊 Database: ${serviceStatus.database === 'connected' ? 'Connected' : 'Development'}`);
        console.log(`⛓️  Blockchain: ${serviceStatus.blockchain === 'connected' ? 'Connected' : 'Development Mode'}`);
        console.log(`💳 Payments: ${serviceStatus.stripe === 'connected' ? 'Connected' : 'Development Mode'}`);
        console.log(`🗂️  Storage: ${serviceStatus.ipfs === 'connected' ? 'IPFS' : 'Local Storage'}`);
        console.log('='.repeat(50));
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ Port ${PORT} in use. Trying ${PORT + 1}...`);
            const fallbackServer = app.listen(PORT + 1, () => {
                console.log('\n' + '='.repeat(50));
                console.log('🚀 BLOCMERCE SERVER READY');
                console.log('='.repeat(50));
                console.log(`📍 Server: http://localhost:${PORT + 1}`);
                console.log(`📊 Database: ${serviceStatus.database === 'connected' ? 'Connected' : 'Development'}`);
                console.log(`⛓️  Blockchain: ${serviceStatus.blockchain === 'connected' ? 'Connected' : 'Development Mode'}`);
                console.log(`💳 Payments: ${serviceStatus.stripe === 'connected' ? 'Connected' : 'Development Mode'}`);
                console.log(`🗂️  Storage: ${serviceStatus.ipfs === 'connected' ? 'IPFS' : 'Local Storage'}`);
                console.log('='.repeat(50));
            });
            setupGracefulShutdown(fallbackServer);
        } else {
            console.log('❌ Failed to start server:', err.message);
            process.exit(1);
        }
    });
    
    setupGracefulShutdown(server);
}).catch(error => {
    console.log('❌ Failed to initialize services:', error.message);
    process.exit(1);
});

// Graceful shutdown setup
function setupGracefulShutdown(server) {
    const gracefulShutdown = (signal) => {
        console.log(`\n🔄 ${signal} received. Shutting down gracefully...`);
        
        server.close(() => {
            console.log('✅ Server closed successfully');
            process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            console.log('❌ Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
        console.log('❌ Unhandled Rejection:', reason);
        process.exit(1);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.log('❌ Uncaught Exception:', error.message);
        process.exit(1);
    });
}

module.exports = app;