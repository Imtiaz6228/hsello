const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createImtiazUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Check if user already exists
        const existingUser = await User.findOne({ email: 'imtiazbashir68131168@gmail.com' });
        if (existingUser) {
            console.log('User already exists');
            console.log('Email: imtiazbashir68131168@gmail.com');
            console.log('Password: password123');
            await mongoose.disconnect();
            return;
        }

        // Create user
        const hashedPassword = await bcrypt.hash('password123', 12);
        const newUser = new User({
            firstName: 'Imtiaz',
            lastName: 'Bashir',
            email: 'imtiazbashir68131168@gmail.com',
            password: hashedPassword,
            isSeller: false,
            balance: 100.00,
            isEmailVerified: true,
            sellerApplication: {
                pending: false,
                approved: false
            }
        });

        await newUser.save();
        console.log('✅ User created successfully!');
        console.log('   Email: imtiazbashir68131168@gmail.com');
        console.log('   Password: password123');
        console.log('   Balance: $100.00');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
    }
}

createImtiazUser();