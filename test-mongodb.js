require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Testing MongoDB Atlas Connection...');
console.log('Connection URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log('🔄 Testing database operations...');

    // Test database access
    return mongoose.connection.db.admin().ping();
  })
  .then(() => {
    console.log('✅ Database operations working!');
    console.log('🎉 MongoDB Atlas is ready!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:');
    console.error('Error details:', err.message);

    if (err.message.includes('authentication failed')) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check your Atlas password is correct');
      console.log('2. Verify database user credentials in Atlas');
      console.log('3. Check network access IP whitelist');
    }

    if (err.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check cluster URL is correct');
      console.log('2. Ensure Atlas cluster is running');
      console.log('3. Check internet connection');
    }

    process.exit(1);
  });
