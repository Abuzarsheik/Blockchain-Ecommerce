const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class KYCService {
    constructor() {
        this.setupFileUpload();
        this.sanctionsLists = this.loadSanctionsList();
        this.pepLists = this.loadPEPList();
    }

    // Configure file upload for KYC documents
    setupFileUpload() {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, '../uploads/kyc');
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const userId = req.user.id;
                const timestamp = Date.now();
                const hash = crypto.randomBytes(8).toString('hex');
                const ext = path.extname(file.originalname);
                cb(null, `${userId}_${file.fieldname}_${timestamp}_${hash}${ext}`);
            }
        });

        const fileFilter = (req, file, cb) => {
            // Allow images and PDFs
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
            }
        };

        this.upload = multer({
            storage,
            fileFilter,
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
                files: 5 // Maximum 5 files per request
            }
        });
    }

    // Get file upload middleware
    getUploadMiddleware() {
        return this.upload.fields([
            { name: 'identityFront', maxCount: 1 },
            { name: 'identityBack', maxCount: 1 },
            { name: 'proofOfAddress', maxCount: 1 },
            { name: 'selfie', maxCount: 1 }
        ]);
    }

    // Submit KYC application
    async submitKYCApplication(userId, personalInfo, documentData) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Update personal information
            user.kyc.personalInfo = {
                ...user.kyc.personalInfo,
                ...personalInfo
            };

            // Update document information
            if (documentData.identity) {
                user.kyc.documents.identity = {
                    ...user.kyc.documents.identity,
                    ...documentData.identity
                };
            }

            if (documentData.proofOfAddress) {
                user.kyc.documents.proofOfAddress = {
                    ...user.kyc.documents.proofOfAddress,
                    ...documentData.proofOfAddress
                };
            }

            if (documentData.selfie) {
                user.kyc.documents.selfie = {
                    ...user.kyc.documents.selfie,
                    ...documentData.selfie
                };
            }

            // Update KYC status
            user.kyc.status = 'in_review';
            user.kyc.submissionDate = new Date();

            // Add to history
            user.kyc.history.push({
                action: 'submitted',
                timestamp: new Date(),
                notes: 'KYC application submitted for review',
                metadata: { personalInfo, documentData }
            });

            await user.save();

            // Run automated checks
            await this.runAutomatedVerification(userId);

            return {
                success: true,
                message: 'KYC application submitted successfully',
                status: user.kyc.status,
                completionPercentage: user.kycCompletionPercentage
            };

        } catch (error) {
            console.error('KYC submission error:', error);
            throw error;
        }
    }

    // Run automated verification checks
    async runAutomatedVerification(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Run compliance checks
            const sanctionsResult = await this.checkSanctionsList(user);
            const pepResult = await this.checkPEPList(user);
            const adverseMediaResult = await this.checkAdverseMedia(user);

            // Update compliance results
            await user.runComplianceChecks(sanctionsResult, pepResult, adverseMediaResult);

            // Calculate risk score
            const riskScore = await this.calculateRiskScore(user);
            const riskLevel = this.getRiskLevel(riskScore);

            await user.updateRiskAssessment(riskScore, riskLevel, []);

            // Auto-approve if low risk and all checks pass
            if (riskLevel === 'low' && sanctionsResult === 'clear' && pepResult === 'clear' && adverseMediaResult === 'clear') {
                await user.updateKycStatus('approved', null, 'Auto-approved based on automated verification');
            }

            return true;

        } catch (error) {
            console.error('Automated verification error:', error);
            throw error;
        }
    }

    // Manual KYC review
    async reviewKYCApplication(userId, decision, reviewerId, notes = null) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            await user.updateKycStatus(decision, reviewerId, notes);

            return {
                success: true,
                message: `KYC application ${decision}`,
                status: user.kyc.status
            };

        } catch (error) {
            console.error('KYC review error:', error);
            throw error;
        }
    }

    // Upload KYC documents
    async uploadDocuments(userId, files) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const uploadedDocs = {};

            // Process identity documents
            if (files.identityFront && files.identityFront[0]) {
                const frontPath = `/uploads/kyc/${files.identityFront[0].filename}`;
                uploadedDocs.identityFront = frontPath;
                await user.addKycDocument('identity', { frontImage: frontPath });
            }

            if (files.identityBack && files.identityBack[0]) {
                const backPath = `/uploads/kyc/${files.identityBack[0].filename}`;
                uploadedDocs.identityBack = backPath;
                await user.addKycDocument('identity', { backImage: backPath });
            }

            // Process proof of address
            if (files.proofOfAddress && files.proofOfAddress[0]) {
                const addressPath = `/uploads/kyc/${files.proofOfAddress[0].filename}`;
                uploadedDocs.proofOfAddress = addressPath;
                await user.addKycDocument('proofOfAddress', { image: addressPath });
            }

            // Process selfie
            if (files.selfie && files.selfie[0]) {
                const selfiePath = `/uploads/kyc/${files.selfie[0].filename}`;
                uploadedDocs.selfie = selfiePath;
                await user.addKycDocument('selfie', { image: selfiePath });
            }

            return {
                success: true,
                message: 'Documents uploaded successfully',
                uploadedDocuments: uploadedDocs,
                completionPercentage: user.kycCompletionPercentage
            };

        } catch (error) {
            console.error('Document upload error:', error);
            throw error;
        }
    }

    // Check against sanctions list
    async checkSanctionsList(user) {
        try {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            
            // Simple sanctions check (in production, use real sanctions API)
            const sanctionedNames = ['john terrorist', 'jane criminal', 'bad actor'];
            
            const isMatch = sanctionedNames.some(name => 
                fullName.includes(name) || name.includes(fullName)
            );

            return isMatch ? 'match' : 'clear';

        } catch (error) {
            console.error('Sanctions list check error:', error);
            return 'clear'; // Default to clear on error
        }
    }

    // Check against PEP (Politically Exposed Persons) list
    async checkPEPList(user) {
        try {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            
            // Simple PEP check (in production, use real PEP API)
            const pepNames = ['political person', 'government official'];
            
            const isMatch = pepNames.some(name => 
                fullName.includes(name) || name.includes(fullName)
            );

            return isMatch ? 'match' : 'clear';

        } catch (error) {
            console.error('PEP list check error:', error);
            return 'clear'; // Default to clear on error
        }
    }

    // Check adverse media
    async checkAdverseMedia(user) {
        try {
            // Simple adverse media check (in production, use real media monitoring API)
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            
            // Mock adverse media check
            const adverseTerms = ['fraud', 'money laundering', 'criminal'];
            
            const hasAdverseMedia = adverseTerms.some(term => 
                fullName.includes(term)
            );

            return hasAdverseMedia ? 'match' : 'clear';

        } catch (error) {
            console.error('Adverse media check error:', error);
            return 'clear'; // Default to clear on error
        }
    }

    // Calculate risk score
    async calculateRiskScore(user) {
        let score = 0;

        // Age factor
        if (user.kyc.personalInfo.dateOfBirth) {
            const age = new Date().getFullYear() - new Date(user.kyc.personalInfo.dateOfBirth).getFullYear();
            if (age < 18 || age > 80) {score += 20;}
            else if (age < 25 || age > 65) {score += 10;}
        }

        // Country risk
        const highRiskCountries = ['AF', 'IQ', 'SY', 'KP']; // ISO codes
        if (highRiskCountries.includes(user.kyc.personalInfo.nationality)) {
            score += 30;
        }

        // Source of funds
        const highRiskSources = ['other'];
        if (highRiskSources.includes(user.kyc.personalInfo.sourceOfFunds)) {
            score += 15;
        }

        // Compliance check results
        if (user.kyc.compliance.sanctionsList.result === 'match') {score += 50;}
        if (user.kyc.compliance.pepCheck.result === 'match') {score += 25;}
        if (user.kyc.compliance.adverseMedia.result === 'match') {score += 20;}

        return Math.min(score, 100); // Cap at 100
    }

    // Get risk level from score
    getRiskLevel(score) {
        if (score <= 30) {return 'low';}
        if (score <= 60) {return 'medium';}
        return 'high';
    }

    // Get KYC statistics
    async getKYCStatistics() {
        try {
            const stats = await User.aggregate([
                {
                    $group: {
                        _id: '$kyc.status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const total = await User.countDocuments();
            
            return {
                total,
                byStatus: stats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {})
            };

        } catch (error) {
            console.error('KYC statistics error:', error);
            throw error;
        }
    }

    // Get pending KYC applications
    async getPendingApplications(page = 1, limit = 10) {
        try {
            const applications = await User.find({
                'kyc.status': { $in: ['in_review', 'pending'] }
            })
            .select('firstName lastName email kyc.status kyc.submissionDate kyc.level')
            .sort({ 'kyc.submissionDate': -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

            const total = await User.countDocuments({
                'kyc.status': { $in: ['in_review', 'pending'] }
            });

            return {
                applications,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page
            };

        } catch (error) {
            console.error('Get pending applications error:', error);
            throw error;
        }
    }

    // Load sanctions list (mock data)
    loadSanctionsList() {
        // In production, load from external API or database
        return [
            'john terrorist',
            'jane criminal',
            'bad actor'
        ];
    }

    // Load PEP list (mock data)
    loadPEPList() {
        // In production, load from external API or database
        return [
            'political person',
            'government official'
        ];
    }
}

module.exports = new KYCService(); 