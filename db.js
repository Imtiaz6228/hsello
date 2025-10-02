const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return true;
    }

    // Check if we're in development without MongoDB
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI provided. Please set up MongoDB connection.');
      console.log('🔧 For VPS hosting, use MongoDB Atlas or configure local MongoDB');
      console.log('📝 Add MONGODB_URI to your .env file');
      return false;
    }

    const mongoURI = process.env.MONGODB_URI;
    console.log('🔧 Attempting to connect to MongoDB...');
    
    // Log connection attempt without exposing credentials
    const maskedURI = mongoURI.replace(/:([^:@]{4})[^:@]*@/, ':$1****@');
    console.log('📍 MongoDB URI:', maskedURI);

    // Enhanced connection options for VPS hosting
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // Increased timeout for VPS
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority',
      // Additional options for production
      bufferCommands: false,
    };

    const conn = await mongoose.connect(mongoURI, connectionOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌐 Connection State: ${mongoose.connection.readyState}`);
    return true;

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);

    // Enhanced error handling for different scenarios
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🚨 CONNECTION REFUSED - MongoDB server not accessible');
      console.log('💡 VPS Solutions:');
      console.log('1. Use MongoDB Atlas (cloud database)');
      console.log('2. Install and configure MongoDB on your VPS');
      console.log('3. Check if MongoDB service is running: sudo systemctl status mongod');
      console.log('4. Start MongoDB service: sudo systemctl start mongod');
      
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🚨 HOST NOT FOUND - Check your MongoDB connection string');
      console.log('💡 Solutions:');
      console.log('1. Verify MONGODB_URI in .env file');
      console.log('2. For MongoDB Atlas, check cluster URL');
      console.log('3. For local: use mongodb://localhost:27017/digitalmarket');
      
    } else if (error.message.includes('authentication failed')) {
      console.log('\n🚨 AUTHENTICATION FAILED - Check credentials');
      console.log('💡 Solutions:');
      console.log('1. Verify username and password in connection string');
      console.log('2. Check database user permissions');
      console.log('3. For Atlas: verify database user exists');
      
    } else if (error.message.includes('MongoServerSelectionError')) {
      console.log('\n🚨 SERVER SELECTION ERROR - Cannot reach MongoDB');
      console.log('💡 VPS Solutions:');
      console.log('1. Check network connectivity');
      console.log('2. Verify firewall settings');
      console.log('3. Check if MongoDB port (27017) is open');
      console.log('4. For Atlas: check IP whitelist');
      
    } else if (error.message.includes('MongoNetworkError')) {
      console.log('\n🚨 NETWORK ERROR - Connection issues');
      console.log('💡 Solutions:');
      console.log('1. Check internet connection');
      console.log('2. Verify DNS resolution');
      console.log('3. Check VPS network configuration');
    }

    console.log('\n🔧 App will start with reduced functionality');
    console.log('⚠️  Database-dependent features will not work (login, signup, etc.)');
    console.log('📝 Please fix MongoDB connection to enable full functionality');
    return false;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📊 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('📊 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);
  
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📊 MongoDB connection closed gracefully');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
  
  console.log('👋 Application terminated gracefully');
  process.exit(0);
};

// Handle different termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = connectDB;
