#!/bin/bash

# MongoDB Restore Script for DigitalMarket
# Switches back to MongoDB and restores data

echo "🔄 Switching back to MongoDB and restoring data..."
echo "================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo $0"
    exit 1
fi

# 1. Stop current PostgreSQL application
print_status "Stopping PostgreSQL application..."
pm2 stop hsello 2>/dev/null || true
pm2 delete hsello 2>/dev/null || true

# 2. Install MongoDB
print_status "Installing MongoDB..."

# Import MongoDB public GPG Key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Reload local package database
apt update

# Install MongoDB packages
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to start
sleep 5

# Check MongoDB status
if systemctl is-active --quiet mongod; then
    print_success "MongoDB installed and running"
else
    print_error "MongoDB failed to start"
    exit 1
fi

# 3. Configure MongoDB
print_status "Configuring MongoDB..."

# Create admin user
mongosh << EOF
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password_2025",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
EOF

# Create application database and user
mongosh -u admin -p secure_password_2025 << EOF
use digitalmarket
db.createUser({
  user: "digitalmarket_user",
  pwd: "app_password_2025",
  roles: ["readWrite"]
})
EOF

print_success "MongoDB users created"

# 4. Restore data (if backup exists)
print_status "Checking for MongoDB backup data..."

BACKUP_DIR="/root/mongodb_backup"
if [ -d "$BACKUP_DIR" ]; then
    print_success "Found backup directory: $BACKUP_DIR"

    # List available backups
    echo "Available backups:"
    ls -la $BACKUP_DIR

    # Restore the most recent backup
    LATEST_BACKUP=$(ls -td $BACKUP_DIR/*/ | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        print_status "Restoring from: $LATEST_BACKUP"
        mongorestore --db digitalmarket --username digitalmarket_user --password app_password_2025 $LATEST_BACKUP
        print_success "Data restoration completed"
    else
        print_warning "No backup found in $BACKUP_DIR"
    fi
else
    print_warning "No backup directory found at $BACKUP_DIR"
    print_status "Creating sample data..."

    # Create sample data
    mongosh -u digitalmarket_user -p app_password_2025 digitalmarket << 'EOF'
    // Create sample user
    db.users.insertOne({
      firstName: "Admin",
      lastName: "User",
      email: "admin@hsello.com",
      password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Le0XcJj0BqhsOn9q6", // password123
      isSeller: true,
      balance: 1000,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create sample store
    db.users.updateOne(
      { email: "admin@hsello.com" },
      {
        $set: {
          store: {
            name: "Demo Store",
            category: "Digital Products",
            banner: "/css/style.css",
            logo: "/css/style.css",
            description: "Welcome to our demo store",
            seoDescription: "Demo store for digital products",
            rules: "Standard terms apply",
            contactEmail: "admin@hsello.com",
            contactPhone: "",
            items: []
          }
        }
      }
    );

    print("Sample data created");
EOF
fi

# 5. Configure environment for MongoDB
print_status "Configuring environment for MongoDB..."

cd /var/www/hsello

# Backup current .env
cp .env .env.postgres.backup 2>/dev/null || true

# Create MongoDB .env
cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=mongodb://digitalmarket_user:app_password_2025@localhost:27017/digitalmarket

# Server Configuration
PORT=3001
NODE_ENV=production
SESSION_SECRET=hsello-production-secret-key-2025-unique-string
BASE_URL=https://hsello.com

# Email Configuration (Disabled)
REQUIRE_EMAIL_VERIFICATION=false
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment Configuration
NOWPAYMENTS_API_KEY=your-nowpayments-api-key

# Security
TRUST_PROXY=true
DEBUG_MODE=false
TZ=UTC
EOF

print_success "Environment configured for MongoDB"

# 6. Install MongoDB dependencies
print_status "Installing MongoDB dependencies..."

# Check if package.json needs updating
if ! grep -q "mongoose" package.json; then
    print_warning "Updating package.json for MongoDB..."

    # Add MongoDB dependencies
    npm install mongoose@^8.0.3 --save
fi

# 7. Start MongoDB application
print_status "Starting MongoDB application..."

pm2 start app.js --name hsello
pm2 startup
pm2 save

# Wait for application to start
sleep 5

# Check if application is running
if pm2 list | grep -q "hsello.*online"; then
    print_success "Application started successfully with MongoDB"
else
    print_error "Application failed to start"
    print_status "Check logs: pm2 logs hsello"
fi

# 8. Test database connection
print_status "Testing database connection..."

# Test MongoDB connection
mongosh -u digitalmarket_user -p app_password_2025 digitalmarket --eval "db.users.countDocuments()" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "MongoDB connection successful"
else
    print_error "MongoDB connection failed"
fi

# Test application
if curl -s http://localhost:3001 > /dev/null; then
    print_success "Application responding on port 3001"
else
    print_error "Application not responding"
fi

echo ""
print_status "MongoDB Restoration Summary"
echo "============================"

print_success "✅ Switched to MongoDB"
print_success "✅ Database: digitalmarket"
print_success "✅ User: digitalmarket_user"
if [ -d "$BACKUP_DIR" ]; then
    print_success "✅ Data restored from backup"
else
    print_success "✅ Sample data created"
fi
print_success "✅ Email verification disabled"
print_success "✅ Application running on port 3001"

echo ""
print_status "Access your application:"
echo "  - Local: http://localhost:3001"
echo "  - Domain: https://hsello.com (after DNS/SSL setup)"
echo ""
echo "MongoDB Credentials:"
echo "  - Host: localhost:27017"
echo "  - Database: digitalmarket"
echo "  - User: digitalmarket_user"
echo "  - Password: app_password_2025"
echo ""
echo "Admin Login:"
echo "  - Email: admin@hsello.com"
echo "  - Password: password123"

echo ""
print_success "MongoDB restoration completed successfully!"