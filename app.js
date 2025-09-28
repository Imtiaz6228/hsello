const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const connectFlash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const http = require('http');
const fs = require('fs');

const mongoose = require('mongoose');

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

// Database connection
// Connect to MongoDB
const connectDB = require('./db');

// Import Models
const User = require('./models/User');
const Order = require('./models/Order');
const Dispute = require('./models/Dispute');
const SellerApplication = require('./models/SellerApplication');
const WithdrawalRequest = require('./models/WithdrawalRequest');
const Payment = require('./models/Payment');
const AdminUser = require('./models/AdminUser');

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

// Try to load socket.io, but make it optional
let io = null;
try {
    const socketIO = require('socket.io');
    io = socketIO(server);
    console.log('📡 Socket.IO loaded successfully');
} catch (error) {
    console.log('⚠️ Socket.IO not available, real-time chat disabled');
}

console.log('🔧 Starting simplified DigitalMarket application...');
console.log('Node version:', process.version);
console.log('Working directory:', __dirname);

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 3001;
const SECRET = process.env.SESSION_SECRET || 'digitalmarket_secret_key_2025';
console.log(' PORT:', PORT);

// Initialize database counters for legacy support
let disputeIdCounter = 1;
let withdrawalIdCounter = 1;

// Database will handle persistence - no more in-memory stores

// Sample data will be created when MongoDB is seeded for development

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

// ============ NOWPAYMENTS CRYPTO PAYMENT INTEGRATION ============

// NowPayments API Helper Functions
const nowPayments = {
    apiKey: process.env.NOWPAYMENTS_API_KEY,
    baseUrl: 'https://api.nowpayments.io/v1',

    headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json'
    },

    // Test API connectivity
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/status`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('NOWPayments API test failed:', error.message);
            throw error;
        }
    }
};

// Global template variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;

    // Add admin info to locals if admin is logged in
    if (req.session.adminUser) {
        res.locals.adminUser = req.session.adminUser;
        res.locals.user = res.locals.user || {};
        res.locals.user.isAdmin = true;
    }

    next();
});

// Product file uploads for digital products
app.post('/seller/upload-product-files/:productId', [
    isLoggedIn,
    upload.array('productFiles', 10) // Allow up to 10 files per product
], async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        if (!req.files || req.files.length === 0) {
            req.flash('error_msg', 'No files uploaded.');
            return res.redirect('/my-store');
        }

        // Add files to product
        product.files = product.files || [];
        const uploadedFiles = req.files.map(file => ({
            filename: file.originalname,
            filepath: file.filename,
            uploadedAt: new Date()
        }));
        product.files.push(...uploadedFiles);

        await user.save();

        req.flash('success_msg', `${req.files.length} file(s) uploaded successfully for product "${product.name}".`);
        res.redirect('/my-store');
    } catch (error) {
        console.error('Upload product files error:', error);
        req.flash('error_msg', 'An error occurred uploading the files.');
        res.redirect('/my-store');
    }
});

app.get('/', async (req, res) => {
    // Initialize variables to prevent ReferenceError in template
    let topStoreThisWeek = null;
    let topProductThisWeek = null;

    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('🔧 MongoDB not connected - using demo data');
            // Fallback demo data
            const demoStores = [
                {
                    sellerId: 'demo1',
                    store: {
                        name: 'Demo Seller 1',
                        description: 'Premium accounts & services',
                        banner: '/css/style.css', // placeholder
                        logo: '/css/style.css'
                    },
                    sellerName: 'John Smith',
                    totalSales: 150
                },
                {
                    sellerId: 'demo2',
                    store: {
                        name: 'Demo Seller 2',
                        description: 'Digital marketplace expert',
                        banner: '/css/style.css',
                        logo: '/css/style.css'
                    },
                    sellerName: 'Sarah Johnson',
                    totalSales: 120
                }
            ];

            topStoreThisWeek = demoStores[0];
            topProductThisWeek = null;

            return res.render('index', {
    user: req.session.user,
    topStores: demoStores,
    productsByCategory: {},
    topStoreThisWeek: topStoreThisWeek || { weeklyRevenue: 0 },
    topProductThisWeek: topProductThisWeek || { weeklyRevenue: 0 },
    dbStatus: 'disconnected'
    
            });
        }

        // Normal database operation when MongoDB is connected
        // Get all approved sellers with stores
        const approvedSellers = await User.find({
            isSeller: true,
            'store.name': { $exists: true }
        }).select('firstName lastName store');

        const approvedStores = [];
        approvedSellers.forEach(seller => {
            if (seller.store) {
                // Calculate total sales for the store
                let totalSales = 0;
                if (seller.store.items && seller.store.items.length > 0) {
                    seller.store.items.forEach(item => {
                        totalSales += item.soldCount || 0;
                    });
                }

                approvedStores.push({
                    sellerId: seller._id.toString(),
                    store: seller.store,
                    sellerName: `${seller.firstName} ${seller.lastName}`,
                    totalSales: totalSales
                });
            }
        });

        // Sort stores by total sales (descending)
        approvedStores.sort((a, b) => b.totalSales - a.totalSales);

        // Calculate weekly statistics
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Get orders from the past week
        const weeklyOrders = await Order.find({
            createdAt: { $gte: oneWeekAgo },
            status: 'completed'
        }).populate('sellerId', 'firstName lastName store');

        // Calculate weekly top store
        const weeklyStoreSales = {};
        const weeklyProductSales = {};

        weeklyOrders.forEach(order => {
            // Weekly store sales
            const sellerId = order.sellerId._id.toString();
            if (!weeklyStoreSales[sellerId]) {
                weeklyStoreSales[sellerId] = {
                    seller: order.sellerId,
                    totalRevenue: 0,
                    totalOrders: 0
                };
            }
            weeklyStoreSales[sellerId].totalRevenue += order.totalCost;
            weeklyStoreSales[sellerId].totalOrders += 1;

            // Weekly product sales
            const productKey = `${sellerId}_${order.productId}`;
            if (!weeklyProductSales[productKey]) {
                weeklyProductSales[productKey] = {
                    sellerId: sellerId,
                    productId: order.productId,
                    productName: order.productName,
                    totalRevenue: 0,
                    totalOrders: 0,
                    seller: order.sellerId
                };
            }
            weeklyProductSales[productKey].totalRevenue += order.totalCost;
            weeklyProductSales[productKey].totalOrders += 1;
        });

        // Find top store this week
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

        // Find top product this week
        if (Object.keys(weeklyProductSales).length > 0) {
            const topProductKey = Object.keys(weeklyProductSales).reduce((a, b) =>
                weeklyProductSales[a].totalRevenue > weeklyProductSales[b].totalRevenue ? a : b
            );
            const topProductData = weeklyProductSales[topProductKey];
            topProductThisWeek = {
                sellerId: topProductData.sellerId,
                productId: topProductData.productId,
                productName: topProductData.productName,
                storeName: topProductData.seller.store.name,
                storeLogo: topProductData.seller.store.logo,
                weeklyRevenue: topProductData.totalRevenue,
                weeklyOrders: topProductData.totalOrders
            };
        }

        // Get real products from all sellers
        const allProducts = [];
        approvedSellers.forEach(seller => {
            if (seller.store && seller.store.items && seller.store.items.length > 0) {
                seller.store.items.forEach(product => {
                    // Only include approved products
                    if (product.moderationStatus === 'approved' && product.status === 'active') {
                        allProducts.push({
                            ...product.toObject(),
                            sellerId: seller._id.toString(),
                            sellerName: `${seller.firstName} ${seller.lastName}`,
                            storeName: seller.store.name,
                            storeLogo: seller.store.logo
                        });
                    }
                });
            }
        });

        // Group products by category
        const productsByCategory = {};
        allProducts.forEach(product => {
            const category = product.itemCategory || product.category || product.directionCategory || 'General';
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });

        // Also group by common category names for easier access
        if (productsByCategory['GMail']) {
            productsByCategory['Gmail'] = productsByCategory['GMail'];
        }
        if (productsByCategory['Instagram']) {
            productsByCategory['Instagram'] = productsByCategory['Instagram'];
        }
        if (productsByCategory['Facebook']) {
            productsByCategory['Facebook'] = productsByCategory['Facebook'];
        }

        // Sort products within each category by soldCount (descending)
        Object.keys(productsByCategory).forEach(category => {
            productsByCategory[category].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        });

        // Add popular categories for demonstration (even if empty)
        const standardCategories = ['GMail', 'Instagram', 'Facebook', 'YouTube', 'Twitter', 'LinkedIn'];
        standardCategories.forEach(category => {
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
        });

        res.render('index', {
            user: req.session.user,
            topStores: approvedStores.slice(0, 4),
            productsByCategory: productsByCategory,
            topStoreThisWeek: topStoreThisWeek,
            topProductThisWeek: topProductThisWeek,
            dbStatus: 'connected'
        });
    } catch (error) {
        console.error('Homepage error:', error);
        // Ultimate fallback
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

// ✅ Login
app.get('/login', (req, res) => {
    res.render('login', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    // Enhanced validation
    if (!email || !password) {
        req.flash('error_msg', 'Email and password are required');
        return res.redirect('/login');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        req.flash('error_msg', 'Please enter a valid email address');
        return res.redirect('/login');
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
        console.error('❌ Database not connected during login');
        req.flash('error_msg', 'Database connection unavailable. Please try again later or contact support.');
        return res.redirect('/login');
    }

    console.log('✅ Database connection verified');

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        console.log('👤 Found user:', user ? user.email : 'Not found');
        
        if (user) {
            console.log('📋 User details:');
            console.log('   - Email verified:', user.isEmailVerified);
            console.log('   - Has password:', !!user.password);
            console.log('   - Created:', user.createdAt);
        }

        if (!user) {
            console.log('❌ User not found for:', email);
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Check if email verification is required and if email is verified
        const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
        console.log('⚙️ Email verification required:', requireEmailVerification);
        
        if (requireEmailVerification && !user.isEmailVerified) {
            console.log('❌ Email not verified for:', email);
            req.flash('error_msg', 'Please verify your email address before logging in. Check your email for the verification link.');
            return res.redirect('/login');
        }

        // Password verification with enhanced security and debugging
        let passwordMatch = false;
        
        console.log('🔑 Testing password...');
        
        // For demo purposes, allowing password123 to work (remove in production)
        if (password === 'password123' && process.env.NODE_ENV !== 'production') {
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
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                isSeller: user.isSeller || false,
                balance: user.balance || 0
            };

            // Update last login time
            try {
                user.lastLoginAt = new Date();
                await user.save();
            } catch (updateError) {
                console.warn('⚠️ Could not update last login time:', updateError.message);
            }

            console.log('✅ Login successful for:', user.email);
            req.flash('success_msg', 'Welcome back!');
            
            // Redirect to intended page or dashboard
            const redirectTo = req.session.returnTo || '/';
            delete req.session.returnTo;
            res.redirect(redirectTo);
        } else {
            console.log('❌ Invalid password for:', email);
            console.log('💡 Debug info:');
            console.log('   - Password provided length:', password.length);
            console.log('   - User has password hash:', !!user.password);
            console.log('   - Email verified:', user.isEmailVerified);
            console.log('   - Verification required:', requireEmailVerification);
            
            req.flash('error_msg', 'Invalid email or password');
            res.redirect('/login');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        
        // Handle specific errors
        if (error.name === 'MongoNetworkError') {
            req.flash('error_msg', 'Database connection error. Please try again later.');
        } else if (error.name === 'MongoTimeoutError') {
            req.flash('error_msg', 'Database timeout. Please try again.');
        } else {
            req.flash('error_msg', 'An error occurred during login. Please try again.');
        }
        
        res.redirect('/login');
    }
});

// ✅ Logout
app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ✅ Signup
app.get('/signup', (req, res) => {
    res.render('signup', {
        success_msg: res.locals.success_msg,
        error_msg: res.locals.error_msg
    });
});

// ✅ Email Verification Page Route
app.get('/email-verification', (req, res) => {
    res.render('email-verification', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// ✅ Email Verification Route
app.get('/verify-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Find user with this verification token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() } // Token not expired
        });

        if (!user) {
            req.flash('error_msg', 'Invalid or expired verification link. Please request a new one.');
            return res.redirect('/email-verification');
        }

        // Check if already verified
        if (user.isEmailVerified) {
            req.flash('success_msg', 'Your email is already verified. You can now log in.');
            return res.redirect('/email-verification');
        }

        // Verify the email
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined; // Clear the token
        user.emailVerificationExpires = undefined;
        await user.save();

        req.flash('success_msg', 'Email verified successfully! You can now log in to your account.');
        res.redirect('/email-verification');

    } catch (error) {
        console.error('Email verification error:', error);
        req.flash('error_msg', 'An error occurred during email verification. Please try again.');
        res.redirect('/email-verification');
    }
});

app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, agreeTerms } = req.body;

    console.log('🔐 Signup attempt:', { email, firstName, lastName });

    // Enhanced validation
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

    // Password strength validation
    if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters long');
        return res.redirect('/signup');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        req.flash('error_msg', 'Please enter a valid email address');
        return res.redirect('/signup');
    }

    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ Database not connected during signup');
            req.flash('error_msg', 'Database connection unavailable. Please try again later or contact support.');
            return res.redirect('/signup');
        }

        console.log('✅ Database connection verified');

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            req.flash('error_msg', 'An account with this email already exists. Please try logging in.');
            return res.redirect('/signup');
        }

        console.log('✅ Email available, creating user...');

        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate email verification token
        const verificationToken = require('crypto').randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            isSeller: false,
            sellerApplication: { pending: false, approved: false },
            balance: 0,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationTokenExpiry,
            isEmailVerified: process.env.REQUIRE_EMAIL_VERIFICATION !== 'true' // Skip verification if not required
        });

        await newUser.save();
        console.log('✅ User created successfully:', newUser._id);

        // Handle email verification
        const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
        
        if (requireEmailVerification) {
            // Send verification email
            const emailResult = await sendEmailVerification(email, verificationToken, `${firstName} ${lastName}`);

            if (emailResult.success) {
                console.log('✅ Verification email sent successfully');
                req.flash('success_msg', 'Account created successfully! Please check your email and click the verification link to activate your account.');
                res.redirect('/email-verification');
            } else if (emailResult.skipEmail) {
                console.warn('⚠️ Email service not configured, auto-verifying user');
                // Auto-verify if email service is not configured
                newUser.isEmailVerified = true;
                newUser.emailVerificationToken = undefined;
                newUser.emailVerificationExpires = undefined;
                await newUser.save();
                req.flash('success_msg', 'Account created successfully! You can now log in.');
                res.redirect('/login');
            } else {
                console.error('❌ Email verification failed:', emailResult.error);
                req.flash('success_msg', 'Account created successfully! However, we couldn\'t send the verification email. Please contact support.');
                res.redirect('/email-verification');
            }
        } else {
            console.log('✅ Email verification disabled, user ready to login');
            req.flash('success_msg', 'Account created successfully! You can now log in.');
            res.redirect('/login');
        }

    } catch (error) {
        console.error('❌ Signup error:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            req.flash('error_msg', 'An account with this email already exists.');
        } else if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            req.flash('error_msg', `Validation error: ${messages.join(', ')}`);
        } else if (error.name === 'MongoNetworkError') {
            req.flash('error_msg', 'Database connection error. Please try again later.');
        } else {
            req.flash('error_msg', 'An error occurred during signup. Please try again.');
        }
        
        res.redirect('/signup');
    }
});

// ============ CRYPTO PAYMENT ROUTES ============

// Main topup page with cryptocurrency option
app.get('/topup', isLoggedIn, (req, res) => {
    res.render('crypto_topup', {
        user: req.session.user,
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

// Cryptocurrency payment selection page
app.get('/topup/cryptocurrency', isLoggedIn, async (req, res) => {
    try {
        const amountUSD = parseFloat(req.query.usd) || 3;

        if (amountUSD < 3 || amountUSD > 20000) {
            req.flash('error_msg', 'Invalid amount. Amount must be between $3 and $20000.');
            return res.redirect('/topup');
        }

        // Calculate RUB amount
        const amountRUB = amountUSD * 81; // Exchange rate from topup page

        res.render('crypto_payment', {
            amountUSD,
            amountRUB,
            usd: amountUSD,
            user: req.session.user,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (error) {
        console.error('Crypto payment page error:', error);
        req.flash('error_msg', 'Unable to load crypto payment options. Please try again or contact support.');
        res.redirect('/topup');
    }
});

// Create cryptocurrency payment
app.post('/topup/cryptocurrency', isLoggedIn, async (req, res) => {
    try {
        const { usd_amount, preferred_crypto } = req.body;
        const amountUSD = parseFloat(usd_amount);
        const userId = req.session.user.id;

        if (amountUSD < 3 || amountUSD > 20000) {
            req.flash('error_msg', 'Invalid amount. Amount must be between $3 and $20000.');
            return res.redirect('/topup');
        }

        // Calculate RUB amount
        const amountRUB = amountUSD * 81;

        // Create payment record in database
        const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const paymentRecord = new Payment({
            userId,
            amountUSD,
            amountRUB,
            status: 'waiting_for_payment',
            orderId: uniqueId
        });

        await paymentRecord.save();

        // Redirect to the invoice creation route
        res.redirect(`/topup/crypto-invoice/${paymentRecord._id}?crypto=${preferred_crypto || 'btc'}`);

    } catch (error) {
        console.error('Create crypto payment error:', error);
        req.flash('error_msg', 'Failed to create payment. Please try again or contact support.');
        res.redirect('/topup');
    }
});

// Show crypto payment invoice and wallet details
app.get('/topup/crypto-invoice/:paymentId', isLoggedIn, async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        const preferredCrypto = req.query.crypto || 'btc';

        const payment = await Payment.findById(paymentId);

        if (!payment || payment.userId.toString() !== req.session.user.id) {
            req.flash('error_msg', 'Payment not found');
            return res.redirect('/topup');
        }

        if (payment.status !== 'waiting_for_payment') {
            req.flash('error_msg', 'This payment has already been processed');
            return res.redirect('/topup');
        }

        // Create NOWPayments invoice
        const nowpayments = {
            baseUrl: 'https://api.nowpayments.io/v1',
            headers: {
                'x-api-key': '364PJYF-83VMRC1-MFJZCV4-XEGT4H5', // YOUR NOWPAYMENTS API KEY
                'Content-Type': 'application/json'
            }
        };

        const invoiceData = {
            price_amount: payment.amountUSD,
            price_currency: 'usd',
            pay_amount: payment.amountUSD,
            pay_currency: preferredCrypto.toUpperCase(),
            payin_extra_id: '',
            ipn_callback_url: `${req.protocol}://${req.get('host')}/webhooks/nowpayments`,
            order_id: payment._id.toString(),
            order_description: `Top up account with $${payment.amountUSD} - ${payment.orderId}`,
            success_url: `${req.protocol}://${req.get('host')}/payment-success/${paymentId}`,
            cancel_url: `${req.protocol}://${req.get('host')}/topup`,
            is_fee_paid_by_user: false,
            fixed_rate: false,
            case: 'payment'
        };

        try {
            const axios = require('axios');
            const invoiceResponse = await axios.post(`${nowpayments.baseUrl}/invoice`, invoiceData, {
                headers: nowpayments.headers
            });

            const invoice = invoiceResponse.data;

            if (invoice && invoice.id) {
                // Update payment record with invoice data
                payment.paymentId = invoice.id;
                payment.paymentAddress = invoice.deposit_address || invoice.pay_address;
                payment.payUrl = invoice.invoice_url;
                payment.payAmount = invoice.pay_amount;
                payment.payCurrency = invoice.pay_currency;
                payment.expectedDeposit = invoice.expected_deposit;
                payment.expiredAt = new Date(invoice.created_at + (60 * 60 * 24 * 1000)); // 24 hours

                await payment.save();

                res.render('crypto_invoice', {
                    payment: payment,
                    invoice: invoice,
                    usd: payment.amountUSD,
                    rub: payment.amountRUB,
                    user: req.session.user,
                    success_msg: req.flash('success_msg'),
                    error_msg: req.flash('error_msg')
                });
            } else {
                console.error('NOWPayments API error - Invalid response:', invoice);
                payment.status = 'failed';
                await payment.save();
                req.flash('error_msg', 'Payment gateway error. Please try again later.');
                res.redirect('/topup');
            }

        } catch (apiError) {
            console.error('NOWPayments API error:', apiError.response?.data || apiError.message);
            payment.status = 'failed';
            await payment.save();
            req.flash('error_msg', 'Payment gateway temporarily unavailable. Please try again later or contact support.');
            res.redirect('/topup');
        }

    } catch (error) {
        console.error('Crypto invoice error:', error);
        req.flash('error_msg', 'Unable to generate payment invoice. Please try again.');
        res.redirect('/topup');
    }
});

