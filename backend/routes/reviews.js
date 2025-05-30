const express = require('express');
// const { query } = require('../config/database'); // Temporarily disabled
const { auth, optionalAuth } = require('../middleware/auth');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for review image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/reviews/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 images per review
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

/**
 * @route   GET /api/reviews/product/:productId
 * @desc    Get reviews for a product with filtering and pagination
 * @access  Public
 */
router.get('/product/:productId', optionalAuth, [
    param('productId').isMongoId().withMessage('Invalid product ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    query('sortBy').optional().isIn(['newest', 'oldest', 'rating-high', 'rating-low', 'helpful']).withMessage('Invalid sort option'),
    query('withImages').optional().isBoolean().withMessage('withImages must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { productId } = req.params;
        const {
            page = 1,
            limit = 10,
            rating,
            sortBy = 'newest',
            withImages
        } = req.query;

        // Build filter
        const filter = {
            product_id: productId,
            status: 'approved'
        };

        if (rating) {
            filter.product_rating = parseInt(rating);
        }

        if (withImages === 'true') {
            filter['images.0'] = { $exists: true };
        }

        // Build sort options
        let sortOptions = {};
        switch (sortBy) {
            case 'newest':
                sortOptions = { created_at: -1 };
                break;
            case 'oldest':
                sortOptions = { created_at: 1 };
                break;
            case 'rating-high':
                sortOptions = { product_rating: -1, created_at: -1 };
                break;
            case 'rating-low':
                sortOptions = { product_rating: 1, created_at: -1 };
                break;
            case 'helpful':
                sortOptions = { 'helpful_votes.up': -1, created_at: -1 };
                break;
            default:
                sortOptions = { created_at: -1 };
        }

        const skip = (page - 1) * limit;

        // Get reviews with populated user data
        const reviews = await Review.find(filter)
            .populate('user_id', 'firstName lastName username profile.avatar')
            .populate('seller_id', 'firstName lastName username')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count
        const total = await Review.countDocuments(filter);

        // Get product statistics
        const stats = await Review.getProductStats(productId);

        res.json({
            success: true,
            reviews: reviews.map(review => ({
                ...review.toObject(),
                canEdit: req.user ? review.canEdit() && review.user_id._id.toString() === req.user.id : false,
                helpfulnessScore: review.getHelpfulnessScore(),
                userVote: req.user ? review.helpful_votes.voters.find(v => v.user_id.toString() === req.user.id)?.vote : null
            })),
            statistics: stats[0] || {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get product reviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get reviews',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/reviews/seller/:sellerId
 * @desc    Get reviews for a seller
 * @access  Public
 */
router.get('/seller/:sellerId', optionalAuth, [
    param('sellerId').isMongoId().withMessage('Invalid seller ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { sellerId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        // Get seller reviews
        const reviews = await Review.find({
            seller_id: sellerId,
            status: 'approved'
        })
        .populate('user_id', 'firstName lastName username profile.avatar')
        .populate('product_id', 'name images')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Review.countDocuments({
            seller_id: sellerId,
            status: 'approved'
        });

        // Get seller statistics
        const stats = await Review.getSellerStats(sellerId);

        res.json({
            success: true,
            reviews,
            statistics: stats[0] || {
                averageRating: 0,
                totalReviews: 0,
                communicationRating: 0,
                responseRate: 0
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get seller reviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get seller reviews',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/reviews/user/my-reviews
 * @desc    Get current user's reviews
 * @access  Private
 */
router.get('/user/my-reviews', auth, [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const reviews = await Review.find({ user_id: req.user.id })
            .populate('product_id', 'name images')
            .populate('seller_id', 'firstName lastName username')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ user_id: req.user.id });

        res.json({
            success: true,
            reviews: reviews.map(review => ({
                ...review.toObject(),
                canEdit: review.canEdit()
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user reviews',
            details: error.message
        });
    }
});

/**
 * @route   GET /api/reviews/eligible-orders
 * @desc    Get orders eligible for review by the current user
 * @access  Private
 */
router.get('/eligible-orders', auth, async (req, res) => {
    try {
        // Find completed orders that haven't been reviewed yet
        const eligibleOrders = await Order.find({
            user_id: req.user.id,
            status: 'delivered',
            payment_status: 'paid'
        })
        .populate('items.product_id', 'name images seller')
        .sort({ created_at: -1 });

        // Filter out orders that already have reviews
        const reviewedOrderIds = await Review.find({
            user_id: req.user.id
        }).distinct('order_id');

        const ordersToReview = eligibleOrders.filter(order => 
            !reviewedOrderIds.includes(order._id.toString())
        );

        res.json({
            success: true,
            orders: ordersToReview
        });

    } catch (error) {
        console.error('Get eligible orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get eligible orders',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/reviews
 * @desc    Create a new review (post-purchase only)
 * @access  Private
 */
router.post('/', auth, upload.array('images', 5), [
    body('orderId').isMongoId().withMessage('Valid order ID is required'),
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('productRating').isInt({ min: 1, max: 5 }).withMessage('Product rating must be between 1 and 5'),
    body('productReview').isLength({ min: 10, max: 2000 }).withMessage('Product review must be 10-2000 characters'),
    body('sellerRating').isInt({ min: 1, max: 5 }).withMessage('Seller rating must be between 1 and 5'),
    body('sellerReview').isLength({ min: 10, max: 1000 }).withMessage('Seller review must be 10-1000 characters'),
    body('aspects.quality').optional().isInt({ min: 1, max: 5 }).withMessage('Quality rating must be between 1 and 5'),
    body('aspects.value').optional().isInt({ min: 1, max: 5 }).withMessage('Value rating must be between 1 and 5'),
    body('aspects.shipping').optional().isInt({ min: 1, max: 5 }).withMessage('Shipping rating must be between 1 and 5'),
    body('aspects.packaging').optional().isInt({ min: 1, max: 5 }).withMessage('Packaging rating must be between 1 and 5'),
    body('aspects.communication').optional().isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1 and 5')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            orderId,
            productId,
            productRating,
            productReview,
            sellerRating,
            sellerReview,
            aspects = {}
        } = req.body;

        // Verify order exists and belongs to user
        const order = await Order.findOne({
            _id: orderId,
            user_id: req.user.id,
            status: 'delivered',
            payment_status: 'paid'
        }).populate('items.product_id');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found or not eligible for review'
            });
        }

        // Verify product is in the order
        const orderItem = order.items.find(item => 
            item.product_id._id.toString() === productId
        );

        if (!orderItem) {
            return res.status(400).json({
                success: false,
                error: 'Product not found in this order'
            });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            order_id: orderId,
            user_id: req.user.id
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                error: 'Review already exists for this order'
            });
        }

        // Get product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Process uploaded images
        const images = req.files ? req.files.map(file => ({
            url: `/uploads/reviews/${file.filename}`,
            caption: '',
            uploaded_at: new Date()
        })) : [];

        // Create review
        const review = new Review({
            product_id: productId,
            order_id: orderId,
            user_id: req.user.id,
            seller_id: product.seller,
            product_rating: parseInt(productRating),
            product_review: productReview.trim(),
            seller_rating: parseInt(sellerRating),
            seller_review: sellerReview.trim(),
            aspects: {
                quality: aspects.quality ? parseInt(aspects.quality) : undefined,
                value: aspects.value ? parseInt(aspects.value) : undefined,
                shipping: aspects.shipping ? parseInt(aspects.shipping) : undefined,
                packaging: aspects.packaging ? parseInt(aspects.packaging) : undefined,
                communication: aspects.communication ? parseInt(aspects.communication) : undefined
            },
            images,
            verified_purchase: true,
            review_source: 'web',
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        await review.save();

        // Update product rating
        await updateProductRating(productId);

        // Send notification to seller
        try {
            await notificationService.createNotification({
                userId: product.seller,
                type: 'order_reviewed',
                customTitle: 'New Review Received',
                customMessage: `You received a new review for "${product.name}" with ${productRating} stars.`,
                category: 'order',
                priority: 'medium',
                relatedEntity: {
                    entityType: 'product',
                    entityId: productId
                },
                data: {
                    productName: product.name,
                    rating: productRating,
                    reviewerName: req.user.firstName + ' ' + req.user.lastName,
                    orderId: orderId
                }
            });
        } catch (notifError) {
            console.error('Failed to send review notification:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            review: review.toObject()
        });

    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create review',
            details: error.message
        });
    }
});

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update a review (within 24 hours)
 * @access  Private
 */
router.put('/:id', auth, upload.array('images', 5), [
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('productRating').optional().isInt({ min: 1, max: 5 }).withMessage('Product rating must be between 1 and 5'),
    body('productReview').optional().isLength({ min: 10, max: 2000 }).withMessage('Product review must be 10-2000 characters'),
    body('sellerRating').optional().isInt({ min: 1, max: 5 }).withMessage('Seller rating must be between 1 and 5'),
    body('sellerReview').optional().isLength({ min: 10, max: 1000 }).withMessage('Seller review must be 10-1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const {
            productRating,
            productReview,
            sellerRating,
            sellerReview,
            aspects = {},
            removeImages = []
        } = req.body;

        // Find review and verify ownership
        const review = await Review.findOne({
            _id: id,
            user_id: req.user.id
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Check if review can be edited (within 24 hours)
        if (!review.canEdit()) {
            return res.status(400).json({
                success: false,
                error: 'Review can only be edited within 24 hours of creation'
            });
        }

        // Update fields
        if (productRating) review.product_rating = parseInt(productRating);
        if (productReview) review.product_review = productReview.trim();
        if (sellerRating) review.seller_rating = parseInt(sellerRating);
        if (sellerReview) review.seller_review = sellerReview.trim();

        // Update aspects
        if (aspects.quality) review.aspects.quality = parseInt(aspects.quality);
        if (aspects.value) review.aspects.value = parseInt(aspects.value);
        if (aspects.shipping) review.aspects.shipping = parseInt(aspects.shipping);
        if (aspects.packaging) review.aspects.packaging = parseInt(aspects.packaging);
        if (aspects.communication) review.aspects.communication = parseInt(aspects.communication);

        // Handle image removal
        if (removeImages && removeImages.length > 0) {
            review.images = review.images.filter(img => 
                !removeImages.includes(img.url)
            );
        }

        // Add new images
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: `/uploads/reviews/${file.filename}`,
                caption: '',
                uploaded_at: new Date()
            }));
            review.images.push(...newImages);
        }

        review.edited_at = new Date();
        await review.save();

        // Update product rating
        await updateProductRating(review.product_id);

        res.json({
            success: true,
            message: 'Review updated successfully',
            review: review.toObject()
        });

    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update review',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/reviews/:id/response
 * @desc    Add/update seller response to a review
 * @access  Private (Seller only)
 */
router.post('/:id/response', auth, [
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('content').isLength({ min: 10, max: 1000 }).withMessage('Response must be 10-1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { content } = req.body;

        // Find review and verify seller ownership
        const review = await Review.findOne({
            _id: id,
            seller_id: req.user.id,
            status: 'approved'
        }).populate('user_id', 'firstName lastName username');

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found or unauthorized'
            });
        }

        // Add or update response
        if (review.seller_response && review.seller_response.content) {
            await review.updateSellerResponse(content);
        } else {
            await review.addSellerResponse(content);
        }

        // Send notification to reviewer
        try {
            await notificationService.createNotification({
                userId: review.user_id._id,
                type: 'review_response',
                customTitle: 'Seller Responded to Your Review',
                customMessage: `The seller has responded to your review.`,
                category: 'order',
                priority: 'medium',
                relatedEntity: {
                    entityType: 'review',
                    entityId: review._id
                }
            });
        } catch (notifError) {
            console.error('Failed to send response notification:', notifError);
        }

        res.json({
            success: true,
            message: 'Response added successfully',
            review: review.toObject()
        });

    } catch (error) {
        console.error('Add seller response error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add response',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/reviews/:id/helpful
 * @desc    Vote on review helpfulness
 * @access  Private
 */
router.post('/:id/helpful', auth, [
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('vote').isIn(['up', 'down']).withMessage('Vote must be up or down')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { vote } = req.body;

        const review = await Review.findOne({
            _id: id,
            status: 'approved'
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Don't allow voting on own review
        if (review.user_id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot vote on your own review'
            });
        }

        await review.addHelpfulVote(req.user.id, vote);

        res.json({
            success: true,
            message: 'Vote recorded successfully',
            helpfulVotes: {
                up: review.helpful_votes.up,
                down: review.helpful_votes.down,
                userVote: vote
            }
        });

    } catch (error) {
        console.error('Vote helpful error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record vote',
            details: error.message
        });
    }
});

/**
 * @route   POST /api/reviews/:id/report
 * @desc    Report a review
 * @access  Private
 */
router.post('/:id/report', auth, [
    param('id').isMongoId().withMessage('Invalid review ID'),
    body('reason').isIn(['spam', 'inappropriate', 'fake', 'offensive', 'other']).withMessage('Invalid report reason'),
    body('details').optional().isLength({ max: 500 }).withMessage('Details cannot exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { reason, details } = req.body;

        const review = await Review.findById(id);
        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Check if user already reported this review
        const alreadyReported = review.reports.some(report => 
            report.reported_by.toString() === req.user.id
        );

        if (alreadyReported) {
            return res.status(400).json({
                success: false,
                error: 'You have already reported this review'
            });
        }

        await review.addReport(req.user.id, reason, details);

        res.json({
            success: true,
            message: 'Review reported successfully'
        });

    } catch (error) {
        console.error('Report review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to report review',
            details: error.message
        });
    }
});

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review (user can delete own review within 24 hours)
 * @access  Private
 */
router.delete('/:id', auth, [
    param('id').isMongoId().withMessage('Invalid review ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;

        const review = await Review.findOne({
            _id: id,
            user_id: req.user.id
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                error: 'Review not found'
            });
        }

        // Only allow deletion within 24 hours
        if (!review.canEdit()) {
            return res.status(400).json({
                success: false,
                error: 'Review can only be deleted within 24 hours of creation'
            });
        }

        await Review.findByIdAndDelete(id);

        // Update product rating
        await updateProductRating(review.product_id);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete review',
            details: error.message
        });
    }
});

// Helper function to update product rating
async function updateProductRating(productId) {
    try {
        const stats = await Review.getProductStats(productId);
        
        const updateData = {
            'rating.average': stats[0]?.averageRating || 0,
            'rating.count': stats[0]?.totalReviews || 0
        };

        await Product.findByIdAndUpdate(productId, updateData);
    } catch (error) {
        console.error('Failed to update product rating:', error);
    }
}

module.exports = router; 