const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            console.log('✅ Database connection is active');
            return true;
        } else {
            console.log('⚠️  Database not connected');
            return false;
        }
    } catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        return false;
    }
};

// Initialize database connection
const initDatabase = async () => {
    await connectDB();
    await testConnection();
};

// Close database connection
const closeDB = async () => {
    try {
        await mongoose.connection.close();
        console.log('📴 Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database:', error.message);
    }
};

// Database connection event handlers
mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('📴 Mongoose disconnected from MongoDB');
});

module.exports = {
    connectDB,
    testConnection,
    initDatabase,
    closeDB,
    mongoose
}; 