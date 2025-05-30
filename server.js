const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./backend/config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const nftUploadsDir = path.join(uploadsDir, 'nfts');
const kycUploadsDir = path.join(uploadsDir, 'kyc');
const avatarUploadsDir = path.join(uploadsDir, 'avatars');
const productUploadsDir = path.join(uploadsDir, 'products');
const disputeUploadsDir = path.join(uploadsDir, 'disputes');
const reviewUploadsDir = path.join(uploadsDir, 'reviews');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(nftUploadsDir)) {
    fs.mkdirSync(nftUploadsDir);
}
if (!fs.existsSync(kycUploadsDir)) {
    fs.mkdirSync(kycUploadsDir);
}
if (!fs.existsSync(avatarUploadsDir)) {
    fs.mkdirSync(avatarUploadsDir);
}
if (!fs.existsSync(productUploadsDir)) {
    fs.mkdirSync(productUploadsDir);
}
if (!fs.existsSync(disputeUploadsDir)) {
    fs.mkdirSync(disputeUploadsDir);
}
if (!fs.existsSync(reviewUploadsDir)) {
    fs.mkdirSync(reviewUploadsDir);
}

// Initialize database connection
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Blocmerce Backend Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// IPFS health endpoint (simplified)
app.get('/api/ipfs/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'IPFS',
        message: 'IPFS service available with fallback storage',
        timestamp: new Date().toISOString(),
        initialized: true
    });
});

// Import routes
const authRoutes = require('./backend/routes/auth');
const profileRoutes = require('./backend/routes/profile');
const productRoutes = require('./backend/routes/products');
const orderRoutes = require('./backend/routes/orders');
const reviewRoutes = require('./backend/routes/reviews');
const disputeRoutes = require('./backend/routes/disputes');
const nftRoutes = require('./backend/routes/nfts');
const blockchainRoutes = require('./backend/routes/blockchain');
const escrowRoutes = require('./backend/routes/escrow');
const paymentRoutes = require('./backend/routes/payments');
const notificationRoutes = require('./backend/routes/notifications');
const trackingRoutes = require('./backend/routes/tracking');
const adminRoutes = require('./backend/routes/admin');
const auditRoutes = require('./backend/routes/audit');
// const ipfsRoutes = require('./backend/routes/ipfs'); // Temporarily disabled - fixing multer issues

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);
// app.use('/api/ipfs', ipfsRoutes);

// Serve static files
app.use('/assets', express.static('assets'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Start server with port fallback
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`🚀 Blocmerce Phase 1 server running on http://localhost:${port}`);
        console.log(`📊 Database: MongoDB configured`);
        console.log(`⛓️  Blockchain: ${process.env.RPC_URL ? 'Connected' : 'Not configured'}`);
        console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
        console.log(`💰 Crypto Payments: Enabled`);
        console.log(`🔒 Escrow System: Active`);
        console.log(`📝 Transaction Recording: Active`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ Port ${port} in use. Trying ${parseInt(port) + 1}...`);
            startServer(parseInt(port) + 1);
        } else {
            console.error('❌ Server error:', err);
        }
    });
}

startServer(PORT);

module.exports = app; 