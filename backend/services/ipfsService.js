// Try to import required modules, fallback if not available
let PinataSDK;

try {
    const pinataModule = require('@pinata/sdk');
    PinataSDK = pinataModule.PinataSDK || pinataModule.default || pinataModule;
} catch (error) {
    // Silent fallback - will show warning later in initializePinata if needed
    PinataSDK = null;
}

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class IPFSService {
    constructor() {
        this.pinata = null;
        this.isInitialized = false;
        this.usePublicGateway = false;
        // Initialize in fallback mode by default
        this.initializePinata();
        this.isInitialized = true;
    }

    async init() {
        try {
            // Try to initialize services
            await this.tryInitializeIPFS();
        } catch (error) {
            this.isInitialized = false;
            this.usePublicGateway = true;
            // Silent fallback - message handled in server.js
        }
    }

    async tryInitializeIPFS() {
        try {
            // Initialize Pinata for production pinning
            this.initializePinata();
            this.isInitialized = true;
            return;
        } catch (error) {
            throw new Error('IPFS service initialization failed');
        }
    }

    initializePinata() {
        if (PinataSDK && process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
            try {
                this.pinata = new PinataSDK({
                    pinataApiKey: process.env.PINATA_API_KEY,
                    pinataSecretApiKey: process.env.PINATA_SECRET_KEY
                });
            } catch (error) {
                // Silent fallback
            }
        }
        // No warning needed - handled in server.js
    }

    async testConnection() {
        try {
            console.log(`📡 IPFS running in fallback mode`);
            return true;
        } catch (error) {
            throw new Error(`IPFS connection failed: ${error.message}`);
        }
    }

    /**
     * Upload file to IPFS with fallback handling
     */
    async uploadFile(filePath, options = {}) {
        try {
            // Always use fallback storage for now
            return this.uploadFileToFallback(filePath, options);

        } catch (error) {
            logger.error('IPFS upload error:', error);
            throw error;
        }
    }

    /**
     * Fallback file upload to local storage
     */
    async uploadFileToFallback(filePath, options = {}) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            
            // Generate a hash for the file
            const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const mockIPFSHash = `bafkreig${hash.substring(0, 52)}`;
            
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Save file to local storage
            const localPath = path.join(uploadsDir, mockIPFSHash);
            fs.writeFileSync(localPath, fileBuffer);
            
            console.log(`📁 File stored in fallback storage: ${mockIPFSHash}`);
            
            return {
                success: true,
                hash: mockIPFSHash,
                url: `/uploads/ipfs-fallback/${mockIPFSHash}`,
                size: fileBuffer.length,
                fileName: fileName,
                fallback: true
            };
            
        } catch (error) {
            throw new Error(`Failed to store file in fallback storage: ${error.message}`);
        }
    }

    /**
     * Upload NFT metadata to IPFS with fallback handling
     */
    async uploadNFTMetadata(metadata) {
        try {
            // Always use fallback storage for now
            return this.uploadMetadataToFallback(metadata);

        } catch (error) {
            logger.error('NFT metadata upload error:', error);
            throw error;
        }
    }

    /**
     * Fallback metadata upload to local storage
     */
    async uploadMetadataToFallback(metadata) {
        try {
            const validatedMetadata = this.validateNFTMetadata(metadata);
            const metadataString = JSON.stringify(validatedMetadata, null, 2);
            
            // Generate a hash for the metadata
            const hash = crypto.createHash('sha256').update(metadataString).digest('hex');
            const mockIPFSHash = `bafkreig${hash.substring(0, 52)}`;
            
            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Save metadata to local storage
            const localPath = path.join(uploadsDir, `${mockIPFSHash}.json`);
            fs.writeFileSync(localPath, metadataString);
            
            console.log(`📁 Metadata stored in fallback storage: ${mockIPFSHash}`);
            
            return {
                success: true,
                hash: mockIPFSHash,
                url: `/uploads/ipfs-fallback/${mockIPFSHash}.json`,
                metadata: validatedMetadata,
                fallback: true
            };
            
        } catch (error) {
            throw new Error(`Failed to store metadata in fallback storage: ${error.message}`);
        }
    }

    /**
     * Validate NFT metadata according to standards
     */
    validateNFTMetadata(metadata) {
        const required = ['name', 'description', 'image'];
        const missing = required.filter(field => !metadata[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
        }

        return {
            name: metadata.name,
            description: metadata.description,
            image: metadata.image,
            external_url: metadata.external_url || '',
            animation_url: metadata.animation_url || '',
            attributes: metadata.attributes || [],
            properties: metadata.properties || {},
            // Add standard fields
            created_by: metadata.created_by || 'Blocmerce',
            created_at: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    /**
     * Retrieve file from IPFS
     */
    async getFile(hash) {
        try {
            // Try to get from fallback storage
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            const localPath = path.join(uploadsDir, hash);
            
            if (fs.existsSync(localPath)) {
                const fileBuffer = fs.readFileSync(localPath);
                return {
                    success: true,
                    data: fileBuffer,
                    url: `/uploads/ipfs-fallback/${hash}`
                };
            }
            
            throw new Error('File not found in fallback storage');

        } catch (error) {
            logger.error('IPFS retrieval error:', error);
            throw new Error(`Failed to retrieve file: ${error.message}`);
        }
    }

    /**
     * Pin existing content
     */
    async pinContent(hash, metadata = {}) {
        try {
            // In fallback mode, just check if file exists
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            const localPath = path.join(uploadsDir, hash);
            
            if (fs.existsSync(localPath)) {
                return { success: true, hash };
            }
            
            return { success: false, error: 'Content not found' };

        } catch (error) {
            logger.error('IPFS pinning error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get IPFS gateway URL
     */
    getGatewayUrl() {
        return process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs';
    }

    /**
     * Get pinned content list
     */
    async getPinnedContent() {
        try {
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            
            if (!fs.existsSync(uploadsDir)) {
                return [];
            }
            
            const files = fs.readdirSync(uploadsDir);
            return files.map(file => ({
                hash: file,
                type: 'local'
            }));

        } catch (error) {
            logger.error('Error getting pinned content:', error);
            return [];
        }
    }

    /**
     * Generate IPFS hash for content without uploading
     */
    async generateHash(content) {
        try {
            const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
            
            // Use crypto to generate a content hash similar to IPFS
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            return `bafkreig${hash.substring(0, 52)}`; // Mock IPFS CID format
            
        } catch (error) {
            logger.error('Hash generation error:', error);
            throw error;
        }
    }

    /**
     * Check if content exists on IPFS
     */
    async contentExists(hash) {
        try {
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            const localPath = path.join(uploadsDir, hash);
            
            return fs.existsSync(localPath);

        } catch (error) {
            return false;
        }
    }

    /**
     * Unpin content
     */
    async unpinContent(hash) {
        try {
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            const localPath = path.join(uploadsDir, hash);
            
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                return { success: true };
            }
            
            return { success: false, error: 'Content not found' };

        } catch (error) {
            logger.error('Error unpinning content:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get service statistics
     */
    async getStats() {
        try {
            const uploadsDir = path.join(__dirname, '../../uploads/ipfs-fallback');
            
            if (!fs.existsSync(uploadsDir)) {
                return {
                    repoSize: 0,
                    storageMax: 'unlimited',
                    numObjects: 0,
                    connectedPeers: 0,
                    version: 'fallback-mode'
                };
            }
            
            const files = fs.readdirSync(uploadsDir);
            let totalSize = 0;
            
            files.forEach(file => {
                const stats = fs.statSync(path.join(uploadsDir, file));
                totalSize += stats.size;
            });
            
            return {
                repoSize: totalSize,
                storageMax: 'unlimited',
                numObjects: files.length,
                connectedPeers: 0,
                version: 'fallback-mode'
            };

        } catch (error) {
            logger.error('Error getting IPFS stats:', error);
            return {
                repoSize: 0,
                storageMax: 'unlimited', 
                numObjects: 0,
                connectedPeers: 0,
                version: 'fallback-mode'
            };
        }
    }
}

// Create singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService; 