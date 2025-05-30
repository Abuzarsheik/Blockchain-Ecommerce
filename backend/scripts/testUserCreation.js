const mongoose = require('mongoose');
const User = require('../models/User');

async function testUserCreation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    console.log('Connected to MongoDB');

    // Create a test user with minimal data
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      username: 'test' + Math.floor(Math.random() * 1000),
      email: 'test_' + Date.now() + '@example.com',
      password_hash: 'hashedpassword123',
      userType: 'buyer'
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('User ID:', testUser._id);
    console.log('Created at:', testUser.created_at);
    console.log('Updated at:', testUser.updated_at);
    console.log('KYC Status:', testUser.kyc.status);
    console.log('KYC Level:', testUser.kyc.level);
    console.log('Source of Funds:', testUser.kyc.personalInfo.sourceOfFunds);
    console.log('Identity Type:', testUser.kyc.documents.identity.type);
    console.log('Proof of Address Type:', testUser.kyc.documents.proofOfAddress.type);
    console.log('Risk Level:', testUser.kyc.riskAssessment.level);
    console.log('Sanctions Check:', testUser.kyc.compliance.sanctionsList.result);
    console.log('PEP Check:', testUser.kyc.compliance.pepCheck.result);
    console.log('Adverse Media Check:', testUser.kyc.compliance.adverseMedia.result);

    // Clean up - delete the test user
    await User.findByIdAndDelete(testUser._id);
    console.log('Test user cleaned up');

    console.log('User creation test completed successfully!');
  } catch (error) {
    console.error('Error testing user creation:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testUserCreation(); 