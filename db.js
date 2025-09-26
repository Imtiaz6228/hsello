const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

let mongoProcess = null; // Keep track of MongoDB process

const startMongoDB = () => {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting MongoDB server automatically...');

    const mongoPath = path.join(__dirname, '..', 'mongodb-win32-x86_64-windows-8.0.13', 'bin', 'mongod.exe');
    const dbPath = path.join(__dirname, '..', 'data', 'db');
    const logPath = path.join(__dirname, '..', 'mongod.log');

    console.log(`📁 MongoDB executable: ${mongoPath}`);
    console.log(`📁 Data directory: ${dbPath}`);

    // Start MongoDB process
    mongoProcess = spawn(mongoPath, [
      '--dbpath', dbPath,
      '--port', '27017',
      '--logpath', logPath
    ], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Handle process output
    mongoProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('waiting for connections')) {
        console.log('✅ MongoDB server started successfully!');
        resolve();
      }
    });

    mongoProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('waiting for connections')) {
        console.log('✅ MongoDB server started successfully!');
        resolve();
      }
    });

    mongoProcess.on('error', (error) => {
      console.error('❌ Failed to start MongoDB:', error.message);
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('MongoDB startup timeout'));
    }, 10000);
  });
};

const connectDB = async () => {
  try {
    // Check if we're in development without MongoDB
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI provided. Make sure to set up MongoDB connection.');
      console.log('🔧 Starting with limited functionality - signup may fail!');
      return false;
    }

    const mongoURI = process.env.MONGODB_URI;
    console.log('🔧 Attempting to connect to MongoDB at:', mongoURI.replace(/:([^:@]{4})[^:@]*@/, ':$1****@'));

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      maxPoolSize: 10,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);

    // Check if it's a connection refused error (MongoDB not running)
    if (error.message.includes('ECONNREFUSED') || error.message.includes('MongoServerError')) {
      console.log('\n🔄 MongoDB server not running. Attempting to start it automatically...');

      try {
        await startMongoDB();
        console.log('⏳ Waiting for MongoDB to be ready...');

        // Wait a bit for MongoDB to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try connecting again
        console.log('🔄 Retrying MongoDB connection...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 5000,
          maxPoolSize: 10,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name}`);
        console.log('🎉 MongoDB started and connected automatically!');
        return true;

      } catch (startError) {
        console.error('❌ Failed to start MongoDB automatically:', startError.message);
        console.log('\n🚨 MANUAL SOLUTION: MongoDB server is not running');
        console.log('To start MongoDB manually:');
        console.log('1. Run: start-mongo-fixed.bat');
        console.log('2. Or use: mongod --dbpath "data\\db" --port 27017');
        console.log('3. Or use MongoDB Cloud Atlas for online database');
      }
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🚨 SOLUTION: MongoDB host not found');
      console.log('Check your MONGODB_URI in .env file');
      console.log('For local development, use: MONGODB_URI=mongodb://localhost:27017/digitalmarket');

    } else if (error.message.includes('authentication failed')) {
      console.log('\n🚨 SOLUTION: Authentication failed');
      console.log('Check your MongoDB username and password in connection string');
    }

    console.log('\n🔧 App will start with reduced functionality');
    console.log('⚠️  Database-dependent features may not work (login, signup, etc.)');
    return false;
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📊 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📊 Mongoose disconnected');
});

// Close connection and MongoDB process on app termination
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');

  // Close MongoDB connection
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('📊 MongoDB connection closed');
  }

  // Kill MongoDB process if we started it
  if (mongoProcess) {
    console.log('🛑 Stopping MongoDB server...');
    mongoProcess.kill();
    console.log('✅ MongoDB server stopped');
  }

  console.log('👋 Application terminated gracefully');
  process.exit(0);
});

// Handle other termination signals
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }

  if (mongoProcess) {
    mongoProcess.kill();
  }

  process.exit(0);
});

module.exports = connectDB;
