const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  blockchainTx: String,
  escrowId: String,
  escrow_tx_hash: String,
  payment_method: String,
  total: Number,
  status: String,
  created_at: Date
}, { collection: 'orders' });

const Order = mongoose.model('Order', orderSchema);

async function checkOrders() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce';
    console.log('Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const allOrders = await Order.find({}).select('orderNumber blockchainTx escrowId escrow_tx_hash payment_method total status').limit(20);
    
    console.log(`\n📦 Found ${allOrders.length} orders total:`);
    console.log('='.repeat(80));

    if (allOrders.length === 0) {
      console.log('❌ No orders found in database');
      process.exit(0);
    }

    allOrders.forEach((order, index) => {
      const hasBlockchain = !!(order.blockchainTx || order.escrowId || order.escrow_tx_hash);
      const blockchainIcon = hasBlockchain ? '🔗' : '❌';
      
      console.log(`${index + 1}. ${blockchainIcon} Order: ${order.orderNumber || order._id}`);
      console.log(`   Payment: ${order.payment_method || 'not set'}`);
      console.log(`   Status: ${order.status || 'not set'}`);
      console.log(`   Total: $${order.total || 0}`);
      console.log(`   Blockchain TX: ${order.blockchainTx ? '✅ ' + order.blockchainTx.slice(0, 20) + '...' : '❌ None'}`);
      console.log(`   Escrow ID: ${order.escrowId ? '✅ ' + order.escrowId.slice(0, 20) + '...' : '❌ None'}`);
      console.log(`   Escrow TX: ${order.escrow_tx_hash ? '✅ ' + order.escrow_tx_hash.slice(0, 20) + '...' : '❌ None'}`);
      console.log(`   Will show verification: ${hasBlockchain ? '✅ YES' : '❌ NO'}`);
      console.log('-'.repeat(60));
    });

    const withBlockchain = allOrders.filter(order => 
      order.blockchainTx || order.escrowId || order.escrow_tx_hash
    );

    console.log(`\n📊 Summary:`);
    console.log(`   Total orders: ${allOrders.length}`);
    console.log(`   With blockchain data: ${withBlockchain.length}`);
    console.log(`   Without blockchain data: ${allOrders.length - withBlockchain.length}`);

    if (withBlockchain.length === 0) {
      console.log('\n⚠️  NO ORDERS HAVE BLOCKCHAIN DATA!');
      console.log('   This is why you don\'t see verification buttons.');
      console.log('   You need to create sample data or make an escrow order.');
    } else {
      console.log('\n✅ Orders with blockchain data found!');
      console.log('   These orders should show verification buttons.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOrders(); 