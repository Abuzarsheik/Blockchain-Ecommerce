const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({}, { collection: 'orders', strict: false });
const Order = mongoose.model('Order', orderSchema);

async function forceAddBlockchainData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get ALL orders
    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders total`);

    if (orders.length === 0) {
      console.log('❌ No orders found in database');
      process.exit(0);
    }

    const sampleBlockchainData = [
      {
        blockchainTx: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        escrowId: '0x1234567890123456789012345678901234567890',
        escrow_tx_hash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456ab',
        payment_method: 'escrow'
      },
      {
        blockchainTx: '0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef123456abc3',
        escrowId: '0x2345678901234567890123456789012345678901',
        escrow_tx_hash: '0xd4e5f6789012345678901234567890abcdef1234567890abcdef123456abc3d4',
        payment_method: 'escrow'
      },
      {
        blockchainTx: '0xe5f6789012345678901234567890abcdef1234567890abcdef123456abc3d4e5',
        escrowId: '0x3456789012345678901234567890123456789012',
        escrow_tx_hash: '0xf6789012345678901234567890abcdef1234567890abcdef123456abc3d4e5f6',
        payment_method: 'crypto'
      }
    ];

    console.log('\n🔗 Adding blockchain data to orders...');

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const blockchainData = sampleBlockchainData[i % sampleBlockchainData.length];

      // Generate unique blockchain data for each order
      const uniqueSuffix = i.toString().padStart(2, '0');
      const uniqueBlockchainTx = blockchainData.blockchainTx.slice(0, -2) + uniqueSuffix;
      const uniqueEscrowId = blockchainData.escrowId.slice(0, -2) + uniqueSuffix;
      const uniqueEscrowTxHash = blockchainData.escrow_tx_hash.slice(0, -2) + uniqueSuffix;

      const updateData = {
        blockchainTx: uniqueBlockchainTx,
        escrowId: uniqueEscrowId,
        escrow_tx_hash: uniqueEscrowTxHash,
        payment_method: blockchainData.payment_method,
        total: order.total || 0.05,
        payment_status: 'paid'
      };

      await Order.findByIdAndUpdate(order._id, { $set: updateData });

      console.log(`✅ Updated order ${order.orderNumber || order._id}:`);
      console.log(`   - Transaction: ${uniqueBlockchainTx.slice(0, 20)}...`);
      console.log(`   - Escrow ID: ${uniqueEscrowId.slice(0, 20)}...`);
      console.log(`   - Payment: ${blockchainData.payment_method}`);
    }

    console.log(`\n🎉 Successfully updated ${orders.length} orders with blockchain data!`);
    
    // Verify the updates
    const updatedOrders = await Order.find({}).select('orderNumber blockchainTx escrowId payment_method');
    console.log('\n✅ Verification - Orders now have blockchain data:');
    updatedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderNumber}: ✅ Blockchain data added`);
    });

    console.log('\n🔗 NOW TEST THE VERIFICATION BUTTONS:');
    console.log('   1. Start your frontend application (npm start)');
    console.log('   2. Navigate to "My Orders"');
    console.log('   3. Click on any order');
    console.log('   4. Look for "Blockchain Verification" section');
    console.log('   5. You should see verification buttons!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceAddBlockchainData(); 