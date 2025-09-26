// Fix MongoDB feature compatibility version from 6.0 to 8.0
const MongoClient = require('mongodb').MongoClient;

// Connect to MongoDB
const url = 'mongodb://localhost:27017/digitalmarket';

MongoClient.connect(url, {
  serverSelectionTimeoutMS: 5000,
}, async (err, client) => {
  if (err) {
    console.error('Failed to connect:', err);
    console.log('MongoDB might still be starting up...');
    return;
  }

  console.log('Connected to MongoDB');

  try {
    const db = client.db('admin');
    const result = await db.command({ setFeatureCompatibilityVersion: "8.0" });
    console.log('Feature compatibility version updated:', result);
  } catch (error) {
    console.error('Failed to update compatibility version:', error);
  } finally {
    await client.close();
  }
});
