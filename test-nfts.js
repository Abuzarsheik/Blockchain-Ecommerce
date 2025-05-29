const mongoose = require('mongoose');
const NFT = require('./backend/models/NFT');
const User = require('./backend/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/blocmerce', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testNFTs() {
  try {
    console.log('🔍 Testing NFT database...');

    // Count total NFTs
    const totalNFTs = await NFT.countDocuments();
    console.log(`📊 Total NFTs in database: ${totalNFTs}`);

    if (totalNFTs > 0) {
      // Get first few NFTs
      const nfts = await NFT.find()
        .populate('creator_id', 'firstName lastName email')
        .limit(3);

      console.log('\n📋 Sample NFTs:');
      nfts.forEach((nft, index) => {
        console.log(`${index + 1}. ${nft.name} - ${nft.price} ETH`);
        console.log(`   Creator: ${nft.creator_id?.firstName || 'Unknown'} ${nft.creator_id?.lastName || ''}`);
        console.log(`   Category: ${nft.category}`);
        console.log(`   Image: ${nft.image_url}`);
        console.log('---');
      });
    } else {
      console.log('❌ No NFTs found in database!');
      console.log('💡 Try creating some NFTs first using the Create NFT page');
    }

  } catch (error) {
    console.error('❌ Error testing NFTs:', error);
  } finally {
    mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

testNFTs();