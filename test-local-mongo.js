const mongoose = require('mongoose');

console.log('🔍 Testing Local MongoDB Connection');
console.log('=====================================\n');

async function testLocalMongo() {
    try {
        console.log('Attempting to connect to local MongoDB...');

        // Connect to local MongoDB
        await mongoose.connect('mongodb://localhost:27017/test', {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });

        console.log('✅ Connection successful!');
        console.log(`Host: ${mongoose.connection.host}`);
        console.log(`Port: ${mongoose.connection.port}`);
        console.log(`Database: ${mongoose.connection.name}`);

        // Test basic database operations
        console.log('\nTesting database operations...');
        const db = mongoose.connection.db;

        // Create a test collection and insert a document
        const testCollection = db.collection('test_connection');
        const testDoc = { message: 'MongoDB is working!', timestamp: new Date() };

        await testCollection.insertOne(testDoc);
        console.log('✅ Test document inserted');

        // Read it back
        const result = await testCollection.findOne({ message: 'MongoDB is working!' });
        console.log('✅ Test document found:', result.message);

        // Clean up
        await testCollection.deleteMany({});
        console.log('✅ Test data cleaned up');

        await mongoose.disconnect();
        console.log('\n🎉 Local MongoDB is working perfectly!');
        console.log('MongoDB installation and setup completed successfully.');

    } catch (error) {
        console.log('❌ Connection failed');
        console.error('Error:', error.message);

        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔧 SOLUTION: MongoDB server is not running');
            console.log('   Start MongoDB: cd mongodb-win32-x86_64-windows-8.0.13\\bin && mongod.exe --dbpath C:\\data\\db');
        } else if (error.message.includes('MongoServerError')) {
            console.log('\n🔧 SOLUTION: Check MongoDB server logs for errors');
        }

        process.exit(1);
    }
}

testLocalMongo();