// Payment success page
app.get('/payment-success/:paymentId', isLoggedIn, async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        const payment = await Payment.findById(paymentId);

        if (!payment || payment.userId.toString() !== req.session.user.id) {
            req.flash('error_msg', 'Payment not found');
            return res.redirect('/topup');
        }

        res.render('payment_success', {
            payment: payment,
            user: req.session.user,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (error) {
        console.error('Payment success page error:', error);
        req.flash('error_msg', 'Unable to load payment success page');
        res.redirect('/topup');
    }
});

// NOWPayments webhook handler for payment status updates
app.post('/webhooks/nowpayments', async (req, res) => {
    try {
        const webhookData = req.body;
        console.log('💰 NOWPayments Webhook received:', JSON.stringify(webhookData, null, 2));

        if (!webhookData.payment_id || !webhookData.payment_status) {
            console.error('Invalid webhook data structure:', webhookData);
            return res.status(400).send('Invalid webhook data');
        }

        const { payment_id, payment_status } = webhookData;

        // Find the payment record
        const payment = await Payment.findOne({ paymentId: payment_id });
        if (!payment) {
            console.error('Payment not found for webhook:', payment_id);
            return res.status(404).send('Payment not found');
        }

        // Store webhook data
        if (!payment.webhooksReceived) payment.webhooksReceived = [];
        payment.webhooksReceived.push({
            id: payment_id,
            timestamp: new Date(),
            data: webhookData
        });

        // Update payment status based on webhook
        const statusMapping = {
            'waiting': 'waiting_for_payment',
            'confirming': 'waiting_for_payment',
            'confirmed': 'paid',
            'sending': 'partially_paid',
            'partially_paid': 'partially_paid',
            'finished': 'paid',
            'failed': 'failed',
            'correct_amount': 'paid',
            'expired': 'expired'
        };

        const newStatus = statusMapping[payment_status] || payment_status;
        payment.status = newStatus;

        // Set paidAt timestamp if payment is successful
        if (['paid', 'finished', 'correct_amount'].includes(newStatus)) {
            payment.paidAt = new Date();
            payment.actuallyPaid = webhookData.actually_paid || webhookData.price_amount;

            // Credit user balance in RUB (only if not already credited)
            if (!payment.balanceUpdated) {
                const user = await User.findById(payment.userId);
                if (user) {
                    // Convert actually paid crypto amount to RUB
                    const actuallyPaidRUB = cryptoToRub(payment.actuallyPaid || payment.payAmount, payment.payCurrency);
                    user.balance = (user.balance || 0) + actuallyPaidRUB;
                    await user.save();
                    payment.balanceUpdated = true;
                    console.log(`💰 Credited ${actuallyPaidRUB} ₽ to user ${user.email} (${payment.actuallyPaid} ${payment.payCurrency})`);
                }
            }
        }

        await payment.save();
        console.log(`💰 Payment ${payment_id} status updated to ${payment.status}`);

        res.status(200).send('OK');

    } catch (error) {
        console.error('NOWPayments webhook error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Demo/Test payment status (for localhost development)
app.get('/test-payment/:paymentId', isLoggedIn, async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        const payment = await Payment.findById(paymentId);

        if (!payment || payment.userId.toString() !== req.session.user.id) {
            return res.json({ success: false, message: 'Payment not found' });
        }

        // In demo mode, mark payment as paid immediately
        if (payment.status !== 'paid') {
            payment.status = 'paid';
            payment.paidAt = new Date();
            payment.actuallyPaid = payment.payAmount || payment.amountUSD;

            // Credit user balance in demo mode
            const user = await User.findById(payment.userId);
            if (user) {
                user.balance = (user.balance || 0) + payment.amountRUB;
                await user.save();
                payment.balanceUpdated = true;
                console.log(`🧪 Demo: Credited ${payment.amountRUB} ₽ to user ${user.email}`);
            }

            await payment.save();
        }

        const user = await User.findById(payment.userId).select('balance');
        const currentBalance = user ? user.balance : 0;

        res.json({
            success: true,
            payment: {
                status: payment.status,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt
            },
            balance: currentBalance,
            message: 'Demo payment completed!'
        });

    } catch (error) {
        console.error('Demo payment error:', error);
        res.json({ success: false, message: 'Demo payment failed' });
    }
});

// Check payment status manually
app.get('/payment-status/:paymentId', isLoggedIn, async (req, res) => {
    try {
        const paymentId = req.params.paymentId;
        const payment = await Payment.findById(paymentId);

        if (!payment || payment.userId.toString() !== req.session.user.id) {
            return res.json({ success: false, message: 'Payment not found' });
        }

        // Check status with NOWPayments API if still waiting
        if (payment.status === 'waiting_for_payment' && payment.paymentId) {
            try {
                const nowpayments = {
                    baseUrl: 'https://api.nowpayments.io/v1',
                    headers: {
                        'x-api-key': '364PJYF-83VMRC1-MFJZCV4-XEGT4H5',
                        'Content-Type': 'application/json'
                    }
                };

                const axios = require('axios');
                const statusResponse = await axios.get(`${nowpayments.baseUrl}/payment/${payment.paymentId}`, {
                    headers: nowpayments.headers
                });

                const statusData = statusResponse.data;
                console.log('Manual payment status check:', statusData);

                // Update local record based on API response
                if (statusData && statusData.payment_status) {
                    const statusMapping = {
                        'waiting': 'waiting_for_payment',
                        'confirming': 'waiting_for_payment',
                        'confirmed': 'paid',
                        'sending': 'partially_paid',
                        'partially_paid': 'partially_paid',
                        'finished': 'paid',
                        'failed': 'failed',
                        'correct_amount': 'paid',
                        'expired': 'expired'
                    };

                    const newStatus = statusMapping[statusData.payment_status] || statusData.payment_status;

                    if (payment.status !== newStatus) {
                        payment.status = newStatus;

                        if (['paid', 'finished', 'correct_amount'].includes(newStatus)) {
                            payment.paidAt = new Date();
                            payment.actuallyPaid = statusData.actually_paid || statusData.pay_amount;

                            // Credit user balance
                            if (!payment.balanceUpdated) {
                                const user = await User.findById(payment.userId);
                                if (user) {
                                    user.balance = (user.balance || 0) + payment.amountRUB;
                                    await user.save();
                                    payment.balanceUpdated = true;
                                }
                            }
                        }

                        await payment.save();
                    }
                }

            } catch (apiError) {
                console.warn('Manual payment status check failed:', apiError.message);
            }
        }

        const user = await User.findById(payment.userId).select('balance');
        const currentBalance = user ? user.balance : 0;

        res.json({
            success: true,
            payment: {
                status: payment.status,
                createdAt: payment.createdAt,
                paidAt: payment.paidAt
            },
            balance: currentBalance
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        res.json({ success: false, message: 'Unable to check payment status' });
    }
});

// Legacy fallback for old payment methods
app.post('/confirm-payment', isLoggedIn, async (req, res) => {
    console.log('⚠️  Legacy payment endpoint called - redirecting to modern crypto payments');
    req.flash('error_msg', 'Please use the cryptocurrency payment method for top-ups.');
    res.redirect('/topup');
});

app.get('/profile', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');
        res.render('profile', { user: user });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'An error occurred loading profile');
        res.redirect('/');
    }
});

// ✅ Become Seller Routes
app.get('/become-seller', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.redirect('/login');

        res.render('become-seller', {
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg,
            user: user
        });
    } catch (error) {
        console.error('Become seller error:', error);
        req.flash('error_msg', 'An error occurred loading the page');
        res.redirect('/');
    }
});

app.post('/become-seller', [
    isLoggedIn,
    upload.fields([
        { name: 'banner', maxCount: 1 },
        { name: 'logo', maxCount: 1 }
    ])
], async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/login');
        }

        // Validate required fields
        const {
            storeName,
            category,
            contactEmail,
            contactPhone,
            rules,
            storeDescription,
            seoDescription,
            agreeTerms
        } = req.body;

        // Required field validation
        const requiredFields = [storeName, category, contactEmail, storeDescription, seoDescription];
        if (requiredFields.some(field => !field || field.trim() === '')) {
            req.flash('error_msg', 'Please fill in all required fields');
            return res.redirect('/become-seller');
        }

        // Terms agreement validation
        if (!agreeTerms) {
            req.flash('error_msg', 'You must agree to the terms and conditions');
            return res.redirect('/become-seller');
        }

        // File validation
        if (!req.files || !req.files.banner || !req.files.logo) {
            req.flash('error_msg', 'Both banner and logo images are required');
            return res.redirect('/become-seller');
        }

        // Create seller application in database
        const newApplication = new SellerApplication({
            userId: user._id,
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            storeName: storeName.trim(),
            category: category,
            contactEmail: contactEmail.trim(),
            contactPhone: contactPhone ? contactPhone.trim() : '',
            rules: rules ? rules.trim() : '',
            storeDescription: storeDescription.trim(),
            seoDescription: seoDescription.trim(),
            bannerPath: req.files.banner[0].filename,
            logoPath: req.files.logo[0].filename,
            status: 'pending',
            submittedAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: ''
        });

        await newApplication.save();

        // Update user application status
        user.sellerApplication = {
            pending: true,
            approved: false,
            applicationId: newApplication._id.toString()
        };
        await user.save();

        // Redirect to application review page instead of home
        req.flash('success_msg', 'Your seller application has been submitted successfully! We will review it within 1-2 business days.');
        res.redirect(`/application-review/${newApplication._id}`);

    } catch (error) {
        console.error('Error processing seller application:', error);
        req.flash('error_msg', 'An error occurred while processing your application. Please try again.');
        res.redirect('/become-seller');
    }
});

