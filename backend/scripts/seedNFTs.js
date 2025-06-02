const NFT = require('../models/NFT');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../config/logger');

require('dotenv').config();

const sampleNFTs = [
  {
    name: "Digital Genesis",
    description: "A groundbreaking digital artwork that represents the birth of the digital age. This NFT captures the essence of technological evolution through vibrant colors and abstract forms.",
    price: 0.5,
    category: "Digital Art",
    image_url: "/uploads/nfts/sample1.svg",
    token_id: "NFT_001_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 5,
    is_minted: true,
    is_listed: true,
    like_count: 25,
    view_count: 150,
    metadata: {
      attributes: [
        { trait_type: "Color Palette", value: "Vibrant" },
        { trait_type: "Style", value: "Abstract" },
        { trait_type: "Rarity", value: "Rare" }
      ]
    }
  },
  {
    name: "Crypto Punk Revolution",
    description: "An iconic collectible from the early days of NFTs. This unique character represents the rebellion against traditional art forms and the emergence of digital ownership.",
    price: 1.2,
    category: "Collectibles",
    image_url: "/uploads/nfts/sample2.svg",
    token_id: "NFT_002_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 10,
    is_minted: true,
    is_listed: true,
    like_count: 89,
    view_count: 420,
    metadata: {
      attributes: [
        { trait_type: "Type", value: "Punk" },
        { trait_type: "Accessories", value: "Sunglasses" },
        { trait_type: "Background", value: "Blue" },
        { trait_type: "Rarity", value: "Ultra Rare" }
      ]
    }
  },
  {
    name: "Virtual Reality Landscape",
    description: "Step into a breathtaking virtual world with this immersive landscape NFT. Perfect for virtual reality experiences and metaverse applications.",
    price: 0.8,
    category: "Gaming",
    image_url: "/uploads/nfts/sample3.svg",
    token_id: "NFT_003_" + Date.now(),
    blockchain: "Polygon",
    royalty_percentage: 7,
    is_minted: true,
    is_listed: true,
    like_count: 42,
    view_count: 280,
    metadata: {
      attributes: [
        { trait_type: "Environment", value: "Forest" },
        { trait_type: "Weather", value: "Sunny" },
        { trait_type: "Interactive", value: "Yes" }
      ]
    }
  },
  {
    name: "Abstract Harmony",
    description: "A mesmerizing piece that explores the relationship between color, form, and digital space. This artwork represents the harmony between chaos and order.",
    price: 0.3,
    category: "Art",
    image_url: "/uploads/nfts/sample4.svg",
    token_id: "NFT_004_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 5,
    is_minted: true,
    is_listed: true,
    like_count: 18,
    view_count: 95,
    metadata: {
      attributes: [
        { trait_type: "Style", value: "Abstract" },
        { trait_type: "Mood", value: "Peaceful" },
        { trait_type: "Complexity", value: "Medium" }
      ]
    }
  },
  {
    name: "Digital Photography Collection #1",
    description: "A stunning digital photograph capturing the beauty of urban architecture in the golden hour. Limited edition with only 10 copies available.",
    price: 0.15,
    category: "Photography",
    image_url: "/uploads/nfts/sample5.svg",
    token_id: "NFT_005_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 8,
    is_minted: true,
    is_listed: true,
    like_count: 67,
    view_count: 340,
    metadata: {
      attributes: [
        { trait_type: "Location", value: "Urban" },
        { trait_type: "Time", value: "Golden Hour" },
        { trait_type: "Edition", value: "Limited" }
      ]
    }
  },
  {
    name: "Synthwave Dreams",
    description: "Transport yourself to the neon-lit world of the 80s with this synthwave-inspired digital art. Perfect for music lovers and retro enthusiasts.",
    price: 0.6,
    category: "Music",
    image_url: "/uploads/nfts/sample6.svg",
    token_id: "NFT_006_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 6,
    is_minted: true,
    is_listed: true,
    like_count: 93,
    view_count: 510,
    metadata: {
      attributes: [
        { trait_type: "Era", value: "80s" },
        { trait_type: "Genre", value: "Synthwave" },
        { trait_type: "Mood", value: "Nostalgic" }
      ]
    }
  },
  {
    name: "Sports Moment NFT",
    description: "Relive the greatest moments in sports history with this exclusive NFT. Features a legendary goal that changed the game forever.",
    price: 2.1,
    category: "Sports",
    image_url: "/uploads/nfts/sample7.svg",
    token_id: "NFT_007_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 12,
    is_minted: true,
    is_listed: true,
    like_count: 156,
    view_count: 780,
    metadata: {
      attributes: [
        { trait_type: "Sport", value: "Football" },
        { trait_type: "Moment", value: "Goal" },
        { trait_type: "Rarity", value: "Legendary" }
      ]
    }
  },
  {
    name: "Utility Token Gateway",
    description: "More than just art - this NFT provides exclusive access to premium features and services within our ecosystem. Utility meets aesthetics.",
    price: 1.5,
    category: "Utility",
    image_url: "/uploads/nfts/sample8.svg",
    token_id: "NFT_008_" + Date.now(),
    blockchain: "Ethereum",
    royalty_percentage: 5,
    is_minted: true,
    is_listed: true,
    like_count: 34,
    view_count: 200,
    metadata: {
      attributes: [
        { trait_type: "Access Level", value: "Premium" },
        { trait_type: "Benefits", value: "Multiple" },
        { trait_type: "Duration", value: "Lifetime" }
      ]
    }
  }
];

async function seedNFTs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');

    // Find a user to assign as creator/owner (preferably admin or seller)
    let creator = await User.findOne({ role: 'admin' });
    if (!creator) {
      creator = await User.findOne({ userType: 'seller' });
    }
    if (!creator) {
      // Create a default creator if none exists
      creator = new User({
        firstName: 'Digital',
        lastName: 'Artist',
        email: 'artist@blocmerce.com',
        password: 'password123',
        userType: 'seller',
        role: 'user',
        isVerified: true
      });
      await creator.save();
    }

    // Clear existing NFTs
    await NFT.deleteMany({});

    // Create sample NFTs
    const nftsToCreate = sampleNFTs.map(nft => ({
      ...nft,
      creator_id: creator._id,
      owner_id: creator._id
    }));

    const createdNFTs = await NFT.insertMany(nftsToCreate);
    console.log(`Created ${createdNFTs.length} sample NFTs`);

    createdNFTs.forEach((nft, index) => {
      console.log(`${index + 1}. ${nft.name} - ${nft.price} ETH`);
    });

  } catch (error) {
    logger.error('Error seeding NFTs:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the seed function
seedNFTs(); 