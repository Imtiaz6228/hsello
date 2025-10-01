# VPS Deployment Guide for DigitalMarket

This guide will help you deploy the DigitalMarket application on a VPS server and fix common signup/login issues.

## 🚀 Quick Fix for Authentication Issues

### 1. Update Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your VPS-specific settings:

```env
# Database (Choose one option)
MONGODB_URI=mongodb://localhost:27017/digitalmarket
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/digitalmarket

# Server Configuration
PORT=3001
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-change-this
BASE_URL=http://your-vps-ip:3001

# Email Configuration (Required for signup)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Disable email verification for testing
REQUIRE_EMAIL_VERIFICATION=false
```

### 2. Install Dependencies

```bash
cd hsello
npm install
```

### 3. Setup MongoDB

#### Option A: MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Add to `MONGODB_URI` in `.env`

#### Option B: Local MongoDB on VPS
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb

# CentOS/RHEL
sudo yum install -y mongodb-server
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 4. Configure Email Service

#### Gmail Setup:
1. Enable 2-factor authentication
2. Generate app password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use app password in `EMAIL_PASS`

### 5. Ensure Localization Files are Deployed

**Important**: Make sure the `locales/` directory is included in your deployment. This directory contains translation files for multiple languages.

```bash
# Check if locales directory exists
ls -la locales/

# If missing, copy from your local development
# scp -r ./locales user@vps:/var/www/hsello/
```

### 6. Start Application

```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Common Issues & Solutions

### Issue 1: "Database connection unavailable"

**Cause**: MongoDB not running or connection string incorrect

**Solutions**:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection string in .env
# Ensure MONGODB_URI is correct
```

### Issue 2: "Email verification failed"

**Cause**: Email service not configured

**Solutions**:
1. **Quick Fix**: Disable email verification
   ```env
   REQUIRE_EMAIL_VERIFICATION=false
   ```

2. **Proper Fix**: Configure email service
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### Issue 3: "User already exists" but can't login

**Cause**: User created but email not verified

**Solutions**:
1. Check database for user:
   ```bash
   mongo digitalmarket
   db.users.find({email: "user@example.com"})
   ```

2. Manually verify user:
   ```bash
   db.users.updateOne(
     {email: "user@example.com"}, 
     {$set: {isEmailVerified: true}}
   )
   ```

### Issue 4: Application crashes on startup

**Cause**: Missing dependencies or configuration

**Solutions**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check logs
npm start 2>&1 | tee app.log
```

### Issue 5: Multiple languages not working

**Cause**: Translation files not deployed or inaccessible

**Solutions**:
```bash
# Check if locales directory exists
ls -la locales/

# Check file permissions
ls -la locales/*/

# Check if translation files are valid JSON
node -e "JSON.parse(require('fs').readFileSync('locales/en/translation.json'))"
node -e "JSON.parse(require('fs').readFileSync('locales/ru/translation.json'))"

# Test language switching
curl http://localhost:3001/lang/ru
```

**Common causes**:
- `locales/` directory not uploaded to VPS
- File permissions don't allow reading
- Translation files corrupted during upload
- Case sensitivity issues (Linux is case-sensitive)

## 🌐 VPS-Specific Configuration

### 1. Firewall Configuration

```bash
# Allow application port
sudo ufw allow 3001

# Allow MongoDB port (if using local MongoDB)
sudo ufw allow 27017
```

### 2. Process Management with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js --name "digitalmarket"

# Auto-restart on boot
pm2 startup
pm2 save
```

### 3. Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing Authentication

### 1. Test Database Connection

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err.message));
"
```

### 2. Test Email Service

```bash
node -e "
const { testEmailConnection } = require('./utils/emailService');
require('dotenv').config();
testEmailConnection()
  .then(result => console.log('Email test:', result))
  .catch(err => console.error('Email error:', err));
"
```

### 3. Create Test User

```bash
node -e "
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const testUser = new User({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'password123',
    isEmailVerified: true
  });
  await testUser.save();
  console.log('✅ Test user created');
  process.exit(0);
}).catch(console.error);
"
```

## 📋 Deployment Checklist

- [ ] MongoDB installed and running
- [ ] `.env` file configured with correct values
- [ ] Email service configured (or disabled)
- [ ] Dependencies installed (`npm install`)
- [ ] `locales/` directory deployed with translation files
- [ ] Firewall configured
- [ ] Application starts without errors
- [ ] Can access application in browser
- [ ] Signup works (creates user)
- [ ] Login works (authenticates user)
- [ ] Email verification works (if enabled)
- [ ] Multiple languages work (`/lang/ru` should switch to Russian)

## 🆘 Emergency Fixes

### Reset All Users Email Verification

```bash
mongo digitalmarket
db.users.updateMany({}, {$set: {isEmailVerified: true}})
```

### Clear All Sessions

```bash
# If using file-based sessions
rm -rf sessions/

# If using MongoDB sessions
mongo digitalmarket
db.sessions.deleteMany({})
```

### Check Application Logs

```bash
# If using PM2
pm2 logs digitalmarket

# If running directly
tail -f app.log
```

## 📞 Support

If you're still experiencing issues:

1. Check the application logs for specific error messages
2. Verify all environment variables are set correctly
3. Test database and email connections separately
4. Try creating a user manually in the database
5. Contact support with specific error messages and logs

## 🔐 Security Notes

- Change `SESSION_SECRET` to a strong, unique value
- Use strong passwords for database users
- Enable firewall and close unnecessary ports
- Keep dependencies updated
- Use HTTPS in production (with SSL certificate)
- Regularly backup your database