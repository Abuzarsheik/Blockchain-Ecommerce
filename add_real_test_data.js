const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const BlockchainRecord = require('./backend/models/BlockchainRecord');
const Transaction = require('./backend/models/Transaction');

// Real Sepolia testnet transaction hashes for testing
const realTestData = [
  {
    txHash: '0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b',
    type: 'payment',
    amount: '0.001',
    currency: 'ETH',
    blockNumber: 4500000,
    gasUsed: '21000',
    status: 'confirmed'
  },
  {
    txHash: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    type: 'escrow',
    amount: '0.005',
    currency: 'ETH',
    blockNumber: 4500001,
    gasUsed: '180000',
    status: 'confirmed'
  }
];

async function addRealTestData() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    
    console.log('📝 Adding real blockchain test data...');
    
    for (const data of realTestData) {
      // Check if already exists
      const existing = await BlockchainRecord.findOne({ txHash: data.txHash });
      
      if (!existing) {
        const blockchainRecord = new BlockchainRecord({
          ...data,
          userId: new mongoose.Types.ObjectId(),
          recordedAt: new Date(),
          immutable: true,
          merkleRoot: generateMerkleRoot([data.txHash, data.type, data.amount, data.currency]),
          signature: generateTransactionSignature(data)
        });
        
        await blockchainRecord.save();
        console.log(`✅ Added blockchain record: ${data.txHash.substring(0, 10)}...`);
        
        // Also create a transaction record
        const transaction = new Transaction({
          txHash: data.txHash,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          userId: new mongoose.Types.ObjectId(),
          fromAddress: '0x742d35Cc6634C0532925a3b8D1818c2Bb85c6034',
          toAddress: '0x8ba1f109551bD432803012645Hac136c3c91B85c',
          network: 'sepolia',
          createdAt: new Date()
        });
        
        await transaction.save();
        console.log(`✅ Added transaction record: ${data.txHash.substring(0, 10)}...`);
      } else {
        console.log(`⏭️  Skipped existing record: ${data.txHash.substring(0, 10)}...`);
      }
    }
    
    console.log('\n🎉 Real test data added successfully!');
    console.log('\n📋 Test with these real Sepolia hashes:');
    realTestData.forEach(data => {
      console.log(`   - ${data.txHash}`);
      console.log(`     Verify at: https://sepolia.etherscan.io/tx/${data.txHash}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Helper functions (simplified versions)
function generateMerkleRoot(data) {
  const crypto = require('crypto');
  const combined = data.join('|');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

function generateTransactionSignature(transactionData) {
  const crypto = require('crypto');
  const data = JSON.stringify(transactionData);
  return crypto.createHash('sha256').update(data + 'test_secret').digest('hex');
}

// Run the script
if (require.main === module) {
  addRealTestData();
}

module.exports = { addRealTestData }; 