// ✅ Application Review Page
app.get('/application-review/:id', isLoggedIn, async (req, res) => {
    try {
        const applicationId = req.params.id;
        const user = await User.findById(req.session.user.id);

        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/login');
        }

        const application = await SellerApplication.findById(applicationId);

        if (!application || application.userId.toString() !== user._id.toString()) {
            req.flash('error_msg', 'Application not found or access denied');
            return res.redirect('/');
        }

        res.render('application-review', {
            application: application,
            user: user,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('Application review error:', error);
        req.flash('error_msg', 'Application not found');
        res.redirect('/');
    }
});

// Middleware to check admin authentication
const isAdminLoggedIn = (req, res, next) => {
    if (req.session.adminUser) return next();

    // Check MongoDB connection status
    if (mongoose.connection.readyState !== 1) {
        req.flash('error_msg', 'Database connection unavailable. Admin panel is temporarily offline.');
        return res.redirect('/');
    }

    req.flash('error_msg', 'Please login to access admin panel.');
    res.redirect('/admin/login');
};

// ✅ Admin Login Routes
app.get('/admin/login', (req, res) => {
    console.log('✅ Admin login route hit!');
    res.render('admin/login', {
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg')
    });
});

app.post('/admin/login', async (req, res) => {
    const { adminId, password } = req.body;

    try {
        const adminUser = await AdminUser.findOne({ adminId: adminId });

        if (!adminUser) {
            req.flash('error_msg', 'Invalid admin ID or password');
            return res.redirect('/admin/login');
        }

        // For demo purposes, allowing admin123 to work
        let passwordMatch = false;
        if (password === 'admin123' || (adminUser.password && await bcrypt.compare(password, adminUser.password))) {
            passwordMatch = true;
        }

        if (passwordMatch) {
            req.session.adminUser = {
                id: adminUser._id.toString(),
                adminId: adminUser.adminId,
                username: adminUser.username,
                email: adminUser.email
            };
            console.log('✅ Admin login successful for:', adminUser.adminId);
            req.flash('success_msg', `Welcome, Admin ${adminUser.adminId}!`);
            res.redirect('/admin/sellers');
        } else {
            console.log('❌ Admin login failed for:', adminId);
            req.flash('error_msg', 'Invalid admin ID or password');
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        req.flash('error_msg', 'An error occurred during admin login');
        res.redirect('/admin/login');
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.adminUser = null;
    res.redirect('/');
});

app.get('/admin/sellers', isAdminLoggedIn, async (req, res) => {
    try {
        const sellerApplications = await SellerApplication.find({})
            .populate('userId', 'firstName lastName email')
            .sort({ submittedAt: -1 });

        res.render('admin/sellers', {
            sellerApplications: sellerApplications,
            adminUser: req.session.adminUser
        });
    } catch (error) {
        console.error('Admin sellers error:', error);
        req.flash('error_msg', 'An error occurred loading seller applications');
        res.redirect('/admin/moderation');
    }
});

app.post('/admin/seller/:id/:action', isAdminLoggedIn, async (req, res) => {
    try {
        const adminUser = req.session.adminUser;
        const applicationId = req.params.id;
        const action = req.params.action;
        const { reviewNotes } = req.body;

        const application = await SellerApplication.findById(applicationId);
        if (!application) {
            req.flash('error_msg', 'Application not found');
            return res.redirect('/admin/sellers');
        }

        const user = await User.findById(application.userId);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/sellers');
        }

        if (action === 'approve') {
            application.status = 'approved';
            application.reviewedBy = adminUser.id;
            application.reviewedAt = new Date();
            application.reviewNotes = reviewNotes || '';

            // Update user status to seller
            user.isSeller = true;
            user.sellerApplication.approved = true;
            user.sellerApplication.pending = false;

            // Create initial store data
            user.store = {
                name: application.storeName,
                category: application.category,
                banner: application.bannerPath,
                logo: application.logoPath,
                description: application.storeDescription,
                seoDescription: application.seoDescription,
                rules: application.rules,
                contactEmail: application.contactEmail,
                contactPhone: application.contactPhone,
                items: []
            };

            await user.save();
            await application.save();

            req.flash('success_msg', `Seller application for "${application.storeName}" has been approved!`);
        } else if (action === 'reject') {
            application.status = 'rejected';
            application.reviewedBy = adminUser.id;
            application.reviewedAt = new Date();
            application.reviewNotes = reviewNotes || '';

            // Reset user application status
            user.sellerApplication.pending = false;
            await user.save();
            await application.save();

            req.flash('error_msg', `Seller application for "${application.storeName}" has been rejected.`);
        }

        res.redirect('/admin/sellers');
    } catch (error) {
        console.error('Admin seller action error:', error);
        req.flash('error_msg', 'An error occurred processing the application');
        res.redirect('/admin/sellers');
    }
});

// ✅ Seller Dashboard (for approved sellers)
app.get('/seller/dashboard', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied. You must be an approved seller.');
            return res.redirect('/');
        }

        // Get seller's recent orders
        const recentOrders = await Order.find({ sellerId: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('buyerId', 'firstName lastName');

        // Calculate dashboard stats
        const totalOrders = await Order.countDocuments({ sellerId: req.session.user.id });
        const totalRevenue = await Order.aggregate([
            { $match: { sellerId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalCost' } } }
        ]);

        const totalItemsSold = await Order.aggregate([
            { $match: { sellerId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);

        res.render('seller/dashboard', {
            user: user,
            recentOrders: recentOrders,
            stats: {
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue[0]?.total || 0,
                totalItemsSold: totalItemsSold[0]?.total || 0,
                totalProducts: user.store?.items?.length || 0
            }
        });
    } catch (error) {
        console.error('Seller dashboard error:', error);
        req.flash('error_msg', 'An error occurred loading the dashboard');
        res.redirect('/');
    }
});

// ✅ Stores Listing Page
app.get('/stores', async (req, res) => {
    try {
        // Find all approved sellers with stores
        const approvedSellers = await User.find({
            isSeller: true,
            'store.name': { $exists: true, $ne: null }
        }).select('firstName lastName store');

        // Calculate ratings and sales for each store
        const enhancedStores = await Promise.all(
            approvedSellers.map(async (seller) => {
                const sellerId = seller._id.toString();

                // Calculate total sales for the store
                let totalSales = 0;
                let totalRevenue = 0;
                let reviewCount = 0;
                let averageRating = 0;

                // Count products and aggregate sales/reviews
                if (seller.store && seller.store.items) {
                    for (const product of seller.store.items) {
                        totalSales += product.soldCount || 0;

                        // Calculate product rating from reviews
                        if (product.reviews && product.reviews.length > 0) {
                            reviewCount += product.reviews.length;
                            const productRating = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length;
                            averageRating = averageRating || 0;
                            // Weighted average across all products
                            averageRating = ((averageRating * (reviewCount - product.reviews.length)) + (productRating * product.reviews.length)) / reviewCount;
                        }
                    }
                }

                return {
                    sellerId: sellerId,
                    store: seller.store,
                    sellerName: `${seller.firstName} ${seller.lastName}`,
                    totalSales: totalSales,
                    totalRevenue: totalRevenue,
                    reviewCount: reviewCount,
                    averageRating: Number.isFinite(averageRating) ? parseFloat(averageRating.toFixed(1)) : 0
                };
            })
        );

        // Sort stores by total sales (descending)
        enhancedStores.sort((a, b) => b.totalSales - a.totalSales);

        res.render('stores', {
            stores: enhancedStores,
            user: req.session.user
        });
    } catch (error) {
        console.error('Stores listing error:', error);
        res.render('stores', {
            stores: [],
            user: req.session.user
        });
    }
});

// ✅ My Store Page (for approved sellers)
app.get('/my-store', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied. You must be an approved seller.');
            return res.redirect('/');
        }

        if (!user.store) {
            req.flash('error_msg', 'Store not found. Please contact support.');
            return res.redirect('/');
        }

        res.render('my-store', {
            user: user,
            store: user.store
        });
    } catch (error) {
        console.error('My store error:', error);
        req.flash('error_msg', 'An error occurred loading your store');
        res.redirect('/');
    }
});

// ✅ Public Store View
app.get('/store/:sellerId', async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const seller = await User.findById(sellerId);

        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Store not found.');
            return res.redirect('/stores');
        }

        res.render('store-view', {
            seller: {
                name: `${seller.firstName} ${seller.lastName}`
            },
            store: seller.store,
            user: req.session.user,
            storeId: sellerId // Add storeId for template access
        });
    } catch (error) {
        console.error('Store view error:', error);
        req.flash('error_msg', 'Store not found.');
        res.redirect('/stores');
    }
});

// ✅ Individual Product View for Buyers
app.get('/product/:sellerId/:productId', async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const productId = req.params.productId;

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Store not found.');
            return res.redirect('/stores');
        }

        const product = seller.store.items.find(item => item.id === productId && item.status === 'active');
        if (!product) {
            req.flash('error_msg', 'Product not found or unavailable.');
            return res.redirect(`/store/${sellerId}`);
        }

        res.render('product', {
            product: product,
            seller: {
                id: sellerId,
                name: `${seller.firstName} ${seller.lastName}`,
                store: seller.store
            },
            user: req.session.user
        });
    } catch (error) {
        console.error('Product view error:', error);
        req.flash('error_msg', 'Product not found.');
        res.redirect('/stores');
    }
});

// ============ PRODUCT MANAGEMENT ROUTES FOR SELLERS ============

app.get('/seller/add-product', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied. You must be an approved seller.');
            return res.redirect('/');
        }

        res.render('seller/add-product', {
            user: user,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('Add product page error:', error);
        req.flash('error_msg', 'An error occurred loading the page');
        res.redirect('/');
    }
});

// Add Product Handler - Modified to not require files initially
app.post('/seller/add-product', [
    isLoggedIn,
    upload.fields([
        { name: 'productImages', maxCount: 5 },
        // Remove productFiles from initial creation - files will be uploaded after
    ])
], async (req, res) => {
    try {
        console.log('🔧 Received form submission for add product');
        console.log('Form fields:', Object.keys(req.body));
        console.log('Files received:', req.files ? req.files.length : 0);

        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            console.log('❌ Access denied - user not seller or store not found');
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/');
        }

        // Extract all form fields (same as before)
        const {
            productName,
            directionCategory,
            itemCategory,
            subcategory,
            registrationMethod,
            profileFullness,
            yearOfRegistration,
            countryOfRegistration,
            loginMethod,
            numberOfSubscribers,
            price,
            itemType,
            completionTime,
            shortDescription,
            fullDescription,
            isDigital,
            stockQuantity,
            tags,
            // New SEO fields
            seoTitle,
            metaDescription,
            seoKeywords
        } = req.body;

        console.log('🔧 Required field check starting...');

        // Validation - Required fields
        const requiredFields = [
            productName, directionCategory, itemCategory, subcategory,
            registrationMethod, profileFullness, yearOfRegistration,
            countryOfRegistration, loginMethod, price, itemType,
            completionTime, shortDescription, fullDescription
        ];

        // Debug: Check which fields are missing
        const missingFields = [];
        requiredFields.forEach((field, index) => {
            if (!field || field.trim() === '') {
                const fieldNames = [
                    'productName', 'directionCategory', 'itemCategory', 'subcategory',
                    'registrationMethod', 'profileFullness', 'yearOfRegistration',
                    'countryOfRegistration', 'loginMethod', 'price', 'itemType',
                    'completionTime', 'shortDescription', 'fullDescription'
                ];
                console.log(`❌ Missing field: ${fieldNames[index]} = "${field}"`);
                missingFields.push(fieldNames[index]);
            }
        });

        if (missingFields.length > 0) {
            console.log('❌ Missing required fields:', missingFields);
            req.flash('error_msg', `Please fill in all required fields. Missing: ${missingFields.join(', ')}`);
            return res.redirect('/seller/add-product');
        }

        console.log('✅ All required fields present');

        // Check if product images were uploaded
        if (!req.files.productImages || req.files.productImages.length === 0) {
            console.log('❌ No product images uploaded');
            req.flash('error_msg', 'At least one product image is required');
            return res.redirect('/seller/add-product');
        }

        console.log('✅ Product images uploaded:', req.files.productImages.length);

        // Don't require files for digital products anymore
        // if (isDigital === 'on') {
        //     // File validation removed from here - will be done after product creation
        // }

        // Generate unique product ID
        const productId = Date.now() + '-' + Math.round(Math.random() * 1E6);

        // Create comprehensive product object
        const newProduct = {
            id: productId,
            // Basic Info
            name: productName.trim(),
            seoTitle: seoTitle ? seoTitle.trim() : productName.trim(),
            metaDescription: metaDescription ? metaDescription.trim() : shortDescription.substring(0, 160),

            // Detailed categorization
            directionCategory: directionCategory,
            itemCategory: itemCategory,
            subcategory: subcategory,

            // Product specifications
            description: fullDescription.trim(), // Add description field for compatibility
            registrationMethod: registrationMethod,
            profileFullness: profileFullness,
            yearOfRegistration: parseInt(yearOfRegistration),
            countryOfRegistration: countryOfRegistration,
            loginMethod: loginMethod,
            numberOfSubscribers: numberOfSubscribers ? parseInt(numberOfSubscribers) : null,

            // Pricing & Delivery
            price: parseFloat(price),
            itemType: itemType,
            completionTime: parseInt(completionTime),

            // Descriptions
            shortDescription: shortDescription.trim(),
            fullDescription: fullDescription.trim(),

    // Inventory & Settings - All products are digital in this marketplace
    isDigital: true, // Automatically set all products as digital
    stockQuantity: 999999, // Unlimited stock for all digital products
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],

            // SEO & Marketing
            seoKeywords: seoKeywords ? seoKeywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword) : [],

            // Media
            images: req.files.productImages.map(file => file.filename),
            files: [], // Will be populated after product creation

            // System fields
            createdAt: new Date(),
            status: 'active', // Set to active for digital marketplace
            soldCount: 0,
            moderationStatus: 'approved' // Auto-approve for digital marketplace
        };

        // Add product to store and save to database
        if (!user.store.items) user.store.items = [];
        user.store.items.push(newProduct);
        await user.save();

        req.flash('success_msg', `Product "${productName}" details saved successfully! ${isDigital === 'on' ? 'Please upload your digital files next.' : ''}`);

        // Redirect to upload files page if digital product, otherwise redirect to store
        if (isDigital === 'on') {
            res.redirect(`/seller/upload-files/${newProduct.id}`);
        } else {
            res.redirect('/my-store');
        }

    } catch (error) {
        console.error('Error adding product:', error);
        req.flash('error_msg', 'An error occurred while adding the product. Please try again.');
        res.redirect('/seller/add-product');
    }
});

// ============ NEW PRODUCT FILE UPLOAD ROUTES ============

// File Upload Page Route
app.get('/seller/upload-files/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        // Allow uploads for all products (not just digital)

        res.render('seller/upload-files', {
            user: user,
            product: product,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('Upload files page error:', error);
        req.flash('error_msg', 'An error occurred loading the page');
        res.redirect('/my-store');
    }
});

// Handle Product File Upload - AUTO STOCK QUANTITY UPDATE
app.post('/seller/upload-files/:productId', [
    isLoggedIn,
    upload.array('productFiles', 10)
], async (req, res) => {
    try {
        console.log('🚀 File upload route called for product:', req.params.productId);

        // Find user
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            console.log('❌ Access denied - user not seller');
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        // Find product
        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);
        if (!product) {
            console.log('❌ Product not found:', productId);
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        // Check files
        if (!req.files || req.files.length === 0) {
            console.log('❌ No files uploaded');
            req.flash('error_msg', 'Please upload at least one file.');
            return res.redirect(`/seller/upload-files/${productId}`);
        }

        console.log(`📤 Processing ${req.files.length} files for: ${product.name}`);

        // Clear existing files
        product.files = [];
        let totalQuantity = 0;
        let validatedFiles = 0;
        let validationErrors = [];

        // Process each file
        for (const file of req.files) {
            try {
                console.log(`🔄 Processing: ${file.originalname}`);
                const filePath = path.join(__dirname, 'uploads', file.filename);

                // Check file exists
                if (!fs.existsSync(filePath)) {
                    console.error(`❌ File missing: ${filePath}`);
                    validationErrors.push(`${file.originalname}: Upload failed`);
                    continue;
                }

                // Validate and count
                const validationResult = await validateAndCountFile(filePath, file.originalname);
                console.log(`📊 ${file.originalname}: ${validationResult.totalCount} entries`);

                if (validationResult.totalCount > 0) {
                    // Add file to product
                    product.files.push({
                        filename: file.originalname,
                        filepath: file.filename,
                        uploadedAt: new Date(),
                        entryCount: validationResult.totalCount
                    });

                    totalQuantity += validationResult.totalCount;
                    validatedFiles++;
                    console.log(`✅ Added ${validationResult.totalCount} entries`);
                } else {
                    validationErrors.push(`${file.originalname}: No valid entries`);
                    console.log(`⚠️ No entries found`);
                }

            } catch (error) {
                console.error(`❌ Error processing ${file.originalname}:`, error.message);
                validationErrors.push(`${file.originalname}: ${error.message}`);
            }
        }

        console.log(`📈 TOTAL QUANTITY: ${totalQuantity}`);

        // CRITICAL: Update stock quantity - ensure both fields are set
        product.stockQuantity = totalQuantity;
        product.availableQuantity = totalQuantity;
        console.log(`📊 STOCK UPDATED: ${totalQuantity} items available`);
        product.isQuantityValidated = true;

        console.log(`💰 STOCK QUANTITY SET TO: ${totalQuantity}`);

        // Keep product active
        product.moderationStatus = 'approved';
        product.status = 'active';

        // SAVE TO DATABASE
        console.log('💾 Saving to database...');
        await user.save();
        console.log('✅ Database save successful');

        // Enhanced success message with detailed feedback
        let successMessage = `✅ Upload completed successfully!\n\n`;
        successMessage += `📁 Files processed: ${validatedFiles}/${req.files.length}\n`;
        successMessage += `📊 Total stock added: ${totalQuantity} items\n`;

        if (totalQuantity > 0) {
            successMessage += `💰 Current total stock: ${product.stockQuantity} items\n`;
        }

        if (validationErrors.length > 0) {
            successMessage += `\n⚠️ Issues encountered: ${validationErrors.length}\n`;
            successMessage += validationErrors.slice(0, 3).join('\n'); // Show first 3 errors
            if (validationErrors.length > 3) {
                successMessage += `\n...and ${validationErrors.length - 3} more issues`;
            }
        }

        // Add file type information
        const fileTypes = [...new Set(req.files.map(f => f.originalname.split('.').pop()))];
        successMessage += `\n📋 File types processed: ${fileTypes.join(', ')}`;

        console.log('✅ Upload completed with enhanced feedback');
        req.flash('success_msg', successMessage);
        res.redirect('/my-store');

    } catch (error) {
        console.error('❌ Upload error:', error);
        req.flash('error_msg', `Upload failed: ${error.message}`);
        res.redirect('/my-store');
    }
});

// Delete specific file from product
app.get('/seller/delete-file/:productId/:fileIndex', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const fileIndex = parseInt(req.params.fileIndex);
        const product = user.store.items.find(item => item.id === productId);

        if (!product || !product.files || fileIndex >= product.files.length) {
            req.flash('error_msg', 'File not found.');
            return res.redirect('/my-store');
        }

        // Remove file from uploads directory
        const fs = require('fs');
        const filePath = path.join(__dirname, 'uploads', path.basename(product.files[fileIndex].filepath));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Deleted file from server:', filePath);
        }

        // Remove from product files array
        const deletedFile = product.files.splice(fileIndex, 1)[0];
        console.log('🗑️ Removed file from product array:', deletedFile.filename);

        // Recalculate stock quantity after file deletion
        let newStockQuantity = 0;
        if (product.files && product.files.length > 0) {
            // Sum up entry counts from remaining files
            newStockQuantity = product.files.reduce((total, file) => {
                return total + (file.entryCount || 0);
            }, 0);
        }

        // Update stock quantity
        product.stockQuantity = newStockQuantity;
        product.availableQuantity = newStockQuantity;

        console.log(`📊 Updated stock quantity after file deletion: ${newStockQuantity}`);

        await user.save();

        req.flash('success_msg', `File "${deletedFile.filename}" deleted successfully. Stock updated to ${newStockQuantity} items.`);
        res.redirect(`/seller/upload-files/${productId}`);
    } catch (error) {
        console.error('Error deleting file:', error);
        req.flash('error_msg', 'An error occurred while deleting the file.');
        res.redirect('/my-store');
    }
});

