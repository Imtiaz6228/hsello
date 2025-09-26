// Debug the main server
const express = require('express');
const path = require('path');
const app = express();

try {
    // Check multer import
    const multer = require('multer');
    console.log('✅ Multer import successful');

    // Check EJS setup
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    console.log('✅ EJS setup successful');

    // Test route
    app.get('/', (req, res) => {
        res.send(`
        <h1>✅ Debug Server Working!</h1>
        <p>Try these URLs:</p>
        <ul>
            <li><a href="/become-seller-debug">Become Seller Debug</a></li>
            <li><a href="/multer-test">Multer Test</a></li>
        </ul>
        `);
    });

    app.get('/become-seller-debug', (req, res) => {
        res.send('✅ Become Seller route works!');
    });

    app.get('/multer-test', (req, res) => {
        res.send('✅ Multer is available and working!');
    });

    const PORT = 3004;
    app.listen(PORT, () => {
        console.log(`🚀 Debug server running at http://localhost:${PORT}`);
        console.log('If this works, the issue is with the main app.js file');
    });

} catch (error) {
    console.error('❌ Debug server setup error:', error);
    console.error('This error is preventing the main server from starting');
}
