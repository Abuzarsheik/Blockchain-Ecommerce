const mongoose = require('mongoose');
const Order = require('./backend/models/Order');
const User = require('./backend/models/User');

mongoose.connect('mongodb://localhost:27017/fyp_marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({}, 'firstName lastName email username').limit(10);
    console.log('\nAll users:');
    users.forEach(user => {
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log('---');
    });
    
    // Find all orders
    const orders = await Order.find({}).populate('userId', 'firstName lastName username').limit(10);
    console.log('\nAll orders:');
    orders.forEach(order => {
      console.log(`Order ID: ${order._id}`);
      console.log(`Order Number: ${order.orderNumber}`);
      console.log(`User ID: ${order.userId?._id}`);
      console.log(`User: ${order.userId?.firstName} ${order.userId?.lastName} (${order.userId?.username})`);
      console.log(`Status: ${order.status}`);
      console.log(`Payment Method: ${order.payment_method}`);
      console.log(`Escrow ID: ${order.escrowId || 'N/A'}`);
      console.log(`Blockchain Tx: ${order.blockchainTx || 'N/A'}`);
      console.log(`Escrow Tx Hash: ${order.escrow_tx_hash || 'N/A'}`);
      console.log('---');
    });
    
    // Count totals
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();
    const ordersWithEscrow = await Order.countDocuments({
      $or: [
        { blockchainTx: { $exists: true } },
        { escrowId: { $exists: true } },
        { escrow_tx_hash: { $exists: true } }
      ]
    });
    
    console.log(`\nDatabase summary:`);
    console.log(`Total users: ${userCount}`);
    console.log(`Total orders: ${orderCount}`);
    console.log(`Orders with blockchain data: ${ordersWithEscrow}`);
    
    mongoose.disconnect();
  })
  .catch(console.error); 