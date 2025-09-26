const express = require('express');
const app = express();
const PORT = 3003; // Different port to test

app.get('/test', (req, res) => {
    res.send('Server is running!');
});

app.get('/admin/login', (req, res) => {
    res.send('<h1>Admin Login Test</h1><p>If you see this, the admin/login route is working.</p>');
});

app.listen(PORT, () => {
    console.log(`🚀 Test server running at http://localhost:${PORT}`);
});
