const mongoose = require('mongoose');
const AdminUser = require('./models/AdminUser');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: __dirname + '/.env' }); // Explicitly load .env from current directory

async function createAdmin() {
    try {
        console.log('MongoDB URI:', process.env.MONGODB_URI);
        console.log('Working directory:', __dirname);

        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment variables');
            console.log('Please check your .env file');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Check if admin already exists
        const existingAdmin = await AdminUser.findOne({ adminId: 'admin' });
        if (existingAdmin) {
            console.log('📋 Admin user already exists');
            console.log('   Admin ID: admin');
            console.log('   Password: admin123');
            await mongoose.disconnect();
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('Family$786', 10);
        const newAdmin = new AdminUser({
            adminId: 'admin',
            username: 'Administrator',
            email: 'admin@digitalmarket.com',
            password: hashedPassword
        });

        await newAdmin.save();
        console.log('✅ Admin user created successfully!');
        console.log('   Admin ID: admin');
        console.log('   Password: Family$786');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

createAdmin();
