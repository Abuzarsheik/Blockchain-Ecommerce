// Jest setup file
require('dotenv').config({ path: '.env.test' });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  // Set test environment early
  process.env.NODE_ENV = 'test';
  
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('🧪 Test database connected');
});

afterAll(async () => {
  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}, 60000); // Increase timeout for cleanup

afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Set test environment variables
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_min_32_chars';
process.env.EMAIL_SERVICE_ENABLED = 'false';
process.env.BLOCKCHAIN_ENABLED = 'false';
process.env.STRIPE_ENABLED = 'false';
process.env.IPFS_ENABLED = 'false';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Custom Jest matchers
expect.extend({
  toBeValidObjectId(received) {
    const pass = /^[0-9a-fA-F]{24}$/.test(received);
    return {
      message: () => `expected ${received} to be a valid ObjectId`,
      pass
    };
  },
  
  toBeValidJWT(received) {
    const pass = typeof received === 'string' && received.split('.').length === 3;
    return {
      message: () => `expected ${received} to be a valid JWT`,
      pass
    };
  }
});

// Mock external services
jest.mock('../backend/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendShippingNotification: jest.fn().mockResolvedValue({ success: true }),
  sendDeliveryConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendDisputeNotification: jest.fn().mockResolvedValue({ success: true }),
  sendMaintenanceNotification: jest.fn().mockResolvedValue({ success: true }),
  sendSecurityAlert: jest.fn().mockResolvedValue({ success: true }),
  init: jest.fn().mockResolvedValue()
}));

jest.mock('../backend/services/ipfsService', () => ({
  uploadFile: jest.fn().mockResolvedValue({ 
    hash: 'QmTest123',
    url: 'https://ipfs.io/ipfs/QmTest123'
  }),
  uploadJSON: jest.fn().mockResolvedValue({
    hash: 'QmTestJSON456',
    url: 'https://ipfs.io/ipfs/QmTestJSON456'
  }),
  retrieveFile: jest.fn().mockResolvedValue('mock file content'),
  deleteFile: jest.fn().mockResolvedValue({ success: true }),
  init: jest.fn().mockResolvedValue()
}));

jest.mock('../backend/services/paymentService', () => ({
  processPayment: jest.fn().mockResolvedValue({
    success: true,
    transactionId: 'mock_transaction_123',
    amount: 100,
    currency: 'USD'
  }),
  refundPayment: jest.fn().mockResolvedValue({
    success: true,
    refundId: 'mock_refund_123'
  }),
  createPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_mock123',
    client_secret: 'pi_mock123_secret'
  })
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_mock123',
        client_secret: 'pi_mock123_secret'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_mock123',
        status: 'succeeded'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_mock123',
        status: 'succeeded'
      })
    }
  }));
});

console.log('🧪 Test environment configured');

module.exports = {
  mongoServer,
  mongoose
}; 