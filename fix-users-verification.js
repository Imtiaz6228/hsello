const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/digitalmarket');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

async function fixUsers() {
    try {
        console.log('🔧 Checking user email verification status...');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users in database`);

        // Check unverified users
        const unverifiedUsers = users.filter(u => !u.isEmailVerified);
        console.log(`⚠️ Found ${unverifiedUsers.length} unverified users`);

        if (unverifiedUsers.length > 0) {
            console.log('🔧 Fixing unverified users...');

            // Update all users to be verified
            const result = await User.updateMany(
                { isEmailVerified: { $ne: true } },
                {
                    $set: {
                        isEmailVerified: true,
                        emailVerificationToken: undefined,
                        emailVerificationExpires: undefined
                    }
                }
            );

            console.log(`✅ Updated ${result.modifiedCount} users`);
        } else {
            console.log('✅ All users are already verified');
        }

        // Verify the fix
        const verifiedCount = await User.countDocuments({ isEmailVerified: true });
        console.log(`📊 Total verified users: ${verifiedCount}/${users.length}`);

        console.log('🎉 Email verification fix completed!');
        console.log('💡 Users can now login and signup without email verification');

    } catch (error) {
        console.error('❌ Error fixing users:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the fix
connectDB().then(() => {
    fixUsers();
});