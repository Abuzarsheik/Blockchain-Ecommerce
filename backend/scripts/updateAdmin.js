const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
    console.log('Connected to MongoDB');

    // Find and update the admin user
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@blocmerce.com' },
      { 
        role: 'admin',
        userType: 'admin',
        isActive: true,
        'emailVerification.isVerified': true
      },
      { new: true }
    );

    if (adminUser) {
      console.log('🎉 Admin user updated successfully!');
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Username:', adminUser.username);
      console.log('🔑 Role:', adminUser.role);
      console.log('👥 UserType:', adminUser.userType);
      console.log('\n🔗 Use credentials: admin@blocmerce.com / admin123');
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error updating admin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  }
};

// Run the script
updateAdmin(); 