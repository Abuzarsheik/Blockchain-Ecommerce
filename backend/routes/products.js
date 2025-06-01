const Product = require('../models/Product');
const User = require('../models/User');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const { getCategoryOptions } = require('../config/constants');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadPath = 'uploads/products';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, JPG, PNG, WebP) are allowed'));
        }
    }
});

// ==== SPECIFIC ROUTES (must come before dynamic routes) ====

// GET /api/products/categories - Get available categories
router.get('/categories', (req, res) => {
    const categories = getCategoryOptions();
    res.json({ categories });
});

// GET /api/products/my - Get current user's products (seller dashboard)
router.get('/my', auth, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        
        const query = { seller: req.user.id };
        if (status) {query.status = status;}
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'inventory.sku': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(query);

        // Get summary statistics
        const stats = await Product.aggregate([
            { $match: { seller: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    activeProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
                    },
                    totalInventory: { $sum: "$inventory.quantity" },
                    totalRevenue: { $sum: "$sales.revenue" },
                    lowStockCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$inventory.trackInventory", true] },
                                        { $lte: [
                                            { $subtract: ["$inventory.quantity", "$inventory.reserved"] },
                                            "$inventory.lowStockThreshold"
                                        ]}
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats: stats[0] || {
                totalProducts: 0,
                activeProducts: 0,
                totalInventory: 0,
                totalRevenue: 0,
                lowStockCount: 0
            }
        });
    } catch (error) {
        logger.error('Error fetching user products:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// GET /api/products/low-stock - Get low stock products for current seller
router.get('/low-stock', auth, async (req, res) => {
    try {
        const products = await Product.findLowStock(req.user._id);
        res.json({ products });
    } catch (error) {
        logger.error('Error fetching low stock products:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Server error',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// ==== GENERAL ROUTES ====

// Get all products
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 12, 
            category, 
            search, 
            sort = 'newest',
            minPrice,
            maxPrice,
            minRating,
            inStock,
            verified
        } = req.query;

        const skip = Math.max(0, (page - 1) * limit);

        // Build query filter
        const filter = { status: 'active' }; // Only show active products
        
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Enhanced search functionality
        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { shortDescription: searchRegex },
                { tags: searchRegex },
                { 'inventory.sku': searchRegex }
            ];

            // Search by seller information
            try {
                const sellers = await User.find({
                    $or: [
                        { firstName: searchRegex },
                        { lastName: searchRegex },
                        { username: searchRegex },
                        { 'sellerProfile.businessName': searchRegex }
                    ]
                }).select('_id');
                
                if (sellers.length > 0) {
                    const sellerIds = sellers.map(seller => seller._id);
                    filter.$or.push({ seller: { $in: sellerIds } });
                }
            } catch (sellerSearchError) {
                logger.error('Error searching sellers:', sellerSearchError);
            }
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) {filter.price.$gte = parseFloat(minPrice);}
            if (maxPrice) {filter.price.$lte = parseFloat(maxPrice);}
        }

        // In stock filter
        if (inStock === 'true') {
            filter['inventory.quantity'] = { $gt: 0 };
        }

        // Verified filter
        if (verified === 'true') {
            filter.verified = true;
        }

        // Build sort options
        let sortOptions = {};
        switch (sort) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'price-low':
                sortOptions = { price: 1 };
                break;
            case 'price-high':
                sortOptions = { price: -1 };
                break;
            case 'name':
                sortOptions = { name: 1 };
                break;
            case 'rating':
                sortOptions = { rating: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        // Get products with pagination and populate seller info
        const products = await Product.find(filter)
            .populate('seller', 'firstName lastName username sellerProfile')
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip(skip);

        // Apply rating filter (client-side for now since rating might be calculated)
        let filteredProducts = products;
        if (minRating && parseFloat(minRating) > 0) {
            filteredProducts = products.filter(product => 
                (product.rating || 0) >= parseFloat(minRating)
            );
        }

        // Get total count for pagination
        const total = await Product.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        // Add computed fields to products
        const enhancedProducts = filteredProducts.map(product => {
            try {
                const productObj = product.toObject();
                productObj.isLowStock = product.isLowStock ? product.isLowStock() : false;
                productObj.canSell = product.canSell ? product.canSell() : true;
                productObj.availableQuantity = productObj.inventory?.quantity ? 
                    (productObj.inventory.quantity - (productObj.inventory.reserved || 0)) : 0;
                return productObj;
            } catch (productError) {
                logger.error('Error processing product:', productError);
                return product.toObject();
            }
        });

        res.json({
            products: enhancedProducts,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: total,
                items_per_page: parseInt(limit),
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            },
            filters: {
                category,
                search,
                sort,
                minPrice,
                maxPrice,
                minRating,
                inStock,
                verified
            }
        });

    } catch (error) {
        logger.error('Get products error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get products',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// ==== PARAMETERIZED ROUTES (must come after specific routes) ====

// GET /api/products/seller/:sellerId - Get products by seller
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        const query = Product.findBySeller(sellerId, status);
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await query
            .skip(skip)
            .limit(parseInt(limit))
            .populate('seller', 'firstName lastName username sellerProfile');

        const total = await Product.countDocuments({ 
            seller: sellerId, 
            ...(status && { status }) 
        });

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching seller products:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// GET /api/products/:id/inventory-history - Get inventory history
router.get('/:id/inventory-history', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        if (product.seller.toString() !== req.user.id.toString()) {
            return res.status(403).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const history = product.inventoryHistory
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + parseInt(limit));

        res.json({
            history,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: product.inventoryHistory.length,
                pages: Math.ceil(product.inventoryHistory.length / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching inventory history:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// Verify product authenticity (blockchain verification)
router.get('/:id/verify', async (req, res) => {
    try {
        const productId = req.params.id;

        // Get product from database
        const productResult = await Product.findById(productId);

        if (!productResult) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // TODO: Implement blockchain verification
        // For now, return mock verification data
        const verification = {
            verified: productResult.verified || false,
            blockchain_hash: productResult.blockchain_hash,
            verification_date: productResult.created_at,
            history: []
        };

        res.json({ verification });

    } catch (error) {
        logger.error('Product verification error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// Get product history (blockchain events)
router.get('/:id/history', async (req, res) => {
    try {
        const productId = req.params.id;

        // Get blockchain records for this product
        const result = await Product.find({ product_id: productId });

        res.json({ history: result });

    } catch (error) {
        logger.error('Product history error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
    try {
        // Check if the ID is actually "categories" which should not match this route
        if (req.params.id === 'categories') {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        const product = await Product.findById(req.params.id)
            .populate('seller', 'firstName lastName username sellerProfile');
        
        if (!product) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // Increment view count
        await Product.findByIdAndUpdate(req.params.id, {
            $inc: { 'sales.views': 1 }
        });

        res.json({ product });
    } catch (error) {
        // Environment-aware logging
        if (process.env.NODE_ENV !== 'production') {
            logger.error('Get product error:', error);
        }
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// ==== CREATE, UPDATE, DELETE ROUTES ====

// POST /api/products - Create new product
router.post('/', auth, upload.array('images', 5), async (req, res) => {
    try {
        const {
            name,
            description,
            shortDescription,
            price,
            originalPrice,
            discountPercentage,
            category,
            subcategory,
            tags,
            specifications,
            weight,
            dimensions,
            freeShipping,
            shippingCost,
            metaTitle,
            metaDescription,
            status = 'draft',
            quantity = 0,
            lowStockThreshold = 5,
            trackInventory = true,
            allowBackorders = false,
            sku
        } = req.body;

        // Validation
        if (!name || !description || !price || !category) {
            return res.status(400).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // Additional price validation
        if (price < 0) {
            return res.status(400).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // Handle image uploads
        const images = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                images.push({
                    url: `/uploads/products/${file.filename}`,
                    alt: `${name} - Image ${index + 1}`,
                    isPrimary: index === 0
                });
            });
        }

        // Create product
        const product = new Product({
            name: name.trim(),
            description,
            shortDescription,
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : null,
            discountPercentage: discountPercentage ? parseFloat(discountPercentage) : 0,
            category,
            subcategory,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            images,
            specifications: specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : {},
            status,
            seller: req.user.id,
            inventory: {
                quantity: parseInt(quantity),
                reserved: 0,
                lowStockThreshold: parseInt(lowStockThreshold),
                trackInventory,
                allowBackorders,
                sku: sku || `SKU-${Date.now()}`
            },
            shipping: {
                weight: weight ? {
                    value: parseFloat(weight),
                    unit: 'lbs' // Default unit
                } : {
                    value: 0,
                    unit: 'lbs'
                },
                dimensions: dimensions ? (typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions) : { length: 0, width: 0, height: 0 },
                freeShipping: freeShipping === 'true',
                shippingCost: shippingCost ? parseFloat(shippingCost) : 0
            },
            seo: {
                metaTitle: metaTitle || name,
                metaDescription: metaDescription || shortDescription || description.substring(0, 160),
                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            }
        });

        await product.save();

        // Add initial inventory entry if quantity > 0
        if (quantity > 0) {
            product.inventoryHistory.push({
                date: new Date(),
                type: 'stock_in',
                quantity: parseInt(quantity),
                previousQuantity: 0,
                newQuantity: parseInt(quantity),
                reason: 'Initial stock',
                reference: 'INITIAL'
            });
            await product.save();
        }

        res.status(201).json({ 
            message: 'Product created successfully', 
            product 
        });
    } catch (error) {
        logger.error('Error creating product:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', auth, upload.array('newImages', 5), async (req, res) => {
    try {
        // Validate ObjectId format first
        if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }
        
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        if (product.seller.toString() !== req.user.id.toString()) {
            return res.status(403).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        const {
            name,
            description,
            shortDescription,
            price,
            originalPrice,
            discountPercentage,
            category,
            subcategory,
            tags,
            specifications,
            weight,
            dimensions,
            freeShipping,
            shippingCost,
            metaTitle,
            metaDescription,
            status,
            existingImages,
            removeImages
        } = req.body;

        // Handle image updates
        let images = [...product.images];
        
        // Remove specified images
        if (removeImages) {
            const toRemove = typeof removeImages === 'string' ? JSON.parse(removeImages) : removeImages;
            images = images.filter((img, index) => !toRemove.includes(index));
        }

        // Add new images
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                images.push({
                    url: `/uploads/products/${file.filename}`,
                    alt: `${name} - Image ${images.length + index + 1}`,
                    isPrimary: images.length === 0 && index === 0
                });
            });
        }

        // Ensure at least one image is primary
        if (images.length > 0 && !images.some(img => img.isPrimary)) {
            images[0].isPrimary = true;
        }

        // Update product fields safely
        if (name) {product.name = name;}
        if (description) {product.description = description;}
        if (shortDescription) {product.shortDescription = shortDescription;}
        if (price) {product.price = parseFloat(price);}
        if (originalPrice) {product.originalPrice = parseFloat(originalPrice);}
        if (discountPercentage !== undefined) {product.discountPercentage = parseFloat(discountPercentage);}
        if (category) {product.category = category;}
        if (subcategory) {product.subcategory = subcategory;}
        if (tags) {product.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;}
        if (specifications) {product.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;}
        if (status) {product.status = status;}
        
        // Update images
        product.images = images;
        
        // Update shipping safely
        if (weight) {product.shipping.weight = weight ? {
            value: parseFloat(weight),
            unit: 'lbs' // Default unit
        } : {
            value: 0,
            unit: 'lbs'
        };}
        if (dimensions) {
            const parsedDimensions = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
            product.shipping.dimensions = {
                length: parsedDimensions.length || 0,
                width: parsedDimensions.width || 0,
                height: parsedDimensions.height || 0
            };
        }
        if (freeShipping !== undefined) {product.shipping.freeShipping = freeShipping === 'true';}
        if (shippingCost) {product.shipping.shippingCost = parseFloat(shippingCost);}
        
        // Update SEO
        if (metaTitle) {product.seo.metaTitle = metaTitle;}
        if (metaDescription) {product.seo.metaDescription = metaDescription;}

        await product.save();

        res.json({ 
            message: 'Product updated successfully', 
            product 
        });
    } catch (error) {
        logger.error('Error updating product:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// PUT /api/products/:id/inventory - Update product inventory
router.put('/:id/inventory', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        if (product.seller.toString() !== req.user.id.toString()) {
            return res.status(403).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        const {
            quantity,
            type,
            reason,
            reference,
            lowStockThreshold,
            trackInventory,
            allowBackorders
        } = req.body;

        if (quantity !== undefined) {
            await product.updateInventory(
                parseInt(quantity),
                type || 'adjustment',
                reason || 'Manual adjustment',
                reference || `ADJ-${Date.now()}`
            );
        }

        // Update inventory settings
        if (lowStockThreshold !== undefined) {
            product.inventory.lowStockThreshold = parseInt(lowStockThreshold);
        }
        if (trackInventory !== undefined) {
            product.inventory.trackInventory = trackInventory;
        }
        if (allowBackorders !== undefined) {
            product.inventory.allowBackorders = allowBackorders;
        }

        await product.save();

        res.json({ 
            message: 'Inventory updated successfully', 
            product 
        });
    } catch (error) {
        logger.error('Error updating inventory:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // Check if user is the product owner or an admin
        const user = await User.findById(req.user.id);
        
        const isOwner = product.seller.toString() === req.user.id.toString();
        const isAdmin = user && user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        // Instead of deleting, mark as discontinued
        product.status = 'discontinued';
        await product.save();

        res.json({ message: 'Product discontinued successfully' });
    } catch (error) {
        logger.error('Error deleting product:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

module.exports = router; 