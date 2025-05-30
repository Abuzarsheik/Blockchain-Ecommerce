const express = require('express');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, generateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
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
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { firstName, lastName, username, email, password, userType, wallet_address } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ error: 'User with this email already exists' });
            } else {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Generate email verification token
        const emailVerificationToken = emailService.generateSecureToken();

        // Create new user
        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            userType: userType,
            wallet_address: wallet_address || null,
            emailVerification: {
                token: emailVerificationToken,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            },
            profile: {
                avatar: null,
                bio: '',
                location: '',
                website: '',
                social: {
                    twitter: '',
                    instagram: '',
                    discord: ''
                }
            },
            sellerProfile: userType === 'seller' ? {
                storeName: '',
                storeDescription: '',
                isVerified: false,
                rating: 0,
                totalSales: 0,
                commission: 5
            } : undefined
        });

        await newUser.save();

        // Send email verification
        await emailService.sendEmailVerification(newUser, emailVerificationToken);

        // Generate JWT token
        const token = generateToken(newUser._id);

        // Log registration
        const ipAddress = getClientIP(req);
        await newUser.addLoginHistory(ipAddress, req.headers['user-agent'], null, true);

        // Return user data (exclude sensitive fields)
        const userData = {
            id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username,
            email: newUser.email,
            userType: newUser.userType,
            wallet_address: newUser.wallet_address,
            profile: newUser.profile,
            sellerProfile: newUser.sellerProfile,
            isVerified: newUser.isVerified,
            emailVerified: newUser.emailVerification.isVerified,
            created_at: newUser.created_at
        };

        res.status(201).json({
            message: 'User registered successfully. Please check your email to verify your account.',
            user: userData,
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

        const { email, password, twoFactorCode } = req.body;
        const ipAddress = getClientIP(req);
        const userAgent = req.headers['user-agent'];

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if account is locked
        if (user.isLocked) {
            await user.addLoginHistory(ipAddress, userAgent, null, false);
            return res.status(423).json({ 
                error: 'Account temporarily locked due to too many failed attempts. Please try again later.' 
            });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            await user.incLoginAttempts();
            await user.addLoginHistory(ipAddress, userAgent, null, false);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check 2FA if enabled
        if (user.twoFactorAuth.isEnabled) {
            if (!twoFactorCode) {
                return res.status(200).json({ 
                    message: 'Two-factor authentication required',
                    requires2FA: true,
                    tempToken: generateToken(user._id, '5m') // Short-lived token for 2FA verification
                });
            }

            // Verify 2FA code
            const verified = speakeasy.totp.verify({
                secret: user.twoFactorAuth.secret,
                encoding: 'base32',
                token: twoFactorCode,
                window: 2 // Allow 60 seconds clock drift
            });

            if (!verified) {
                // Check backup codes
                const backupCode = user.twoFactorAuth.backupCodes.find(
                    code => code.code === twoFactorCode.toUpperCase() && !code.used
                );

                if (!backupCode) {
                    await user.incLoginAttempts();
                    await user.addLoginHistory(ipAddress, userAgent, null, false);
                    return res.status(401).json({ error: 'Invalid two-factor authentication code' });
                }

                // Mark backup code as used
                backupCode.used = true;
                await user.save();
            }

            // Update 2FA last used timestamp
            user.twoFactorAuth.lastUsed = new Date();
            await user.save();
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Update last login and log the login
        user.lastLogin = new Date();
        user.updated_at = new Date();
        await user.save();
        await user.addLoginHistory(ipAddress, userAgent, null, true);

        // Send login notification if enabled
        if (user.security.loginNotifications) {
            await emailService.sendLoginNotification(user, ipAddress, userAgent, null);
        }

        // Get device info for security alert
        const deviceInfo = {
            userAgent: userAgent || 'Unknown',
            ipAddress: ipAddress || 'Unknown',
            deviceType: getDeviceType(userAgent),
            location: 'Unknown' // You could integrate with IP geolocation service
        };

        // Check if this is a new device (simple implementation)
        const isNewDevice = !user.trusted_devices?.some(device => 
            device.userAgent === deviceInfo.userAgent && device.ipAddress === deviceInfo.ipAddress
        );

        // Add device to trusted devices if not already there
        if (isNewDevice) {
            if (!user.trusted_devices) {
                user.trusted_devices = [];
            }
            user.trusted_devices.push({
                ...deviceInfo,
                firstSeen: new Date(),
                lastUsed: new Date()
            });
            
            // Send security alert for new device login
            try {
                await notificationService.sendSecurityAlert(user._id, 'login_new_device', {
                    deviceType: deviceInfo.deviceType,
                    location: deviceInfo.location,
                    ipAddress: deviceInfo.ipAddress,
                    loginTime: new Date().toISOString()
                }, deviceInfo);
            } catch (notifError) {
                console.error('Failed to send new device login notification:', notifError);
            }
        } else {
            // Update last used time for existing device
            const deviceIndex = user.trusted_devices.findIndex(device => 
                device.userAgent === deviceInfo.userAgent && device.ipAddress === deviceInfo.ipAddress
            );
            if (deviceIndex !== -1) {
                user.trusted_devices[deviceIndex].lastUsed = new Date();
            }
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
                wallet_address: user.wallet_address,
                profile: user.profile,
                sellerProfile: user.sellerProfile,
                isVerified: user.isVerified,
                emailVerified: user.emailVerification.isVerified,
                twoFactorEnabled: user.twoFactorAuth.isEnabled,
                created_at: user.created_at,
                updated_at: user.updated_at,
                lastLogin: user.lastLogin,
                isNewDevice
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await User.findOne({
            'emailVerification.token': token,
            'emailVerification.expires': { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
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
        res.status(500).json({ error: 'Email verification failed' });
    }
});

// Resend email verification
router.post('/resend-verification', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.emailVerification.isVerified) {
            return res.status(400).json({ error: 'Email is already verified' });
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
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});

// Request password reset
router.post('/forgot-password', passwordResetLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal whether user exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Check if too many reset attempts
        if (user.passwordReset.attempts >= 3) {
            return res.status(429).json({ error: 'Too many password reset attempts. Please try again later.' });
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
        res.status(500).json({ error: 'Password reset request failed' });
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
            return res.status(400).json({ error: 'Invalid or expired reset token' });
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
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// Setup 2FA
router.post('/setup-2fa', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.twoFactorAuth.isEnabled) {
            return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `YourApp (${user.email})`,
            issuer: 'YourApp',
            length: 20
        });

        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Generate backup codes
        const backupCodes = emailService.generateBackupCodes();

        // Save secret (but don't enable yet)
        user.twoFactorAuth.secret = secret.base32;
        user.twoFactorAuth.backupCodes = backupCodes.map(code => ({ code, used: false }));
        await user.save();

        // Send setup email with QR code
        await emailService.send2FASetupEmail(user, qrCodeDataUrl);

        res.json({
            message: '2FA setup initiated. Please scan the QR code with your authenticator app.',
            qrCode: qrCodeDataUrl,
            backupCodes: backupCodes,
            secret: secret.base32 // For manual entry if QR code doesn't work
        });

    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: '2FA setup failed' });
    }
});

