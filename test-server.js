// Quick test to check if routes work
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3003;

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Test route
app.get('/test', (req, res) => {
    res.send('✅ Test route works!');
});

// Become seller test
app.get('/become-seller-test', (req, res) => {
    res.send('✅ Become Seller route is accessible!');
});

app.listen(PORT, () => {
    console.log(`🧪 Test server running at http://localhost:${PORT}`);
    console.log(`   Test: http://localhost:${PORT}/test`);
    console.log(`   Become Seller Test: http://localhost:${PORT}/become-seller-test`);
});