// Manual data entry route - ADD TO EXISTING STOCK
app.post('/seller/manual-entry/:productId', isLoggedIn, async (req, res) => {
    try {
        console.log('🔧 Manual entry route called for product:', req.params.productId);

        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            console.log('❌ Access denied - user not seller');
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);
        if (!product) {
            console.log('❌ Product not found:', productId);
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        const { dataFormat, dataContent, validateData } = req.body;
        console.log('📝 Manual entry data:', { dataFormat, validateData, dataLength: dataContent.length });

        // Parse and validate data
        const lines = dataContent.split('\n').filter(line => line.trim().length > 0);
        const newQuantity = lines.length;

        console.log(`📊 Found ${newQuantity} new data lines`);

        if (newQuantity === 0) {
            req.flash('error_msg', 'No valid data entries found. Please enter data with one entry per line.');
            return res.redirect(`/seller/upload-files/${productId}`);
        }

        // Validate data format if requested
        if (validateData === 'on') {
            let validationErrors = [];

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return; // Skip empty lines

                try {
                    if (dataFormat === 'accounts' || dataFormat === 'gmail') {
                        // Check for email:password format
                        if (!trimmedLine.includes(':') || trimmedLine.split(':').length < 2) {
                            validationErrors.push(`Line ${index + 1}: Invalid account format. Expected: email:password`);
                        } else {
                            const [email, password] = trimmedLine.split(':');
                            if (!email.includes('@') || password.length < 3) {
                                validationErrors.push(`Line ${index + 1}: Invalid email or password format`);
                            }
                        }
                    } else if (dataFormat === 'profiles' || dataFormat === 'instagram' || dataFormat === 'facebook' || dataFormat === 'twitter' || dataFormat === 'youtube' || dataFormat === 'linkedin' || dataFormat === 'tiktok') {
                        // Check for username:password format
                        if (!trimmedLine.includes(':') || trimmedLine.split(':').length < 2) {
                            validationErrors.push(`Line ${index + 1}: Invalid ${dataFormat} format. Expected: username:password`);
                        }
                    } else if (dataFormat === 'json') {
                        // Try to parse as JSON
                        JSON.parse(trimmedLine);
                    } else if (dataFormat === 'csv') {
                        // Basic CSV validation - should contain commas
                        if (!trimmedLine.includes(',')) {
                            validationErrors.push(`Line ${index + 1}: Invalid CSV format. Expected comma-separated values`);
                        }
                    } else if (dataFormat === 'xml') {
                        // Basic XML validation - should contain angle brackets
                        if (!trimmedLine.includes('<') || !trimmedLine.includes('>')) {
                            validationErrors.push(`Line ${index + 1}: Invalid XML format. Expected XML tags`);
                        }
                    } else if (dataFormat === 'sql') {
                        // Basic SQL validation - should contain INSERT or VALUES
                        const upperLine = trimmedLine.toUpperCase();
                        if (!upperLine.includes('INSERT') && !upperLine.includes('VALUES')) {
                            validationErrors.push(`Line ${index + 1}: Invalid SQL format. Expected INSERT statement`);
                        }
                    }
                    // For custom format, no validation needed
                } catch (parseError) {
                    validationErrors.push(`Line ${index + 1}: Invalid ${dataFormat} format - ${parseError.message}`);
                }
            });

            if (validationErrors.length > 0) {
                console.log('❌ Validation errors:', validationErrors.slice(0, 5));
                req.flash('error_msg', `Data validation failed:\n${validationErrors.slice(0, 5).join('\n')}`);
                return res.redirect(`/seller/upload-files/${productId}`);
            }
        }

        // Get current stock - ensure we get the actual current value from database
        const currentStock = parseInt(product.stockQuantity) || 0;

        console.log(`📈 Current stock before manual entry: ${currentStock}`);
        console.log(`📊 New entries to add: ${newQuantity}`);
        console.log(`📁 Product files count: ${product.files ? product.files.length : 0}`);

        // Create manual data file
        const fs = require('fs');
        const manualDataFileName = `manual_data_${Date.now()}.txt`;
        const manualDataPath = path.join(__dirname, 'uploads', manualDataFileName);

        // If there's existing data, append to it
        let existingData = '';
        let existingEntryCount = 0;

        if (product.files && product.files.length > 0) {
            console.log('🔍 Looking for existing manual file...');
            console.log('📋 Product files:', product.files.map(f => ({ filename: f.filename, dataType: f.dataType })));

            // Look for any file that might contain data (use first file)
            let existingFile = product.files[0];

            // If no manual file found, check if there's any uploaded file we can use
            if (!existingFile && product.files.length > 0) {
                console.log('⚠️ No manual file found, checking for any existing data file...');
                existingFile = product.files[0]; // Use the first file as fallback
            }

            console.log('🎯 Found existing file:', existingFile ? existingFile.filename : 'None');

            if (existingFile) {
                try {
                    const existingFilePath = path.join(__dirname, 'uploads', path.basename(existingFile.filepath));
                    console.log('📂 Checking file path:', existingFilePath);

                    if (fs.existsSync(existingFilePath)) {
                        existingData = fs.readFileSync(existingFilePath, 'utf8');
                        console.log('📄 Successfully read existing data, length:', existingData.length);

                        if (existingData.length > 0) {
                            console.log('📄 First 200 chars of existing data:', existingData.substring(0, 200));

                            // Count existing lines
                            const existingLines = existingData.split('\n').filter(line => line.trim().length > 0);
                            existingEntryCount = existingLines.length;
                            console.log('📊 Existing entries count:', existingEntryCount);

                            if (existingData && !existingData.endsWith('\n')) {
                                existingData += '\n';
                            }
                        } else {
                            console.log('⚠️ Existing file is empty');
                            existingEntryCount = 0;
                        }
                    } else {
                        console.log('⚠️ Existing file not found at path:', existingFilePath);
                        // Try to list directory contents to debug
                        try {
                            const dirContents = fs.readdirSync(path.dirname(existingFilePath));
                            console.log('📂 Directory contents:', dirContents);
                        } catch (dirError) {
                            console.log('⚠️ Could not read directory:', dirError.message);
                        }
                    }
                } catch (readError) {
                    console.warn('⚠️ Could not read existing file, starting fresh:', readError.message);
                }
            } else {
                console.log('⚠️ No existing files found in product.files');
            }
        } else {
            console.log('⚠️ No product.files array or empty array');
        }

        // Combine existing data with new data
        const combinedData = existingData + dataContent;
        const totalLines = combinedData.split('\n').filter(line => line.trim().length > 0);
        const newTotalStock = totalLines.length;

        console.log(`📈 Combined data has ${totalLines.length} total lines`);
        console.log(`💰 Final stock calculation: ${existingEntryCount} + ${newQuantity} = ${newTotalStock}`);
        console.log(`📝 New data content length: ${dataContent.length}`);
        console.log(`📝 Combined data length: ${combinedData.length}`);

        // Additional validation
        if (newTotalStock !== (existingEntryCount + newQuantity)) {
            console.warn(`⚠️ Stock calculation mismatch! Expected: ${existingEntryCount + newQuantity}, Got: ${newTotalStock}`);
        }

        // Fallback: If something went wrong with file reading, ensure stock is at least the new quantity
        if (newTotalStock < newQuantity) {
            console.warn(`⚠️ Stock calculation error! Forcing stock to at least ${newQuantity}`);
            newTotalStock = newQuantity;
        }

        // Write combined data to file
        fs.writeFileSync(manualDataPath, combinedData, 'utf8');
        console.log('💾 Manual data file updated:', manualDataPath);

        // Update or add manual data file entry
        if (!product.files) product.files = [];

        const existingManualFile = product.files[0]; // Use first file
        if (existingManualFile) {
            // Update existing entry
            existingManualFile.entryCount = newTotalStock;
            existingManualFile.uploadedAt = new Date();
            // Remove old file if it exists
            try {
                const oldFilePath = path.join(__dirname, 'uploads', path.basename(existingManualFile.filepath));
                if (fs.existsSync(oldFilePath) && oldFilePath !== manualDataPath) {
                    fs.unlinkSync(oldFilePath);
                    console.log('🗑️ Removed old manual data file');
                }
            } catch (unlinkError) {
                console.warn('⚠️ Could not remove old file:', unlinkError.message);
            }
            // Update filepath to new file
            existingManualFile.filepath = manualDataFileName;
        } else {
            // Add new entry
            product.files.push({
                filename: 'manual_data.txt',
                filepath: manualDataFileName,
                uploadedAt: new Date(),
                entryCount: newTotalStock,
                dataType: 'manual',
                format: dataFormat
            });
        }

        // CRITICAL: ADD TO EXISTING STOCK - ensure both fields are updated
        product.stockQuantity = newTotalStock;
        product.availableQuantity = newTotalStock;
        console.log(`📊 MANUAL ENTRY STOCK UPDATED: ${currentStock} + ${newQuantity} = ${newTotalStock}`);
        product.isQuantityValidated = true;

        // Update manual entry data
        product.manualEntryData = {
            format: dataFormat,
            entryCount: newTotalStock,
            lastUpdated: new Date(),
            totalUploads: (product.manualEntryData?.totalUploads || 0) + 1
        };

        // Keep product active
        product.moderationStatus = 'approved';
        product.status = 'active';

        console.log(`✅ STOCK QUANTITY UPDATED: ${currentStock} + ${newQuantity} = ${newTotalStock}`);
        console.log(`📊 Total entries in combined file: ${totalLines.length}`);

        // SAVE TO DATABASE
        console.log('💾 Saving to database...');
        await user.save();
        console.log('✅ Database save successful');

        req.flash('success_msg', `✅ Manual entry completed successfully!\n\n📝 Entries added: ${newQuantity}\n📊 Total stock: ${newTotalStock} items\n🏷️ Data format: ${dataFormat}\n${validateData === 'on' ? '✅ Validation: Enabled' : '⚠️ Validation: Disabled'}`);
        res.redirect('/my-store');

    } catch (error) {
        console.error('❌ Manual entry error:', error);
        req.flash('error_msg', `Manual entry failed: ${error.message}`);
        res.redirect('/my-store');
    }
});

// ============ STOCK MANAGEMENT ROUTES FOR SELLERS ============

// View Product Stock Details
app.get('/seller/stock/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        // Get stock information
        const stockInfo = {
            totalStock: product.stockQuantity || 0,
            availableStock: product.availableQuantity || 0,
            soldCount: product.soldCount || 0,
            files: product.files || [],
            manualEntryData: product.manualEntryData || null
        };

        res.render('seller/stock-details', {
            user: user,
            product: product,
            stockInfo: stockInfo,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('Stock details error:', error);
        req.flash('error_msg', 'An error occurred loading stock details');
        res.redirect('/my-store');
    }
});

// Download Product Data File
app.get('/seller/download-stock/:productId/:fileIndex', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const fileIndex = parseInt(req.params.fileIndex);
        const product = user.store.items.find(item => item.id === productId);

        if (!product || !product.files || fileIndex >= product.files.length) {
            req.flash('error_msg', 'File not found.');
            return res.redirect('/my-store');
        }

        const file = product.files[fileIndex];
        const filePath = path.join(__dirname, 'uploads', path.basename(file.filepath));

        if (!fs.existsSync(filePath)) {
            req.flash('error_msg', 'File not found on server.');
            return res.redirect('/my-store');
        }

        // Download the file
        res.download(filePath, file.filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                req.flash('error_msg', 'Download failed.');
                res.redirect('/my-store');
            }
        });
    } catch (error) {
        console.error('Download stock file error:', error);
        req.flash('error_msg', 'An error occurred downloading the file');
        res.redirect('/my-store');
    }
});

// Delete All Stock for Product
app.post('/seller/delete-all-stock/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        // Delete all associated files
        if (product.files && product.files.length > 0) {
            product.files.forEach(file => {
                try {
                    const filePath = path.join(__dirname, 'uploads', path.basename(file.filepath));
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log('🗑️ Deleted file:', file.filename);
                    }
                } catch (fileError) {
                    console.warn('⚠️ Could not delete file:', file.filename, fileError.message);
                }
            });
        }

        // Reset stock quantities
        product.stockQuantity = 0;
        product.availableQuantity = 0;
        product.files = [];
        product.manualEntryData = null;
        product.isQuantityValidated = false;

        await user.save();

        req.flash('success_msg', `All stock deleted for product "${product.name}". Stock reset to 0.`);
        res.redirect('/my-store');
    } catch (error) {
        console.error('Delete all stock error:', error);
        req.flash('error_msg', 'An error occurred deleting stock');
        res.redirect('/my-store');
    }
});

// Edit Uploaded File Content
app.post('/seller/edit-file-content/:productId/:fileIndex', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const fileIndex = parseInt(req.params.fileIndex);
        const product = user.store.items.find(item => item.id === productId);

        if (!product || !product.files || fileIndex >= product.files.length) {
            req.flash('error_msg', 'File not found.');
            return res.redirect('/my-store');
        }

        const file = product.files[fileIndex];
        const filePath = path.join(__dirname, 'uploads', path.basename(file.filepath));
        const { newContent } = req.body;

        if (!fs.existsSync(filePath)) {
            req.flash('error_msg', 'File not found on server.');
            return res.redirect('/my-store');
        }

        // Write new content to file
        fs.writeFileSync(filePath, newContent, 'utf8');

        // Recalculate stock quantity
        const lines = newContent.split('\n').filter(line => line.trim().length > 0);
        const newQuantity = lines.length;

        // Update file entry count
        file.entryCount = newQuantity;
        file.uploadedAt = new Date();

        // Update product stock
        product.stockQuantity = newQuantity;
        product.availableQuantity = newQuantity;

        await user.save();

        req.flash('success_msg', `File content updated successfully! Stock quantity: ${newQuantity} items.`);
        res.redirect(`/seller/stock/${productId}`);
    } catch (error) {
        console.error('Edit file content error:', error);
        req.flash('error_msg', 'An error occurred updating file content');
        res.redirect('/my-store');
    }
});

// View File Content (for manual editing)
app.get('/seller/view-file-content/:productId/:fileIndex', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const fileIndex = parseInt(req.params.fileIndex);
        const product = user.store.items.find(item => item.id === productId);

        if (!product || !product.files || fileIndex >= product.files.length) {
            req.flash('error_msg', 'File not found.');
            return res.redirect('/my-store');
        }

        const file = product.files[fileIndex];
        const filePath = path.join(__dirname, 'uploads', file.filepath);

        if (!fs.existsSync(filePath)) {
            req.flash('error_msg', 'File not found on server.');
            return res.redirect('/my-store');
        }

        // Read file content
        const fileContent = fs.readFileSync(filePath, 'utf8');

        res.render('seller/edit-file-content', {
            user: user,
            product: product,
            file: file,
            fileIndex: fileIndex,
            fileContent: fileContent,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('View file content error:', error);
        req.flash('error_msg', 'An error occurred loading file content');
        res.redirect('/my-store');
    }
});

// Submit product for moderation (after files are uploaded)
app.post('/seller/submit-moderation/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }


        // Check if product has files
        if (!product.files || product.files.length === 0) {
            req.flash('error_msg', 'Please upload at least one file before submitting for moderation.');
            return res.redirect(`/seller/upload-files/${productId}`);
        }

        product.moderationStatus = 'pending';
        product.status = 'inactive'; // Status will be set to active by admin after approval

        await user.save();

        req.flash('success_msg', `Product "${product.name}" submitted for moderation successfully!`);
        res.redirect('/my-store');
    } catch (error) {
        console.error('Error submitting for moderation:', error);
        req.flash('error_msg', 'An error occurred while submitting for moderation.');
        res.redirect('/my-store');
    }
});

// Edit Product Page
app.get('/seller/edit-product/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        res.render('seller/edit-product', {
            user: user,
            product: product,
            success_msg: res.locals.success_msg,
            error_msg: res.locals.error_msg
        });
    } catch (error) {
        console.error('Edit product page error:', error);
        req.flash('error_msg', 'An error occurred loading the product');
        res.redirect('/my-store');
    }
});

// Edit Product Handler
app.post('/seller/edit-product/:productId', [
    isLoggedIn,
    upload.array('productImages', 5)
], async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        const {
            productName,
            category,
            price,
            description,
            stockQuantity,
            tags,
            isDigital,
            status
        } = req.body;

        // Update product
        product.name = productName.trim();
        product.category = category;
        product.price = parseFloat(price);
        product.description = description.trim();
        product.stockQuantity = isDigital === 'on' ? 999999 : parseInt(stockQuantity) || 0;
        product.isDigital = isDigital === 'on';
        product.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        product.status = status || 'active';

        // Add new images if uploaded
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            product.images = [...product.images, ...newImages];
        }

        await user.save();

        req.flash('success_msg', `Product "${productName}" updated successfully!`);
        res.redirect('/my-store');

    } catch (error) {
        console.error('Error updating product:', error);
        req.flash('error_msg', 'An error occurred while updating the product. Please try again.');
        res.redirect('/my-store');
    }
});

