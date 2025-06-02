const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// JWT authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Access denied. No token provided.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        // Get user from database
        const user = await User.findById(decoded.userId).select('-password_hash');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid token. User not found.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        req.user = { 
            userId: user._id, 
            id: user._id,
            email: user.email, 
            wallet_address: user.wallet_address,
            userType: user.userType || 'user',
            role: user.role || 'user',
            isVerified: user.isVerified || false
        };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid token.',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Token expired.',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                message: 'Authentication failed.',
                timestamp: new Date().toISOString()
            }
        });
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId).select('-password_hash');

        req.user = user ? { 
            userId: user._id, 
            id: user._id,
            email: user.email, 
            wallet_address: user.wallet_address,
            userType: user.userType || 'user',
            role: user.role || 'user',
            isVerified: user.isVerified || false
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
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Access denied. No token provided.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const user = await User.findById(decoded.userId).select('-password_hash');

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Access denied. Admin privileges required.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        req.user = { 
            userId: user._id, 
            id: user._id,
            email: user.email, 
            role: user.role,
            userType: user.userType || 'admin'
        };
        
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: 'Admin authentication failed.',
                timestamp: new Date().toISOString()
            }
        });
    }
};

// Generate JWT token
const generateToken = (userId, expiresIn = '7d') => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn }
    );
};

module.exports = {
    auth,
    optionalAuth,
    adminAuth,
    generateToken
}; 