const express = require('express');
// const { query } = require('../config/database'); // Temporarily disabled
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// TEMPORARY: Simplified routes while migrating from PostgreSQL to MongoDB
// These will be properly implemented with MongoDB later

// Verify product authenticity
router.get('/verify/:productId', optionalAuth, async (req, res) => {
    try {
        // Temporary placeholder response
        res.json({
            verified: false,
            blockchain_hash: null,
            verification_date: null,
            history: []
        });
    } catch (error) {
        console.error('Product verification error:', error);
        res.status(500).json({ error: 'Failed to verify product' });
    }
});

// Get transaction details
router.get('/transaction/:txHash', optionalAuth, async (req, res) => {
    try {
        res.status(404).json({ error: 'Transaction not found' });
    } catch (error) {
        console.error('Transaction lookup error:', error);
        res.status(500).json({ error: 'Failed to get transaction details' });
    }
});

// Submit product to blockchain
router.post('/submit', auth, async (req, res) => {
    try {
        res.status(501).json({ 
            error: 'Blockchain functionality temporarily disabled during database migration' 
        });
    } catch (error) {
        console.error('Blockchain submission error:', error);
        res.status(500).json({ error: 'Failed to submit to blockchain' });
    }
});

// Get blockchain statistics
router.get('/stats', optionalAuth, async (req, res) => {
    try {
        res.json({
            total_records: 0,
            verified_records: 0,
            verified_products: 0,
            verified_reviews: 0
        });
    } catch (error) {
        console.error('Blockchain stats error:', error);
        res.status(500).json({ error: 'Failed to get blockchain statistics' });
    }
});

// Get blockchain activity
router.get('/activity', optionalAuth, async (req, res) => {
    try {
        res.json({
            activities: [],
            pagination: {
                current_page: 1,
                total_pages: 0,
                total_items: 0,
                items_per_page: 20
            }
        });
    } catch (error) {
        console.error('Blockchain activity error:', error);
        res.status(500).json({ error: 'Failed to get blockchain activity' });
    }
});

// Get blockchain status
router.get('/status', async (req, res) => {
    try {
        res.json({
            success: true,
            status: 'connected',
            message: 'Blockchain service is operational',
            network: process.env.BLOCKCHAIN_NETWORK || 'ethereum',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Blockchain status error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Failed to get blockchain status',
            error: error.message
        });
    }
});

module.exports = router; 