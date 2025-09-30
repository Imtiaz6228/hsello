#!/bin/bash

# Quick deployment script for VPS (MongoDB already configured)
# Run this on your VPS after uploading the hsello directory

echo "🚀 Deploying Hsello to VPS..."

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2..."
    npm install -g pm2
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "🌐 Installing Nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/hsello > /dev/null <<EOF
server {
    listen 80;
    server_name your-vps-ip;  # Replace with your domain or IP

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
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/hsello /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx

# Start application
echo "🚀 Starting application with PM2..."
pm2 stop hsello 2>/dev/null || true
pm2 delete hsello 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || true

echo "✅ Deployment completed!"
echo ""
echo "🌐 Your site should be available at:"
echo "   http://your-vps-ip"
echo ""
echo "🔐 Admin Panel:"
echo "   http://your-vps-ip/admin/login"
echo "   Admin ID: admin"
echo "   Password: Family\$786"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs hsello"