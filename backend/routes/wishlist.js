const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/wishlist/test
 * @desc    Test endpoint to verify authentication
 * @access  Private
 */
router.get('/test', auth, async (req, res) => {
    try {
        console.log('Auth test - User:', req.user);
        res.json({
            success: true,
            message: 'Authentication working',
            user: req.user
        });
    } catch (error) {
        console.error('Auth test error:', error);
        res.status(500).json({
            success: false,
            error: 'Auth test failed'
        });
    }
});

/**
 * @route   GET /api/wishlist
 * @desc    Get user's wishlist
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        console.log('Wishlist request - User ID:', req.user.id);
        
        const user = await User.findById(req.user.id);

        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log('User found, wishlist length:', user.wishlist?.length || 0);

        // Initialize wishlist if it doesn't exist
        if (!user.wishlist) {
            user.wishlist = [];
            await user.save();
        }

        // If wishlist is empty, return empty array
        if (user.wishlist.length === 0) {
            console.log('Empty wishlist, returning empty array');
            return res.json({
                success: true,
                wishlist: [],
                count: 0
            });
        }

        // Populate wishlist with product details
        const populatedUser = await User.findById(req.user.id)
            .populate({
                path: 'wishlist',
                populate: {
                    path: 'seller',
                    select: 'username firstName lastName sellerProfile'
                }
            });

        if (!populatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found during population'
            });
        }

        // Transform wishlist items to include dateAdded
        const wishlistWithDates = populatedUser.wishlist
            .filter(product => product != null) // Filter out any null products
            .map(product => {
                // Find when this product was added to wishlist
                const wishlistItem = user.wishlistItems?.find(item => 
                    item.productId.toString() === product._id.toString()
                );
                
                return {
                    ...product.toObject(),
                    dateAdded: wishlistItem?.dateAdded || product.createdAt
                };
            });

        console.log('Sending wishlist response, count:', wishlistWithDates.length);

        res.json({
            success: true,
            wishlist: wishlistWithDates,
            count: wishlistWithDates.length
        });
    } catch (error) {
        console.error('Wishlist route error:', error);
        logger.error('Error fetching wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching wishlist',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/wishlist/add
 * @desc    Add product to wishlist
 * @access  Private
 */
router.post('/add', auth, async (req, res) => {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Product ID is required'
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Check if product is active
        if (product.status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Cannot add inactive product to wishlist'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if product is already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({
                success: false,
                error: 'Product already in wishlist'
            });
        }

        // Add to wishlist
        user.wishlist.push(productId);

        // Also add to wishlistItems with timestamp for better tracking
        if (!user.wishlistItems) {
            user.wishlistItems = [];
        }
        
        user.wishlistItems.push({
            productId: productId,
            dateAdded: new Date()
        });

        await user.save();

        res.json({
            success: true,
            message: 'Product added to wishlist',
            wishlistCount: user.wishlist.length
        });
    } catch (error) {
        logger.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while adding to wishlist'
        });
    }
});

/**
 * @route   DELETE /api/wishlist/remove/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/remove/:productId', auth, async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: 'Product ID is required'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if product is in wishlist
        if (!user.wishlist.includes(productId)) {
            return res.status(404).json({
                success: false,
                error: 'Product not found in wishlist'
            });
        }

        // Remove from wishlist
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);

        // Also remove from wishlistItems
        if (user.wishlistItems) {
            user.wishlistItems = user.wishlistItems.filter(
                item => item.productId.toString() !== productId
            );
        }

        await user.save();

        res.json({
            success: true,
            message: 'Product removed from wishlist',
            wishlistCount: user.wishlist.length
        });
    } catch (error) {
        logger.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while removing from wishlist'
        });
    }
});

/**
 * @route   DELETE /api/wishlist/clear
 * @desc    Clear entire wishlist
 * @access  Private
 */
router.delete('/clear', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Clear wishlist
        user.wishlist = [];
        user.wishlistItems = [];

        await user.save();

        res.json({
            success: true,
            message: 'Wishlist cleared successfully'
        });
    } catch (error) {
        logger.error('Error clearing wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while clearing wishlist'
        });
    }
});

/**
 * @route   GET /api/wishlist/check/:productId
 * @desc    Check if product is in user's wishlist
 * @access  Private
 */
router.get('/check/:productId', auth, async (req, res) => {
    try {
        const { productId } = req.params;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const isInWishlist = user.wishlist.includes(productId);

        res.json({
            success: true,
            isInWishlist,
            wishlistCount: user.wishlist.length
        });
    } catch (error) {
        logger.error('Error checking wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while checking wishlist'
        });
    }
});

module.exports = router; 