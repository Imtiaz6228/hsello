#!/bin/bash

# Connection Troubleshooting Script for hsello.com
# Run this to diagnose why hsello.com is not accessible

echo "🔍 Connection Troubleshooting for hsello.com"
echo "==========================================="

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

# 1. Check VPS IP address
print_status "Checking VPS IP address..."
CURRENT_IP=$(curl -s ifconfig.me)
echo "Current public IP: $CURRENT_IP"
echo "Expected IP: 168.231.125.1"

if [ "$CURRENT_IP" = "168.231.125.1" ]; then
    print_success "IP address matches expected value"
else
    print_warning "IP address mismatch!"
    print_status "Current IP: $CURRENT_IP"
    print_status "Expected IP: 168.231.125.1"
    print_error "Your VPS IP may have changed! Update DNS records with: $CURRENT_IP"
fi
echo ""

# 2. Check DNS resolution
print_status "Checking DNS resolution..."
DNS_IP=$(nslookup hsello.com 2>/dev/null | grep -A 2 "Name:" | grep "Address:" | head -1 | awk '{print $2}')
echo "DNS resolved hsello.com to: $DNS_IP"

if [ "$DNS_IP" = "168.231.125.1" ]; then
    print_success "DNS is correctly pointing to VPS IP"
elif [ -z "$DNS_IP" ]; then
    print_error "DNS lookup failed - domain may not be configured"
else
    print_error "DNS points to wrong IP: $DNS_IP (expected: 168.231.125.1)"
    print_status "Update your DNS A record: hsello.com -> 168.231.125.1"
fi
echo ""

# 3. Check local services
print_status "Checking local services..."

# Check if application is running
if pgrep -f "app-postgres.js" > /dev/null; then
    print_success "Application process is running"
else
    print_error "Application process not found!"
    print_status "Starting application..."
    cd /var/www/hsello
    pm2 start app-postgres.js --name hsello
fi

# Check PM2 status
PM2_STATUS=$(pm2 list | grep hsello | awk '{print $10}')
if [ "$PM2_STATUS" = "online" ]; then
    print_success "PM2 reports application online"
else
    print_error "PM2 reports application status: $PM2_STATUS"
fi

# Check if port 3001 is listening
if netstat -tlnp | grep -q ":3001 "; then
    print_success "Application listening on port 3001"
else
    print_error "Application not listening on port 3001"
fi
echo ""

# 4. Check Nginx
print_status "Checking Nginx configuration..."

if systemctl is-active --quiet nginx; then
    print_success "Nginx service is running"
else
    print_error "Nginx service is not running!"
    systemctl start nginx
fi

# Check Nginx configuration
if nginx -t > /dev/null 2>&1; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors:"
    nginx -t
fi

# Check if port 80 is listening
if netstat -tlnp | grep -q ":80 "; then
    print_success "Nginx listening on port 80"
else
    print_error "Nginx not listening on port 80"
fi

# Check site configuration
if [ -f "/etc/nginx/sites-enabled/hsello.com" ]; then
    print_success "Nginx site configuration exists"
else
    print_error "Nginx site configuration missing!"
fi
echo ""

# 5. Check firewall
print_status "Checking firewall configuration..."

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | grep "80\|443\|22\|3001")
    if echo "$UFW_STATUS" | grep -q "ALLOW"; then
        print_success "Firewall allows required ports"
        echo "$UFW_STATUS"
    else
        print_error "Firewall blocking required ports!"
        print_status "Adding firewall rules..."
        ufw allow 80
        ufw allow 443
        ufw allow 22
        ufw allow 3001
        echo "y" | ufw reload
    fi
else
    print_warning "UFW not found - using iptables"
    iptables -L | grep -E "(80|443|22|3001)"
fi
echo ""

# 6. Test local connectivity
print_status "Testing local connectivity..."

# Test application directly
if curl -s --max-time 5 http://localhost:3001 > /dev/null; then
    print_success "Application responds on localhost:3001"
else
    print_error "Application not responding on localhost:3001"
    print_status "Check application logs: pm2 logs hsello"
