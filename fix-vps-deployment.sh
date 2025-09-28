#!/bin/bash

# VPS Deployment Fix Script for hsello.com
# Run this script to diagnose and fix common VPS deployment issues

echo "🔧 VPS Deployment Fix Script for hsello.com"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo $0"
    exit 1
fi

print_status "Starting VPS deployment diagnostics and fixes..."

# 1. Check system resources
print_status "Checking system resources..."
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h
echo ""

# 2. Check if required services are installed
print_status "Checking required services..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found! Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not found!"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    print_success "PostgreSQL installed: $PG_VERSION"
else
    print_error "PostgreSQL not found! Installing..."
    apt install -y postgresql postgresql-contrib
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 installed: $PM2_VERSION"
else
    print_error "PM2 not found! Installing..."
    npm install -g pm2
fi

# Check Nginx
if command -v nginx &> /dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1)
    print_success "Nginx installed: $NGINX_VERSION"
else
    print_error "Nginx not found! Installing..."
    apt install -y nginx
fi

echo ""

# 3. Check service status
print_status "Checking service status..."

# PostgreSQL status
if systemctl is-active --quiet postgresql; then
    print_success "PostgreSQL is running"
else
    print_warning "PostgreSQL is not running. Starting..."
    systemctl start postgresql
    systemctl enable postgresql
fi

# Nginx status
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_warning "Nginx is not running. Starting..."
    systemctl start nginx
    systemctl enable nginx
fi

echo ""

# 4. Check application directory
print_status "Checking application directory..."

if [ -d "/var/www/hsello" ]; then
    print_success "Application directory exists: /var/www/hsello"

    # Check key files
    if [ -f "/var/www/hsello/package.json" ]; then
        print_success "package.json found"
    else
        print_error "package.json missing!"
    fi

    if [ -f "/var/www/hsello/app-postgres.js" ]; then
        print_success "app-postgres.js found"
    else
        print_error "app-postgres.js missing!"
    fi

    if [ -d "/var/www/hsello/prisma" ]; then
        print_success "Prisma directory found"
        if [ -f "/var/www/hsello/prisma/schema.prisma" ]; then
            print_success "schema.prisma found"
        else
            print_error "schema.prisma missing!"
        fi
    else
        print_error "Prisma directory missing!"
    fi

    if [ -d "/var/www/hsello/node_modules" ]; then
        print_success "node_modules directory exists"
    else
        print_warning "node_modules missing. Installing dependencies..."
        cd /var/www/hsello
        npm install
    fi

else
    print_error "Application directory /var/www/hsello does not exist!"
    print_status "Please upload your application files first:"
    echo "  scp -r hsello root@168.231.125.1:/var/www/"
    exit 1
fi

echo ""

# 5. Check database connectivity
print_status "Checking database connectivity..."

cd /var/www/hsello

# Check if .env exists
if [ -f ".env" ]; then
    print_success ".env file exists"
    # Check DATABASE_URL
    if grep -q "DATABASE_URL" .env; then
        print_success "DATABASE_URL found in .env"
    else
        print_error "DATABASE_URL not found in .env"
    fi
else
    print_error ".env file missing! Creating from template..."
    cp .env.vps .env
    print_warning "Please edit .env file with your database credentials"
fi

# Test database connection
if [ -f ".env" ]; then
    source .env
    if [ -n "$DATABASE_URL" ]; then
        print_status "Testing database connection..."
        npx prisma db push --preview-feature > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Database connection successful"
        else
            print_error "Database connection failed"
            print_status "Check your DATABASE_URL in .env file"
        fi
    else
        print_error "DATABASE_URL not set in .env"
    fi
fi

echo ""

# 6. Check PM2 processes
print_status "Checking PM2 processes..."

PM2_PROCESSES=$(pm2 list | grep -c "hsello")
if [ "$PM2_PROCESSES" -gt 0 ]; then
    print_success "hsello PM2 process found"
    pm2 status
else
    print_warning "hsello PM2 process not found. Starting application..."
    pm2 start app-postgres.js --name hsello
    pm2 startup
    pm2 save
fi

echo ""

# 7. Check Nginx configuration
print_status "Checking Nginx configuration..."

if [ -f "/etc/nginx/sites-enabled/hsello.com" ]; then
    print_success "Nginx site configuration exists"

    # Test configuration
    nginx -t > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration has errors"
        nginx -t
    fi

    # Check if site is listening on port 80
    if netstat -tlnp | grep -q ":80 "; then
        print_success "Nginx listening on port 80"
    else
        print_error "Nginx not listening on port 80"
    fi

