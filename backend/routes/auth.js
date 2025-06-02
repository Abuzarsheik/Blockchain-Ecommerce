const QRCode = require('qrcode');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const express = require('express');
const notificationService = require('../services/notificationService');
const rateLimit = require('express-rate-limit');
const speakeasy = require('speakeasy');
const { KYC_STATUS } = require('../config/constants');
const { auth, generateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - username
 *         - email
 *         - password
 *         - userType
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: John
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: Doe
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           description: Unique username
 *           example: johndoe123
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: john@example.com
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password with uppercase, lowercase, number and special character
 *           example: SecurePass123!
 *         userType:
 *           type: string
 *           enum: [buyer, seller]
 *           description: Type of user account
 *           example: buyer
 *         wallet_address:
 *           type: string
 *           description: Optional crypto wallet address
 *           example: 0x742d35Cc6634C0532925a3b8D7b9E9865c13a8C4
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many registration attempts
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *               twoFactorCode:
 *                 type: string
 *                 description: 2FA code if enabled
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials or validation error
 *       429:
 *         description: Too many login attempts
 */

/**
 * @swagger
 * /api/auth/health:
 *   get:
 *     summary: Check authentication service health
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: Authentication
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: number
 *                     message:
 *                       type: string
 */


const router = express.Router();

// Auth Health Check (no auth required)
router.get('/health', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        res.json({
            status: 'ok',
            service: 'Authentication',
            timestamp: new Date().toISOString(),
            stats: { totalUsers: userCount }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'Authentication',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rate limiting (disabled in test environment)
const authLimiter = process.env.NODE_ENV === 'test' 
  ? (req, res, next) => next() // No-op in test environment
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 requests per windowMs
      message: { error: 'Too many authentication attempts, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

const passwordResetLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // No-op in test environment  
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 password reset requests per hour
      message: { error: 'Too many password reset attempts, please try again later.' },
    });

// Helper function to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

// Input validation middleware
const registerValidation = [
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('userType').isIn(['buyer', 'seller']).withMessage('User type must be buyer or seller'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Register new user
router.post('/register', authLimiter, registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { firstName, lastName, username, email, password, userType, wallet_address } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    message: existingUser.email === email.toLowerCase() ? 
                        'User with this email already exists' : 'Username is already taken',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            userType: userType,
            wallet_address: wallet_address || null,
            profile: {
                avatar: null,
                bio: '',
                location: '',
                website: '',
                social: { twitter: '', instagram: '', discord: '' }
            }
        });

        await newUser.save();

        const token = generateToken(newUser._id);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                username: newUser.username,
                email: newUser.email,
                userType: newUser.userType,
                wallet_address: newUser.wallet_address
            },
            token: token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Server error during registration',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Login user
router.post('/login', authLimiter, loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                userType: user.userType,
                role: user.role,
                wallet_address: user.wallet_address
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Login failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Verify email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Verification token is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const user = await User.findOne({
            'emailVerification.token': token,
            'emailVerification.expires': { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid or expired verification token',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Mark email as verified
        user.emailVerification.isVerified = true;
        user.emailVerification.token = null;
        user.emailVerification.expires = null;
        user.isVerified = true; // Mark user as verified
        await user.save();

        res.json({ message: 'Email verified successfully' });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Email verification failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Resend email verification
router.post('/resend-verification', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (user.emailVerification.isVerified) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Email is already verified',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Generate new verification token
        const emailVerificationToken = emailService.generateSecureToken();

        // Update user with new token
        user.emailVerification.token = emailVerificationToken;
        user.emailVerification.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();

        // Send email verification
        await emailService.sendEmailVerification(user, emailVerificationToken);

        res.json({ message: 'Verification email sent successfully' });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to resend verification email',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Request password reset
router.post('/forgot-password', passwordResetLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal whether user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Check if too many reset attempts
        if (user.passwordReset.attempts >= 3) {
            return res.status(429).json({
                success: false,
                error: {
                    message: 'Too many password reset attempts. Please try again later.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Generate reset token
        const resetToken = emailService.generateSecureToken();

        // Save reset token and expiry
        user.passwordReset.token = resetToken;
        user.passwordReset.expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.passwordReset.attempts = (user.passwordReset.attempts || 0) + 1;
        await user.save();

        // Send password reset email
        await emailService.sendPasswordResetEmail(user, resetToken);

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Password reset request failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Reset password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { token, newPassword } = req.body;

        const user = await User.findOne({
            'passwordReset.token': token,
            'passwordReset.expires': { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired reset token',
                timestamp: new Date().toISOString()
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token
        user.password_hash = newPasswordHash;
        user.passwordReset.token = null;
        user.passwordReset.expires = null;
        user.passwordReset.attempts = 0;
        user.updated_at = new Date();
        await user.save();

        // Reset login attempts
        await user.resetLoginAttempts();

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Password reset failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Setup 2FA
router.post('/setup-2fa', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (user.twoFactorAuth.isEnabled) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Two-factor authentication is already enabled',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Generate secret with Google Authenticator optimized settings
        const secret = speakeasy.generateSecret({
            name: `Blocmerce (${user.email})`,
            issuer: 'Blocmerce Platform',
            length: 32, // Increased for better security
            symbols: false // Disable symbols for better compatibility
        });

        // Generate QR code with enhanced settings
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        });

        // Generate backup codes
        const backupCodes = emailService.generateBackupCodes();

        // Save secret (but don't enable yet)
        user.twoFactorAuth.secret = secret.base32;
        user.twoFactorAuth.backupCodes = backupCodes.map(code => ({ code, used: false }));
        await user.save();

        // Send setup email with QR code
        await emailService.send2FASetupEmail(user, qrCodeDataUrl);

        console.log(`🔐 2FA setup initiated for user: ${user.email}`);
        console.log(`📱 QR Code generated for Google Authenticator compatibility`);
        console.log(`🔑 Secret length: ${secret.base32.length} characters`);

        res.json({
            message: '2FA setup initiated. Scan the QR code with Google Authenticator or any compatible TOTP app.',
            qrCode: qrCodeDataUrl,
            backupCodes: backupCodes,
            secret: secret.base32, // For manual entry if QR code doesn't work
            issuer: 'Blocmerce Platform',
            accountName: `Blocmerce (${user.email})`
        });

    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: '2FA setup failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Verify and enable 2FA
router.post('/verify-2fa', auth, [
    body('code').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: '6-digit code is required',
                timestamp: new Date().toISOString()
            });
        }

        const { code } = req.body;
        const user = await User.findById(req.user.id);

        if (!user || !user.twoFactorAuth.secret) {
            return res.status(400).json({
                error: 'Please setup 2FA first',
                timestamp: new Date().toISOString()
            });
        }

        if (user.twoFactorAuth.isEnabled) {
            return res.status(400).json({
                error: '2FA is already enabled',
                timestamp: new Date().toISOString()
            });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorAuth.secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({
                error: 'Invalid 2FA code',
                timestamp: new Date().toISOString()
            });
        }

        // Enable 2FA
        user.twoFactorAuth.isEnabled = true;
        user.twoFactorAuth.lastUsed = new Date();
        await user.save();

        res.json({ 
            message: '2FA enabled successfully',
            backupCodes: user.twoFactorAuth.backupCodes.filter(code => !code.used).map(code => code.code)
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: '2FA verification failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Disable 2FA
router.post('/disable-2fa', auth, [
    body('password').notEmpty().withMessage('Current password is required'),
    body('code').optional().isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { password, code } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!user.twoFactorAuth.isEnabled) {
            return res.status(400).json({
                error: '2FA is not enabled',
                timestamp: new Date().toISOString()
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Invalid password',
                timestamp: new Date().toISOString()
            });
        }

        // Verify 2FA code if provided
        if (code) {
            const verified = speakeasy.totp.verify({
                secret: user.twoFactorAuth.secret,
                encoding: 'base32',
                token: code,
                window: 2
            });

            if (!verified) {
                // Check backup codes
                const backupCode = user.twoFactorAuth.backupCodes.find(
                    bc => bc.code === code.toUpperCase() && !bc.used
                );

                if (!backupCode) {
                    return res.status(400).json({
                        error: 'Invalid 2FA code',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Disable 2FA
        user.twoFactorAuth.isEnabled = false;
        user.twoFactorAuth.secret = null;
        user.twoFactorAuth.backupCodes = [];
        user.twoFactorAuth.lastUsed = null;
        await user.save();

        res.json({ message: '2FA disabled successfully' });

    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to disable 2FA',
                timestamp: new Date().toISOString()
            }
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
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get user profile',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get login history
router.get('/login-history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('loginHistory');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Return last 20 login attempts
        const loginHistory = user.loginHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

        res.json({ loginHistory });

    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get login history',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Update profile (existing functionality preserved)
router.put('/profile', auth, async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            username, 
            wallet_address, 
            profile,
            sellerProfile 
        } = req.body;
        
        const updateData = {
            updated_at: new Date()
        };

        if (firstName) {updateData.firstName = firstName.trim();}
        if (lastName) {updateData.lastName = lastName.trim();}
        if (username) {updateData.username = username.toLowerCase().trim();}
        if (wallet_address !== undefined) {updateData.wallet_address = wallet_address;}

        if (profile) {
            updateData.profile = profile;
        }

        if (sellerProfile) {
            updateData.sellerProfile = sellerProfile;
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password_hash -twoFactorAuth.secret');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        res.json({
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: {
                    message: 'Username or email already exists',
                    timestamp: new Date().toISOString()
                }
            });
        }
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update profile',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get security settings
router.get('/security-settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('security twoFactorAuth.isEnabled');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const securitySettings = {
            loginNotifications: user.security?.loginNotifications !== undefined ? user.security.loginNotifications : true,
            emailAlerts: user.security?.emailAlerts !== undefined ? user.security.emailAlerts : true,
            suspiciousActivityAlerts: user.security?.suspiciousActivityAlerts !== undefined ? user.security.suspiciousActivityAlerts : true,
            sessionTimeout: user.security?.sessionTimeout || 7,
            twoFactorEnabled: user.twoFactorAuth?.isEnabled || false
        };

        res.json({ securitySettings });

    } catch (error) {
        console.error('Get security settings error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get security settings',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Update security settings
router.put('/security-settings', auth, [
    body('loginNotifications').optional().isBoolean().withMessage('Login notifications must be boolean'),
    body('emailAlerts').optional().isBoolean().withMessage('Email alerts must be boolean'),
    body('suspiciousActivityAlerts').optional().isBoolean().withMessage('Suspicious activity alerts must be boolean'),
    body('sessionTimeout').optional().isInt({ min: 0, max: 365 }).withMessage('Session timeout must be between 0 and 365 days')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { loginNotifications, emailAlerts, suspiciousActivityAlerts, sessionTimeout } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Initialize security object if it doesn't exist
        if (!user.security) {
            user.security = {};
        }

        // Update security settings
        if (loginNotifications !== undefined) {user.security.loginNotifications = loginNotifications;}
        if (emailAlerts !== undefined) {user.security.emailAlerts = emailAlerts;}
        if (suspiciousActivityAlerts !== undefined) {user.security.suspiciousActivityAlerts = suspiciousActivityAlerts;}
        if (sessionTimeout !== undefined) {user.security.sessionTimeout = sessionTimeout;}

        user.updated_at = new Date();
        await user.save();

        res.json({ 
            message: 'Security settings updated successfully',
            securitySettings: {
                loginNotifications: user.security.loginNotifications,
                emailAlerts: user.security.emailAlerts,
                suspiciousActivityAlerts: user.security.suspiciousActivityAlerts,
                sessionTimeout: user.security.sessionTimeout
            }
        });

    } catch (error) {
        console.error('Update security settings error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update security settings',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Change password (existing functionality enhanced)
router.put('/change-password', auth, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Current password is incorrect',
                timestamp: new Date().toISOString()
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password_hash = newPasswordHash;
        user.updated_at = new Date();
        await user.save();

        // Reset login attempts
        await user.resetLoginAttempts();

        res.json({ 
            success: true,
            message: 'Password updated successfully' 
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to change password',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Logout (invalidate token on client side, optionally maintain server-side blacklist)
router.post('/logout', auth, async (req, res) => {
    try {
        // In a more sophisticated implementation, you might want to maintain a token blacklist
        // For now, the client should remove the token
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Logout failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Helper function to determine device type
function getDeviceType(userAgent) {
    if (!userAgent) {return 'Unknown';}
    
    userAgent = userAgent.toLowerCase();
    
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        return 'Mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
        return 'Tablet';
    } else {
        return 'Desktop';
    }
}

module.exports = router; 