// Delete Product
app.post('/seller/delete-product/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const productIndex = user.store.items.findIndex(item => item.id === productId);

        if (productIndex === -1) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        const productName = user.store.items[productIndex].name;
        user.store.items.splice(productIndex, 1);
        await user.save();

        req.flash('success_msg', `Product "${productName}" deleted successfully!`);
        res.redirect('/my-store');
    } catch (error) {
        console.error('Delete product error:', error);
        req.flash('error_msg', 'An error occurred while deleting the product.');
        res.redirect('/my-store');
    }
});

// Toggle Product Status
app.post('/seller/toggle-product/:productId', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        product.status = product.status === 'active' ? 'inactive' : 'active';
        await user.save();

        req.flash('success_msg', `Product "${product.name}" ${product.status === 'active' ? 'activated' : 'deactivated'} successfully!`);
        res.redirect('/my-store');
    } catch (error) {
        console.error('Toggle product status error:', error);
        req.flash('error_msg', 'An error occurred updating product status.');
        res.redirect('/my-store');
    }
});

// ============ CUSTOMER PURCHASE ROUTES ============

// Add to Cart (for future implementation)
app.post('/add-to-cart/:sellerId/:productId', isLoggedIn, async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            return res.json({ success: false, message: 'Store not found' });
        }

        const product = seller.store.items.find(item => item.id === productId && item.status === 'active');
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }

        if (!product.isDigital && product.stockQuantity < quantity) {
            return res.json({ success: false, message: 'Insufficient stock' });
        }

        const user = await User.findById(req.session.user.id);
        if (!user.cart) user.cart = [];

        // Check if product already in cart
        const existingItem = user.cart.find(item => item.productId === productId && item.sellerId === sellerId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({
                sellerId: sellerId,
                productId: productId,
                productName: product.name,
                price: product.price,
                quantity: quantity,
                image: product.images[0]
            });
        }

        await user.save();
        res.json({ success: true, message: 'Product added to cart!' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.json({ success: false, message: 'An error occurred adding to cart' });
    }
});

// Buy Now (Direct Purchase) - WITH STOCK DEDUCTION AND PERSONALIZED DOWNLOAD
app.post('/buy-now/:sellerId/:productId', isLoggedIn, async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        console.log('🛒 Purchase attempt:', { sellerId, productId, quantity });

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Store not found');
            return res.redirect('/stores');
        }

        const product = seller.store.items.find(item => item.id === productId && item.status === 'active');
        if (!product) {
            req.flash('error_msg', 'Product not found or unavailable');
            return res.redirect(`/store/${sellerId}`);
        }

        const user = await User.findById(req.session.user.id);
        const totalCost = product.price * quantity;

        // Check user balance
        if ((user.balance || 0) < totalCost) {
            req.flash('error_msg', 'Insufficient balance. Please top up your account.');
            return res.redirect(`/store/${sellerId}`);
        }

        // Check available stock
        const availableStock = product.stockQuantity || 0;
        if (availableStock < quantity) {
            req.flash('error_msg', `Insufficient stock available. Only ${availableStock} items remaining.`);
            return res.redirect(`/store/${sellerId}`);
        }

        console.log(`📦 Stock check passed: ${availableStock} available, purchasing ${quantity}`);

        // Process purchase with 10% commission to admin
        user.balance = (user.balance || 0) - totalCost;

        // Calculate commission (10% of total cost)
        const commissionAmount = totalCost * 0.10;
        const sellerAmount = totalCost * 0.90;

        // Add 90% to seller's balance
        seller.balance = (seller.balance || 0) + sellerAmount;

        // Add 10% commission to admin's balance
        try {
            // Find the first admin user to add commission
            const adminUser = await AdminUser.findOne();
            if (adminUser) {
                adminUser.balance = (adminUser.balance || 0) + commissionAmount;
                await adminUser.save();
                console.log(`💰 Commission: ${commissionAmount.toFixed(2)} ₽ added to admin balance`);
            } else {
                console.warn('⚠️ No admin user found for commission');
            }
        } catch (adminError) {
            console.error('❌ Error updating admin commission:', adminError);
        }

        // DEDUCT STOCK IMMEDIATELY - ensure both fields are updated
        product.stockQuantity = availableStock - quantity;
        product.availableQuantity = product.stockQuantity;
        product.soldCount = (product.soldCount || 0) + quantity;

        console.log(`💰 Stock updated: ${availableStock} - ${quantity} = ${product.stockQuantity}`);
        console.log(`📊 Available quantity updated to: ${product.availableQuantity}`);

        // Create order with download tracking
        const newOrder = new Order({
            buyerId: user._id,
            sellerId: seller._id,
            productId: productId,
            productName: product.name,
            quantity: quantity,
            price: product.price,
            totalCost: totalCost,
            status: 'completed',
            orderDate: new Date(),
            isDigital: true,
            quantityPurchased: quantity,
            downloadReady: false, // Will be set to true when personalized file is created
            downloadFileName: null
        });

        await newOrder.save();

        // CREATE PERSONALIZED DOWNLOAD FILE
        if (product.files && product.files.length > 0) {
            try {
                console.log('📁 Creating personalized download file...');

                // Use the first file as the main data file (any file, not just manual files)
                const mainFile = product.files[0];
                if (mainFile) {
                    const mainFilePath = path.join(__dirname, 'uploads', path.basename(mainFile.filepath));

                    if (fs.existsSync(mainFilePath)) {
                        // Read the main data file
                        const fileContent = fs.readFileSync(mainFilePath, 'utf8');
                        const allLines = fileContent.split('\n').filter(line => line.trim().length > 0);

                        console.log(`📄 Main file has ${allLines.length} entries, need ${quantity} for buyer`);

                        if (allLines.length >= quantity) {
                            // Take the first 'quantity' entries for this buyer
                            const buyerLines = allLines.splice(0, quantity);

                            // Create personalized file for buyer
                            const buyerFileName = `purchase_${newOrder._id}_${Date.now()}.txt`;
                            const buyerFilePath = path.join(__dirname, 'uploads', buyerFileName);

                            fs.writeFileSync(buyerFilePath, buyerLines.join('\n'), 'utf8');

                            // Update order with download info
                            newOrder.downloadReady = true;
                            newOrder.downloadFileName = buyerFileName;
                            await newOrder.save();

                            // Update main file with remaining data
                            if (allLines.length > 0) {
                                fs.writeFileSync(mainFilePath, allLines.join('\n'), 'utf8');
                                console.log(`📝 Updated main file with ${allLines.length} remaining entries`);

                                // Update product's available quantity
                                product.availableQuantity = allLines.length;
                            } else {
                                // No entries left, remove the file
                                fs.unlinkSync(mainFilePath);
                                console.log('🗑️ Main file emptied and removed');
                                product.availableQuantity = 0;
                            }

                            // Save the updated product stock
                            await seller.save();

                            console.log(`✅ Created personalized file: ${buyerFileName} with ${quantity} entries`);
                        } else {
                            console.warn(`⚠️ Insufficient data in main file: ${allLines.length} < ${quantity}`);
                        }
                    } else {
                        console.warn('⚠️ Main data file not found');
                    }
                } else {
                    console.warn('⚠️ No data files found for product');
                }
            } catch (fileError) {
                console.error('❌ Error creating personalized file:', fileError);
                // Continue with purchase even if file creation fails
            }
        }

        await user.save();
        await seller.save();

        // Update session balance
        req.session.user.balance = user.balance;

        const successMsg = newOrder.downloadReady ?
            `Successfully purchased ${quantity}x ${product.name} for $${totalCost.toFixed(2)}! Your personalized download is ready.` :
            `Successfully purchased ${quantity}x ${product.name} for $${totalCost.toFixed(2)}! Download will be available shortly.`;

        req.flash('success_msg', successMsg);
        res.redirect(`/orders`);
    } catch (error) {
        console.error('Purchase error:', error);
        req.flash('error_msg', 'An error occurred during purchase. Please try again.');
        res.redirect('/stores');
    }
});

// Contact Seller - Message/Chat Storage (in-memory for now)
let chatMessages = {}; // sellerId -> buyerId -> messages[]

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    next();
});

// Add missing routes
app.get('/favorites', isLoggedIn, (req, res) => {
    res.render('favorites', {
        user: req.session.user,
        favorites: [] // TODO: implement favorites system
    });
});

// Reviews route - Show user's reviews
app.get('/reviews', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const reviews = [];

        // Find all sellers with products that have reviews by this user
        const sellers = await User.find({
            isSeller: true
        });

        // Collect all reviews by this user
        sellers.forEach(seller => {
            if (seller.store && seller.store.items) {
                seller.store.items.forEach(product => {
                    if (product.reviews && Array.isArray(product.reviews)) {
                        const userReviewsForProduct = product.reviews.filter(review => review.userId === userId);
                        userReviewsForProduct.forEach(review => {
                            reviews.push({
                                ...review,
                                sellerName: `${seller.firstName} ${seller.lastName}`,
                                productName: product.name,
                                productId: product.id
                            });
                        });
                    }
                });
            }
        });

        // Sort reviews by date (newest first)
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate rating statistics
        const calculateRatingStats = (reviews) => {
            const stats = {
                totalReviews: reviews.length,
                averageRating: 0,
                ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                topReviewedProducts: []
            };

            if (reviews.length > 0) {
                let totalRating = 0;
                const productStats = {};

                reviews.forEach(review => {
                    totalRating += review.rating;
                    stats.ratingBreakdown[review.rating] = (stats.ratingBreakdown[review.rating] || 0) + 1;

                    // Track product stats
                    if (!productStats[review.productId]) {
                        productStats[review.productId] = {
                            name: review.productName,
                            reviewCount: 0,
                            totalRating: 0,
                            image: '/css/style.css' // Default placeholder
                        };
                    }
                    productStats[review.productId].reviewCount++;
                    productStats[review.productId].totalRating += review.rating;
                });

                stats.averageRating = totalRating / reviews.length;

                // Get top reviewed products
                stats.topReviewedProducts = Object.values(productStats)
                    .sort((a, b) => b.reviewCount - a.reviewCount)
                    .slice(0, 3);

                stats.topReviewedProducts.forEach(product => {
                    product.rating = product.totalRating / product.reviewCount;
                });
            }

            return stats;
        };

        // Check if user can edit a review
        const canEditReview = (review, currentUser) => {
            if (!currentUser) return false;
            // Convert both IDs to strings for comparison
            return review.userId.toString() === currentUser.id.toString();
        };

        // Calculate rating percentage for display
        const getRatingPercentage = (stars) => {
            if (!userReviews || userReviews.length === 0) return 0;

            const count = userReviews.filter(review => review.rating === stars).length;
            return Math.round((count / userReviews.length) * 100);
        };

        // Get count of reviews with specific star rating
        const getRatingCount = (stars) => {
            return userReviews.filter(review => review.rating === stars).length || 0;
        };

        // Get overall rating
        const getOverallRating = () => {
            if (!userReviews || userReviews.length === 0) return 0;
            const total = userReviews.reduce((sum, review) => sum + review.rating, 0);
            return Math.round((total / userReviews.length) * 10) / 10; // Round to 1 decimal place
        };

        // Get total reviews count
        const getTotalReviews = () => {
            return userReviews.length;
        };

        // Get product category and price from the sellers
        const getProductCategory = (productId) => {
            // Find product from sellers we searched
            for (let seller of sellers) {
                if (seller.store && seller.store.items) {
                    const product = seller.store.items.find(item => item.id === productId);
                    if (product) {
                        return product.itemCategory || product.category || 'Product';
                    }
                }
            }
            return 'Product';
        };

        const getProductPrice = (productId) => {
            // Find product from sellers we searched
            for (let seller of sellers) {
                if (seller.store && seller.store.items) {
                    const product = seller.store.items.find(item => item.id === productId);
                    if (product) {
                        return product.price || 0;
                    }
                }
            }
            return 0;
        };

        // Check if user has pending reviews
        const hasPendingReviews = (currentUser) => {
            return userReviews.length > 0;
        };

        // Get top reviewed products
        const getTopReviewedProducts = () => {
            const stats = calculateRatingStats(reviews);
            return stats.topReviewedProducts;
        };

        res.render('reviews', {
            user: req.session.user,
            reviews: reviews,
            error_msg: res.locals.error_msg,
            success_msg: res.locals.success_msg,
            // Helper functions for template
            getRatingPercentage,
            getRatingCount,
            getOverallRating,
            getTotalReviews,
            getProductCategory,
            getProductPrice,
            hasPendingReviews,
            getTopReviewedProducts,
            canEdit: (review, currentUser) => canEditReview(review, currentUser),
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Reviews error:', error);
        res.render('reviews', {
            user: req.session.user,
            reviews: [],
            error_msg: 'An error occurred loading reviews',
            getRatingPercentage: () => 0,
            getRatingCount: () => 0,
            getOverallRating: () => 0,
            getTotalReviews: () => 0,
            getProductCategory: () => 'Product',
            getProductPrice: () => 0,
            hasPendingReviews: () => false,
            getTopReviewedProducts: () => [],
            canEdit: () => false,
            currentUser: req.session.user
        });
    }
});

app.delete('/dispute/old-route', isLoggedIn, (req, res) => {
    // This route was removed - duplicate route
});

// Products listing route
app.get('/products', async (req, res) => {
    try {
        // Get all approved sellers with stores
        const approvedSellers = await User.find({
            isSeller: true,
            'store.name': { $exists: true }
        }).select('firstName lastName store');

        // Get real products from all sellers
        const products = [];
        approvedSellers.forEach(seller => {
            if (seller.store && seller.store.items && seller.store.items.length > 0) {
                seller.store.items.forEach(product => {
                    // Only include approved products
                    if (product.moderationStatus === 'approved' && product.status === 'active') {
                        products.push({
                            ...product.toObject(),
                            sellerId: seller._id.toString(),
                            sellerName: `${seller.firstName} ${seller.lastName}`,
                            storeName: seller.store.name,
                            storeLogo: seller.store.logo
                        });
                    }
                });
            }
        });

        // Sort products by soldCount (descending) to show top selling first
        products.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

        res.render('products', {
            user: req.session.user,
            products: products
        });
    } catch (error) {
        console.error('Products listing error:', error);
        res.render('products', {
            user: req.session.user,
            products: []
        });
    }
});

// Services route
app.get('/services', (req, res) => {
    res.render('services', {
        user: req.session.user
    });
});

// Contact Seller Routes
app.get('/contact-seller/:sellerId', isLoggedIn, async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const buyerId = req.session.user.id;

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Seller not found.');
            return res.redirect('/stores');
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
            req.flash('error_msg', 'User not found.');
            return res.redirect('/login');
        }

        res.render('contact-seller', {
            seller: {
                id: sellerId,
                name: `${seller.firstName} ${seller.lastName}`,
                store: seller.store
            },
            buyer: buyer,
            messages: [], // We'll get messages from DB later
            user: req.session.user
        });
    } catch (error) {
        console.error('Contact seller error:', error);
        req.flash('error_msg', 'An error occurred loading the page');
        res.redirect('/stores');
    }
});

app.post('/contact-seller/:sellerId', isLoggedIn, async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const buyerId = req.session.user.id;

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            return res.json({ success: false, message: 'Seller not found.' });
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
            return res.json({ success: false, message: 'User not found.' });
        }

        const { message } = req.body;
        if (!message || message.trim() === '') {
            return res.json({ success: false, message: 'Message cannot be empty.' });
        }

        const newMessage = {
            id: Date.now().toString(),
            from: buyerId,
            fromName: `${buyer.firstName} ${buyer.lastName}`,
            message: message.trim(),
            timestamp: new Date(),
            type: 'text'
        };

        // Store message in local variable (temporary solution)
        // In production, you'd want a proper Message model for this
        if (!global.chatMessages) global.chatMessages = {};
        if (!global.chatMessages[sellerId]) global.chatMessages[sellerId] = {};
        if (!global.chatMessages[sellerId][buyerId]) {
            global.chatMessages[sellerId][buyerId] = [];
        }
        global.chatMessages[sellerId][buyerId].push(newMessage);

        res.json({
            success: true,
            message: newMessage,
            buyerName: buyer.firstName
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.json({ success: false, message: 'An error occurred sending the message' });
    }
});

// Handle chat file uploads
const chatFileUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png',
            'image/gif', 'application/pdf', 'text/plain'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDF, and text files are allowed.'), false);
        }
    }
});