else
    print_error "Nginx site configuration missing!"
    print_status "Creating Nginx configuration..."

    # Create Nginx config
    cat > /etc/nginx/sites-available/hsello.com << 'EOF'
server {
    listen 80;
    server_name hsello.com www.hsello.com;

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

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /public/ {
        alias /var/www/hsello/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /var/www/hsello/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    ln -sf /etc/nginx/sites-available/hsello.com /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    systemctl reload nginx
fi

echo ""

# 8. Check firewall
print_status "Checking firewall configuration..."

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | grep -c "3001\|80\|443\|22")
    if [ "$UFW_STATUS" -ge 4 ]; then
        print_success "Firewall rules look good"
        ufw status | grep -E "(3001|80|443|22)"
    else
        print_warning "Firewall rules may be incomplete"
        print_status "Adding required firewall rules..."
        ufw allow 22
        ufw allow 80
        ufw allow 443
        ufw allow 3001
        echo "y" | ufw enable
    fi
else
    print_warning "UFW firewall not found"
fi

echo ""

# 9. Test application
print_status "Testing application..."

# Test local application
if curl -s http://localhost:3001 > /dev/null; then
    print_success "Application responding on localhost:3001"
else
    print_error "Application not responding on localhost:3001"
fi

# Test through Nginx
if curl -s http://localhost > /dev/null; then
    print_success "Application accessible through Nginx on port 80"
else
    print_error "Application not accessible through Nginx"
fi

# Test domain (if DNS is configured)
if curl -s --max-time 10 http://hsello.com > /dev/null 2>&1; then
    print_success "Domain hsello.com is accessible"
else
    print_warning "Domain hsello.com not accessible (DNS may not be configured yet)"
fi

echo ""

# 10. SSL Check
print_status "Checking SSL configuration..."

if [ -d "/etc/letsencrypt/live/hsello.com" ]; then
    print_success "SSL certificate exists for hsello.com"

    # Check certificate expiry
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/hsello.com/fullchain.pem | cut -d= -f2)
    print_status "Certificate expires: $CERT_EXPIRY"

    # Check if Nginx config has SSL
    if grep -q "ssl_certificate" /etc/nginx/sites-available/hsello.com; then
        print_success "Nginx SSL configuration found"
    else
        print_warning "Nginx SSL configuration missing"
    fi

else
    print_warning "SSL certificate not found"
    print_status "To setup SSL, run:"
    echo "  apt install -y certbot python3-certbot-nginx"
    echo "  systemctl stop nginx"
    echo "  certbot certonly --standalone -d hsello.com -d www.hsello.com"
    echo "  systemctl start nginx"
    echo "  # Then update Nginx config with SSL settings"
fi

echo ""

# 11. Final status report
print_status "Deployment status summary:"
echo "=========================================="

# Check all critical components
ISSUES_FOUND=0

# Application
if pm2 list | grep -q "hsello.*online"; then
    print_success "✓ Application: Running"
else
    print_error "✗ Application: Not running"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Database
if systemctl is-active --quiet postgresql; then
    print_success "✓ Database: Running"
else
    print_error "✗ Database: Not running"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Web server
if systemctl is-active --quiet nginx && nginx -t > /dev/null 2>&1; then
    print_success "✓ Web Server: Running and configured"
else
    print_error "✗ Web Server: Issues found"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Connectivity
if curl -s http://localhost:3001 > /dev/null; then
    print_success "✓ Local connectivity: Working"
else
    print_error "✗ Local connectivity: Failed"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
    print_success "🎉 All systems operational!"
    print_status "Your site should be accessible at:"
    echo "  - http://hsello.com"
    echo "  - http://168.231.125.1"
    if [ -d "/etc/letsencrypt/live/hsello.com" ]; then
        echo "  - https://hsello.com (SSL enabled)"
    fi
else
    print_warning "Found $ISSUES_FOUND issue(s) that need attention"
    print_status "Please review the errors above and fix them"
fi

echo ""
print_status "Useful commands:"
echo "  pm2 logs hsello              # View application logs"
echo "  pm2 restart hsello           # Restart application"
echo "  systemctl reload nginx       # Reload web server"
echo "  ufw status                   # Check firewall"
echo "  ./fix-vps-deployment.sh      # Run this script again"

echo ""
print_status "For SSL setup, run:"
echo "  ./setup-ssl.sh"

echo ""
print_status "Fix script completed!"