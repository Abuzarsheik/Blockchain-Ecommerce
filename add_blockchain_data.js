const mongoose = require('mongoose');
require('dotenv').config();

const orderSchema = new mongoose.Schema({}, { collection: 'orders', strict: false });
const Order = mongoose.model('Order', orderSchema);

async function addBlockchainData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all orders without blockchain data
    const orders = await Order.find({
      $and: [
        { blockchainTx: { $exists: false } },
        { escrowId: { $exists: false } },
        { escrow_tx_hash: { $exists: false } }
      ]
    });

    console.log(`Found ${orders.length} orders without blockchain data`);

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
        payment_method: 'crypto'
      }
    ];

    for (let i = 0; i < orders.length && i < sampleBlockchainData.length; i++) {
      const order = orders[i];
      const blockchainData = sampleBlockchainData[i];

      await Order.findByIdAndUpdate(order._id, {
        $set: {
          blockchainTx: blockchainData.blockchainTx,
          ...(blockchainData.escrowId && { escrowId: blockchainData.escrowId }),
          ...(blockchainData.escrow_tx_hash && { escrow_tx_hash: blockchainData.escrow_tx_hash }),
          payment_method: blockchainData.payment_method,
          total: order.total || 0.05 // Set a sample total if missing
        }
      });

      console.log(`✅ Updated order ${order.orderNumber || order._id} with blockchain data`);
      console.log(`   - Transaction: ${blockchainData.blockchainTx.slice(0, 20)}...`);
      if (blockchainData.escrowId) {
        console.log(`   - Escrow: ${blockchainData.escrowId.slice(0, 20)}...`);
      }
    }

    console.log(`\n🎉 Successfully updated ${Math.min(orders.length, sampleBlockchainData.length)} orders with blockchain data!`);
    console.log('\n✅ Now your orders should show blockchain verification buttons!');
    console.log('\n🔗 To test:');
    console.log('   1. Go to your frontend application');
    console.log('   2. Navigate to "My Orders"');
    console.log('   3. Click on any order');
    console.log('   4. Look for "Blockchain Verification" section');
    console.log('   5. You should see "Verify Transaction" and "View Escrow Details" buttons');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addBlockchainData(); 