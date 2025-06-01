const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ipfsService = require('../services/ipfsService');
const { auth } = require('../middleware/auth');

// IPFS Health Check (no auth required)
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'ok',
            service: 'IPFS',
            timestamp: new Date().toISOString(),
            initialized: ipfsService.isInitialized
        };

        if (ipfsService.isInitialized) {
            try {
                const stats = await ipfsService.getStats();
                health.stats = stats;
                health.message = 'IPFS service operational';
            } catch (statsError) {
                health.message = 'IPFS service running but stats unavailable';
                health.warning = statsError.message;
            }
        } else {
            health.status = 'degraded';
            health.message = 'IPFS service not initialized - using fallback storage';
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            service: 'IPFS',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/temp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|pdf|json|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('File type not allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: fileFilter
});

// Upload file to IPFS - FIXED VERSION
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided'
            });
        }

        const result = await ipfsService.uploadFile(req.file.path, {
            metadata: {
                originalName: req.file.originalname,
                uploadedBy: req.user.id,
                uploadedAt: new Date(),
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });

        // Clean up temporary file
        fs.unlinkSync(req.file.path);

        res.json(result);

    } catch (error) {
        // Clean up on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('IPFS upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload NFT metadata to IPFS
router.post('/metadata', auth, async (req, res) => {
    try {
        const { metadata } = req.body;

        if (!metadata) {
            return res.status(400).json({
                success: false,
                error: 'Metadata is required'
            });
        }

        // Add creator information
        metadata.created_by = req.user.id;
        metadata.created_at = new Date().toISOString();

        const result = await ipfsService.uploadNFTMetadata(metadata);

        res.json(result);

    } catch (error) {
        console.error('NFT metadata upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get file from IPFS
router.get('/file/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        const result = await ipfsService.getFile(hash);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
        
        res.send(result.data);

    } catch (error) {
        console.error('IPFS file retrieval error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Pin content to IPFS
router.post('/pin', auth, async (req, res) => {
    try {
        const { hash, metadata = {} } = req.body;

        if (!hash) {
            return res.status(400).json({
                success: false,
                error: 'Hash is required'
            });
        }

        metadata.pinnedBy = req.user.id;
        metadata.pinnedAt = new Date().toISOString();

        const result = await ipfsService.pinContent(hash, metadata);

        res.json(result);

    } catch (error) {
        console.error('IPFS pin error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Unpin content from IPFS
router.delete('/pin/:hash', auth, async (req, res) => {
    try {
        const { hash } = req.params;

        // Check if user has permission to unpin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const result = await ipfsService.unpinContent(hash);

        res.json(result);

    } catch (error) {
        console.error('IPFS unpin error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get pinned content list
router.get('/pins', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const pins = await ipfsService.getPinnedContent();

        res.json({
            success: true,
            pins
        });

    } catch (error) {
        console.error('Get pins error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check if content exists
router.get('/exists/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        const exists = await ipfsService.contentExists(hash);

        res.json({
            success: true,
            exists,
            hash
        });

    } catch (error) {
        console.error('Content exists check error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get IPFS statistics
router.get('/stats', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const stats = await ipfsService.getStats();

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('IPFS stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Generate hash for content
router.post('/hash', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }

        const hash = await ipfsService.generateHash(content);

        res.json({
            success: true,
            hash
        });

    } catch (error) {
        console.error('Hash generation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bulk upload multiple files
router.post('/upload/bulk', auth, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files provided'
            });
        }

        const uploadPromises = req.files.map(async (file) => {
            try {
                const result = await ipfsService.uploadFile(file.path, {
                    metadata: {
                        originalName: file.originalname,
                        uploadedBy: req.user.id,
                        uploadedAt: new Date(),
                        mimetype: file.mimetype,
                        size: file.size
                    }
                });

                // Clean up temporary file
                fs.unlinkSync(file.path);

                return {
                    success: true,
                    originalName: file.originalname,
                    ...result
                };
            } catch (error) {
                // Clean up on error
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return {
                    success: false,
                    originalName: file.originalname,
                    error: error.message
                };
            }
        });

        const results = await Promise.all(uploadPromises);

        res.json({
            success: true,
            results
        });

    } catch (error) {
        // Clean up all files on error
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        console.error('Bulk upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 