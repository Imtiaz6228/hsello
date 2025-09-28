#!/bin/bash

# Nginx Setup for hsello.com
# Run this after deploying the application

echo "🌐 Setting up Nginx for hsello.com..."

# Install Nginx
apt install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/hsello.com << EOF
server {
    listen 80;
    server_name hsello.com www.hsello.com;

    # Redirect HTTP to HTTPS (if you have SSL)
    # return 301 https://\$server_name\$request_uri;

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

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /public/ {
        alias /root/hsello/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /root/hsello/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/hsello.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo "✅ Nginx configured for hsello.com"
echo "🌐 Your site will be available at: http://hsello.com"
echo ""
echo "📋 Next steps for SSL (HTTPS):"
echo "1. Install Certbot: apt install certbot python3-certbot-nginx"
echo "2. Get SSL certificate: certbot --nginx -d hsello.com -d www.hsello.com"
echo "3. Update BASE_URL in .env to https://hsello.com"