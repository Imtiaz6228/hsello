const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

// Debug logging
console.log('🔧 Starting simple test application...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.send('<h1>Home Page</h1><a href="/admin/login">Go to Admin Login</a>');
});

app.get('/admin/login', (req, res) => {
    console.log('✅ Admin login route hit!');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Admin Login Test</title></head>
        <body>
            <h1>Admin Login Page</h1>
            <p>Route is working!</p>
            <div>
                <p>Demo Admin Access</p>
                <p>Admin ID: ADMIN-001</p>
                <p>Password: admin123</p>
            </div>
            <a href="/">Back to Home</a>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Simple server running at http://localhost:${PORT}`);
});

module.exports = app;
