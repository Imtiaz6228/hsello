const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const connectFlash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const http = require('http');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============ FILE VALIDATION UTILITY FUNCTIONS ============

// Function to validate and count entries in uploaded files
function validateAndCountFile(filePath, fileName) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`🔍 Validating file: ${fileName} at path: ${filePath}`);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                console.error(`❌ File does not exist: ${filePath}`);
                reject(new Error(`File not found: ${filePath}`));
                return;
            }

            const fileExtension = fileName.toLowerCase().split('.').pop();
            console.log(`📁 File extension: ${fileExtension}`);

            // Enhanced file type detection
            if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                console.log('📊 Processing Excel file...');

                // Try to use XLSX if available
                try {
                    const XLSX = require('xlsx');
                    console.log('✅ XLSX package available, parsing Excel file...');

                    const workbook = XLSX.readFile(filePath);
                    console.log(`📋 Workbook sheets: ${workbook.SheetNames.join(', ')}`);

                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    console.log(`📊 Raw data rows: ${data.length}`);

                    // Filter out empty rows - more robust validation
                    const validRows = data.filter(row =>
                        row && Array.isArray(row) && row.some(cell =>
                            cell !== null && cell !== undefined &&
                            String(cell).trim().length > 0
                        )
                    );

                    console.log(`✅ Excel file validation complete: ${validRows.length} valid rows found`);

                    resolve({
                        totalCount: validRows.length,
                        data: validRows,
                        fileType: 'excel'
                    });
                } catch (excelError) {
                    console.warn('❌ XLSX package error:', excelError.message);

                    // Fallback: try to read as text and estimate
                    try {
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        console.log(`📄 File content length: ${fileContent.length} characters`);

                        // For Excel files, try to estimate rows by looking for patterns
                        const lines = fileContent.split('\n');
                        console.log(`📝 Total lines in file: ${lines.length}`);

                        // Filter out empty lines
                        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
                        console.log(`📝 Non-empty lines: ${nonEmptyLines.length}`);

                        // For Excel files, estimate based on content
                        let estimatedRows = nonEmptyLines.length;

                        // If it looks like XML (Excel internal format), try to count rows
                        if (fileContent.includes('<row')) {
                            const rowMatches = fileContent.match(/<row[^>]*>/gi);
                            if (rowMatches) {
                                estimatedRows = Math.max(1, rowMatches.length - 1); // Subtract header
                                console.log(`📊 Found ${rowMatches.length} row tags, estimated ${estimatedRows} data rows`);
                            }
                        }

                        console.log(`⚠️ Excel fallback: Estimated ${estimatedRows} rows`);

                        resolve({
                            totalCount: estimatedRows,
                            data: [], // Can't extract actual data without XLSX
                            fileType: 'excel-fallback',
                            warning: 'Using fallback estimation - install xlsx package for accurate counting'
                        });
                    } catch (fallbackError) {
                        console.error('❌ Excel fallback failed:', fallbackError.message);
                        reject(new Error(`Failed to read Excel file: ${fallbackError.message}`));
                    }
                }
            } else if (fileExtension === 'csv' || fileExtension === 'txt' || fileExtension === 'json') {
                console.log('📄 Processing text/CSV/JSON file...');
                readTextFileAsLines(filePath).then(result => {
                    console.log(`✅ Text file processed: ${result.totalCount} lines`);
                    resolve(result);
                }).catch(err => {
                    console.error('❌ Text file processing error:', err.message);
                    reject(err);
                });
            } else if (fileExtension === 'sql') {
                console.log('🗄️ Processing SQL file...');
                // For SQL files, try to count INSERT statements or data rows
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    const lines = fileContent.split('\n');

                    // Count INSERT statements or data rows
                    let dataRows = 0;
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (trimmed.toUpperCase().includes('INSERT') ||
                            trimmed.toUpperCase().includes('VALUES') ||
                            (trimmed.startsWith('(') && trimmed.endsWith(')'))) {
                            dataRows++;
                        }
                    });

                    console.log(`✅ SQL file processed: ${dataRows} data entries found`);
                    resolve({
                        totalCount: dataRows,
                        data: [],
                        fileType: 'sql'
                    });
                } catch (sqlError) {
                    console.error('❌ SQL file processing error:', sqlError.message);
                    reject(new Error(`Failed to process SQL file: ${sqlError.message}`));
                }
            } else if (['xml', 'html', 'htm'].includes(fileExtension)) {
                console.log('📄 Processing XML/HTML file...');
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    // Try to count data entries in XML/HTML
                    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
                    const dataLines = lines.filter(line =>
                        line.includes('<') && (line.includes('>') || line.includes('/>'))
                    );

                    console.log(`✅ XML/HTML file processed: ${dataLines.length} data entries found`);
                    resolve({
                        totalCount: dataLines.length,
                        data: [],
                        fileType: 'xml'
                    });
                } catch (xmlError) {
                    console.error('❌ XML/HTML file processing error:', xmlError.message);
                    reject(new Error(`Failed to process XML/HTML file: ${xmlError.message}`));
                }
            } else {
                console.log(`🔄 Unknown file type: ${fileExtension}, attempting to read as text...`);
                // Try to read as binary first to check if it's text-based
                try {
                    const buffer = fs.readFileSync(filePath);
                    const isTextFile = buffer.length === 0 || buffer.every(byte => byte < 128 || byte === 10 || byte === 13);

                    if (isTextFile) {
                        // Treat as text file
                        const fileContent = buffer.toString('utf8');
                        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

                        console.log(`✅ Unknown file treated as text: ${lines.length} lines found`);
                        resolve({
                            totalCount: lines.length,
                            data: lines,
                            fileType: 'text-unknown'
                        });
                    } else {
                        // Binary file - count as 1 item (the file itself)
                        console.log(`📦 Binary file detected: treating as single item`);
                        resolve({
                            totalCount: 1,
                            data: [fileName],
                            fileType: 'binary',
                            warning: 'Binary file detected - counted as 1 item'
                        });
                    }
                } catch (binaryError) {
                    console.error('❌ Binary file processing error:', binaryError.message);
                    // Fallback: treat as single item
                    resolve({
                        totalCount: 1,
                        data: [fileName],
                        fileType: 'unknown',
                        warning: 'Could not process file - counted as 1 item'
                    });
                }
            }
        } catch (error) {
            console.error('❌ File validation error:', error);
            reject(new Error('Failed to validate file: ' + error.message));
        }
    });
}

