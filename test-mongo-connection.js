const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB Connection...');
console.log('=================================\n');

async function testConnection() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });

        console.log('✅ MongoDB Connected Successfully!');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);
        console.log(`🔌 Port: ${mongoose.connection.port}`);

        // Test basic operations
        console.log('\n🧪 Testing database operations...');

        // Create test collection if it doesn't exist
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`📚 Collections found: ${collections.length}`);

        // Close connection
        await mongoose.disconnect();
        console.log('\n🎉 MongoDB is ready for DigitalMarket!');
        console.log('You can now start your app with: node app.js');

    } catch (error) {
        console.error('❌ MongoDB Connection Failed:');
        console.error('Error:', error.message);

        if (error.message.includes('connect ECONNREFUSED')) {
            console.log('\n🔧 SOLUTION: MongoDB server is not running.');
            console.log('Run this command to start MongoDB:');
            console.log('   start-mongo-local.bat');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n🔧 SOLUTION: Check your MongoDB username and password.');
        }

        console.log('\nFor more help, visit: https://docs.mongodb.com/manual/installation/');
        process.exit(1);
    }
}

testConnection();
