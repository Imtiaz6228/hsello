#!/usr/bin/env node

/**
 * Fix Existing Users - Set all users as email verified
 * Run this to fix users created before the email verification was disabled
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function fixExistingUsers() {
    console.log('🔧 Fixing Existing Users');
    console.log('=======================\n');

    try {
        // Connect to database
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users in database\n`);

        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('💡 Create a new account and it should work immediately');
            return;
        }

        let fixedCount = 0;

        // Fix each user
        for (const user of users) {
            console.log(`👤 Processing user: ${user.email}`);
            let needsUpdate = false;

            // Fix 1: Set email as verified
            if (!user.isEmailVerified) {
                console.log('   🔧 Setting email as verified');
                user.isEmailVerified = true;
                needsUpdate = true;
            }

            // Fix 2: Clear verification tokens
            if (user.emailVerificationToken) {
                console.log('   🔧 Clearing verification token');
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
                needsUpdate = true;
            }

            // Fix 3: Ensure email is lowercase
            if (user.email !== user.email.toLowerCase()) {
                console.log('   🔧 Converting email to lowercase');
                user.email = user.email.toLowerCase();
                needsUpdate = true;
            }

            if (needsUpdate) {
                await user.save();
                fixedCount++;
                console.log('   ✅ User fixed and updated');
            } else {
                console.log('   ✅ User already OK');
            }

            // Test password hash
            if (user.password) {
                console.log('   ✅ Password hash exists');
            } else {
                console.log('   ❌ No password hash - user needs to signup again');
            }

            console.log(''); // Empty line
        }

        console.log(`🎉 Fixed ${fixedCount} out of ${users.length} users`);
        console.log('\n✅ All users are now ready to login without email verification');

        // Show test credentials
        console.log('\n🧪 Test Login Credentials:');
        users.forEach((user, index) => {
            console.log(`   ${index + 1}. Email: ${user.email}`);
            console.log(`      Password: Use the password you set during signup`);
            console.log(`      Demo Password: password123 (if enabled)`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Fix error:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 MongoDB is not running. Solutions:');
            console.log('   1. Start MongoDB: sudo systemctl start mongod');
            console.log('   2. Use MongoDB Atlas (cloud database)');
            console.log('   3. Use the simple file-based version: npm run start-simple');
        }
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n📊 Database connection closed');
        }
        process.exit(0);
    }
}

fixExistingUsers();