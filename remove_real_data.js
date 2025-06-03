const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const BlockchainRecord = require('./backend/models/BlockchainRecord');
const Transaction = require('./backend/models/Transaction');

// Real Sepolia testnet transaction hashes that we added
const realTestHashes = [
  '0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984'
];

async function removeRealTestData() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    
    console.log('🗑️ Removing real blockchain test data...');
    
    for (const txHash of realTestHashes) {
      // Remove blockchain record
      const removedBlockchainRecord = await BlockchainRecord.deleteOne({ txHash });
      if (removedBlockchainRecord.deletedCount > 0) {
        console.log(`✅ Removed blockchain record: ${txHash.substring(0, 10)}...`);
      } else {
        console.log(`⏭️  No blockchain record found: ${txHash.substring(0, 10)}...`);
      }
      
      // Remove transaction record
      const removedTransaction = await Transaction.deleteOne({ txHash });
      if (removedTransaction.deletedCount > 0) {
        console.log(`✅ Removed transaction record: ${txHash.substring(0, 10)}...`);
      } else {
        console.log(`⏭️  No transaction record found: ${txHash.substring(0, 10)}...`);
      }
    }
    
    console.log('\n🎉 Real test data removed successfully!');
    console.log('\n📋 Your application will now use mock data for verification.');
    console.log('\n🧪 Test with mock hashes like:');
    console.log('   - 0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef123456ab01');
    console.log('   - 0x1234567890abcdef1234567890abcdef12345678');
    console.log('\n✨ These will return mock verification data for testing purposes.');
    
  } catch (error) {
    console.error('❌ Error removing test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the script
if (require.main === module) {
  removeRealTestData();
}

module.exports = { removeRealTestData }; 