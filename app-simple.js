const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const connectFlash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const fs = require('fs');

// Use file-based database instead of MongoDB
const { fileDB } = require('./db-file');

console.log('🚀 Starting DigitalMarket with File-Based Database');
console.log('📁 No MongoDB required - using local file storage');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.SESSION_SECRET || 'digitalmarket_secret_key_2025';

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to check if logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// Set up EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(connectFlash());

// Global template variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    next();
});

// ============ AUTHENTICATION ROUTES ============

// Home page
app.get('/', async (req, res) => {
    try {
        const stats = fileDB.getStats();
        res.render('index', {
            user: req.session.user,
            topStores: [],
            productsByCategory: {},
            topStoreThisWeek: null,
            topProductThisWeek: null,
            dbStatus: 'file-based',
            stats: stats
        });
    } catch (error) {
        console.error('Homepage error:', error);
        res.render('index', {
            user: req.session.user,
            topStores: [],
            productsByCategory: {},
            topStoreThisWeek: null,
            topProductThisWeek: null,
            dbStatus: 'error',
            stats: { totalUsers: 0, totalOrders: 0 }
        });
    }
});

// Login page
app.get('/login', (req, res) => {
    res.render('login', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// Login handler - SIMPLIFIED WITHOUT EMAIL VERIFICATION
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    // Basic validation
    if (!email || !password) {
        req.flash('error_msg', 'Email and password are required');
        return res.redirect('/login');
    }

    try {
        const user = await fileDB.findUserByEmail(email);
        console.log('👤 Found user:', user ? user.email : 'Not found');

        if (!user) {
            console.log('❌ User not found for:', email);
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Password verification
        let passwordMatch = false;
        
        // Demo password
        if (password === 'password123') {
            console.log('⚠️ Demo password used');
            passwordMatch = true;
        } else {
            passwordMatch = await bcrypt.compare(password, user.password);
        }

        console.log('🔑 Password match:', passwordMatch);

        if (passwordMatch) {
            // Create session
            req.session.user = {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isSeller: user.isSeller || false,
                balance: user.balance || 0
            };

            // Update last login
            await fileDB.updateUser(user._id, { lastLoginAt: new Date().toISOString() });

            console.log('✅ Login successful for:', user.email);
            req.flash('success_msg', 'Welcome back!');
            res.redirect('/');
        } else {
            console.log('❌ Invalid password for:', email);
            req.flash('error_msg', 'Invalid email or password');
            res.redirect('/login');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        req.flash('error_msg', 'An error occurred during login. Please try again.');
        res.redirect('/login');
    }
});

// Signup page
app.get('/signup', (req, res) => {
    res.render('signup', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// Signup handler - SIMPLIFIED WITHOUT EMAIL VERIFICATION
app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, agreeTerms } = req.body;
    console.log('📝 Signup attempt:', { email, firstName, lastName });

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        req.flash('error_msg', 'All fields are required');
        return res.redirect('/signup');
    }

    if (!agreeTerms) {
        req.flash('error_msg', 'You must agree to the terms and conditions');
        return res.redirect('/signup');
    }

    if (password !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/signup');
    }

    if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters long');
        return res.redirect('/signup');
    }

    try {
        // Check if user already exists
        const existingUser = await fileDB.findUserByEmail(email);
        if (existingUser) {
            console.log('❌ User already exists:', email);
            req.flash('error_msg', 'An account with this email already exists. Please try logging in.');
            return res.redirect('/signup');
        }

        // Create user
        const newUser = await fileDB.createUser({
            firstName,
            lastName,
            email,
            password
        });

        console.log('✅ User created successfully:', newUser.email);
        req.flash('success_msg', 'Account created successfully! You can now log in.');
        res.redirect('/login');

    } catch (error) {
        console.error('❌ Signup error:', error);
        
        if (error.message === 'User already exists') {
            req.flash('error_msg', 'An account with this email already exists.');
        } else {
            req.flash('error_msg', 'An error occurred during signup. Please try again.');
        }
        
        res.redirect('/signup');
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Profile page
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await fileDB.findUserById(req.session.user.id);
        if (!user) return res.redirect('/login');
        res.render('profile', { user: user });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'An error occurred loading profile');
        res.redirect('/');
    }
});

// Orders page
app.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const orders = await fileDB.findOrdersByUserId(req.session.user.id);
        res.render('orders', {
            orders: orders,
            disputes: [], // Simplified for now
            user: req.session.user
        });
    } catch (error) {
        console.error('Orders error:', error);
        req.flash('error_msg', 'An error occurred loading orders');
        res.redirect('/');
    }
});

// Debug route to check users
app.get('/debug-users', (req, res) => {
    try {
        const users = fileDB.readData(fileDB.usersFile);
        const stats = fileDB.getStats();
        
        res.json({
            success: true,
            stats: stats,
            users: users.map(u => ({
                id: u._id,
                email: u.email,
                name: `${u.firstName} ${u.lastName}`,
                hasPassword: !!u.password,
                isEmailVerified: u.isEmailVerified,
                createdAt: u.createdAt
            }))
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Test login route
app.post('/test-login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const result = await fileDB.verifyPassword(email, password);
        res.json(result);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Application error:', error);
    res.status(500).render('error', {
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? error : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found',
        error: {}
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log('📁 Using file-based database (no MongoDB required)');
    console.log('✅ Email verification disabled');
    console.log('🔧 Ready for VPS deployment');
});

module.exports = app;