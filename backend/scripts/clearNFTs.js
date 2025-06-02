const NFT = require('../models/NFT');
const mongoose = require('mongoose');
const logger = require('../config/logger');

async function clearNFTs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');

    // Clear all NFTs
    const result = await NFT.deleteMany({});
    console.log(`Deleted ${result.deletedCount} NFTs from database`);

  } catch (error) {
    logger.error('Error clearing NFTs:', error);
  } finally {
    await mongoose.connection.close();
  }
}

clearNFTs(); 