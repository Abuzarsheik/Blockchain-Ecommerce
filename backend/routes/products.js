const express = require('express');
const Product = require('../models/Product');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    const categories = [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing & Fashion' },
        { value: 'home-garden', label: 'Home & Garden' },
        { value: 'sports', label: 'Sports & Outdoors' },
        { value: 'books', label: 'Books & Media' },
        { value: 'beauty', label: 'Beauty & Personal Care' },
        { value: 'toys', label: 'Toys & Games' },
        { value: 'automotive', label: 'Automotive' },
        { value: 'jewelry', label: 'Jewelry & Accessories' },
        { value: 'art-collectibles', label: 'Art & Collectibles' },
        { value: 'other', label: 'Other' }
    ];
    
    res.json({ categories });
});

// GET /api/products/my - Get current user's products (seller dashboard)
router.get('/my', auth, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        
        let query = { seller: req.user.id };
        if (status) query.status = status;
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
        console.error('Error fetching user products:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/products/low-stock - Get low stock products for current seller
router.get('/low-stock', auth, async (req, res) => {
    try {
        const products = await Product.findLowStock(req.user._id);
        res.json({ products });
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ error: 'Server error' });
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

        const skip = (page - 1) * limit;

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
                { tags: { $in: [searchRegex] } },
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
                console.error('Error searching sellers:', sellerSearchError);
            }
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
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
            const productObj = product.toObject();
            productObj.isLowStock = product.isLowStock();
            productObj.canSell = product.canSell();
            productObj.availableQuantity = productObj.inventory.quantity - productObj.inventory.reserved;
            return productObj;
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
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
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
        console.error('Error fetching seller products:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/products/:id/inventory-history - Get inventory history
router.get('/:id/inventory-history', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
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
        console.error('Error fetching inventory history:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify product authenticity (blockchain verification)
router.get('/:id/verify', async (req, res) => {
    try {
        const productId = req.params.id;

        // Get product from database
        const productResult = await Product.findById(productId);

        if (!productResult) {
            return res.status(404).json({ error: 'Product not found' });
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
        console.error('Product verification error:', error);
        res.status(500).json({ error: 'Failed to verify product' });
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
        console.error('Product history error:', error);
        res.status(500).json({ error: 'Failed to get product history' });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
    try {
        // Check if the ID is actually "categories" which should not match this route
        if (req.params.id === 'categories') {
            return res.status(404).json({ error: 'Route not found. Categories endpoint should be handled separately.' });
        }

        const product = await Product.findById(req.params.id)
            .populate('seller', 'firstName lastName username sellerProfile');
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Increment view count
        await Product.findByIdAndUpdate(req.params.id, {
            $inc: { 'sales.views': 1 }
        });

        res.json({ product });
    } catch (error) {
        console.error('Get product error:', error);
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }
        res.status(500).json({ error: 'Failed to get product' });
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
                error: 'Name, description, price, and category are required' 
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
            tags: tags ? JSON.parse(tags) : [],
            images,
            specifications: specifications ? JSON.parse(specifications) : {},
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
                weight: weight ? parseFloat(weight) : 0,
                dimensions: dimensions ? JSON.parse(dimensions) : { length: 0, width: 0, height: 0 },
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
                type: 'initial',
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
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', auth, upload.array('newImages', 5), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
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
            const toRemove = JSON.parse(removeImages);
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

        // Update product fields
        const updateData = {
            name: name || product.name,
            description: description || product.description,
            shortDescription: shortDescription || product.shortDescription,
            price: price ? parseFloat(price) : product.price,
            originalPrice: originalPrice ? parseFloat(originalPrice) : product.originalPrice,
            discountPercentage: discountPercentage ? parseFloat(discountPercentage) : product.discountPercentage,
            category: category || product.category,
            subcategory: subcategory || product.subcategory,
            tags: tags ? JSON.parse(tags) : product.tags,
            images,
            specifications: specifications ? JSON.parse(specifications) : product.specifications,
            status: status || product.status,
            shipping: {
                ...product.shipping,
                weight: weight ? parseFloat(weight) : product.shipping.weight,
                dimensions: dimensions ? JSON.parse(dimensions) : product.shipping.dimensions,
                freeShipping: freeShipping !== undefined ? freeShipping === 'true' : product.shipping.freeShipping,
                shippingCost: shippingCost ? parseFloat(shippingCost) : product.shipping.shippingCost
            },
            seo: {
                metaTitle: metaTitle || product.seo.metaTitle,
                metaDescription: metaDescription || product.seo.metaDescription,
                slug: product.seo.slug // Keep existing slug
            }
        };

        Object.assign(product, updateData);
        await product.save();

        res.json({ 
            message: 'Product updated successfully', 
            product 
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/products/:id/inventory - Update product inventory
router.put('/:id/inventory', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
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
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Instead of deleting, mark as discontinued
        product.status = 'discontinued';
        await product.save();

        res.json({ message: 'Product discontinued successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 