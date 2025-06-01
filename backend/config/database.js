const mongoose = require('mongoose');
const logger = require('./logger');

// MongoDB connection
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blocmerce';
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        return true;
    } catch (error) {
        logger.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
};

// Test database connection
const testConnection = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        logger.error('❌ Database connection test failed:', error.message);
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
    } catch (error) {
        logger.error('❌ Error closing database:', error.message);
    }
};

// Database connection event handlers
mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    logger.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected from MongoDB');
});

module.exports = {
    connectDB,
    testConnection,
    initDatabase,
    closeDB,
    mongoose
}; 