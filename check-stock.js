const mongoose = require('mongoose');
require('dotenv').config();

async function checkStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./models/User');
    const users = await User.find({ isSeller: true });

    console.log(`\n📊 Found ${users.length} sellers:`);

    let totalProducts = 0;
    users.forEach((user, index) => {
      if (user.store && user.store.items) {
        console.log(`\n🏪 Seller ${index + 1}: ${user.store.name || user.firstName + ' ' + user.lastName}`);
        console.log(`   📦 Products: ${user.store.items.length}`);

        user.store.items.forEach((product, pIndex) => {
          totalProducts++;
          console.log(`   ${pIndex + 1}. "${product.name}"`);
          console.log(`      💰 Price: ₽${product.price}`);
          console.log(`      📊 Stock: ${product.stockQuantity || 0}`);
          console.log(`      📊 Available: ${product.availableQuantity || 0}`);
          console.log(`      🔄 Status: ${product.status}`);
          console.log(`      🛒 Sold: ${product.soldCount || 0}`);
          console.log(`      📁 Files: ${product.files ? product.files.length : 0}`);
          console.log('');
        });
      }
    });

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Sellers: ${users.length}`);
    console.log(`   Total Products: ${totalProducts}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStock();
