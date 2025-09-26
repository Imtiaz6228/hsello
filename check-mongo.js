require('dotenv').config();
const mongoose = require('mongoose');
const { exec } = require('child_process');
const dns = require('dns').promises;

console.log('🔍 MongoDB Atlas Connection Diagnostic Tool');
console.log('============================================\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   MONGODB_URI configured:', process.env.MONGODB_URI ? '✅' : '❌');
if (process.env.MONGODB_URI) {
    const url = new URL(process.env.MONGODB_URI);
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Protocol: ${url.protocol}`);
}

// DNS Resolution Check
console.log('\n2. DNS Resolution Check:');
async function checkDNS() {
    try {
        const addresses = await dns.resolve4('cluster0.ms0fasc.mongodb.net');
        console.log('   DNS Resolution: ✅');
        console.log(`   IP addresses: ${addresses.join(', ')}`);
    } catch (error) {
        console.log('   DNS Resolution: ❌');
        console.log(`   Error: ${error.message}`);
    }
}

// Network Connectivity Test
console.log('\n3. Network Connectivity Test:');
function checkNetwork() {
    return new Promise((resolve) => {
        exec(`ping -n 2 cluster0.ms0fasc.mongodb.net`, (error, stdout, stderr) => {
            if (error) {
                console.log('   Ping test: ❌');
                console.log('   Error: Failed to ping MongoDB Atlas cluster');
            } else {
                console.log('   Ping test: ✅');
                console.log('   Connection to MongoDB Atlas is possible');
            }
            resolve();
        });
    });
}

// MongoDB Connection Test
console.log('\n4. MongoDB Connection Test:');
async function testConnection() {
    try {
        console.log('   Attempting connection...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });

        console.log('   Connection: ✅');
        console.log(`   Host: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);
        console.log(`   ReadyState: ${conn.connection.readyState}`);

        // Test basic operations
        console.log('\n5. Database Operations Test:');
        const collections = await conn.connection.db.listCollections().toArray();
        console.log(`   Collections found: ${collections.length}`);

        const usersCollection = conn.connection.db.collection('users');
        const userCount = await usersCollection.countDocuments({}, { maxTimeMS: 5000 });
        console.log(`   Users in database: ${userCount}`);

        await mongoose.disconnect();
        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.log('   Connection: ❌');
        console.log(`   Error: ${error.message}`);
        console.log(`   Error code: ${error.code}`);
        console.log(`   Error name: ${error.name}`);

        if (error.message.includes('ENOTFOUND')) {
            console.log('\n🔧 POSSIBLE SOLUTIONS:');
            console.log('   1. Check if cluster is paused (resume it in Atlas)');
            console.log('   2. Verify network connectivity');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n🔧 POSSIBLE SOLUTIONS:');
            console.log('   1. Check username/password in connection string');
            console.log('   2. Verify user permissions in Atlas');
            console.log('   3. Reset database user password');
        } else if (error.message.includes('queryTxt ETIMEOUT')) {
            console.log('\n🔧 POSSIBLE SOLUTIONS:');
            console.log('   1. Check IP whitelist in Atlas Network Access');
            console.log('   2. Try adding 0.0.0.0/0 for testing (NOT recommended for production)');
        }
    }
}

// Run all checks
async function runDiagnostics() {
    await checkDNS();
    await checkNetwork();
    await testConnection();

    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Login to MongoDB Atlas dashboard');
    console.log('   2. Check Network Access > IP Access List');
    console.log('   3. Add your current IP address or 0.0.0.0/0 for all IPs');
    console.log('   4. Verify cluster is not paused (Clusters > Resume if needed)');
    console.log('   5. Test connection again: node check-mongo.js');
}

runDiagnostics();
