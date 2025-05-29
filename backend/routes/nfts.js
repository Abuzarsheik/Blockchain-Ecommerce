const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const NFT = require('../models/NFT');
const { auth } = require('../middleware/auth');
const optionalAuth = require('../middleware/auth').optionalAuth;

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/nfts');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// @route   GET /api/nfts
// @desc    Get all NFTs with pagination and filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        
        // Build filter object
        let filter = {};
        
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        if (req.query.category) {
            filter.category = req.query.category;
        }
        
        if (req.query.creator) {
            filter.creator_id = req.query.creator;
        }
        
        // Build sort object
        let sort = {};
        switch (req.query.sort) {
            case 'oldest':
                sort.created_at = 1;
                break;
            case 'price_high':
                sort.price = -1;
                break;
            case 'price_low':
                sort.price = 1;
                break;
            case 'name_asc':
                sort.name = 1;
                break;
            case 'name_desc':
                sort.name = -1;
                break;
            default:
                sort.created_at = -1; // newest first
        }
        
        const nfts = await NFT.find(filter)
            .populate('creator_id', 'firstName lastName username email')
            .populate('owner_id', 'firstName lastName username email')
            .sort(sort)
            .skip(skip)
            .limit(limit);
        
        const total = await NFT.countDocuments(filter);
        const pages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            nfts,
            pagination: {
                current: page,
                pages,
                total,
                limit
            }
        });
    } catch (error) {
        console.error('Get NFTs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFTs',
            error: error.message
        });
    }
});

// @route   GET /api/nfts/:id
// @desc    Get single NFT by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id)
            .populate('creator_id', 'firstName lastName username email')
            .populate('owner_id', 'firstName lastName username email');
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'NFT not found'
            });
        }
        
        // Increment view count
        await NFT.findByIdAndUpdate(req.params.id, { 
            $inc: { view_count: 1 } 
        });
        
        res.json({
            success: true,
            nft: {
                ...nft.toObject(),
                view_count: (nft.view_count || 0) + 1
            }
        });
    } catch (error) {
        console.error('Get NFT error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch NFT',
            error: error.message
        });
    }
});

// @route   POST /api/nfts/:id/like
// @desc    Like/Unlike an NFT
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'NFT not found'
            });
        }
        
        // Initialize likes and liked_by arrays if they don't exist
        if (!nft.liked_by) {
            nft.liked_by = [];
        }
        if (!nft.like_count) {
            nft.like_count = 0;
        }
        
        const userIndex = nft.liked_by.indexOf(req.user.userId);
        let liked = false;
        
        if (userIndex > -1) {
            // User has already liked, so unlike
            nft.liked_by.splice(userIndex, 1);
            nft.like_count = Math.max(0, nft.like_count - 1);
            liked = false;
        } else {
            // User hasn't liked, so like
            nft.liked_by.push(req.user.userId);
            nft.like_count += 1;
            liked = true;
        }
        
        await nft.save();
        
        res.json({
            success: true,
            message: liked ? 'NFT liked successfully' : 'NFT unliked successfully',
            liked,
            like_count: nft.like_count
        });
    } catch (error) {
        console.error('Like NFT error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to like/unlike NFT',
            error: error.message
        });
    }
});

// @route   POST /api/nfts
// @desc    Create a new NFT
// @access  Private
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, royalty_percentage } = req.body;
        
        // Validation
        if (!name || !description || !price || !category) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }
        
        // Generate token ID
        const tokenId = `TOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create NFT object
        const nftData = {
            name,
            description,
            price: parseFloat(price),
            category,
            image_url: `/uploads/nfts/${req.file.filename}`,
            creator_id: req.user.userId,
            owner_id: req.user.userId,
            token_id: tokenId,
            royalty_percentage: parseFloat(royalty_percentage) || 5,
            blockchain: 'Ethereum',
            is_minted: false,
            like_count: 0,
            view_count: 0,
            liked_by: [],
            metadata: {
                image: `/uploads/nfts/${req.file.filename}`,
                attributes: []
            }
        };
        
        const nft = new NFT(nftData);
        await nft.save();
        
        // Populate creator info for response
        await nft.populate('creator_id', 'firstName lastName username email');
        
        res.status(201).json({
            success: true,
            message: 'NFT created successfully',
            nft
        });
    } catch (error) {
        console.error('Create NFT error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create NFT',
            error: error.message
        });
    }
});

// @route   PUT /api/nfts/:id
// @desc    Update NFT
// @access  Private (Owner only)
router.put('/:id', auth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'NFT not found'
            });
        }
        
        // Check if user is the creator
        if (nft.creator_id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this NFT'
            });
        }
        
        const { name, description, price, category } = req.body;
        
        if (name) nft.name = name;
        if (description) nft.description = description;
        if (price) nft.price = parseFloat(price);
        if (category) nft.category = category;
        
        nft.updated_at = new Date();
        
        await nft.save();
        
        res.json({
            success: true,
            message: 'NFT updated successfully',
            nft
        });
    } catch (error) {
        console.error('Update NFT error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update NFT',
            error: error.message
        });
    }
});

// @route   DELETE /api/nfts/:id
// @desc    Delete NFT
// @access  Private (Owner only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        
        if (!nft) {
            return res.status(404).json({
                success: false,
                message: 'NFT not found'
            });
        }
        
        // Check if user is the creator
        const creatorId = nft.creator_id.toString();
        const requestUserId = req.user.userId.toString();
        
        if (creatorId !== requestUserId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this NFT'
            });
        }
        
        // Delete the image file if it exists
        if (nft.image_url) {
            const imagePath = path.join(__dirname, '..', nft.image_url);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                } catch (imageError) {
                    console.error('Error deleting image file:', imageError);
                    // Continue with NFT deletion even if image deletion fails
                }
            }
        }
        
        // Delete the NFT from database
        await NFT.findByIdAndDelete(req.params.id);
        
        res.json({
            success: true,
            message: 'NFT deleted successfully'
        });
    } catch (error) {
        console.error('Delete NFT error:', error);
        
        // Handle specific MongoDB errors
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid NFT ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to delete NFT',
            error: error.message
        });
    }
});

module.exports = router; 