const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');
const kycService = require('../services/kycService');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ===========================================
// PROFILE MANAGEMENT ROUTES
// ===========================================

// Get user profile
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password_hash -twoFactorAuth.secret -passwordReset -emailVerification.token');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
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
                emailVerified: user.emailVerification?.isVerified || false,
                kyc: {
                    status: user.kyc.status,
                    level: user.kyc.level,
                    completionPercentage: user.kycCompletionPercentage,
                    isApproved: user.isKycApproved,
                    isExpired: user.isKycExpired
                },
                lastLogin: user.lastLogin,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Update user profile
router.put('/', auth, [
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    body('username').optional().trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
    body('profile.bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('profile.location').optional().isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
    body('profile.website').optional().isURL().withMessage('Invalid website URL'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            firstName,
            lastName,
            username,
            profile,
            sellerProfile
        } = req.body;

        const updateData = {
            updated_at: new Date()
        };

        // Update basic info
        if (firstName) updateData.firstName = firstName.trim();
        if (lastName) updateData.lastName = lastName.trim();
        if (username) updateData.username = username.toLowerCase().trim();

        // Update profile
        if (profile) {
            updateData['profile.bio'] = profile.bio || '';
            updateData['profile.location'] = profile.location || '';
            updateData['profile.website'] = profile.website || '';
            updateData['profile.preferredLanguage'] = profile.preferredLanguage || 'en';
            updateData['profile.timezone'] = profile.timezone || 'UTC';
            
            if (profile.social) {
                updateData['profile.social.twitter'] = profile.social.twitter || '';
                updateData['profile.social.instagram'] = profile.social.instagram || '';
                updateData['profile.social.discord'] = profile.social.discord || '';
            }

            if (profile.notifications) {
                updateData['profile.notifications'] = profile.notifications;
            }

            if (profile.privacy) {
                updateData['profile.privacy'] = profile.privacy;
            }
        }

        // Update seller profile (if user is seller)
        if (sellerProfile && req.user.userType === 'seller') {
            updateData['sellerProfile.storeName'] = sellerProfile.storeName || '';
            updateData['sellerProfile.storeDescription'] = sellerProfile.storeDescription || '';
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
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                profile: user.profile,
                sellerProfile: user.sellerProfile,
                updated_at: user.updated_at
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Upload profile avatar
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
        }
    }
});

router.post('/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No avatar file uploaded' });
        }

        const avatarPath = `/uploads/avatars/${req.file.filename}`;

        // Update user avatar
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 'profile.avatar': avatarPath },
            { new: true }
        ).select('profile.avatar');

        res.json({
            message: 'Avatar uploaded successfully',
            avatar: user.profile.avatar
        });

    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// ===========================================
// KYC VERIFICATION ROUTES
// ===========================================

// Get KYC status and information
router.get('/kyc', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('kyc firstName lastName email');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Don't expose sensitive document paths in response
        const kycInfo = {
            status: user.kyc.status,
            level: user.kyc.level,
            submissionDate: user.kyc.submissionDate,
            reviewDate: user.kyc.reviewDate,
            expiryDate: user.kyc.expiryDate,
            rejectionReason: user.kyc.rejectionReason,
            completionPercentage: user.kycCompletionPercentage,
            isApproved: user.isKycApproved,
            isExpired: user.isKycExpired,
            personalInfo: user.kyc.personalInfo,
            riskAssessment: {
                level: user.kyc.riskAssessment.level,
                score: user.kyc.riskAssessment.score,
                lastAssessment: user.kyc.riskAssessment.lastAssessment
            },
            transactionLimits: user.kyc.transactionLimits,
            documents: {
                identity: {
                    type: user.kyc.documents.identity.type,
                    verified: user.kyc.documents.identity.verified,
                    hasFiles: !!(user.kyc.documents.identity.frontImage || user.kyc.documents.identity.backImage)
                },
                proofOfAddress: {
                    type: user.kyc.documents.proofOfAddress.type,
                    verified: user.kyc.documents.proofOfAddress.verified,
                    hasFiles: !!user.kyc.documents.proofOfAddress.image
                },
                selfie: {
                    verified: user.kyc.documents.selfie.verified,
                    hasFiles: !!user.kyc.documents.selfie.image
                }
            }
        };

        res.json({ kyc: kycInfo });

    } catch (error) {
        console.error('Get KYC info error:', error);
        res.status(500).json({ error: 'Failed to get KYC information' });
    }
});

