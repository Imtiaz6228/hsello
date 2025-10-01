#!/bin/bash

# Hsello VPS Deployment Script with Multi-Language Support
# This script deploys the Hsello application including locales directory for multi-language support

echo "🚀 Starting Hsello VPS Deployment with Multi-Language Support..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Get VPS details
read -p "Enter your VPS IP address or domain: " VPS_HOST
read -p "Enter your VPS username: " VPS_USER
read -p "Enter the path to your SSH key (or press enter for password auth): " SSH_KEY

# Create deployment package
print_status "Creating deployment package with locales..."

# Create temporary directory for deployment
DEPLOY_DIR="hsello-deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy all necessary files
print_info "Copying application files..."
cp -r app.js package.json ecosystem.config.js "$DEPLOY_DIR/"
cp -r config/ "$DEPLOY_DIR/"
cp -r locales/ "$DEPLOY_DIR/"
cp -r models/ "$DEPLOY_DIR/"
cp -r public/ "$DEPLOY_DIR/"
cp -r routes/ "$DEPLOY_DIR/" 2>/dev/null || true
cp -r utils/ "$DEPLOY_DIR/"
cp -r views/ "$DEPLOY_DIR/"
cp -r uploads/ "$DEPLOY_DIR/" 2>/dev/null || mkdir -p "$DEPLOY_DIR/uploads"
cp .env.example "$DEPLOY_DIR/"
cp .gitignore "$DEPLOY_DIR/"

# Create deployment archive
print_info "Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

# Upload to VPS
print_status "Uploading to VPS..."
if [ -n "$SSH_KEY" ]; then
    scp -i "$SSH_KEY" "${DEPLOY_DIR}.tar.gz" "${VPS_USER}@${VPS_HOST}:~/"
else
    scp "${DEPLOY_DIR}.tar.gz" "${VPS_USER}@${VPS_HOST}:~/"
fi

# Execute deployment commands on VPS
print_status "Deploying on VPS..."

SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="ssh -i $SSH_KEY"
fi

$SSH_CMD "${VPS_USER}@${VPS_HOST}" << EOF
    # Update system packages
    echo "Updating system packages..."
    sudo apt update && sudo apt upgrade -y

    # Install Node.js 18+ if not installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi

    # Install PM2 globally
    echo "Installing PM2..."
    sudo npm install -g pm2

    # Install Nginx
    echo "Installing Nginx..."
    sudo apt install -y nginx

    # Create application directory
    echo "Creating application directory..."
    sudo mkdir -p /var/www/hsello
    sudo chown -R \$USER:\$USER /var/www/hsello

    # Extract deployment package
    echo "Extracting deployment package..."
    cd /var/www/hsello
    tar -xzf ~/${DEPLOY_DIR}.tar.gz
    cp -r ${DEPLOY_DIR}/* .
    rm -rf ${DEPLOY_DIR}

    # Verify locales directory
    echo "Verifying locales directory..."
    if [ -d "locales" ]; then
        echo "✅ Locales directory found"
        ls -la locales/
        ls -la locales/*/
    else
        echo "❌ Locales directory missing!"
        exit 1
    fi

    # Install dependencies
    echo "Installing application dependencies..."
    npm install --production

    # Create logs directory
    mkdir -p logs

    # Configure firewall
    echo "Configuring firewall..."
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable

    # Configure Nginx
    echo "Configuring Nginx..."
    sudo tee /etc/nginx/sites-available/hsello > /dev/null <<NGINX_EOF
server {
    listen 80;
    server_name ${VPS_HOST} www.${VPS_HOST};

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
NGINX_EOF

    # Enable site
    sudo ln -s /etc/nginx/sites-available/hsello /etc/nginx/sites-enabled/ 2>/dev/null || true
    sudo nginx -t
    sudo systemctl reload nginx

    # Setup environment file
    if [ ! -f .env ]; then
        echo "Creating .env file..."
        cp .env.example .env
        echo "⚠️  Please edit /var/www/hsello/.env with your configuration"
    fi

    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit /var/www/hsello/.env with your database and email settings"
    echo "2. Start the application: pm2 start ecosystem.config.js"
    echo "3. Setup PM2 to start on boot: pm2 startup && pm2 save"
    echo "4. Test multi-language support: curl http://localhost:3001/lang/ru"
    echo ""
    echo "Useful PM2 commands:"
    echo "  pm2 status          - Check application status"
    echo "  pm2 logs            - View application logs"
    echo "  pm2 restart hsello  - Restart application"
EOF

# Cleanup local files
print_info "Cleaning up local files..."
rm -rf "$DEPLOY_DIR"
rm -f "${DEPLOY_DIR}.tar.gz"

print_status "🎉 Deployment script completed!"
print_warning "Don't forget to:"
echo "  1. Configure your .env file on the VPS"
echo "  2. Update Nginx server_name with your actual domain"
echo "  3. Configure SSL certificate with Let's Encrypt"
echo "  4. Test the application and multi-language functionality"
echo ""
print_info "Multi-language support should now be working on your VPS!"