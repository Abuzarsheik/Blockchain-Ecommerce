require('dotenv').config();
const mongoose = require('mongoose');

console.log('🚀 Setting up Blocmerce Demo Data...\n');

const setupDemoData = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce_dev';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const User = require('../backend/models/User');
    const Product = require('../backend/models/Product');
    const Order = require('../backend/models/Order');

    // Clear existing demo data
    console.log('🧹 Clearing existing demo data...');
    await User.deleteMany({ email: { $regex: /demo|test/i } });
    await Product.deleteMany({ name: { $regex: /demo|test/i } });
    await Order.deleteMany({});

    // Create demo users
    console.log('👥 Creating demo users...');
    const demoUsers = [
      {
        name: 'Demo Buyer',
        email: 'buyer@demo.com',
        password: 'demo123',
        role: 'user',
        isVerified: true
      },
      {
        name: 'Demo Seller',
        email: 'seller@demo.com',
        password: 'demo123',
        role: 'seller',
        isVerified: true
      },
      {
        name: 'Demo Admin',
        email: 'admin@demo.com',
        password: 'demo123',
        role: 'admin',
        isVerified: true
      }
    ];

    for (const userData of demoUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.name}`);
    }

    // Create demo products
    console.log('\n📦 Creating demo products...');
    const demoProducts = [
      {
        name: 'Demo Smartphone',
        description: 'Latest smartphone with advanced features',
        price: 599,
        category: 'Electronics',
        stock: 10,
        images: ['/images/phone.jpg'],
        seller: await User.findOne({ email: 'seller@demo.com' })._id
      },
      {
        name: 'Demo Laptop',
        description: 'High-performance laptop for professionals',
        price: 1299,
        category: 'Electronics',
        stock: 5,
        images: ['/images/laptop.jpg'],
        seller: await User.findOne({ email: 'seller@demo.com' })._id
      },
      {
        name: 'Demo NFT Artwork',
        description: 'Unique digital art piece',
        price: 0.5,
        category: 'NFT',
        stock: 1,
        images: ['/images/nft.jpg'],
        isNFT: true,
        seller: await User.findOne({ email: 'seller@demo.com' })._id
      }
    ];

    for (const productData of demoProducts) {
      const product = new Product(productData);
      await product.save();
      console.log(`✅ Created product: ${productData.name}`);
    }

    console.log('\n🎉 Demo data setup complete!');
    console.log('\n📋 Demo Accounts:');
    console.log('👤 Buyer: buyer@demo.com / demo123');
    console.log('🏪 Seller: seller@demo.com / demo123');
    console.log('👑 Admin: admin@demo.com / demo123');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
};

if (require.main === module) {
  setupDemoData();
}

module.exports = setupDemoData; 