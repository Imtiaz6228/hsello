#!/usr/bin/env node

/**
 * Debug Login Issues - Check user data after signup
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/User');

async function debugLogin() {
    console.log('🔍 Debugging Login Issues');
    console.log('========================\n');

    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get all users
        const users = await User.find({}).select('firstName lastName email password isEmailVerified createdAt');
        console.log(`📊 Found ${users.length} users in database\n`);

        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('💡 Try signing up first, then run this script again');
            return;
        }

        // Check each user
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            console.log(`👤 User ${i + 1}:`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.firstName} ${user.lastName}`);
            console.log(`   Email Verified: ${user.isEmailVerified}`);
            console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
            console.log(`   Password Length: ${user.password ? user.password.length : 0}`);
            console.log(`   Created: ${user.createdAt}`);

            // Test password verification
            if (user.password) {
                try {
                    const testPassword = 'password123'; // Demo password
                    const isValidDemo = await bcrypt.compare(testPassword, user.password);
                    console.log(`   Demo Password (${testPassword}): ${isValidDemo ? '✅ Valid' : '❌ Invalid'}`);
                } catch (err) {
                    console.log(`   Password Test: ❌ Error - ${err.message}`);
                }
            }

            console.log(''); // Empty line
        }

        // Check email verification requirement
        console.log('⚙️ Configuration:');
        console.log(`   REQUIRE_EMAIL_VERIFICATION: ${process.env.REQUIRE_EMAIL_VERIFICATION || 'true (default)'}`);
        console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);

        // Provide recommendations
        console.log('\n💡 Troubleshooting:');
        
        const unverifiedUsers = users.filter(u => !u.isEmailVerified);
        if (unverifiedUsers.length > 0 && process.env.REQUIRE_EMAIL_VERIFICATION !== 'false') {
            console.log('   ⚠️ Some users have unverified emails');
            console.log('   Solution 1: Set REQUIRE_EMAIL_VERIFICATION=false in .env');
            console.log('   Solution 2: Manually verify users with this command:');
            console.log('   db.users.updateMany({}, {$set: {isEmailVerified: true}})');
        }

        const usersWithoutPassword = users.filter(u => !u.password);
        if (usersWithoutPassword.length > 0) {
            console.log('   ❌ Some users have no password hash');
            console.log('   This indicates a signup error - users need to be recreated');
        }

        console.log('\n🧪 Quick Fix Commands:');
        console.log('   # Verify all users:');
        console.log('   mongo digitalmarket --eval "db.users.updateMany({}, {\\$set: {isEmailVerified: true}})"');
        console.log('   # Or use MongoDB Compass/Studio 3T to update manually');

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

debugLogin();