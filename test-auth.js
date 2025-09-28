#!/usr/bin/env node

/**
 * Authentication Test Script for VPS Deployment
 * Run this script to test database connection, email service, and create test users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models and services
const User = require('./models/User');
const { testEmailConnection, sendEmailVerification } = require('./utils/emailService');

console.log('🧪 DigitalMarket Authentication Test Script');
console.log('==========================================\n');

async function testDatabaseConnection() {
    console.log('1️⃣ Testing Database Connection...');
    
    try {
        if (!process.env.MONGODB_URI) {
            console.log('❌ MONGODB_URI not found in .env file');
            return false;
        }

        console.log('📍 MongoDB URI:', process.env.MONGODB_URI.replace(/:([^:@]{4})[^:@]*@/, ':$1****@'));
        
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });

        console.log('✅ Database connection successful');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('🌐 Host:', mongoose.connection.host);
        return true;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Solution: Start MongoDB service or use MongoDB Atlas');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('💡 Solution: Check MONGODB_URI in .env file');
        } else if (error.message.includes('authentication failed')) {
            console.log('💡 Solution: Check MongoDB username/password');
        }
        
        return false;
    }
}

async function testEmailService() {
    console.log('\n2️⃣ Testing Email Service...');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email credentials not configured');
        console.log('📧 EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
        console.log('🔑 EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
        console.log('💡 Configure email in .env or set REQUIRE_EMAIL_VERIFICATION=false');
        return false;
    }

    try {
        const result = await testEmailConnection();
        if (result.success) {
            console.log('✅ Email service connection successful');
            return true;
        } else {
            console.log('❌ Email service connection failed:', result.error);
            return false;
        }
    } catch (error) {
        console.log('❌ Email service test failed:', error.message);
        return false;
    }
}

async function createTestUser() {
    console.log('\n3️⃣ Creating Test User...');
    
    const testEmail = 'test@digitalmarket.local';
    const testPassword = 'password123';
    
    try {
        // Check if test user already exists
        const existingUser = await User.findOne({ email: testEmail });
        if (existingUser) {
            console.log('⚠️ Test user already exists');
            console.log('📧 Email:', existingUser.email);
            console.log('✅ Verified:', existingUser.isEmailVerified);
            console.log('👤 Name:', `${existingUser.firstName} ${existingUser.lastName}`);
            return existingUser;
        }

        // Create new test user
        const hashedPassword = await bcrypt.hash(testPassword, 12);
        const testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: testEmail,
            password: hashedPassword,
            isEmailVerified: process.env.REQUIRE_EMAIL_VERIFICATION !== 'true', // Auto-verify if not required
            isSeller: false,
            balance: 0
        });

        await testUser.save();
        console.log('✅ Test user created successfully');
        console.log('📧 Email:', testUser.email);
        console.log('🔑 Password:', testPassword);
        console.log('✅ Verified:', testUser.isEmailVerified);
        
        return testUser;
    } catch (error) {
        console.log('❌ Failed to create test user:', error.message);
        return null;
    }
}

async function testUserLogin() {
    console.log('\n4️⃣ Testing User Login...');
    
    const testEmail = 'test@digitalmarket.local';
    const testPassword = 'password123';
    
    try {
        const user = await User.findOne({ email: testEmail });
        if (!user) {
            console.log('❌ Test user not found');
            return false;
        }

        const passwordMatch = await bcrypt.compare(testPassword, user.password);
        if (passwordMatch) {
            console.log('✅ Password verification successful');
            
            if (user.isEmailVerified) {
                console.log('✅ User can login (email verified)');
                return true;
            } else {
                console.log('⚠️ User cannot login (email not verified)');
                console.log('💡 Set REQUIRE_EMAIL_VERIFICATION=false or verify email');
                return false;
            }
        } else {
            console.log('❌ Password verification failed');
            return false;
        }
    } catch (error) {
        console.log('❌ Login test failed:', error.message);
        return false;
    }
}

async function checkConfiguration() {
    console.log('\n5️⃣ Configuration Check...');
    
    const config = {
        'MONGODB_URI': process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
        'PORT': process.env.PORT || '3001 (default)',
        'NODE_ENV': process.env.NODE_ENV || 'development (default)',
        'SESSION_SECRET': process.env.SESSION_SECRET ? '✅ Set' : '⚠️ Using default',
        'BASE_URL': process.env.BASE_URL || 'http://localhost:3001 (default)',
        'EMAIL_USER': process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
        'EMAIL_PASS': process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
        'REQUIRE_EMAIL_VERIFICATION': process.env.REQUIRE_EMAIL_VERIFICATION || 'true (default)',
    };

    console.log('📋 Current Configuration:');
    Object.entries(config).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('   - Configure email credentials or set REQUIRE_EMAIL_VERIFICATION=false');
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.includes('change-this')) {
        console.log('   - Change SESSION_SECRET to a secure random string');
    }
    if (process.env.BASE_URL && process.env.BASE_URL.includes('localhost')) {
        console.log('   - Update BASE_URL to your VPS domain/IP');
    }
}

async function runAllTests() {
    try {
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.log('\n❌ Cannot proceed without database connection');
            process.exit(1);
        }

        await testEmailService();
        await createTestUser();
        await testUserLogin();
        await checkConfiguration();

        console.log('\n🎉 Test Summary:');
        console.log('================');
        console.log('✅ Database: Connected');
        console.log('📧 Email: ' + (process.env.EMAIL_USER ? 'Configured' : 'Not configured'));
        console.log('👤 Test User: Created/Available');
        console.log('🔐 Login: Ready to test');
        
        console.log('\n🚀 Next Steps:');
        console.log('1. Start the application: npm start');
        console.log('2. Visit: http://localhost:3001');
        console.log('3. Try logging in with: test@digitalmarket.local / password123');
        console.log('4. Try creating a new account');

    } catch (error) {
        console.error('\n❌ Test script error:', error);
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n📊 Database connection closed');
        }
        process.exit(0);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node test-auth.js [options]');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --db-only      Test database connection only');
    console.log('  --email-only   Test email service only');
    console.log('  --config-only  Show configuration only');
    process.exit(0);
}

if (args.includes('--db-only')) {
    testDatabaseConnection().then(() => process.exit(0));
} else if (args.includes('--email-only')) {
    testEmailService().then(() => process.exit(0));
} else if (args.includes('--config-only')) {
    checkConfiguration().then(() => process.exit(0));
} else {
    runAllTests();
}