app.post('/contact-seller/:sellerId/upload', [
    isLoggedIn,
    chatFileUpload.single('file')
], async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const buyerId = req.session.user.id;

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            return res.json({ success: false, message: 'Seller not found.' });
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
            return res.json({ success: false, message: 'User not found.' });
        }

        if (!req.file) {
            return res.json({ success: false, message: 'No file uploaded.' });
        }

        const fileName = req.file.originalname;
        const fileUrl = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';

        const newMessage = {
            id: Date.now().toString(),
            from: buyerId,
            fromName: `${buyer.firstName} ${buyer.lastName}`,
            message: fileName,
            filename: fileName,
            filepath: req.file.filename,
            fileUrl: fileUrl,
            type: fileType,
            timestamp: new Date()
        };

        // Store message in local variable (temporary solution)
        if (!global.chatMessages) global.chatMessages = {};
        if (!global.chatMessages[sellerId]) global.chatMessages[sellerId] = {};
        if (!global.chatMessages[sellerId][buyerId]) {
            global.chatMessages[sellerId][buyerId] = [];
        }
        global.chatMessages[sellerId][buyerId].push(newMessage);

        res.json({
            success: true,
            message: newMessage,
            buyerName: buyer.firstName
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.json({ success: false, message: 'Upload failed.' });
    }
});

