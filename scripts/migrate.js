const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../backend/models/User');
const Product = require('../backend/models/Product');
const NFT = require('../backend/models/NFT');

async function runMigration() {
    console.log('🚀 Starting Blocmerce MongoDB migration...');

    try {
        // Connect to MongoDB
        console.log('📊 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce');
        console.log('✅ MongoDB connection successful');

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🧹 Clearing existing data...');
        await User.deleteMany({});
        await Product.deleteMany({});
        await NFT.deleteMany({});
        console.log('✅ Existing data cleared');

        // Create admin user
        console.log('👤 Creating admin user...');
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 12);
        
        const adminUser = new User({
            firstName: 'Admin',
            lastName: 'User',
            username: 'admin',
            email: 'admin@blocmerce.com',
            password_hash: adminPassword,
            userType: 'seller',
            role: 'admin',
            isVerified: true,
            emailVerification: {
                isVerified: true
            },
            kyc: {
                status: 'approved',
                level: 'advanced',
                personalInfo: {
                    sourceOfFunds: 'business'
                },
                documents: {
                    identity: {
                        type: 'passport',
                        verified: true
                    },
                    proofOfAddress: {
                        type: 'utility_bill',
                        verified: true
                    }
                },
                riskAssessment: {
                    level: 'low'
                },
                compliance: {
                    sanctionsList: { result: 'clear' },
                    pepCheck: { result: 'clear' },
                    adverseMedia: { result: 'clear' }
                }
            },
            sellerProfile: {
                storeName: 'Blocmerce Official Store',
                storeDescription: 'Official Blocmerce marketplace store',
                isVerified: true,
                rating: 5.0,
                totalSales: 0,
                commission: 0
            }
        });

        await adminUser.save();
        console.log('✅ Admin user created');

        // Create sample seller
        console.log('👤 Creating sample seller...');
        const sellerPassword = await bcrypt.hash('seller123', 12);
        
        const sampleSeller = new User({
            firstName: 'John',
            lastName: 'Seller',
            username: 'johnseller',
            email: 'seller@example.com',
            password_hash: sellerPassword,
            userType: 'seller',
            role: 'user',
            isVerified: true,
            emailVerification: {
                isVerified: true
            },
            kyc: {
                status: 'approved',
                level: 'basic',
                personalInfo: {
                    sourceOfFunds: 'employment'
                },
                documents: {
                    identity: {
                        type: 'national_id',
                        verified: true
                    },
                    proofOfAddress: {
                        type: 'utility_bill',
                        verified: true
                    }
                },
                riskAssessment: {
                    level: 'low'
                },
                compliance: {
                    sanctionsList: { result: 'clear' },
                    pepCheck: { result: 'clear' },
                    adverseMedia: { result: 'clear' }
                }
            },
            sellerProfile: {
                storeName: 'John\'s Digital Art',
                storeDescription: 'Premium digital art and NFT collections',
                isVerified: true,
                rating: 4.8,
                totalSales: 15,
                commission: 5
            }
        });

        await sampleSeller.save();
        console.log('✅ Sample seller created');

        // Create sample buyer
        console.log('👤 Creating sample buyer...');
        const buyerPassword = await bcrypt.hash('buyer123', 12);
        
        const sampleBuyer = new User({
            firstName: 'Jane',
            lastName: 'Buyer',
            username: 'janebuyer',
            email: 'buyer@example.com',
            password_hash: buyerPassword,
            userType: 'buyer',
            role: 'user',
            isVerified: true,
            emailVerification: {
                isVerified: true
            },
            kyc: {
                status: 'approved',
                level: 'basic',
                personalInfo: {
                    sourceOfFunds: 'employment'
                },
                documents: {
                    identity: {
                        type: 'drivers_license',
                        verified: true
                    },
                    proofOfAddress: {
                        type: 'bank_statement',
                        verified: true
                    }
                },
                riskAssessment: {
                    level: 'low'
                },
                compliance: {
                    sanctionsList: { result: 'clear' },
                    pepCheck: { result: 'clear' },
                    adverseMedia: { result: 'clear' }
                }
            }
        });

        await sampleBuyer.save();
        console.log('✅ Sample buyer created');

        // Verify data
        const usersCount = await User.countDocuments();
        const productsCount = await Product.countDocuments();
        const nftsCount = await NFT.countDocuments();

        console.log('\n📊 Migration Summary:');
        console.log(`   - Users created: ${usersCount}`);
        console.log(`   - Products: ${productsCount}`);
        console.log(`   - NFTs: ${nftsCount}`);

        console.log('\n🎉 Migration completed successfully!');
        console.log('🔑 Login credentials:');
        console.log('   - Admin: admin@blocmerce.com / admin123');
        console.log('   - Seller: seller@example.com / seller123');
        console.log('   - Buyer: buyer@example.com / buyer123');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📊 MongoDB connection closed');
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = runMigration; 