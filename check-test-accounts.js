const mongoose = require('mongoose');
const User = require('./models/User');
const AdminUser = require('./models/AdminUser');
require('dotenv').config();

async function checkTestAccounts() {
    try {
        console.log('🔍 Checking Test Accounts...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');

        // Check test buyer
        console.log('👤 Checking Test Buyer...');
        const buyer = await User.findOne({ email: 'buyer@test.com' });
        if (buyer) {
            console.log('✅ Test Buyer Found:');
            console.log('   Email:', buyer.email);
            console.log('   Name:', buyer.firstName, buyer.lastName);
            console.log('   Balance:', buyer.balance || 0);
            console.log('   Is Seller:', buyer.isSeller);
            console.log('   Email Verified:', buyer.isEmailVerified);
        } else {
            console.log('❌ Test Buyer NOT found');
        }

        // Check test seller
        console.log('\n🏪 Checking Test Seller...');
        const seller = await User.findOne({ email: 'seller@test.com' });
        if (seller) {
            console.log('✅ Test Seller Found:');
            console.log('   Email:', seller.email);
            console.log('   Name:', seller.firstName, seller.lastName);
            console.log('   Balance:', seller.balance || 0);
            console.log('   Is Seller:', seller.isSeller);
            console.log('   Store:', seller.store ? seller.store.name : 'No store');
            console.log('   Products:', seller.store && seller.store.items ? seller.store.items.length : 0);
        } else {
            console.log('❌ Test Seller NOT found');
        }

        // Check test admin
        console.log('\n👑 Checking Test Admin...');
        const admin = await AdminUser.findOne({ adminId: 'admin123' });
        if (admin) {
            console.log('✅ Test Admin Found:');
            console.log('   Admin ID:', admin.adminId);
            console.log('   Username:', admin.username);
            console.log('   Email:', admin.email);
            console.log('   Role:', admin.role);
        } else {
            console.log('❌ Test Admin NOT found');
        }

        console.log('\n🎯 Test Account Check Complete!');
        console.log('\n💡 If accounts are missing, run: node create-test-accounts.js');

    } catch (error) {
        console.error('❌ Error checking test accounts:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

checkTestAccounts();
