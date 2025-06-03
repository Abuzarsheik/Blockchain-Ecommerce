const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Order = require('./backend/models/Order');
const Product = require('./backend/models/Product');

mongoose.connect('mongodb://localhost:27017/fyp_marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Create a test user that matches the current session
    const testUser = new User({
      _id: '683ccd451e617dfb7f2d14a6', // Use the same ID from the logs
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      email: 'john.doe@example.com',
      password_hash: '$2b$10$hashedpasswordexample1234567890', // Mock hashed password
      userType: 'buyer',
      wallet_address: '0xa1b2c3d4e5f6789012345678901234567890abcd',
      emailVerification: {
        isVerified: true
      },
      created_at: new Date(),
      updated_at: new Date()
    });
    
    try {
      await testUser.save();
      console.log('✅ Test user created');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        console.error('User creation error:', error.message);
        throw error;
      }
    }
    
    // Create a test product
    let testProduct;
    try {
      testProduct = new Product({
        name: 'Test Product',
        description: 'A test product for blockchain verification',
        price: 0.05,
        category: 'Electronics',
        seller: testUser._id,
        quantity: 10,
        images: ['test-image.jpg'],
        isActive: true,
        created_at: new Date()
      });
      await testProduct.save();
      console.log('✅ Test product created');
    } catch (error) {
      // If product creation fails, just use a mock product ID
      console.log('ℹ️  Using mock product data');
    }
    
    // Create test orders with blockchain data
    const orders = [
      {
        orderNumber: 'ORD-2024-001',
        userId: testUser._id,
        items: [{
          product: testProduct?._id || new mongoose.Types.ObjectId(),
          name: 'Test Product 1',
          price: 0.05,
          quantity: 1
        }],
        total: 0.05,
        status: 'confirmed',
        payment_method: 'escrow',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        blockchainTx: '0x1234567890123456789012345678901234567890123456789012345678901234',
        escrowId: '0x1234567890123456789012345678901234567800',
        escrow_tx_hash: '0xabcd1234567890123456789012345678901234567890123456789012345678abcd',
        created_at: new Date()
      },
      {
        orderNumber: 'ORD-2024-002',
        userId: testUser._id,
        items: [{
          product: testProduct?._id || new mongoose.Types.ObjectId(),
          name: 'Test Product 2',
          price: 0.08,
          quantity: 1
        }],
        total: 0.08,
        status: 'processing',
        payment_method: 'escrow',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        blockchainTx: '0x2345678901234567890123456789012345678901234567890123456789012345',
        escrowId: '0x2345678901234567890123456789012345678901',
        escrow_tx_hash: '0xbcde2345678901234567890123456789012345678901234567890123456789bcde',
        created_at: new Date()
      },
      {
        orderNumber: 'ORD-2024-003',
        userId: testUser._id,
        items: [{
          product: testProduct?._id || new mongoose.Types.ObjectId(),
          name: 'Test Product 3',
          price: 0.12,
          quantity: 1
        }],
        total: 0.12,
        status: 'shipped',
        payment_method: 'escrow',
        shipping_address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        blockchainTx: '0x3456789012345678901234567890123456789012345678901234567890123456',
        escrowId: '0x3456789012345678901234567890123456789002',
        escrow_tx_hash: '0xcdef3456789012345678901234567890123456789012345678901234567890cdef',
        created_at: new Date()
      }
    ];
    
    // Delete existing orders and create new ones
    await Order.deleteMany({ userId: testUser._id });
    
    for (const orderData of orders) {
      const order = new Order(orderData);
      await order.save();
      console.log(`✅ Order created: ${order.orderNumber} with escrow ID: ${order.escrowId}`);
    }
    
    // Verify the data
    const createdOrders = await Order.find({ userId: testUser._id });
    console.log(`\n📋 Summary:`);
    console.log(`User ID: ${testUser._id}`);
    console.log(`User: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`Wallet: ${testUser.wallet_address}`);
    console.log(`Orders created: ${createdOrders.length}`);
    
    createdOrders.forEach(order => {
      console.log(`  - ${order.orderNumber}: ${order.escrowId}`);
    });
    
    mongoose.disconnect();
    console.log('\n✅ Test data creation completed!');
  })
  .catch(console.error); 