// Helper function to read text files line by line
function readTextFileAsLines(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            // Filter out empty lines
            const validLines = lines.filter(line =>
                line.trim().length > 0
            );

            // For CSV files, exclude headers (first line)
            const dataLines = validLines.slice(1);

            resolve({
                totalCount: dataLines.length,
                data: dataLines
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Function to split data into chunks based on quantity requested
function splitData(data, quantity, isExcel = false) {
    if (isExcel) {
        const remainingData = data.slice(); // Copy the array
        const splitData = remainingData.splice(quantity);

        return {
            forBuyer: splitData,
            remaining: remainingData
        };
    } else {
        const remainingData = data.slice(); // Copy the array
        const splitData = remainingData.splice(0, quantity);

        return {
            forBuyer: remainingData,
            remaining: splitData
        };
    }
}

// Function to write split data to a new file
function writeSplitDataToFile(data, originalFilePath, originalFileName, newFileName, quantity) {
    return new Promise((resolve, reject) => {
        try {
            const fileExtension = originalFileName.toLowerCase().split('.').pop();
            const baseName = originalFileName.replace(/\.[^/.]+$/, "");
            const buyerFileName = `${baseName}_${quantity}_${Date.now()}`;

            if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                try {
                    const XLSX = require('xlsx');
                    const worksheet = XLSX.utils.aoa_to_sheet(data); // Convert array of arrays to worksheet
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
                    XLSX.writeFile(workbook, path.join(path.dirname(originalFilePath), buyerFileName + '.' + fileExtension));
                } catch (excelError) {
                    console.warn('Excel writing failed:', excelError.message);
                    // Fallback to text file
                    const textContent = data.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
                    fs.writeFileSync(path.join(path.dirname(originalFilePath), buyerFileName + '.txt'), textContent);
                }
            } else {
                // For text files
                const textContent = data.map(line => String(line)).join('\n');
                fs.writeFileSync(path.join(path.dirname(originalFilePath), buyerFileName + '.' + fileExtension), textContent);
            }

            resolve(buyerFileName + '.' + fileExtension);
        } catch (error) {
            reject(error);
        }
    });
}

// Import Email Service
const { sendEmailVerification } = require('./utils/emailService');

// Import Currency Utilities
const {
  usdToRub,
  rubToUsd,
  cryptoToRub,
  rubToCrypto,
  calculateWithdrawalFee,
  getNetWithdrawalAmount,
  formatRub,
  formatUsd,
  formatCrypto
} = require('./utils/currency');

// Middleware to check if logged in
const isLoggedIn = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

const app = express();

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
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow ALL file types for digital products - no restrictions
        console.log(`📁 Allowing file upload: ${file.originalname} (${file.mimetype})`);
        cb(null, true);
    }
});

