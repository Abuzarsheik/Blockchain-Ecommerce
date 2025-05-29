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

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(nftUploadsDir)) {
    fs.mkdirSync(nftUploadsDir);
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

// Routes
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/products', require('./backend/routes/products'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/reviews', require('./backend/routes/reviews'));
app.use('/api/blockchain', require('./backend/routes/blockchain'));
app.use('/api/nfts', require('./backend/routes/nfts')); // Add NFT routes

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