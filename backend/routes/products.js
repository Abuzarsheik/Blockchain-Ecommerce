const express = require('express');
const Product = require('../models/Product');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 12, 
            category, 
            search, 
            sort = 'newest' 
        } = req.query;

        const skip = (page - 1) * limit;

        // Build query filter
        const filter = {};
        
        if (category && category !== 'all') {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort options
        let sortOptions = {};
        switch (sort) {
            case 'newest':
                sortOptions = { created_at: -1 };
                break;
            case 'oldest':
                sortOptions = { created_at: 1 };
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
            default:
                sortOptions = { created_at: -1 };
        }

        // Get products with pagination
        const products = await Product.find(filter)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip(skip);

        // Get total count for pagination
        const total = await Product.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        res.json({
            products,
            pagination: {
                current_page: parseInt(page),
                total_pages: totalPages,
                total_items: total,
                items_per_page: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// Get single product by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// Create new product (admin only)
router.post('/', adminAuth, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            price, 
            image_url, 
            category = 'other',
            stock = 0
        } = req.body;

        // Validation
        if (!name || !description || price === undefined) {
            return res.status(400).json({ 
                error: 'Name, description, and price are required' 
            });
        }

        if (price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }

        // Create product
        const newProduct = new Product({
            name: name.trim(),
            description,
            price,
            image_url,
            category,
            stock
        });

        await newProduct.save();

        res.status(201).json({
            message: 'Product created successfully',
            product: newProduct
        });

    } catch (error) {
        console.error('Create product error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product (admin only)
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const { 
            name, 
            description, 
            price, 
            image_url, 
            category,
            stock
        } = req.body;

        // Validation
        if (price !== undefined && price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }

        // Build update object
        const updateData = { updated_at: new Date() };
        
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (image_url !== undefined) updateData.image_url = image_url;
        if (category !== undefined) updateData.category = category;
        if (stock !== undefined) updateData.stock = stock;

        const product = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({
            message: 'Product updated successfully',
            product
        });

    } catch (error) {
        console.error('Update product error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const productId = req.params.id;

        const product = await Product.findByIdAndDelete(productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
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

module.exports = router; 