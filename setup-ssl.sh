#!/bin/bash

# SSL Setup Script for hsello.com
# Run this after basic deployment to enable HTTPS

echo "🔒 Setting up SSL certificate for hsello.com..."

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Stop Nginx temporarily for certificate generation
systemctl stop nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
certbot certonly --standalone -d hsello.com -d www.hsello.com

# Check if certificate was obtained successfully
if [ -d "/etc/letsencrypt/live/hsello.com" ]; then
    echo "✅ SSL certificate obtained successfully!"

    # Create SSL-enabled Nginx configuration
    cat > /etc/nginx/sites-available/hsello.com << EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name hsello.com www.hsello.com;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name hsello.com www.hsello.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/hsello.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hsello.com/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

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

    # Start Nginx
    systemctl start nginx
    systemctl enable nginx

    echo "✅ SSL setup complete!"
    echo "🌐 Your site is now available at: https://hsello.com"
    echo ""
    echo "🔄 Certificate renewal reminder:"
    echo "SSL certificates auto-renew. Test renewal with:"
    echo "certbot renew --dry-run"

else
    echo "❌ SSL certificate generation failed!"
    echo "🔍 Troubleshooting steps:"
    echo "1. Check if domain DNS points to this server"
    echo "2. Verify firewall allows ports 80 and 443"
    echo "3. Check Nginx is stopped during certificate generation"
    echo "4. Try manual certificate generation"

    # Restart Nginx without SSL
    systemctl start nginx
fi