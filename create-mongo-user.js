const { MongoClient } = require('mongodb');

async function createMongoUser() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        console.log('🔧 Creating MongoDB user for DigitalMarket...');

        await client.connect();
        console.log('✅ Connected to MongoDB');

        const adminDb = client.db('admin');

        // Create user in myappdb
        await adminDb.command({
            createUser: 'myappuser',
            pwd: 'yourpassword',
            roles: [
                {
                    role: 'readWrite',
                    db: 'myappdb'
                }
            ]
        });

        console.log('✅ MongoDB user created successfully!');
        console.log('   Username: myappuser');
        console.log('   Password: yourpassword');
        console.log('   Database: myappdb');
        console.log('   Connection string: mongodb://myappuser:yourpassword@localhost:27017/myappdb');

    } catch (error) {
        console.error('❌ Error creating MongoDB user:', error.message);

        if (error.message.includes('already exists')) {
            console.log('ℹ️  User already exists. You can update the password manually in MongoDB shell:');
            console.log('   mongosh admin');
            console.log('   db.changeUserPassword("myappuser", "newpassword")');
        } else if (error.message.includes('not authorized')) {
            console.log('ℹ️  Need to run MongoDB without authentication first.');
            console.log('   Make sure MongoDB is running without --auth flag.');
        }
    } finally {
        await client.close();
    }
}

createMongoUser();