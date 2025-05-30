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

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated.' });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({ error: 'Account is temporarily locked.' });
        }

        req.user = { 
            userId: user._id, 
            id: user._id, // For backward compatibility
            email: user.email, 
            wallet_address: user.wallet_address,
            userType: user.userType,
            isVerified: user.isVerified,
            emailVerified: user.emailVerification?.isVerified || false
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

        req.user = user && user.isActive && !user.isLocked ? { 
            userId: user._id, 
            id: user._id, // For backward compatibility
            email: user.email, 
            wallet_address: user.wallet_address,
            userType: user.userType,
            isVerified: user.isVerified,
            emailVerified: user.emailVerification?.isVerified || false
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

// Verified user middleware (requires email verification)
const verifiedAuth = async (req, res, next) => {
    try {
        await auth(req, res, () => {});
        
        if (!req.user.emailVerified) {
            return res.status(403).json({ 
                error: 'Email verification required. Please verify your email to access this feature.' 
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Verification check failed.' });
    }
};

// Generate JWT token with enhanced options
const generateToken = (userId, expiresIn = '7d') => {
    const payload = {
        userId,
        iat: Math.floor(Date.now() / 1000),
        jti: require('crypto').randomBytes(16).toString('hex') // JWT ID for potential blacklisting
    };

    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { 
            expiresIn,
            issuer: 'YourApp',
            audience: 'YourApp-Users'
        }
    );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
        return decoded.type === 'refresh' ? decoded : null;
    } catch (error) {
        return null;
    }
};

module.exports = {
    auth,
    optionalAuth,
    adminAuth,
    verifiedAuth,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken
}; 