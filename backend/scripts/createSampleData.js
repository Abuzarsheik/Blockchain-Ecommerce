const mongoose = require('mongoose');
const BlockchainRecord = require('../models/BlockchainRecord');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const { ethers } = require('ethers');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fyp-marketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createSampleBlockchainData = async () => {
  try {
    console.log('🔗 Creating sample blockchain verification data...');

    // Sample transaction hashes and contract addresses
    const sampleData = [
      {
        txHash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        contractAddress: '0x1234567890123456789012345678901234567890',
        type: 'escrow',
        amount: '0.0025',
        currency: 'ETH',
        description: 'Smart Contract Escrow for NFT Purchase',
        blockNumber: 18450123,
        gasUsed: 284000
      },
      {
        txHash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456ab',
        contractAddress: '0x2345678901234567890123456789012345678901',
        type: 'payment',
        amount: '0.0012',
        currency: 'ETH',
        description: 'Direct Crypto Payment',
        blockNumber: 18450124,
        gasUsed: 145000
      },
      {
        txHash: '0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef123456abc3',
        contractAddress: '0x3456789012345678901234567890123456789012',
        type: 'escrow',
        amount: '0.0045',
        currency: 'ETH',
        description: 'Smart Contract Escrow for Digital Art',
        blockNumber: 18450125,
        gasUsed: 298000
      }
    ];

    // Create blockchain records
    for (const data of sampleData) {
      // Create blockchain record
      const blockchainRecord = new BlockchainRecord({
        txHash: data.txHash,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        network: 'ethereum',
        blockNumber: data.blockNumber,
        gasUsed: data.gasUsed,
        contractAddress: data.contractAddress,
        immutable: true,
        recordedAt: new Date(),
        metadata: {
          platform: 'Blocmerce',
          version: '1.0.0',
          networkFee: '0.001',
          exchangeRate: 2000
        }
      });

      // Generate merkle root
      blockchainRecord.merkleRoot = blockchainRecord.constructor.generateMerkleRoot([
        data.txHash,
        data.type,
        data.amount,
        data.currency,
        blockchainRecord.recordedAt.getTime().toString()
      ]);

      // Generate signature
      const crypto = require('crypto');
      const signatureData = {
        txHash: data.txHash,
        type: data.type,
        amount: data.amount,
        currency: data.currency
      };
      blockchainRecord.signature = crypto.createHash('sha256')
        .update(JSON.stringify(signatureData))
        .digest('hex');

      await blockchainRecord.save();

      console.log(`✅ Created blockchain record: ${data.txHash.substring(0, 10)}...`);
    }

    console.log('🎉 Sample blockchain data created successfully!');
    console.log('\n📋 You can now verify these transactions:');
    console.log('1. Navigate to: http://localhost:3000/verify');
    console.log('2. Or use direct URLs:');
    sampleData.forEach((data, index) => {
      console.log(`   http://localhost:3000/verify/${data.txHash}`);
    });
    console.log('\n🔍 Test contract addresses:');
    sampleData.forEach((data, index) => {
      console.log(`   ${data.contractAddress} (${data.type})`);
    });

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
};

createSampleBlockchainData(); 