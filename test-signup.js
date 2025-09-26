require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

console.log('🧪 Testing Signup Process...');

// Test MongoDB connection
async function testSignup() {
    try {
        console.log('1. Connecting to MongoDB...');

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB Connected');
        console.log('Connection readyState:', mongoose.connection.readyState);

        // Test user creation
        console.log('\n2. Testing user creation...');

        const testData = {
            firstName: 'Test',
            lastName: 'User',
            email: `test${Date.now()}@example.com`,
            password: await require('bcrypt').hash('password123', 12),
            isSeller: false,
            balance: 100
        };

        const newUser = new User(testData);
        await newUser.save();

        console.log('✅ User created successfully:', newUser.email);

        // Clean up
        await User.findByIdAndDelete(newUser._id);
        console.log('✅ Test user cleaned up');

        await mongoose.connection.close();
        console.log('✅ Test completed successfully');

    } catch (error) {
        console.error('❌ Error during test:', error.message);
        console.error('Full error:', error);

        if (error.errors) {
            console.error('Validation errors:', error.errors);
        }

        process.exit(1);
    }
}

testSignup();
