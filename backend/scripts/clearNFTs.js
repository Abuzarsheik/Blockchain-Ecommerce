const mongoose = require('mongoose');
const NFT = require('../models/NFT');

async function clearNFTs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    console.log('Connected to MongoDB');

    // Clear all NFTs
    const result = await NFT.deleteMany({});
    console.log(`Deleted ${result.deletedCount} NFTs from database`);

    console.log('NFT clearing completed successfully!');
  } catch (error) {
    console.error('Error clearing NFTs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

clearNFTs(); 