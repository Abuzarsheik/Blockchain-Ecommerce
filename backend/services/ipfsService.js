const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IPFSService {
    constructor() {
        this.ipfs = null;
        this.pinata = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Initialize IPFS node (local or remote)
            this.ipfs = create({
                host: process.env.IPFS_HOST || 'localhost',
                port: process.env.IPFS_PORT || 5001,
                protocol: process.env.IPFS_PROTOCOL || 'http'
            });

            // Initialize Pinata for production pinning
            if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
                const { PinataSDK } = require('@pinata/sdk');
                this.pinata = new PinataSDK({
                    pinataApiKey: process.env.PINATA_API_KEY,
                    pinataSecretApiKey: process.env.PINATA_SECRET_KEY
                });
            }

            // Test connection
            await this.testConnection();
            this.isInitialized = true;
            console.log('✅ IPFS service initialized successfully');

        } catch (error) {
            console.warn('⚠️ IPFS service initialization failed, using fallback storage:', error.message);
            this.isInitialized = false;
        }
    }

    async testConnection() {
        try {
            const version = await this.ipfs.version();
            console.log(`📡 Connected to IPFS node version: ${version.version}`);
            return true;
        } catch (error) {
            throw new Error(`IPFS connection failed: ${error.message}`);
        }
    }

    /**
     * Upload file to IPFS
     */
    async uploadFile(filePath, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('IPFS service not initialized');
            }

            const fileBuffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);

            // Upload to IPFS
            const result = await this.ipfs.add({
                path: fileName,
                content: fileBuffer
            }, {
                pin: true,
                cidVersion: 1,
                ...options
            });

            const ipfsHash = result.cid.toString();

            // Pin to Pinata for persistence (if available)
            if (this.pinata) {
                try {
                    await this.pinata.pinByHash(ipfsHash, {
                        pinataMetadata: {
                            name: fileName,
                            ...options.metadata
                        }
                    });
                    console.log(`📌 File pinned to Pinata: ${ipfsHash}`);
                } catch (pinataError) {
                    console.warn('Pinata pinning failed:', pinataError.message);
                }
            }

            return {
                success: true,
                hash: ipfsHash,
                url: `${this.getGatewayUrl()}/${ipfsHash}`,
                size: fileBuffer.length,
                fileName: fileName
            };

        } catch (error) {
            console.error('IPFS upload error:', error);
            throw new Error(`Failed to upload file to IPFS: ${error.message}`);
        }
    }

    /**
     * Upload NFT metadata to IPFS
     */
    async uploadNFTMetadata(metadata) {
        try {
            if (!this.isInitialized) {
                throw new Error('IPFS service not initialized');
            }

            // Validate metadata format
            const validatedMetadata = this.validateNFTMetadata(metadata);
            
            // Convert to buffer
            const metadataBuffer = Buffer.from(JSON.stringify(validatedMetadata, null, 2));

            // Upload to IPFS
            const result = await this.ipfs.add({
                path: 'metadata.json',
                content: metadataBuffer
            }, {
                pin: true,
                cidVersion: 1
            });

            const ipfsHash = result.cid.toString();

            // Pin to Pinata
            if (this.pinata) {
                try {
                    await this.pinata.pinByHash(ipfsHash, {
                        pinataMetadata: {
                            name: `NFT Metadata - ${metadata.name}`,
                            keyvalues: {
                                type: 'nft-metadata',
                                nftName: metadata.name
                            }
                        }
                    });
                } catch (pinataError) {
                    console.warn('Pinata metadata pinning failed:', pinataError.message);
                }
            }

            return {
                success: true,
                hash: ipfsHash,
                url: `${this.getGatewayUrl()}/${ipfsHash}`,
                metadata: validatedMetadata
            };

        } catch (error) {
            console.error('NFT metadata upload error:', error);
            throw new Error(`Failed to upload NFT metadata: ${error.message}`);
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
            if (!this.isInitialized) {
                throw new Error('IPFS service not initialized');
            }

            const chunks = [];
            for await (const chunk of this.ipfs.cat(hash)) {
                chunks.push(chunk);
            }

            const fileBuffer = Buffer.concat(chunks);
            
            return {
                success: true,
                data: fileBuffer,
                url: `${this.getGatewayUrl()}/${hash}`
            };

        } catch (error) {
            console.error('IPFS retrieval error:', error);
            throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
        }
    }

    /**
     * Pin existing content
     */
    async pinContent(hash, metadata = {}) {
        try {
            if (!this.isInitialized) {
                return { success: false, error: 'IPFS not initialized' };
            }

            // Pin to local IPFS node
            await this.ipfs.pin.add(hash);

            // Pin to Pinata if available
            if (this.pinata) {
                await this.pinata.pinByHash(hash, {
                    pinataMetadata: {
                        name: metadata.name || `Content-${hash.substring(0, 8)}`,
                        ...metadata
                    }
                });
            }

            return { success: true, hash };

        } catch (error) {
            console.error('IPFS pinning error:', error);
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
            if (!this.isInitialized) {
                return [];
            }

            const pins = [];
            for await (const pin of this.ipfs.pin.ls()) {
                pins.push({
                    hash: pin.cid.toString(),
                    type: pin.type
                });
            }

            return pins;

        } catch (error) {
            console.error('Error getting pinned content:', error);
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
            console.error('Hash generation error:', error);
            throw error;
        }
    }

    /**
     * Check if content exists on IPFS
     */
    async contentExists(hash) {
        try {
            if (!this.isInitialized) {
                return false;
            }

            const stats = await this.ipfs.object.stat(hash);
            return stats !== null;

        } catch (error) {
            return false;
        }
    }

    /**
     * Unpin content
     */
    async unpinContent(hash) {
        try {
            if (!this.isInitialized) {
                return { success: false, error: 'IPFS not initialized' };
            }

            await this.ipfs.pin.rm(hash);
            
            return { success: true };

        } catch (error) {
            console.error('IPFS unpinning error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get content statistics
     */
    async getStats() {
        try {
            if (!this.isInitialized) {
                return null;
            }

            const stats = await this.ipfs.stats.repo();
            const peers = await this.ipfs.swarm.peers();
            
            return {
                repoSize: stats.repoSize,
                storageMax: stats.storageMax,
                numObjects: stats.numObjects,
                connectedPeers: peers.length,
                version: await this.ipfs.version()
            };

        } catch (error) {
            console.error('Error getting IPFS stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService; 