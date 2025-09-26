#!/usr/bin/env node

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import models
const User = require('./models/User');
const SellerApplication = require('./models/SellerApplication');

console.log('🔧 Testing become-seller functionality...\n');

// Mock data for testing
const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com'
};

const mockBody = {
    storeName: 'Test Store',
    category: 'services',
    contactEmail: 'contact@teststore.com',
    contactPhone: '123-456-7890',
    storeDescription: 'This is a test store description',
    seoDescription: 'Test store SEO description',
    rules: 'Test rules',
    agreeTerms: 'on'
};

const mockFiles = {
    banner: [{ filename: 'test-banner.jpg' }],
    logo: [{ filename: 'test-logo.jpg' }]
};

// Test 1: Model Validation
async function test1() {
    console.log('📋 Test 1: Schema Validation');

    try {
        const newApplication = new SellerApplication({
            userId: mockUser._id,
            userName: `${mockUser.firstName} ${mockUser.lastName}`,
            userEmail: mockUser.email,
            storeName: mockBody.storeName,
            category: mockBody.category,
            contactEmail: mockBody.contactEmail.trim(),
            contactPhone: mockBody.contactPhone.trim(),
            rules: mockBody.rules.trim(),
            storeDescription: mockBody.storeDescription.trim(),
            seoDescription: mockBody.seoDescription.trim(),
            bannerPath: mockFiles.banner[0].filename,
            logoPath: mockFiles.logo[0].filename,
            status: 'pending',
            submittedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: ''
        });

        console.log('✅ SellerApplication object created successfully');

        // Validate schema
        await newApplication.validate();
        console.log('✅ Schema validation passed');

        return true;
    } catch (error) {
        console.error('❌ Schema validation failed:', error.message);
        return false;
    }
}

// Test 2: Database Save (if MongoDB is connected)
async function test2() {
    console.log('\n📋 Test 2: Database Save');

    if (mongoose.connection.readyState !== 1) {
        console.log('⚠️  MongoDB not connected, skipping save test');
        return false;
    }

    try {
        const newApplication = new SellerApplication({
            userId: mockUser._id,
            userName: `${mockUser.firstName} ${mockUser.lastName}`,
            userEmail: mockUser.email,
            storeName: mockBody.storeName + ' ' + Math.random(),
            category: mockBody.category,
            contactEmail: mockBody.contactEmail,
            contactPhone: mockBody.contactPhone,
            rules: mockBody.rules,
            storeDescription: mockBody.storeDescription,
            seoDescription: mockBody.seoDescription,
            bannerPath: mockFiles.banner[0].filename,
            logoPath: mockFiles.logo[0].filename,
            status: 'pending',
            submittedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: ''
        });

        await newApplication.save();
        console.log('✅ SellerApplication saved to database');

        // Clean up
        await SellerApplication.deleteOne({ _id: newApplication._id });
        console.log('✅ Test application removed from database');

        return true;
    } catch (error) {
        console.error('❌ Database save failed:', error.message);
        return false;
    }
}

// Run tests
async function runTests() {
    console.log('🔧 Starting become-seller tests...\n');

    const test1Result = await test1();
    const test2Result = await test2();

    console.log('\n📊 Test Results:');
    console.log(`Schema Validation: ${test1Result ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Database Save: ${test2Result ? '✅ PASS' : '❌ FAIL'}`);

    if (test1Result && test2Result) {
        console.log('\n🎉 All tests passed! The become-seller functionality should work.');
    } else {
        console.log('\n❌ Some tests failed. Check issues above.');
    }
}

// Handle MongoDB connection
async function setupMongo() {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/digitalmarket';

    try {
        await mongoose.connect(dbUri);
        console.log('✅ MongoDB connected for testing');
    } catch (error) {
        console.log('⚠️  MongoDB connection failed, running schema tests only');
    }
}

// Main execution
setupMongo().then(() => {
    runTests().then(() => {
        console.log('\n🏁 Testing complete!');
        process.exit(0);
    });
}).catch(console.error);