// Verify and enable 2FA
router.post('/verify-2fa', auth, [
    body('code').isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: '6-digit code is required' });
        }

        const { code } = req.body;
        const user = await User.findById(req.user.id);

        if (!user || !user.twoFactorAuth.secret) {
            return res.status(400).json({ error: 'Please setup 2FA first' });
        }

        if (user.twoFactorAuth.isEnabled) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorAuth.secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid 2FA code' });
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
        res.status(500).json({ error: '2FA verification failed' });
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
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.twoFactorAuth.isEnabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
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
                    return res.status(400).json({ error: 'Invalid 2FA code' });
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
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password_hash -twoFactorAuth.secret -passwordReset -emailVerification.token');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Get login history
router.get('/login-history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('loginHistory');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return last 20 login attempts
        const loginHistory = user.loginHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 20);

        res.json({ loginHistory });

    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ error: 'Failed to get login history' });
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

        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (username) updateData.username = username.toLowerCase().trim();
        if (wallet_address !== undefined) updateData.wallet_address = wallet_address;

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
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Get security settings
router.get('/security-settings', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('security twoFactorAuth.isEnabled');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
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
        res.status(500).json({ error: 'Failed to get security settings' });
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
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize security object if it doesn't exist
        if (!user.security) {
            user.security = {};
        }

        // Update security settings
        if (loginNotifications !== undefined) user.security.loginNotifications = loginNotifications;
        if (emailAlerts !== undefined) user.security.emailAlerts = emailAlerts;
        if (suspiciousActivityAlerts !== undefined) user.security.suspiciousActivityAlerts = suspiciousActivityAlerts;
        if (sessionTimeout !== undefined) user.security.sessionTimeout = sessionTimeout;

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
        res.status(500).json({ error: 'Failed to update security settings' });
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
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
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
        res.status(500).json({ error: 'Failed to change password' });
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
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Helper function to determine device type
function getDeviceType(userAgent) {
    if (!userAgent) return 'Unknown';
    
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