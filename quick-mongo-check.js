require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Quick MongoDB Atlas Check');
console.log('=============================\n');

console.log('Environment Variables:');
if (process.env.MONGODB_URI) {
    console.log('✅ MONGODB_URI found');
    try {
        const url = new URL(process.env.MONGODB_URI);
        console.log(`Host: ${url.hostname}`);
        console.log(`Database: ${url.pathname.slice(1)}`);
    } catch (e) {
        console.log('❌ Invalid connection string format');
    }
} else {
    console.log('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

console.log('\nTesting connection...');

// Set shorter timeout for quick test
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
})
.then(() => {
    console.log('✅ Connection successful!');
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Database: ${mongoose.connection.name}`);
    return mongoose.disconnect();
})
.then(() => {
    console.log('✅ Test completed successfully');
    console.log('\n🎉 Your MongoDB Atlas connection works!');
})
.catch((error) => {
    console.log('❌ Connection failed');
    console.error('Error:', error.message);

    if (error.message.includes('authentication failed')) {
        console.log('\n🔧 SOLUTION: Check your username/password in MongoDB Atlas');
        console.log('   1. Go to Atlas > Database Access');
        console.log('   2. Make sure user exists and password is correct');
    } else if (error.message.includes('queryTxt ETIMEOUT')) {
        console.log('\n🔧 SOLUTION: IP Whitelist Issue');
        console.log('   1. Go to Atlas > Network Access');
        console.log('   2. Add your IP address (or 0.0.0.0/0 for all IPs)');
        console.log('   3. OR: Allow access from anywhere for testing');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
        console.log('\n🔧 SOLUTION: DNS/Network Issue');
        console.log('   1. Check your internet connection');
        console.log('   2. Try again in a few minutes');
    }

    process.exit(1);
});
