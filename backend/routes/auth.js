const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, generateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, username, email, password, userType, wallet_address } = req.body;

        // Validation
        if (!firstName || !lastName || !username || !email || !password || !userType) {
            return res.status(400).json({ 
                error: 'First name, last name, username, email, password, and user type are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        if (!['buyer', 'seller'].includes(userType)) {
            return res.status(400).json({ error: 'User type must be either "buyer" or "seller"' });
        }

        // Check if user already exists (email or username)
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

        // Create new user
        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.toLowerCase().trim(),
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            userType: userType,
            wallet_address: wallet_address || null,
            // Initialize profiles based on user type
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

        // Generate JWT token
        const token = generateToken(newUser._id);

        // Return user data (exclude password)
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
            created_at: newUser.created_at
        };

        res.status(201).json({
            message: 'User registered successfully',
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
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        user.updated_at = new Date();
        await user.save();

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
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password_hash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Update user profile
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
        
        // Build update object
        const updateData = {
            updated_at: new Date()
        };

        // Add basic fields if provided
        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (username) updateData.username = username.toLowerCase().trim();
        if (wallet_address !== undefined) updateData.wallet_address = wallet_address;

        // Handle profile nested object
        if (profile) {
            updateData.profile = profile;
        }

        // Handle seller profile nested object
        if (sellerProfile) {
            updateData.sellerProfile = sellerProfile;
        }
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password_hash');

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

// Change password
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        // Get user with password
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
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password_hash = newPasswordHash;
        user.updated_at = new Date();
        await user.save();

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router; 