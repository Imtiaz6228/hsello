const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Check if test user already exists
        const existingUser = await User.findOne({ email: 'test@example.com' });
        if (existingUser) {
            console.log('Test user already exists');
            console.log('Email: test@example.com');
            console.log('Password: password123');
            await mongoose.disconnect();
            return;
        }

        // Create test user
        const hashedPassword = await bcrypt.hash('password123', 12);
        const newUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: hashedPassword,
            isSeller: false,
            balance: 100.00,
            isEmailVerified: true, // Add this to fix login issue
            sellerApplication: {
                pending: false,
                approved: false
            }
        });

        await newUser.save();
        console.log('✅ Test user created successfully!');
        console.log('   Email: test@example.com');
        console.log('   Password: password123');
        console.log('   Balance: $100.00');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
    }
}

createTestUser();