// Submit KYC personal information
router.post('/kyc/personal-info', auth, [
    body('dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
    body('nationality').isLength({ min: 2, max: 2 }).withMessage('Nationality must be 2-character country code'),
    body('countryOfResidence').isLength({ min: 2, max: 2 }).withMessage('Country of residence must be 2-character country code'),
    body('phoneNumber').isMobilePhone().withMessage('Invalid phone number'),
    body('address.street').isLength({ min: 1 }).withMessage('Street address is required'),
    body('address.city').isLength({ min: 1 }).withMessage('City is required'),
    body('address.country').isLength({ min: 2, max: 2 }).withMessage('Country must be 2-character country code'),
    body('occupation').isLength({ min: 1 }).withMessage('Occupation is required'),
    body('sourceOfFunds').isIn(['employment', 'business', 'investments', 'inheritance', 'other']).withMessage('Invalid source of funds'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const personalInfo = req.body;
        
        // Validate age (must be 18+)
        const age = new Date().getFullYear() - new Date(personalInfo.dateOfBirth).getFullYear();
        if (age < 18) {
            return res.status(400).json({ error: 'You must be at least 18 years old to complete KYC verification' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update personal information
        user.kyc.personalInfo = personalInfo;
        await user.save();

        res.json({
            message: 'Personal information saved successfully',
            completionPercentage: user.kycCompletionPercentage
        });

    } catch (error) {
        console.error('KYC personal info error:', error);
        res.status(500).json({ error: 'Failed to save personal information' });
    }
});

// Upload KYC documents
router.post('/kyc/documents', auth, kycService.getUploadMiddleware(), async (req, res) => {
    try {
        const { 
            identityType, 
            identityNumber, 
            identityIssueDate, 
            identityExpiryDate,
            identityIssuingAuthority,
            proofOfAddressType,
            proofOfAddressIssueDate
        } = req.body;

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ error: 'No documents uploaded' });
        }

        const result = await kycService.uploadDocuments(req.user.id, req.files);

        // Update document metadata
        const user = await User.findById(req.user.id);
        
        if (identityType && req.files.identityFront) {
            user.kyc.documents.identity.type = identityType;
            user.kyc.documents.identity.documentNumber = identityNumber;
            user.kyc.documents.identity.issueDate = identityIssueDate;
            user.kyc.documents.identity.expiryDate = identityExpiryDate;
            user.kyc.documents.identity.issuingAuthority = identityIssuingAuthority;
        }

        if (proofOfAddressType && req.files.proofOfAddress) {
            user.kyc.documents.proofOfAddress.type = proofOfAddressType;
            user.kyc.documents.proofOfAddress.issueDate = proofOfAddressIssueDate;
        }

        await user.save();

        res.json(result);

    } catch (error) {
        console.error('KYC document upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload documents' });
    }
});

// Submit KYC application for review
router.post('/kyc/submit', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if application is complete
        if (user.kycCompletionPercentage < 80) {
            return res.status(400).json({ 
                error: 'KYC application is incomplete. Please fill all required fields and upload documents.',
                completionPercentage: user.kycCompletionPercentage
            });
        }

        const result = await kycService.submitKYCApplication(
            req.user.id, 
            user.kyc.personalInfo,
            user.kyc.documents
        );

        res.json(result);

    } catch (error) {
        console.error('KYC submission error:', error);
        res.status(500).json({ error: error.message || 'Failed to submit KYC application' });
    }
});

// Get KYC history
router.get('/kyc/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('kyc.history')
            .populate('kyc.history.performedBy', 'firstName lastName email');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ history: user.kyc.history });

    } catch (error) {
        console.error('Get KYC history error:', error);
        res.status(500).json({ error: 'Failed to get KYC history' });
    }
});

// ===========================================
// ADMIN KYC MANAGEMENT ROUTES
// ===========================================

// Get pending KYC applications (Admin only)
router.get('/kyc/admin/pending', adminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await kycService.getPendingApplications(page, limit);
        res.json(result);

    } catch (error) {
        console.error('Get pending KYC applications error:', error);
        res.status(500).json({ error: 'Failed to get pending applications' });
    }
});

// Get KYC statistics (Admin only)
router.get('/kyc/admin/statistics', adminAuth, async (req, res) => {
    try {
        const stats = await kycService.getKYCStatistics();
        res.json(stats);

    } catch (error) {
        console.error('Get KYC statistics error:', error);
        res.status(500).json({ error: 'Failed to get KYC statistics' });
    }
});

// Review KYC application (Admin only)
router.post('/kyc/admin/review/:userId', adminAuth, [
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId } = req.params;
        const { decision, notes } = req.body;

        const result = await kycService.reviewKYCApplication(
            userId, 
            decision, 
            req.user.id, 
            notes
        );

        // Send notification email to user
        const user = await User.findById(userId);
        if (user) {
            await emailService.sendKycStatusUpdate(user, decision, notes);
        }

        res.json(result);

    } catch (error) {
        console.error('KYC review error:', error);
        res.status(500).json({ error: error.message || 'Failed to review KYC application' });
    }
});

// Get detailed KYC application (Admin only)
router.get('/kyc/admin/application/:userId', adminAuth, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('firstName lastName email kyc')
            .populate('kyc.reviewedBy', 'firstName lastName email')
            .populate('kyc.history.performedBy', 'firstName lastName email');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            },
            kyc: user.kyc
        });

    } catch (error) {
        console.error('Get KYC application error:', error);
        res.status(500).json({ error: 'Failed to get KYC application' });
    }
});

module.exports = router; 