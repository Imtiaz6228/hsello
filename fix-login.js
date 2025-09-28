#!/usr/bin/env node

/**
 * Quick Fix for Login Issues
 * This script will fix common login problems after signup
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function fixLoginIssues() {
    console.log('🔧 Fixing Login Issues');
    console.log('=====================\n');

    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users in database\n`);

        if (users.length === 0) {
            console.log('❌ No users found in database');
            console.log('💡 Please sign up first, then run this script');
            return;
        }

        let fixedCount = 0;

        // Fix each user
        for (const user of users) {
            console.log(`👤 Checking user: ${user.email}`);
            let needsUpdate = false;

            // Fix 1: Ensure email is verified if verification is disabled
            if (!user.isEmailVerified && process.env.REQUIRE_EMAIL_VERIFICATION !== 'true') {
                console.log('   🔧 Setting email as verified (verification disabled)');
                user.isEmailVerified = true;
                needsUpdate = true;
            }

            // Fix 2: Clear expired verification tokens
            if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
                console.log('   🔧 Clearing expired verification token');
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

            // Fix 4: Check password hash
            if (!user.password) {
                console.log('   ❌ User has no password hash - this user needs to be recreated');
            } else {
                console.log('   ✅ Password hash exists');
            }

            if (needsUpdate) {
                await user.save();
                fixedCount++;
                console.log('   ✅ User updated');
            } else {
                console.log('   ✅ User is OK');
            }

            console.log(''); // Empty line
        }

        console.log(`🎉 Fixed ${fixedCount} users`);

        // Show current configuration
        console.log('\n⚙️ Current Configuration:');
        console.log(`   REQUIRE_EMAIL_VERIFICATION: ${process.env.REQUIRE_EMAIL_VERIFICATION || 'true (default)'}`);
        console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);

        // Provide recommendations
        console.log('\n💡 Recommendations:');
        
        const unverifiedUsers = users.filter(u => !u.isEmailVerified);
        if (unverifiedUsers.length > 0) {
            console.log(`   ⚠️ ${unverifiedUsers.length} users still have unverified emails`);
            if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
                console.log('   Solution: Set REQUIRE_EMAIL_VERIFICATION=false in .env file');
            }
        }

        const usersWithoutPassword = users.filter(u => !u.password);
        if (usersWithoutPassword.length > 0) {
            console.log(`   ❌ ${usersWithoutPassword.length} users have no password hash`);
            console.log('   These users need to sign up again');
        }

        console.log('\n🧪 Test Login:');
        console.log('   1. Start the app: npm start');
        console.log('   2. Try logging in with your signup credentials');
        console.log('   3. If still failing, run: node debug-login.js');

    } catch (error) {
        console.error('❌ Fix error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n📊 Database connection closed');
        process.exit(0);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node fix-login.js');
    console.log('');
    console.log('This script fixes common login issues:');
    console.log('- Sets email as verified if verification is disabled');
    console.log('- Clears expired verification tokens');
    console.log('- Converts emails to lowercase');
    console.log('- Identifies users without password hashes');
    process.exit(0);
}

fixLoginIssues();