// Simple test to check if models and basic app structure work
console.log('Testing syntax and basic imports...');

try {
    const mongoose = require('mongoose');
    console.log('✅ mongoose imported');

    const User = require('./models/User');
    console.log('✅ User model imported');

    const Order = require('./models/Order');
    console.log('✅ Order model imported');

    const AdminUser = require('./models/AdminUser');
    console.log('✅ AdminUser model imported');

    console.log('✅ All models imported successfully');
} catch (error) {
    console.log('❌ Error:', error.message);
}