// Socket.IO for real-time messaging (if available)
if (io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join-chat', (data) => {
            const room = `chat-${data.sellerId}-${data.buyerId}`;
            socket.join(room);
            console.log(`User joined chat room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
}

// ============ DISPUTE SYSTEM ROUTES ============

// Open/Create Dispute - Migrating to MongoDB
app.post('/dispute/create/:orderId', isLoggedIn, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user.id;
        const { reason, description, disputePeriod } = req.body;

        // Find the order in database
        const order = await Order.findById(orderId);
        if (!order) {
            req.flash('error_msg', 'Order not found');
            return res.redirect('/orders');
        }

        // Check if user can open dispute for this order
        if (order.buyerId.toString() !== userId && order.sellerId.toString() !== userId) {
            req.flash('error_msg', 'Access denied - not your order');
            return res.redirect('/orders');
        }

        // Check if user is buyer (only buyers can open disputes)
        if (order.buyerId.toString() !== userId) {
            req.flash('error_msg', 'Only buyers can open disputes');
            return res.redirect('/orders');
        }

        // Check dispute period (default 48 hours)
        const allowedHours = disputePeriod || 48;
        const orderDate = new Date(order.createdAt);
        const timeSinceOrder = Date.now() - orderDate.getTime();
        const hoursSinceOrder = timeSinceOrder / (1000 * 60 * 60);

        if (hoursSinceOrder > allowedHours) {
            req.flash('error_msg', `Cannot open dispute. Disputes must be opened within ${allowedHours} hours of purchase.`);
            return res.redirect('/orders');
        }

        // Check if dispute already exists for this order
        const existingDispute = await Dispute.findOne({
            orderId: orderId,
            status: { $ne: 'closed' }
        });

        if (existingDispute) {
            req.flash('error_msg', 'A dispute is already open for this order');
            return res.redirect(`/dispute/${existingDispute._id}`);
        }

        // Create new dispute in database
        const newDispute = new Dispute({
            orderId: orderId,
            buyerId: order.buyerId,
            sellerId: order.sellerId,
            reason: reason,
            description: description,
            status: 'open',
            openedAt: new Date(),
            lastActivity: new Date(),
            chat: [],
            evidence: [],
            autoCloseAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            resolution: null
        });

        await newDispute.save();

        req.flash('success_msg', 'Dispute opened successfully! You have 24 hours to resolve this with the seller.');
        res.redirect(`/dispute/${newDispute._id}`);

    } catch (error) {
        console.error('Create dispute error:', error);
        req.flash('error_msg', 'An error occurred while creating the dispute. Please try again.');
        res.redirect('/orders');
    }
});

// View Dispute - Migrating to MongoDB
app.get('/dispute/:disputeId', isLoggedIn, async (req, res) => {
    try {
        const disputeId = req.params.disputeId;
        const userId = req.session.user.id;

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            req.flash('error_msg', 'Dispute not found');
            return res.redirect('/orders');
        }

        // Check access
        if (dispute.buyerId.toString() !== userId && dispute.sellerId.toString() !== userId) {
            req.flash('error_msg', 'Access denied');
            return res.redirect('/orders');
        }

        // Get order and user details from database
        const order = await Order.findById(dispute.orderId);
        const buyer = await User.findById(dispute.buyerId);
        const seller = await User.findById(dispute.sellerId);

        // Calculate time remaining until auto-close
        const now = new Date();
        const timeRemaining = dispute.autoCloseAt.getTime() - now.getTime();
        const hoursLeft = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
        const minutesLeft = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

        res.render('dispute', {
            dispute: dispute,
            order: order,
            buyer: buyer,
            seller: seller,
            user: req.session.user,
            timeRemaining: {
                hours: hoursLeft,
                minutes: minutesLeft,
                total: timeRemaining
            }
        });
    } catch (error) {
        console.error('View dispute error:', error);
        req.flash('error_msg', 'An error occurred loading the dispute');
        res.redirect('/orders');
    }
});

// Send Message in Dispute - Migrating to MongoDB
app.post('/dispute/:disputeId/message', isLoggedIn, async (req, res) => {
    try {
        const disputeId = req.params.disputeId;
        const userId = req.session.user.id;
        const { message } = req.body;

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.json({ success: false, message: 'Dispute not found' });
        }

        if (dispute.status !== 'open') {
            return res.json({ success: false, message: 'Dispute is not open' });
        }

        // Check access
        if (dispute.buyerId.toString() !== userId && dispute.sellerId.toString() !== userId) {
            return res.json({ success: false, message: 'Access denied' });
        }

        const newMessage = {
            id: Date.now().toString(),
            from: userId,
            fromName: `${req.session.user.firstName} ${req.session.user.lastName}`,
            message: message.trim(),
            timestamp: new Date(),
            type: 'text'
        };

        dispute.chat.push(newMessage);
        dispute.lastActivity = new Date();
        await dispute.save();

        res.json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.json({ success: false, message: 'An error occurred sending the message' });
    }
});

// Upload Evidence - Migrating to MongoDB
app.post('/dispute/:disputeId/evidence', [
    isLoggedIn,
    upload.single('evidence')
], async (req, res) => {
    try {
        const disputeId = req.params.disputeId;
        const userId = req.session.user.id;

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.json({ success: false, message: 'Dispute not found' });
        }

        // Check access
        if (dispute.buyerId.toString() !== userId && dispute.sellerId.toString() !== userId) {
            return res.json({ success: false, message: 'Access denied' });
        }

        if (!req.file) {
            return res.json({ success: false, message: 'No file uploaded' });
        }

        const newEvidence = {
            id: Date.now().toString(),
            uploadedBy: userId,
            uploaderName: `${req.session.user.firstName} ${req.session.user.lastName}`,
            filename: req.file.originalname,
            filepath: req.file.filename,
            fileUrl: `/uploads/${req.file.filename}`,
            timestamp: new Date(),
            description: req.body.description || ''
        };

        dispute.evidence.push(newEvidence);
        dispute.lastActivity = new Date();
        await dispute.save();

        res.json({
            success: true,
            evidence: newEvidence
        });
    } catch (error) {
        console.error('Upload evidence error:', error);
        res.json({ success: false, message: 'An error occurred uploading the file' });
    }
});

// Resolve Dispute (Seller Refund) - Migrating to MongoDB
app.post('/dispute/:disputeId/refund', isLoggedIn, async (req, res) => {
    try {
        const disputeId = req.params.disputeId;
        const userId = req.session.user.id;
        const { refundAmount, reason } = req.body;

        console.log('🔄 Processing refund request:', { disputeId, userId, refundAmount, reason });

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            console.error('❌ Dispute not found:', disputeId);
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Dispute not found' });
            }
            req.flash('error_msg', 'Dispute not found');
            return res.redirect('/orders');
        }

        console.log('📋 Dispute found:', { status: dispute.status, sellerId: dispute.sellerId, buyerId: dispute.buyerId });

        // Only seller can process refund
        if (dispute.sellerId.toString() !== userId) {
            console.error('❌ Access denied - user is not the seller:', { userId, sellerId: dispute.sellerId });
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Only the seller can process refunds' });
            }
            req.flash('error_msg', 'Only the seller can process refunds');
            return res.redirect(`/dispute/${dispute._id}`);
        }

        if (dispute.status !== 'open') {
            console.error('❌ Dispute is not open:', dispute.status);
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Dispute is not open' });
            }
            req.flash('error_msg', 'Dispute is not open');
            return res.redirect(`/dispute/${dispute._id}`);
        }

        // Get order and users from database
        console.log('🔍 Fetching order and users...');
        const order = await Order.findById(dispute.orderId);
        const buyer = await User.findById(dispute.buyerId);
        const seller = await User.findById(dispute.sellerId);

        if (!order) {
            console.error('❌ Order not found:', dispute.orderId);
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Order not found' });
            }
            req.flash('error_msg', 'Order not found');
            return res.redirect('/orders');
        }

        if (!buyer || !seller) {
            console.error('❌ Buyer or seller not found:', { buyerId: dispute.buyerId, sellerId: dispute.sellerId });
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'User data not found' });
            }
            req.flash('error_msg', 'User data not found');
            return res.redirect('/orders');
        }

        console.log('💰 Current balances:', { sellerBalance: seller.balance, buyerBalance: buyer.balance, orderTotal: order.totalCost });

        // Validate refund amount - must be provided and valid (no upper limit)
        const refund = parseFloat(refundAmount);
        if (isNaN(refund) || refund < 0) {
            console.error('❌ Invalid refund amount:', refundAmount);
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Invalid refund amount. Please enter a valid positive number.' });
            }
            req.flash('error_msg', 'Invalid refund amount. Please enter a valid positive number.');
            return res.redirect(`/dispute/${dispute._id}`);
        }

        // Check seller balance
        if ((seller.balance || 0) < refund) {
            console.error('❌ Insufficient seller balance:', { sellerBalance: seller.balance, refundAmount: refund });
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: `Insufficient balance for refund. Available: $${(seller.balance || 0).toFixed(2)}` });
            }
            req.flash('error_msg', `Insufficient balance for refund. Available: $${(seller.balance || 0).toFixed(2)}`);
            return res.redirect(`/dispute/${dispute._id}`);
        }

        console.log('✅ Validation passed, processing refund...');

        // Process refund - deduct only the refunded amount from seller balance
        const oldSellerBalance = seller.balance || 0;
        const oldBuyerBalance = buyer.balance || 0;

        seller.balance = oldSellerBalance - refund;
        buyer.balance = oldBuyerBalance + refund;

        console.log('💸 Balance changes:', {
            seller: `${oldSellerBalance} -> ${seller.balance}`,
            buyer: `${oldBuyerBalance} -> ${buyer.balance}`
        });

        // Update order status to refunded (only mark as refunded if full refund, otherwise keep as completed)
        const oldOrderStatus = order.status;
        if (refund >= order.totalCost) {
            order.status = 'refunded';
            console.log('📋 Order status changed to refunded');
        }
        // For partial refunds or over-refunds, order remains completed but with refund record

        // Close dispute
        dispute.status = 'closed';
        dispute.resolution = {
            type: 'refund',
            amount: refund,
            reason: reason || '', // Include the reason if provided
            processedAt: new Date(),
            processedBy: 'seller'
        };

        console.log('🔒 Closing dispute with resolution:', dispute.resolution);

        // Save all changes
        console.log('💾 Saving changes to database...');
        await Promise.all([seller.save(), buyer.save(), order.save(), dispute.save()]);
        console.log('✅ All database saves completed successfully');

        let refundType = 'partial';
        if (refund >= order.totalCost) {
            refundType = 'full';
        } else if (refund > order.totalCost) {
            refundType = 'over';
        }

        const refundTypeText = refundType === 'over' ? 'Over' : refundType.charAt(0).toUpperCase() + refundType.slice(1);

        console.log('🎉 Refund processed successfully:', {
            type: refundType,
            amount: refund,
            sellerBalance: seller.balance,
            buyerBalance: buyer.balance,
            orderStatus: order.status,
            disputeStatus: dispute.status
        });

        const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
        if (isAjax) {
            return res.json({ success: true, message: `${refundTypeText} refund of $${refund.toFixed(2)} processed successfully!` });
        }

        req.flash('success_msg', `${refundTypeText} refund of $${refund.toFixed(2)} processed successfully!`);
        res.redirect('/seller/disputes');
    } catch (error) {
        console.error('❌ Process refund error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            disputeId: req.params.disputeId,
            userId: req.session.user.id,
            body: req.body
        });

        const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
        if (isAjax) {
            return res.json({ success: false, message: 'An error occurred processing the refund. Please check the console for details.' });
        }
        req.flash('error_msg', 'An error occurred processing the refund. Please try again or contact support.');
        res.redirect('/seller/disputes');
    }
});

// Close Dispute (Buyer) - Migrating to MongoDB
app.post('/dispute/:disputeId/close', isLoggedIn, async (req, res) => {
    try {
        const disputeId = req.params.disputeId;
        const userId = req.session.user.id;

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Dispute not found' });
            }
            req.flash('error_msg', 'Dispute not found');
            return res.redirect('/orders');
        }

        // Only buyer can close dispute
        if (dispute.buyerId.toString() !== userId) {
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Only the buyer can close the dispute' });
            }
            req.flash('error_msg', 'Only the buyer can close the dispute');
            return res.redirect(`/dispute/${dispute._id}`);
        }

        if (dispute.status !== 'open') {
            const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
            if (isAjax) {
                return res.json({ success: false, message: 'Dispute is not open' });
            }
            req.flash('error_msg', 'Dispute is not open');
            return res.redirect(`/dispute/${dispute._id}`);
        }

        // Close dispute
        dispute.status = 'closed';
        dispute.resolution = {
            type: 'closed_by_buyer',
            processedAt: new Date(),
            processedBy: 'buyer'
        };

        await dispute.save();

        const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
        if (isAjax) {
            return res.json({ success: true, message: 'Dispute closed successfully!' });
        }

        req.flash('success_msg', 'Dispute closed successfully!');
        res.redirect('/orders');
    } catch (error) {
        console.error('Close dispute error:', error);
        const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
        if (isAjax) {
            return res.json({ success: false, message: 'An error occurred closing the dispute' });
        }
        req.flash('error_msg', 'An error occurred closing the dispute');
        res.redirect('/orders');
    }
});

// Unified dispute listing route for both buyer and seller
app.get('/dispute', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Find all disputes where user is buyer or seller
        const userDisputes = await Dispute.find({
            $or: [
                { buyerId: userId },
                { sellerId: userId }
            ]
        }).sort({ openedAt: -1 }).populate('orderId');

        // Calculate time remaining for each dispute
        const disputesWithTimeRemaining = userDisputes.map(dispute => {
            const disputeObj = dispute.toObject();

            if (dispute.autoCloseAt) {
                const now = new Date();
                const closeAt = new Date(dispute.autoCloseAt);
                const diff = closeAt.getTime() - now.getTime();

                if (diff <= 0) {
                    disputeObj.timeRemaining = 'Expired';
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    disputeObj.timeRemaining = `${hours}h ${minutes}m`;
                }
            } else {
                disputeObj.timeRemaining = 'N/A';
            }

            return disputeObj;
        });

        // For now, return empty disputes array to avoid errors
        res.render('dispute-list', {
            user: req.session.user,
            disputes: disputesWithTimeRemaining || [],
            error_msg: req.flash('error_msg'),
            success_msg: req.flash('success_msg')
        });
    } catch (error) {
        console.error('List disputes error:', error);

        // Fallback to empty array
        res.render('dispute-list', {
            user: req.session.user,
            disputes: [],
            error_msg: req.flash('error_msg'),
            success_msg: req.flash('success_msg')
        });
    }
});

// Auto-Resolve Disputes (24-hour timer) - REMOVED: migrated to MongoDB but dispute system infrastructure incomplete

// Auto-Resolve Disputes (24-hour timer) - REMOVED: migrated to MongoDB but dispute system infrastructure incomplete

// ============ ORDER HISTORY ROUTES ============

// Buyer's Orders
app.get('/orders', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Get user's orders
        const userOrders = await Order.find({ buyerId: req.session.user.id })
            .sort({ createdAt: -1 })
            .populate('sellerId', 'firstName lastName store.name');

        // Get disputes for user's orders
        const userDisputes = await Dispute.find({
            $or: [
                { buyerId: req.session.user.id },
                { sellerId: req.session.user.id }
            ]
        }).populate('orderId');

        res.render('orders', {
            orders: userOrders,
            disputes: userDisputes,
            user: req.session.user
        });
    } catch (error) {
        console.error('Orders error:', error);
        req.flash('error_msg', 'An error occurred loading orders');
        res.redirect('/');
    }
});

// Seller's Orders
app.get('/seller/orders', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/');
        }

        // Get seller's orders from database
        const sellerOrders = await Order.find({ sellerId: userId })
            .sort({ createdAt: -1 })
            .populate('buyerId', 'firstName lastName');

        // Get disputes for seller's orders
        const sellerDisputes = await Dispute.find({
            sellerId: userId,
            status: { $ne: 'auto-closed' }
        }).sort({ openedAt: -1 });

        res.render('seller/orders', {
            orders: sellerOrders,
            disputes: sellerDisputes,
            user: req.session.user
        });
    } catch (error) {
        console.error('Seller orders error:', error);
        req.flash('error_msg', 'An error occurred loading orders');
        res.redirect('/');
    }
});

// Seller Disputes - Updated for MongoDB
app.get('/seller/disputes', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/');
        }

        // Get disputes where user is the seller
        const sellerDisputes = await Dispute.find({
            sellerId: userId,
            status: { $ne: 'auto-closed' } // Don't show auto-closed disputes
        })
        .populate('orderId', 'quantity price totalCost orderDate productId buyerId')
        .populate('buyerId', 'firstName lastName')
        .sort({ openedAt: -1 });

        // Get seller's products to check for reviews
        const sellerProducts = user.store?.items || [];

        // Enrich disputes with review information
        const enrichedDisputes = await Promise.all(
            sellerDisputes.map(async (dispute) => {
                const disputeObj = dispute.toObject();

                // Add order number (use part of orderId as order number)
                disputeObj.orderNumber = dispute.orderId ?
                    dispute.orderId._id.toString().substring(-8).toUpperCase() : 'N/A';

                // Find reviews from the buyer for this product
                const productWithReviews = sellerProducts.find(product =>
                    product.id === disputeObj.orderId?.productId
                );

                if (productWithReviews && productWithReviews.reviews) {
                    // Get reviews from this buyer for this product
                    disputeObj.buyerReviews = productWithReviews.reviews.filter(review =>
                        review.userId === disputeObj.buyerId?._id?.toString()
                    );
                } else {
                    disputeObj.buyerReviews = [];
                }

                return disputeObj;
            })
        );

        // Calculate statistics for the template
        const openDisputes = sellerDisputes.filter(d => d.status === 'open').length;
        const resolvedDisputes = sellerDisputes.filter(d => d.status === 'closed').length;

        // Calculate total refunds from resolved disputes
        const totalRefunds = sellerDisputes
            .filter(d => d.status === 'closed' && d.resolution && d.resolution.type === 'refund')
            .reduce((sum, d) => sum + (d.resolution.amount || 0), 0);

        // Calculate average resolution time (simplified)
        const resolvedDisputesWithTime = sellerDisputes.filter(d =>
            d.status === 'closed' && d.openedAt && d.resolution?.processedAt
        );

        let avgResolutionTime = 'N/A';
        if (resolvedDisputesWithTime.length > 0) {
            const totalHours = resolvedDisputesWithTime.reduce((sum, d) => {
                const opened = new Date(d.openedAt);
                const resolved = new Date(d.resolution.processedAt);
                const hours = (resolved - opened) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            const avgHours = totalHours / resolvedDisputesWithTime.length;
            if (avgHours < 24) {
                avgResolutionTime = `${Math.round(avgHours)}h`;
            } else {
                avgResolutionTime = `${Math.round(avgHours / 24)}d`;
            }
        }

        // Helper function for time remaining
        const getTimeRemaining = (autoCloseAt) => {
            if (!autoCloseAt) return 'N/A';

            const now = new Date();
            const closeAt = new Date(autoCloseAt);
            const diff = closeAt.getTime() - now.getTime();

            if (diff <= 0) return 'Expired';

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            return `${hours}h ${minutes}m`;
        };

        res.render('seller/disputes', {
            disputes: enrichedDisputes,
            orders: sellerDisputes.map(d => d.orderId),
            user: req.session.user,
            // Pass helper functions and data
            getOpenDisputes: () => openDisputes,
            getResolvedDisputes: () => resolvedDisputes,
            getTotalRefunds: () => totalRefunds.toFixed(2),
            getAvgResolutionTime: () => avgResolutionTime,
            getTimeRemaining: getTimeRemaining
        });
    } catch (error) {
        console.error('Seller disputes error:', error);
        req.flash('error_msg', 'An error occurred loading disputes');
        res.redirect('/my-store');
    }
});

// Seller Reviews
app.get('/seller/reviews', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/');
        }

        // Get all products with reviews
        const productsWithReviews = [];
        if (user.store && user.store.items) {
            user.store.items.forEach(product => {
                if (product.reviews && product.reviews.length > 0) {
                    productsWithReviews.push({
                        product: product,
                        reviews: product.reviews
                    });
                }
            });
        }

        res.render('seller/reviews', {
            productsWithReviews: productsWithReviews,
            user: req.session.user
        });
    } catch (error) {
        console.error('Seller reviews error:', error);
        req.flash('error_msg', 'An error occurred loading reviews');
        res.redirect('/');
    }
});

// Seller Product Moderation
app.get('/seller/moderation', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/');
        }

        // Get products pending moderation
        const pendingProducts = user.store?.items?.filter(product => product.moderationStatus === 'pending') || [];

        res.render('seller/moderation', {
            user: req.session.user,
            pendingProducts: pendingProducts
        });
    } catch (error) {
        console.error('Seller moderation error:', error);
        req.flash('error_msg', 'An error occurred loading the moderation page');
        res.redirect('/');
    }
});

// Process Download (Digital Products) - WITH PERSONALIZED FILES AND FORMAT OPTIONS
app.get('/download/:orderId/:productId', isLoggedIn, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const productId = req.params.productId;
        const userId = req.session.user.id;
        const format = req.query.format || 'txt'; // Default to txt

        console.log('Download attempt:', { orderId, productId, userId, format });

        const order = await Order.findOne({
            _id: orderId,
            buyerId: userId,
            productId: productId
        });

        if (!order) {
            console.log('Order not found');
            req.flash('error_msg', 'Order not found or access denied');
            return res.redirect('/orders');
        }

        // Find the seller and product
        const seller = await User.findById(order.sellerId);
        if (!seller || !seller.store || !seller.store.items) {
            console.log('Seller or store not found');
            req.flash('error_msg', 'Product not found');
            return res.redirect('/orders');
        }

        const product = seller.store.items.find(item => item.id === productId);
        if (!product) {
            console.log('Product not found in store');
            req.flash('error_msg', 'Product not found');
            return res.redirect('/orders');
        }

        console.log('Order download info:', {
            downloadReady: order.downloadReady,
            downloadFileName: order.downloadFileName,
            quantity: order.quantity
        });

        // CHECK FOR PERSONALIZED DOWNLOAD FILE FIRST
        if (order.downloadReady && order.downloadFileName) {
            const personalizedFilePath = path.join(__dirname, 'uploads', order.downloadFileName);

            console.log('Checking personalized file:', personalizedFilePath);

            if (fs.existsSync(personalizedFilePath)) {
                console.log('✅ Downloading personalized file:', order.downloadFileName);

                // Read the file content
                const fileContent = fs.readFileSync(personalizedFilePath, 'utf8');

                // Convert based on format
                let downloadContent = fileContent;
                let mimeType = 'text/plain';
                let fileExtension = 'txt';
                let fileName = `your_data_${order.quantity}_items`;

                if (format === 'csv') {
                    // Convert TXT to CSV format - parse account details
                    const lines = fileContent.split('\n');
                    let csvData = [];

                    // Extract account information - handle multiple entries
                    const entries = [];
                    let currentEntry = {};

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('- Email:')) {
                            if (Object.keys(currentEntry).length > 0) {
                                entries.push(currentEntry);
                            }
                            currentEntry = { email: trimmed.replace('- Email:', '').trim() };
                        } else if (trimmed.startsWith('- Password:')) {
                            currentEntry.password = trimmed.replace('- Password:', '').trim();
                        } else if (trimmed.startsWith('- Recovery Email:')) {
                            currentEntry.recoveryEmail = trimmed.replace('- Recovery Email:', '').trim();
                        } else if (trimmed.startsWith('- Phone:')) {
                            currentEntry.phone = trimmed.replace('- Phone:', '').trim();
                        } else if (trimmed.startsWith('- Created:')) {
                            currentEntry.created = trimmed.replace('- Created:', '').trim();
                        } else if (trimmed.startsWith('- Verified:')) {
                            currentEntry.verified = trimmed.replace('- Verified:', '').trim();
                        } else if (trimmed.startsWith('- 2FA Enabled:')) {
                            currentEntry.twoFA = trimmed.replace('- 2FA Enabled:', '').trim();
                        } else if (trimmed.startsWith('- Storage Used:')) {
                            currentEntry.storage = trimmed.replace('- Storage Used:', '').trim();
                        }
                    }

                    // Add the last entry
                    if (Object.keys(currentEntry).length > 0) {
                        entries.push(currentEntry);
                    }

                    // Create CSV with headers
                    csvData.push('Email,Password,Recovery Email,Phone,Created,Verified,2FA Enabled,Storage Used');
                    entries.forEach(entry => {
                        csvData.push(`"${entry.email || ''}","${entry.password || ''}","${entry.recoveryEmail || ''}","${entry.phone || ''}","${entry.created || ''}","${entry.verified || ''}","${entry.twoFA || ''}","${entry.storage || ''}"`);
                    });

                    downloadContent = csvData.join('\n');
                    mimeType = 'text/csv';
                    fileExtension = 'csv';
                }

                // Set headers and send
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`);
                res.send(downloadContent);
                return;
            } else {
                console.warn('⚠️ Personalized file not found, falling back to original files');
            }
        }

        // FALLBACK: Original file handling if no personalized file
        console.log('Product files:', product.files);

        // Check if product has digital files
        if (!product.files || product.files.length === 0) {
            console.log('No digital files available');
            req.flash('error_msg', 'No digital files available for this product. Please contact the seller for assistance.');
            return res.redirect('/orders');
        }

        // Find the data file (prefer .txt files)
        let dataFile = product.files.find(file => file.filename.toLowerCase().endsWith('.txt'));
        if (!dataFile) {
            // If no .txt file, use the first file
            dataFile = product.files[0];
        }

        const filePath = path.join(__dirname, 'uploads', path.basename(dataFile.filepath));

        console.log('Data file download:', { filePath, fileName: dataFile.filename });

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('File does not exist:', filePath);
            req.flash('error_msg', 'File not found. Please contact support.');
            return res.redirect('/orders');
        }

        // Read the file content
        const fullFileContent = fs.readFileSync(filePath, 'utf8');
        const allLines = fullFileContent.split('\n').filter(line => line.trim().length > 0);

        console.log(`📊 Original file has ${allLines.length} entries, order quantity: ${order.quantity}`);

        // TAKE ONLY THE PURCHASED QUANTITY - first N lines
        const purchasedLines = allLines.slice(0, order.quantity);
        const fileContent = purchasedLines.join('\n');

        console.log(`✅ Providing ${purchasedLines.length} entries for download`);

        // Convert based on format
        let downloadContent = fileContent;
        let mimeType = 'text/plain';
        let fileExtension = 'txt';
        let fileName = `your_data_${order.quantity}_items`;

        if (format === 'csv') {
            // Convert TXT to CSV format - handle multiple accounts
            const lines = fileContent.split('\n');
            let csvData = [];

            // Create CSV with headers
            csvData.push('Email,Password,Recovery Email,Phone,Created,Verified,2FA Enabled,Storage Used');

            // Parse each account block (assuming accounts are separated by empty lines or structured format)
            let currentAccount = {};
            let accountCount = 0;

            for (const line of lines) {
                const trimmed = line.trim();

                if (trimmed.startsWith('- Email:')) {
                    // Save previous account if exists
                    if (Object.keys(currentAccount).length > 0) {
                        csvData.push(`"${currentAccount.email || ''}","${currentAccount.password || ''}","${currentAccount.recoveryEmail || ''}","${currentAccount.phone || ''}","${currentAccount.created || ''}","${currentAccount.verified || ''}","${currentAccount.twoFA || ''}","${currentAccount.storage || ''}"`);
                        accountCount++;
                    }
                    // Start new account
                    currentAccount = { email: trimmed.replace('- Email:', '').trim() };
                } else if (trimmed.startsWith('- Password:')) {
                    currentAccount.password = trimmed.replace('- Password:', '').trim();
                } else if (trimmed.startsWith('- Recovery Email:')) {
                    currentAccount.recoveryEmail = trimmed.replace('- Recovery Email:', '').trim();
                } else if (trimmed.startsWith('- Phone:')) {
                    currentAccount.phone = trimmed.replace('- Phone:', '').trim();
                } else if (trimmed.startsWith('- Created:')) {
                    currentAccount.created = trimmed.replace('- Created:', '').trim();
                } else if (trimmed.startsWith('- Verified:')) {
                    currentAccount.verified = trimmed.replace('- Verified:', '').trim();
                } else if (trimmed.startsWith('- 2FA Enabled:')) {
                    currentAccount.twoFA = trimmed.replace('- 2FA Enabled:', '').trim();
                } else if (trimmed.startsWith('- Storage Used:')) {
                    currentAccount.storage = trimmed.replace('- Storage Used:', '').trim();
                }
            }

            // Add the last account
            if (Object.keys(currentAccount).length > 0) {
                csvData.push(`"${currentAccount.email || ''}","${currentAccount.password || ''}","${currentAccount.recoveryEmail || ''}","${currentAccount.phone || ''}","${currentAccount.created || ''}","${currentAccount.verified || ''}","${currentAccount.twoFA || ''}","${currentAccount.storage || ''}"`);
                accountCount++;
            }

            console.log(`📊 CSV conversion: ${accountCount} accounts processed`);

            downloadContent = csvData.join('\n');
            mimeType = 'text/csv';
            fileExtension = 'csv';
        }

        // Set headers and send
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`);
        res.send(downloadContent);

    } catch (error) {
        console.error('Download error:', error);
        req.flash('error_msg', 'An error occurred processing the download. Please contact support.');
        res.redirect('/orders');
    }
});

// ============ REVIEWS SYSTEM ============

// Submit Review
app.post('/review/:productId/submit', isLoggedIn, async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.session.user.id;
        const { rating, comment } = req.body;

        // Find the seller and product
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/stores');
        }

        // Find seller with the product
        const sellerWithProduct = await User.findOne({
            'store.items.id': productId,
            isSeller: true
        });

        if (!sellerWithProduct || !sellerWithProduct.store) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/stores');
        }

        const product = sellerWithProduct.store.items.find(item => item.id === productId);
        if (!product) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/stores');
        }

        // Check if user has purchased this product
        const hasPurchased = await Order.findOne({
            buyerId: userId,
            productId: productId,
            sellerId: sellerWithProduct._id
        });

        if (!hasPurchased) {
            req.flash('error_msg', 'You can only review products you have purchased');
            return res.redirect(`/product/${sellerWithProduct._id}/${productId}`);
        }

        const newReview = {
            id: `review_${Date.now()}`,
            userId: userId,
            userName: `${user.firstName} ${user.lastName}`,
            productId: productId,
            rating: parseInt(rating),
            comment: comment.trim(),
            date: new Date()
        };

        // Add review to product
        if (!product.reviews) product.reviews = [];
        product.reviews.push(newReview);

        // Save the updated seller data
        await sellerWithProduct.save();

        req.flash('success_msg', 'Review submitted successfully!');
        res.redirect(`/product/${sellerWithProduct._id}/${productId}`);
    } catch (error) {
        console.error('Review submission error:', error);
        req.flash('error_msg', 'An error occurred submitting your review. Please try again.');
        res.redirect('/stores');
    }
});

// ============ WITHDRAWAL SYSTEM ============

// Seller Balance & Withdrawals Page
app.get('/seller/balance', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/');
        }

        // Get seller's withdrawal requests from database
        const sellerWithdrawals = await WithdrawalRequest.find({
            sellerId: user._id
        }).sort({ requestedAt: -1 });

        res.render('seller/balance', {
            user: req.session.user,
            seller: user,
            balance: user.balance || 0,
            withdrawals: sellerWithdrawals
        });
    } catch (error) {
        console.error('Seller balance error:', error);
        req.flash('error_msg', 'An error occurred loading your balance');
        res.redirect('/');
    }
});

// Request Withdrawal
app.post('/seller/withdrawal', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const { amount, cryptoWalletAddress, blockchain } = req.body;

        if (!user || !user.isSeller) {
            req.flash('error_msg', 'Access denied - you must be a seller');
            return res.redirect('/seller/balance');
        }

        const withdrawalAmount = parseFloat(amount);
        const currentBalance = user.balance || 0;

        if (withdrawalAmount <= 0) {
            req.flash('error_msg', 'Invalid withdrawal amount');
            return res.redirect('/seller/balance');
        }

        if (withdrawalAmount > currentBalance) {
            req.flash('error_msg', 'Insufficient balance');
            return res.redirect('/seller/balance');
        }

        if (!cryptoWalletAddress || cryptoWalletAddress.trim() === '') {
            req.flash('error_msg', 'Crypto wallet address is required');
            return res.redirect('/seller/balance');
        }

        // Validate blockchain selection
        const validBlockchains = ['BTC', 'ETH', 'USDT_TR20', 'USDT_ERC20', 'USDT_TRC20', 'BNB', 'ADA', 'SOL', 'DOGE', 'USDT_BEP20'];
        if (!blockchain || !validBlockchains.includes(blockchain)) {
            req.flash('error_msg', 'Please select a valid blockchain');
            return res.redirect('/seller/balance');
        }

        // Calculate withdrawal fee and net amount
        const withdrawalFee = calculateWithdrawalFee(withdrawalAmount, blockchain);
        const netAmount = getNetWithdrawalAmount(withdrawalAmount, blockchain);

        // Convert RUB to crypto amount
        const cryptoAmount = rubToCrypto(netAmount, blockchain);

        // Create withdrawal request in database
        const newWithdrawal = new WithdrawalRequest({
            sellerId: user._id,
            amount: withdrawalAmount, // RUB amount
            netAmount: netAmount, // RUB amount after fee
            cryptoAmount: cryptoAmount, // Crypto amount to send
            fee: withdrawalFee, // Fee in RUB
            cryptoWalletAddress: cryptoWalletAddress.trim(),
            blockchain: blockchain,
            status: 'pending',
            requestedAt: new Date()
        });

        await newWithdrawal.save();

        // Deduct from balance (hold)
        user.balance -= withdrawalAmount;
        await user.save();

        req.flash('success_msg', 'Withdrawal request submitted! It will be processed once approved by admin.');
        res.redirect('/seller/balance');
    } catch (error) {
        console.error('Withdrawal request error:', error);
        req.flash('error_msg', 'An error occurred submitting your withdrawal request');
        res.redirect('/seller/balance');
    }
});

app.get('/admin/withdrawals', isAdminLoggedIn, async (req, res) => {
    try {
        const withdrawalRequests = await WithdrawalRequest.find({})
            .populate('sellerId', 'firstName lastName email')
            .sort({ requestedAt: -1 });

        res.render('admin/withdrawals', {
            withdrawalRequests: withdrawalRequests,
            adminUser: req.session.adminUser
        });
    } catch (error) {
        console.error('Admin withdrawals error:', error);
        req.flash('error_msg', 'An error occurred loading withdrawal requests');
        res.redirect('/admin/sellers');
    }
});

app.post('/admin/withdrawal/:withdrawalId/:action', isAdminLoggedIn, async (req, res) => {
    try {
        const withdrawalId = req.params.withdrawalId;
        const action = req.params.action;

        const withdrawal = await WithdrawalRequest.findById(withdrawalId);
        if (!withdrawal) {
            req.flash('error_msg', 'Withdrawal request not found');
            return res.redirect('/admin/withdrawals');
        }

        if (action === 'approve') {
            withdrawal.status = 'approved';
            withdrawal.processedAt = new Date();
            withdrawal.transactionId = `TXN_${Date.now()}`;

            // In real implementation, you would integrate with crypto payment gateway

            req.flash('success_msg', 'Withdrawal approved and processed!');
        } else if (action === 'reject') {
            withdrawal.status = 'rejected';
            withdrawal.processedAt = new Date();

            // Refund to seller balance
            const seller = await User.findById(withdrawal.sellerId);
            if (seller) {
                seller.balance += withdrawal.amount;
                await seller.save();
            }

            req.flash('error_msg', 'Withdrawal rejected and funds refunded to seller.');
        }

        await withdrawal.save();
        res.redirect('/admin/withdrawals');
    } catch (error) {
        console.error('Admin withdrawal processing error:', error);
        req.flash('error_msg', 'An error occurred processing the withdrawal');
        res.redirect('/admin/withdrawals');
    }
});

// ==================== PRODUCT MODERATION SYSTEM ====================

// Admin Moderate Products (Approve/Reject)
app.post('/admin/product/:sellerId/:productId/:action', isAdminLoggedIn, async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const productId = req.params.productId;
        const action = req.params.action;

        // Find seller using MongoDB
        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Seller or store not found');
            return res.redirect('/admin/moderation');
        }

        // Find product in seller's store
        const product = seller.store.items.find(item => item.id === productId);
        if (!product) {
            req.flash('error_msg', 'Product not found');
            return res.redirect('/admin/moderation');
        }

        if (action === 'approve') {
            product.moderationStatus = 'approved';
            product.status = 'active';
            console.log(`✅ Product "${product.name}" approved and made active`);

            req.flash('success_msg', `Product "${product.name}" has been approved and is now active!`);
        } else if (action === 'reject') {
            product.moderationStatus = 'rejected';
            product.status = 'inactive';

            // Add rejection reason if provided
            if (req.body.reason) {
                product.rejectionReason = req.body.reason;
            }

            console.log(`❌ Product "${product.name}" rejected and made inactive`);
            req.flash('error_msg', `Product "${product.name}" has been rejected and made inactive.`);
        }

        // Save the updated seller data
        await seller.save();

        res.redirect('/admin/moderation');
    } catch (error) {
        console.error('Admin product action error:', error);
        req.flash('error_msg', 'An error occurred processing the product');
        res.redirect('/admin/moderation');
    }
});

// Admin Moderation Dashboard
app.get('/admin/moderation', isAdminLoggedIn, async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            req.flash('error_msg', 'Database connection unavailable. Product moderation is temporarily offline.');
            return res.redirect('/');
        }

        // Find all sellers with stores
        const sellers = await User.find({
            isSeller: true,
            'store.name': { $exists: true, $ne: null }
        }).select('firstName lastName store');

        // Filter products pending moderation in JavaScript to avoid MongoDB projection errors
        const pendingProducts = [];
        sellers.forEach(seller => {
            if (seller.store && seller.store.items) {
                seller.store.items.forEach(product => {
                    if (product.moderationStatus === 'pending') {
                        pendingProducts.push({
                            ...product.toObject ? product.toObject() : product,
                            sellerId: seller._id.toString(),
                            sellerName: `${seller.firstName} ${seller.lastName}`,
                            seller: seller
                        });
                    }
                });
            }
        });

        res.render('admin/moderation', {
            pendingProducts: pendingProducts,
            adminUser: req.session.adminUser
        });
    } catch (error) {
        console.error('Admin moderation error:', error);
        req.flash('error_msg', 'An error occurred loading the moderation page');
        res.redirect('/admin/login');
    }
});

// ============ FILE VALIDATION AND QUANTITY MANAGEMENT ROUTES ============

// Route to validate file and show quantity information
app.post('/seller/validate-file/:productId', [
    isLoggedIn,
    upload.single('uploadFile')
], async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user || !user.isSeller || !user.store) {
            req.flash('error_msg', 'Access denied.');
            return res.redirect('/my-store');
        }

        const productId = req.params.productId;
        const product = user.store.items.find(item => item.id === productId);

        if (!product) {
            req.flash('error_msg', 'Product not found.');
            return res.redirect('/my-store');
        }

        if (!req.file) {
            req.flash('error_msg', 'No file uploaded for validation.');
            return res.redirect(`/seller/upload-files/${productId}`);
        }

        // Validate the file and count entries
        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const validationResult = await validateAndCountFile(filePath, req.file.filename);

        // Add validation information to product
        if (!product.fileValidation) {
            product.fileValidation = [];
        }

        product.fileValidation.push({
            filename: req.file.originalname,
            filepath: req.file.filename,
            totalQuantity: validationResult.totalCount,
            validatedAt: new Date(),
            isValid: true,
            sampleData: validationResult.data.slice(0, 5) // Store first 5 rows as sample
        });

        // Update product's available quantity
        product.availableQuantity = validationResult.totalCount;
        product.isQuantityValidated = true;

        await user.save();

        req.flash('success_msg', `File validated successfully! Found ${validationResult.totalCount} valid entries.`);
        res.redirect(`/seller/upload-files/${productId}`);
    } catch (error) {
        console.error('File validation error:', error);
        req.flash('error_msg', 'Failed to validate file. Please try again.');
        res.redirect('/my-store');
    }
});

// Enhanced purchase route with quantity selection and file splitting
app.post('/buy-with-quantity/:sellerId/:productId', [
    isLoggedIn,
    upload.none() // Allow form data without file uploads
], async (req, res) => {
    try {
        const sellerId = req.params.sellerId;
        const productId = req.params.productId;
        const quantity = parseInt(req.body.quantity) || 1;

        if (quantity <= 0) {
            req.flash('error_msg', 'Invalid quantity selected.');
            return res.redirect(`/store/${sellerId}`);
        }

        const seller = await User.findById(sellerId);
        if (!seller || !seller.isSeller || !seller.store) {
            req.flash('error_msg', 'Store not found');
            return res.redirect('/stores');
        }

        const product = seller.store.items.find(item => item.id === productId && item.status === 'active');
        if (!product) {
            req.flash('error_msg', 'Product not found or unavailable');
            return res.redirect(`/store/${sellerId}`);
        }

        const user = await User.findById(req.session.user.id);
        const totalCost = product.price * quantity;

        // Verify available quantity
        const availableQuantity = product.availableQuantity || product.fileValidation?.[0]?.totalQuantity || 0;
        if (availableQuantity < quantity) {
            req.flash('error_msg', `Insufficient quantity available. Only ${availableQuantity} items remaining.`);
            return res.redirect(`/product/${sellerId}/${productId}`);
        }

        // Additional check: ensure we have enough data in files
        if (product.files && product.files.length > 0) {
            const mainFile = product.files[0];
            const mainFilePath = path.join(__dirname, 'uploads', path.basename(mainFile.filepath));

            if (fs.existsSync(mainFilePath)) {
                const fileContent = fs.readFileSync(mainFilePath, 'utf8');
                const availableLines = fileContent.split('\n').filter(line => line.trim().length > 0);

                if (availableLines.length < quantity) {
                    req.flash('error_msg', `Not enough data available in file. Only ${availableLines.length} entries remaining.`);
                    return res.redirect(`/product/${sellerId}/${productId}`);
                }
            }
        }

        // Check user balance
        if ((user.balance || 0) < totalCost) {
            req.flash('error_msg', 'Insufficient balance. Please top up your account.');
            return res.redirect(`/store/${sellerId}`);
        }

        // Process purchase
        user.balance = (user.balance || 0) - totalCost;
        seller.balance = (seller.balance || 0) + totalCost;

        // Update available quantity
        product.availableQuantity = availableQuantity - quantity;
        product.soldCount = (product.soldCount || 0) + quantity;

        // Create order with quantity tracking
        const newOrder = new Order({
            buyerId: user._id,
            sellerId: seller._id,
            productId: productId,
            productName: product.name,
            quantity: quantity,
            price: product.price,
            totalCost: totalCost,
            status: 'completed',
            orderDate: new Date(),
            isDigital: true,
            quantityPurchased: quantity,
            fileSplitCreated: false // Will be updated when file is split
        });

        await newOrder.save();

        // Update session balance
        req.session.user.balance = user.balance;

        // Save seller data with quantity updates
        await seller.save();

        req.flash('success_msg', `Successfully purchased ${quantity}x ${product.name} for $${totalCost.toFixed(2)}! Your files will be ready for download.`);
        res.redirect(`/orders`);
    } catch (error) {
        console.error('Purchase with quantity error:', error);
        req.flash('error_msg', 'An error occurred during purchase. Please try again.');
        res.redirect('/stores');
    }
});

// Enhanced download route with quantity-based file splitting
app.get('/download-quantity/:orderId/:productId', isLoggedIn, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const productId = req.params.productId;
        const userId = req.session.user.id;

        console.log('Quantity-based download attempt:', { orderId, productId, userId });

        const order = await Order.findOne({
            _id: orderId,
            buyerId: userId,
            productId: productId
        });

        if (!order) {
            console.log('Order not found');
            req.flash('error_msg', 'Order not found or access denied');
            return res.redirect('/orders');
        }

        // Find the seller and product
        const seller = await User.findById(order.sellerId);
        if (!seller || !seller.store || !seller.store.items) {
            console.log('Seller or store not found');
            req.flash('error_msg', 'Product not found');
            return res.redirect('/orders');
        }

        const product = seller.store.items.find(item => item.id === productId);
        if (!product) {
            console.log('Product not found in store');
            req.flash('error_msg', 'Product not found');
            return res.redirect('/orders');
        }

        console.log('Product files:', product.files);
        console.log('Order quantity:', order.quantity);

        // Check if product has digital files
        if (!product.files || product.files.length === 0) {
            console.log('No digital files available');
            req.flash('error_msg', 'No digital files available for this product. Please contact the seller for assistance.');
            return res.redirect('/orders');
        }

        // Get the main product file (assume first file is the data file)
        const mainFile = product.files[0];
        const mainFilePath = path.join(__dirname, 'uploads', path.basename(mainFile.filepath));

        if (!fs.existsSync(mainFilePath)) {
            console.error('Main file does not exist:', mainFilePath);
            req.flash('error_msg', 'Main product file not found. Please contact support.');
            return res.redirect('/orders');
        }

        // Check if quantity split has already been created
        let buyerFilePath = null;
        let buyerFileName = null;

        // First, check if this specific quantity has been split before
        const quantitySplitFileName = `${mainFile.filename.replace('.xlsx', '')}_${order.quantity}_${orderId}.xlsx`;
        const potentialSplitPath = path.join(path.dirname(mainFilePath), quantitySplitFileName);

        if (fs.existsSync(potentialSplitPath)) {
            console.log('Using existing split file:', potentialSplitPath);
            buyerFilePath = potentialSplitPath;
            buyerFileName = quantitySplitFileName;
        } else {
            // Need to create split file
            console.log('Creating new split file for quantity:', order.quantity);

            try {
                const validationResult = await validateAndCountFile(mainFilePath, mainFile.filename);
                console.log('File validation result:', validationResult.totalCount, 'entries');

                if (validationResult.totalCount < order.quantity) {
                    req.flash('error_msg', `Insufficient data available. File contains ${validationResult.totalCount} entries but order requires ${order.quantity}.`);
                    return res.redirect('/orders');
                }

                // Split the data
                const splitResult = await splitData(validationResult.data, order.quantity);
                console.log('Data split result:', splitResult.forBuyer.length, 'entries for buyer');

                // Create the split file
                const createdFileName = await writeSplitDataToFile(
                    splitResult.forBuyer,
                    mainFilePath,
                    mainFile.filename,
                    quantitySplitFileName,
                    order.quantity
                );

                console.log('Created split file:', createdFileName);
                buyerFilePath = path.join(path.dirname(mainFilePath), createdFileName);
                buyerFileName = createdFileName;

                // Update original file to remove the split data
                if (splitResult.remaining.length > 0) {
                    const remainingFileName = `remaining_${mainFile.filename}`;
                    await writeSplitDataToFile(
                        splitResult.remaining,
                        mainFilePath,
                        mainFile.filename,
                        remainingFileName,
                        splitResult.remaining.length
                    );

                    // Update product's available quantity
                    product.availableQuantity = splitResult.remaining.length;
                    await seller.save();
                }

                // Mark order as split-created
                order.fileSplitCreated = true;
                await order.save();

            } catch (splitError) {
                console.error('Error splitting file:', splitError);
                req.flash('error_msg', 'Failed to prepare the portion of your data. Please contact support.');
                return res.redirect('/orders');
            }
        }

        // Download the file
        if (buyerFilePath && fs.existsSync(buyerFilePath)) {
            console.log('Downloading split file:', buyerFilePath);
            res.download(buyerFilePath, buyerFileName, (err) => {
                if (err) {
                    console.error('Split file download error:', err);
                    req.flash('error_msg', 'Download failed. Please try again or contact support.');
                    res.redirect('/orders');
                } else {
                    console.log('Split file download successful');
                }
            });
        } else {
            console.error('Split file not found for download');
            req.flash('error_msg', 'Your requested data portion is not available yet. Please try again later.');
            res.redirect('/orders');
        }

    } catch (error) {
        console.error('Quantity-based download error:', error);
        req.flash('error_msg', 'An error occurred processing the download. Please contact support.');
        res.redirect('/orders');
    }
});

// Download all orders details as PDF
app.get('/download-all-orders', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Get user's orders with seller details
        const userOrders = await Order.find({ buyerId: userId })
            .sort({ createdAt: -1 })
            .populate('sellerId', 'firstName lastName store.name');

        if (!userOrders || userOrders.length === 0) {
            req.flash('error_msg', 'No orders found to download');
            return res.redirect('/orders');
        }

        // Generate CSV content
        let csvContent = 'Order ID,Date,Product Name,Quantity,Unit Price,Total Cost,Status,Seller Name\n';

        userOrders.forEach(order => {
            const orderDate = new Date(order.orderDate).toLocaleDateString();
            const sellerName = order.sellerId ?
                `${order.sellerId.firstName} ${order.sellerId.lastName}` :
                'Unknown Seller';

            csvContent += `"${order._id}","${orderDate}","${order.productName}","${order.quantity}","₽${order.price.toFixed(2)}","₽${order.totalCost.toFixed(2)}","${order.status}","${sellerName}"\n`;
        });

        // Set headers for CSV download
        const fileName = `my_orders_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        res.send(csvContent);

    } catch (error) {
        console.error('Download all orders error:', error);
        req.flash('error_msg', 'An error occurred generating the download');
        res.redirect('/orders');
    }
});

// Add download button to user menu - redirect to orders page
app.get('/user/downloads', isLoggedIn, (req, res) => {
    res.redirect('/orders');
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`💬 Chat functionality enabled`);
});

module.exports = app;