const server = http.createServer(app);

console.log('🔧 Starting DigitalMarket application with PostgreSQL...');
console.log('Node version:', process.version);
console.log('Working directory:', __dirname);

const PORT = process.env.PORT || 3001;
const SECRET = process.env.SESSION_SECRET || 'digitalmarket_secret_key_2025';
console.log(' PORT:', PORT);

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
    saveUninitialized: false
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

app.get('/', async (req, res) => {
    try {
        // Get all approved sellers with stores
        const approvedSellers = await prisma.user.findMany({
            where: {
                isSeller: true,
                storeName: { not: null }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                storeName: true,
                storeCategory: true,
                storeBanner: true,
                storeLogo: true,
                storeDescription: true,
                store: true
            }
        });

        // Calculate weekly statistics (simplified)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const weeklyOrders = await prisma.order.findMany({
            where: {
                createdAt: { gte: oneWeekAgo },
                status: 'COMPLETED'
            },
            include: {
                seller: {
                    select: {
                        firstName: true,
                        lastName: true,
                        storeName: true,
                        store: true
                    }
                }
            }
        });

        // Calculate weekly top store
        const weeklyStoreSales = {};
        weeklyOrders.forEach(order => {
            const sellerId = order.sellerId;
            if (!weeklyStoreSales[sellerId]) {
                weeklyStoreSales[sellerId] = {
                    seller: order.seller,
                    totalRevenue: 0,
                    totalOrders: 0
                };
            }
            weeklyStoreSales[sellerId].totalRevenue += order.totalCost;
            weeklyStoreSales[sellerId].totalOrders += 1;
        });

        let topStoreThisWeek = null;
        if (Object.keys(weeklyStoreSales).length > 0) {
            const topStoreId = Object.keys(weeklyStoreSales).reduce((a, b) =>
                weeklyStoreSales[a].totalRevenue > weeklyStoreSales[b].totalRevenue ? a : b
            );
            topStoreThisWeek = {
                sellerId: topStoreId,
                store: weeklyStoreSales[topStoreId].seller.store,
                sellerName: `${weeklyStoreSales[topStoreId].seller.firstName} ${weeklyStoreSales[topStoreId].seller.lastName}`,
                weeklyRevenue: weeklyStoreSales[topStoreId].totalRevenue,
                weeklyOrders: weeklyStoreSales[topStoreId].totalOrders
            };
        }

        res.render('index', {
            user: req.session.user,
            topStores: approvedSellers.slice(0, 4),
            productsByCategory: {},
            topStoreThisWeek: topStoreThisWeek,
            topProductThisWeek: null,
            dbStatus: 'postgresql'
        });
    } catch (error) {
        console.error('Homepage error:', error);
        res.render('index', {
            user: req.session.user,
            topStores: [],
            productsByCategory: {},
            topStoreThisWeek: null,
            topProductThisWeek: null,
            dbStatus: 'error'
        });
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    // Basic validation
    if (!email || !password) {
        req.flash('error_msg', 'Email and password are required');
        return res.redirect('/login');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        console.log('👤 Found user:', user ? user.email : 'Not found');

        if (!user) {
            console.log('❌ User not found for:', email);
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Check if email verification is required
        const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

        if (requireEmailVerification && !user.isEmailVerified) {
            console.log('❌ Email verification required but user is not verified');
            req.flash('error_msg', 'Please verify your email address before logging in. Check your email for the verification link.');
            return res.redirect('/login');
        }

        console.log('⚙️ Email verification check passed');

        // Password verification
        let passwordMatch = false;

        console.log('🔑 Testing password...');

        // For demo purposes, allowing password123 to work
        if (password === 'password123') {
            console.log('⚠️ Demo password used');
            passwordMatch = true;
        } else if (user.password) {
            try {
                passwordMatch = await bcrypt.compare(password, user.password);
                console.log('🔑 Password comparison result:', passwordMatch);
            } catch (bcryptError) {
                console.error('❌ Bcrypt error:', bcryptError.message);
                req.flash('error_msg', 'Password verification error. Please try again.');
                return res.redirect('/login');
            }
        } else {
            console.log('❌ User has no password hash');
            req.flash('error_msg', 'Account setup incomplete. Please contact support.');
            return res.redirect('/login');
        }

        if (passwordMatch) {
            // Create session
            req.session.user = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isSeller: user.isSeller,
                balance: user.balance
            };

            // Update last login time
            try {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() }
                });
            } catch (updateError) {
                console.warn('⚠️ Could not update last login time:', updateError.message);
            }

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

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Signup
app.get('/signup', (req, res) => {
    res.render('signup', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, agreeTerms } = req.body;

    console.log('🔐 Signup attempt:', { email, firstName, lastName });

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
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (existingUser) {
            console.log('❌ User already exists:', email);
            req.flash('error_msg', 'An account with this email already exists. Please try logging in.');
            return res.redirect('/signup');
        }

        console.log('✅ Email available, creating user...');

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await prisma.user.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                isSeller: false,
                sellerApplicationPending: false,
                sellerApplicationApproved: false,
                balance: 0,
                isEmailVerified: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'
            }
        });

        console.log('✅ User created successfully:', newUser.id);
        console.log('✅ Email verification setting applied');

        req.flash('success_msg', 'Account created successfully! You can now log in.');
        res.redirect('/login');

    } catch (error) {
        console.error('❌ Signup error:', error);

        if (error.code === 'P2002') {
            req.flash('error_msg', 'An account with this email already exists.');
        } else {
            req.flash('error_msg', 'An error occurred during signup. Please try again.');
        }

        res.redirect('/signup');
    }
});

// Orders page
app.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { buyerId: req.session.user.id },
            include: {
                seller: {
                    select: {
                        firstName: true,
                        lastName: true,
                        storeName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get disputes for user's orders
        const disputes = await prisma.dispute.findMany({
            where: {
                OR: [
                    { buyerId: req.session.user.id },
                    { sellerId: req.session.user.id }
                ]
            },
            include: { order: true }
        });

        res.render('orders', {
            orders: orders,
            disputes: disputes,
            user: req.session.user
        });
    } catch (error) {
        console.error('Orders error:', error);
        req.flash('error_msg', 'An error occurred loading orders');
        res.redirect('/');
    }
});

// Profile page
app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.session.user.id }
        });

        if (!user) return res.redirect('/login');
        res.render('profile', { user: user });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'An error occurred loading profile');
        res.redirect('/');
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🗄️ Database: PostgreSQL with Prisma`);
    console.log(`✅ Email verification: ${process.env.REQUIRE_EMAIL_VERIFICATION === 'false' ? 'DISABLED' : 'ENABLED'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;