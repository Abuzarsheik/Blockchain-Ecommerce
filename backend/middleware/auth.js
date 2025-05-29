const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password_hash');

        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }

        req.user = { 
            userId: user._id, 
            id: user._id, // For backward compatibility
            email: user.email, 
            wallet_address: user.wallet_address 
        };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired.' });
        }
        
        res.status(500).json({ error: 'Authentication failed.' });
    }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select('-password_hash');

        req.user = user ? { 
            userId: user._id, 
            id: user._id, // For backward compatibility
            email: user.email, 
            wallet_address: user.wallet_address 
        } : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {});
        
        // Check if user is admin (you can modify this logic)
        const user = await User.findById(req.user.userId || req.user.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Admin authentication failed.' });
    }
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    auth,
    optionalAuth,
    adminAuth,
    generateToken
}; 