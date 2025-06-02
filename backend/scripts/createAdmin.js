const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Username:', existingAdmin.username);
      console.log('\n🔑 Use these credentials to login as admin');
      return;
    }

    // Create admin user
    const adminData = {
      firstName: 'System',
      lastName: 'Administrator',
      username: 'admin',
      email: 'admin@blocmerce.com',
      password_hash: await bcrypt.hash('admin123', 10),
      userType: 'admin', // Admin user type
      role: 'admin',
      isActive: true,
      emailVerification: {
        isVerified: true
      }
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@blocmerce.com');
    console.log('👤 Username: admin');
    console.log('🔒 Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
    console.log('\n🔗 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
};

// Run the script
createAdmin(); 