#!/usr/bin/env node

/**
 * Debug Admin Login Issues - Check admin user data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const AdminUser = require('./models/AdminUser');

async function debugAdminLogin() {
    console.log('🔍 Debugging Admin Login Issues');
    console.log('===============================\n');

    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get all admin users
        const adminUsers = await AdminUser.find({}).select('adminId username email password createdAt');
        console.log(`📊 Found ${adminUsers.length} admin users in database\n`);

        if (adminUsers.length === 0) {
            console.log('❌ No admin users found in database');
            console.log('💡 Run "node create-admin.js" to create an admin user');
            return;
        }

        // Check each admin user
        for (let i = 0; i < adminUsers.length; i++) {
            const admin = adminUsers[i];
            console.log(`👑 Admin User ${i + 1}:`);
            console.log(`   Admin ID: ${admin.adminId}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Has Password: ${admin.password ? 'Yes' : 'No'}`);
            console.log(`   Password Length: ${admin.password ? admin.password.length : 0}`);
            console.log(`   Created: ${admin.createdAt}`);

            // Test password verification
            if (admin.password) {
                try {
                    const testPasswords = ['Family$786', 'admin123'];
                    for (const testPass of testPasswords) {
                        const isValid = await bcrypt.compare(testPass, admin.password);
                        console.log(`   Password "${testPass}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
                    }
                } catch (err) {
                    console.log(`   Password Test: ❌ Error - ${err.message}`);
                }
            }

            console.log(''); // Empty line
        }

        console.log('\n🧪 Quick Fix Commands:');
        console.log('   # Create admin user:');
        console.log('   node create-admin.js');
        console.log('   # Or manually create in MongoDB:');
        console.log('   db.adminusers.insertOne({adminId: "admin", username: "Administrator", email: "admin@hsello.com", password: "$2b$10$..."})');

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

debugAdminLogin();