const User = require('../models/User');
const emailService = require('../services/emailService');
const express = require('express');
const fs = require('fs');
const kycService = require('../services/kycService');
const multer = require('multer');
const path = require('path');
const { auth, adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

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
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('Get profile error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        if (firstName) {updateData.firstName = firstName.trim();}
        if (lastName) {updateData.lastName = lastName.trim();}
        if (username) {updateData.username = username.toLowerCase().trim();}

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
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('Update profile error:', error);
        if (error.code === 11000) {
            return res.status(409).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
            return res.status(400).json({
                success: false,
                error: {
                    message: 'No avatar file uploaded',
                    timestamp: new Date().toISOString()
                }
            });
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
        logger.error('Avatar upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload avatar' });
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
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('Get KYC info error:', error);
        res.status(500).json({ error: error.message || 'Failed to get KYC information' });
    }
});

// Submit KYC personal information
router.post('/kyc/personal-info', auth, [
    body('dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
    body('nationality').isLength({ min: 2, max: 2 }).withMessage('Nationality must be 2-character country code'),
    body('countryOfResidence').isLength({ min: 2, max: 2 }).withMessage('Country of residence must be 2-character country code'),
    body('phoneNumber').isLength({ min: 7, max: 20 }).matches(/^[\+]?[0-9\s\-\(\)]+$/).withMessage('Invalid phone number format'),
    body('address.street').isLength({ min: 1 }).withMessage('Street address is required'),
    body('address.city').isLength({ min: 1 }).withMessage('City is required'),
    body('address.country').isLength({ min: 2, max: 2 }).withMessage('Country must be 2-character country code'),
    body('address.postalCode').optional().isLength({ min: 1, max: 20 }).withMessage('Invalid postal code'),
    body('address.state').optional().isLength({ min: 1, max: 100 }).withMessage('Invalid state/province'),
    body('occupation').isLength({ min: 1 }).withMessage('Occupation is required'),
    body('sourceOfFunds').isIn(['employment', 'business', 'investments', 'inheritance', 'other']).withMessage('Invalid source of funds'),
], async (req, res) => {
    try {
        logger.info(`KYC personal info submission attempt for user: ${req.user.id}`);
        logger.info('Request body:', JSON.stringify(req.body, null, 2));

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('KYC validation errors:', errors.array());
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const personalInfo = req.body;
        
        // Enhanced age validation
        const birthDate = new Date(personalInfo.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            logger.warn(`Age validation failed: ${age} years old`);
            return res.status(400).json({
                success: false,
                error: {
                    message: 'You must be at least 18 years old to complete KYC verification',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Find user with error handling
        const user = await User.findById(req.user.id);
        if (!user) {
            logger.error(`User not found: ${req.user.id}`);
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        logger.info(`Found user: ${user.email}`);

        // Ensure kyc object exists
        if (!user.kyc) {
            user.kyc = {
                status: 'pending',
                personalInfo: {},
                documents: {},
                history: []
            };
        }

        // Update personal information
        user.kyc.personalInfo = {
            ...user.kyc.personalInfo,
            ...personalInfo
        };

        // Save with error handling
        const savedUser = await user.save();
        logger.info(`User saved successfully, completion: ${savedUser.kycCompletionPercentage}%`);

        res.json({
            success: true,
            message: 'Personal information saved successfully',
            completionPercentage: savedUser.kycCompletionPercentage || 0
        });

    } catch (error) {
        logger.error('KYC personal info error details:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            requestBody: req.body
        });
        
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error while saving personal information',
                timestamp: new Date().toISOString()
            }
        });
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
            return res.status(400).json({
                success: false,
                error: {
                    message: 'No documents were uploaded. Please select at least one document to upload.',
                    timestamp: new Date().toISOString()
                }
            });
        }

        logger.info(`📤 Starting KYC document upload for user ${req.user.id}`);
        logger.info(`📋 Files received: ${Object.keys(req.files).join(', ')}`);

        const result = await kycService.uploadDocuments(req.user.id, req.files);

        // Update document metadata
        const user = await User.findById(req.user.id);
        
        if (identityType && req.files.identityFront) {
            user.kyc.documents.identity.type = identityType;
            user.kyc.documents.identity.documentNumber = identityNumber;
            user.kyc.documents.identity.issueDate = identityIssueDate;
            user.kyc.documents.identity.expiryDate = identityExpiryDate;
            user.kyc.documents.identity.issuingAuthority = identityIssuingAuthority;
            logger.info(`📝 Identity document metadata updated: ${identityType}`);
        }

        if (proofOfAddressType && req.files.proofOfAddress) {
            user.kyc.documents.proofOfAddress.type = proofOfAddressType;
            user.kyc.documents.proofOfAddress.issueDate = proofOfAddressIssueDate;
            logger.info(`📝 Proof of address metadata updated: ${proofOfAddressType}`);
        }

        await user.save();
        
        logger.info(`✅ KYC documents successfully saved for user ${req.user.id}`);
        logger.info(`📊 Upload summary: ${result.savedDocuments.length} documents saved`);

        // Enhanced response with detailed confirmation
        const enhancedResult = {
            ...result,
            message: `🎉 SUCCESS! ${result.savedDocuments.length} document(s) have been uploaded and saved securely.`,
            details: {
                uploadedAt: new Date().toISOString(),
                userId: req.user.id,
                totalDocuments: result.savedDocuments.length,
                savedFiles: result.savedDocuments.map(doc => ({
                    type: doc.type,
                    filename: doc.filename,
                    size: `${(doc.size / 1024 / 1024).toFixed(2)} MB`,
                    status: '✅ SAVED'
                })),
                nextSteps: result.completionPercentage >= 80 
                    ? 'Your KYC application is now ready for submission!'
                    : 'Please complete any remaining steps to submit your KYC application.'
            }
        };

        res.json(enhancedResult);

    } catch (error) {
        logger.error('❌ KYC document upload error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to upload documents',
            timestamp: new Date().toISOString()
        });
    }
});

