#!/bin/bash

# DigitalMarket PostgreSQL Deployment Script
# Run this on your VPS after uploading the application

echo "🚀 Starting DigitalMarket PostgreSQL Deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
echo "🔄 Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Setup PostgreSQL database and user
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE digitalmarket;
CREATE USER digitalmarket_user WITH PASSWORD 'secure_password_2025';
GRANT ALL PRIVILEGES ON DATABASE digitalmarket TO digitalmarket_user;
ALTER USER digitalmarket_user CREATEDB;
EOF

echo "✅ PostgreSQL setup complete!"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow 3001
ufw allow 22
ufw allow 80
ufw allow 443
echo "y" | ufw enable

echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your application files to the VPS"
echo "2. Run the application setup commands"
echo "3. Setup domain (hsello.com) with Nginx"
echo ""
echo "🌐 Your site will be available at: https://hsello.com"
echo ""
echo "📋 Domain Setup Commands (run after uploading files):"
echo "cd /root/hsello"
echo "chmod +x setup-nginx.sh"
echo "./setup-nginx.sh"
echo ""
echo "Your VPS is ready for DigitalMarket deployment!"