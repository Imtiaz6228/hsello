// Simple diagnostic script to help debug add product form issues
console.log('🔍 Form Debugging Diagnostics');
console.log('===========================');

// Check 1: Required files existence
const fs = require('fs');

const requiredFiles = [
    'app.js',
    'views/seller/add-product.ejs',
    'uploads/',
    'public/',
    'package.json'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - EXISTS`);
    } else {
        console.log(`❌ ${file} - MISSING`);
    }
});

// Check 2: Form field analysis from EJS file
console.log('\n📝 Analyzing form fields from add-product.ejs...');
if (fs.existsSync('views/seller/add-product.ejs')) {
    const formContent = fs.readFileSync('views/seller/add-product.ejs', 'utf8');

    const requiredFieldsPattern = /name=["']([^"']+)["'][^>]*required/g;
    const formFields = [];

    let match;
    while ((match = requiredFieldsPattern.exec(formContent)) !== null) {
        formFields.push(match[1]);
    }

    console.log('🔍 Required form fields found:');
    formFields.forEach(field => {
        console.log(`   - ${field}`);
    });

    console.log(`📊 Total required fields: ${formFields.length}`);

    // Check file upload fields
    const fileUploadPattern = /name=["']([^"']+)["'][^>]*type=["']file["']/g;
    const fileFields = [];
    while ((match = fileUploadPattern.exec(formContent)) !== null) {
        fileFields.push(match[1]);
    }

    console.log('\n🖼️ File upload fields found:');
    fileFields.forEach(field => {
        console.log(`   - ${field}`);
    });

    console.log(`📊 Total file upload fields: ${fileFields.length}`);
} else {
    console.log('❌ Cannot analyze form fields - add-product.ejs not found');
}

// Check 3: Server configuration
console.log('\n⚙️ Server configuration check...');
if (fs.existsSync('app.js')) {
    const appContent = fs.readFileSync('app.js', 'utf8');

    // Check if multer is properly configured
    if (appContent.includes("multer") && appContent.includes("upload.array")) {
        console.log('✅ Multer configuration detected');
    } else {
        console.log('❌ Multer configuration not found or incomplete');
    }

    // Check if the route exists
    if (appContent.includes("POST.*add-product") || appContent.includes("'/seller/add-product'")) {
        console.log('✅ Add product route detected');
    } else {
        console.log('❌ Add product route not found');
    }

    // Check for debug logging (which we added)
    if (appContent.includes("🔧 Received form submission")) {
        console.log('✅ Debug logging is active in the route handler');
    } else {
        console.log('❌ Debug logging not found');
    }
} else {
    console.log('❌ Cannot check server configuration - app.js not found');
}

// Check 4: Installation guide
console.log('\n🚀 Next Steps:');
console.log('1. Make sure the server is running: node app.js');
console.log('2. Access http://localhost:3002 in your browser');
console.log('3. Log in as a seller user');
console.log('4. Navigate to the add product page');
console.log('5. Fill out the form completely and check server console for debug logs');
console.log('6. If errors occur, check the server console output for detailed information');

console.log('\n🧪 For automated testing (optional):');
console.log('Install axios: npm install axios form-data');
console.log('Then run: node test-form.js');

// Test contact-seller route functionality
console.log('\n📡 Testing contact-seller route...');
require('./app'); // This will start the server if not already running

// Simulate basic request checks
console.log('🔍 Testing seller existence...');

// Basic test data
const sellers = require('./app.js').users.filter(u => u.isSeller && u.store);
if (sellers.length > 0) {
    console.log(`✅ Found ${sellers.length} sellers in the system`);
    sellers.forEach(seller => {
        console.log(`   - Seller ID: ${seller.id}, Store: ${seller.store.name}`);
    });
} else {
    console.log('❌ No sellers found in the system');
    console.log('💡 Create a seller account first by:');
    console.log('   1. Going to /signup');
    console.log('   2. Creating an account');
    console.log('   3. Going to /become-seller');
    console.log('   4. Filling out and submitting the seller application');
    console.log('   5. Logging into admin panel (/admin/login) with admin/admin123');
    console.log('   6. Approving the seller application');
}

console.log('\n🔗 Contact seller route test completed');