fi

# Test through Nginx
if curl -s --max-time 5 http://localhost > /dev/null; then
    print_success "Application accessible through Nginx on port 80"
else
    print_error "Application not accessible through Nginx"
    print_status "Check Nginx error logs: tail -f /var/log/nginx/error.log"
fi
echo ""

# 7. Test external connectivity
print_status "Testing external connectivity..."

# Test from external service
EXTERNAL_TEST=$(curl -s --max-time 10 "https://check-host.net/check-http?host=hsello.com" | grep -o '"status":[0-9]*' | head -1)
if [ -n "$EXTERNAL_TEST" ]; then
    print_status "External connectivity test initiated"
else
    print_warning "Could not test external connectivity"
fi

# Test with different timeout
print_status "Testing connection with longer timeout..."
if timeout 30 curl -s http://hsello.com > /dev/null; then
    print_success "Site is accessible from external test"
else
    print_error "Site not accessible - connection timeout"
fi
echo ""

# 8. Provide diagnostic summary
print_status "Connection Diagnostic Summary"
echo "================================="

ISSUES_FOUND=0

# DNS Check
if [ "$DNS_IP" != "168.231.125.1" ]; then
    print_error "❌ DNS Issue: hsello.com does not point to 168.231.125.1"
    print_status "   Current DNS IP: $DNS_IP"
    print_status "   Fix: Update DNS A record in your domain registrar"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "✅ DNS: Correctly configured"
fi

# IP Check
if [ "$CURRENT_IP" != "168.231.125.1" ]; then
    print_error "❌ IP Issue: VPS IP has changed"
    print_status "   Current IP: $CURRENT_IP"
    print_status "   Expected IP: 168.231.125.1"
    print_status "   Fix: Update DNS records with new IP"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "✅ IP Address: Correct"
fi

# Application Check
if pgrep -f "app-postgres.js" > /dev/null && [ "$PM2_STATUS" = "online" ]; then
    print_success "✅ Application: Running"
else
    print_error "❌ Application Issue: Not running properly"
    print_status "   Fix: cd /var/www/hsello && pm2 start app-postgres.js --name hsello"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Nginx Check
if systemctl is-active --quiet nginx && nginx -t > /dev/null 2>&1; then
    print_success "✅ Nginx: Running and configured"
else
    print_error "❌ Nginx Issue: Not running or misconfigured"
    print_status "   Fix: systemctl start nginx && nginx -t"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Firewall Check
if netstat -tlnp | grep -q ":80 " && netstat -tlnp | grep -q ":3001 "; then
    print_success "✅ Ports: 80 and 3001 are open"
else
    print_error "❌ Firewall Issue: Required ports blocked"
    print_status "   Fix: ufw allow 80 && ufw allow 3001"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Local Connectivity
if curl -s http://localhost:3001 > /dev/null && curl -s http://localhost > /dev/null; then
    print_success "✅ Local Connectivity: Working"
else
    print_error "❌ Local Connectivity Issue"
    print_status "   Fix: Check application and Nginx logs"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
if [ $ISSUES_FOUND -eq 0 ]; then
    print_success "🎉 All diagnostics passed! Site should be accessible."
    print_status "If still not working, wait for DNS propagation (up to 24 hours)"
else
    print_error "Found $ISSUES_FOUND issue(s) that need to be fixed"
fi

echo ""
print_status "Quick Fix Commands:"
echo "1. Update DNS: Set A record hsello.com -> $CURRENT_IP"
echo "2. Check firewall: ufw status"
echo "3. Restart services: pm2 restart hsello && systemctl reload nginx"
echo "4. Test locally: curl http://localhost"
echo "5. Wait for DNS: DNS changes can take 24-48 hours to propagate"

echo ""
print_status "Monitoring Commands:"
echo "pm2 logs hsello          # Application logs"
echo "tail -f /var/log/nginx/access.log    # Nginx access logs"
echo "tail -f /var/log/nginx/error.log     # Nginx error logs"
echo "nslookup hsello.com      # Check DNS resolution"

echo ""
print_status "Troubleshooting completed!"