// Submit KYC application for review
router.post('/kyc/submit', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('KYC submission error:', error);
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
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
        }

        res.json({ history: user.kyc.history });

    } catch (error) {
        logger.error('Get KYC history error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('Get pending KYC applications error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// Get KYC statistics (Admin only)
router.get('/kyc/admin/statistics', adminAuth, async (req, res) => {
    try {
        const stats = await kycService.getKYCStatistics();
        res.json(stats);

    } catch (error) {
        logger.error('Get KYC statistics error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('KYC review error:', error);
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
            return res.status(404).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
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
        logger.error('Get KYC application error:', error);
        res.status(500).json({
        success: false,
        error: {
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        }
      });
    }
});

// Test endpoint to verify document storage (for development/testing)
router.get('/kyc/verify-documents', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('firstName lastName kyc.documents kyc.status');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const fs = require('fs');
        const path = require('path');
        
        const documentVerification = {
            userId: req.user.id,
            userName: `${user.firstName} ${user.lastName}`,
            kycStatus: user.kyc.status,
            timestamp: new Date().toISOString(),
            documents: {
                identity: {
                    front: {
                        path: user.kyc.documents.identity.frontImage,
                        exists: user.kyc.documents.identity.frontImage ? 
                            fs.existsSync(path.join(__dirname, '..', user.kyc.documents.identity.frontImage)) : false,
                        verified: user.kyc.documents.identity.verified
                    },
                    back: {
                        path: user.kyc.documents.identity.backImage,
                        exists: user.kyc.documents.identity.backImage ? 
                            fs.existsSync(path.join(__dirname, '..', user.kyc.documents.identity.backImage)) : false,
                        verified: user.kyc.documents.identity.verified
                    },
                    type: user.kyc.documents.identity.type,
                    documentNumber: user.kyc.documents.identity.documentNumber
                },
                proofOfAddress: {
                    path: user.kyc.documents.proofOfAddress.image,
                    exists: user.kyc.documents.proofOfAddress.image ? 
                        fs.existsSync(path.join(__dirname, '..', user.kyc.documents.proofOfAddress.image)) : false,
                    verified: user.kyc.documents.proofOfAddress.verified,
                    type: user.kyc.documents.proofOfAddress.type
                },
                selfie: {
                    path: user.kyc.documents.selfie.image,
                    exists: user.kyc.documents.selfie.image ? 
                        fs.existsSync(path.join(__dirname, '..', user.kyc.documents.selfie.image)) : false,
                    verified: user.kyc.documents.selfie.verified
                }
            }
        };

        const totalDocuments = [
            documentVerification.documents.identity.front.exists,
            documentVerification.documents.identity.back.exists,
            documentVerification.documents.proofOfAddress.exists,
            documentVerification.documents.selfie.exists
        ].filter(Boolean).length;

        const allDocumentsExist = 
            documentVerification.documents.identity.front.path && documentVerification.documents.identity.front.exists &&
            documentVerification.documents.proofOfAddress.path && documentVerification.documents.proofOfAddress.exists &&
            documentVerification.documents.selfie.path && documentVerification.documents.selfie.exists;

        logger.info(`🔍 Document verification requested for user ${req.user.id}`);
        logger.info(`📊 Documents found: ${totalDocuments}/4 (identity back is optional)`);

        res.json({
            success: true,
            message: allDocumentsExist ? 
                '✅ All required documents are properly saved and accessible!' : 
                '⚠️ Some documents may be missing or inaccessible.',
            verification: documentVerification,
            summary: {
                totalDocuments,
                allRequiredDocuments: allDocumentsExist,
                status: allDocumentsExist ? '✅ COMPLETE' : '⚠️ INCOMPLETE'
            }
        });

    } catch (error) {
        logger.error('❌ Document verification error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to verify documents',
                details: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

module.exports = router; 