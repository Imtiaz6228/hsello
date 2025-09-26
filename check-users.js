const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        const users = await User.find({}, 'firstName lastName email isSeller balance');
        console.log(`Found ${users.length} users:`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.email} (Seller: ${user.isSeller})`);
        });

        if (users.length === 0) {
            console.log('No users found in database');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
    }
}

checkUsers();
