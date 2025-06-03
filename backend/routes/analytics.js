const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Track wallet connection
router.post('/wallet-connection', auth, async (req, res) => {
  try {
    const { wallet_address, connection_type } = req.body;
    
    // Update user's wallet address if provided
    if (wallet_address) {
      await User.findByIdAndUpdate(req.user.id, {
        wallet_address,
        updatedAt: new Date()
      });
    }

    // Here you could add analytics tracking if needed
    console.log(`User ${req.user.id} connected wallet: ${wallet_address} via ${connection_type}`);

    res.json({
      success: true,
      message: 'Wallet connection tracked successfully',
      data: {
        wallet_address,
        connection_type,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking wallet connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error tracking wallet connection' 
    });
  }
});

module.exports = router; 