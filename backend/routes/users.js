const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

// Get seller dashboard stats
router.get('/seller-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is a seller
    const user = await User.findById(userId);
    if (!user || user.userType !== 'seller') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Only sellers can access seller stats.' 
      });
    }

    // Get seller products count
    const productsListed = await Product.countDocuments({ 
      seller: userId,
      status: { $ne: 'deleted' }
    });

    // Get orders received for seller's products
    const ordersReceived = await Order.countDocuments({ 
      sellerId: userId 
    });

    // Calculate total revenue from completed orders
    const revenueAggregation = await Order.aggregate([
      { $match: { sellerId: userId, status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    // Calculate total sales (completed orders)
    const totalSales = await Order.countDocuments({ 
      sellerId: userId, 
      status: 'completed' 
    });

    // Get average rating (if you have a reviews system)
    // This is placeholder - you'll need to implement based on your review model
    const averageRating = 4.5; // Placeholder

    // Calculate pending payouts (orders that are delivered but not yet paid out)
    const pendingPayoutAggregation = await Order.aggregate([
      { $match: { sellerId: userId, status: 'delivered', payoutStatus: { $ne: 'paid' } } },
      { $group: { _id: null, pendingPayouts: { $sum: '$totalAmount' } } }
    ]);
    const pendingPayouts = pendingPayoutAggregation.length > 0 ? pendingPayoutAggregation[0].pendingPayouts : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalSales,
        productsListed,
        ordersReceived,
        averageRating,
        pendingPayouts
      }
    });

  } catch (error) {
    console.error('Error fetching seller stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching seller statistics' 
    });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user profile' 
    });
  }
});

module.exports = router; 