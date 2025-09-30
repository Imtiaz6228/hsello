# 🚀 Hsello Production Deployment Guide

This guide will help you deploy the Hsello application to a VPS server for production use.

## 📋 Prerequisites

- Ubuntu 20.04+ VPS server
- Domain name (optional but recommended)
- MongoDB Atlas account (recommended) or local MongoDB
- SSH access to your VPS

## 🔧 Pre-Deployment Setup

### 1. Domain Configuration (Optional)

- Point your domain A record to your VPS IP address
- For SSL, you'll need a domain name

## 📁 Deployment Files Prepared

The following files have been prepared for deployment:

- `ecosystem.config.js` - PM2 configuration
- `deploy.sh` - Automated deployment script
- `.env` - Production environment configuration

## 🚀 Deployment Steps

### Step 1: Upload Files to VPS

Upload your entire `hsello` directory to your VPS:

```bash
# On your local machine
scp -r hsello/ user@your-vps-ip:/home/user/

# Or use SFTP/rsync
rsync -avz hsello/ user@your-vps-ip:/home/user/hsello/
```

### Step 2: Configure Environment

SSH into your VPS and configure the environment:

```bash
# SSH to your VPS
ssh user@your-vps-ip

# Navigate to application directory
cd hsello

# Edit .env file with your actual values
nano .env
```

Update these values in `.env`:

```env
# MongoDB is already configured on your VPS
# BASE_URL should be updated if you have a domain
BASE_URL=https://your-domain.com

# Configure email (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 3: Run Deployment Script

```bash
# Make script executable and run
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Install Node.js, PM2, and Nginx
- Configure firewall
- Set up Nginx reverse proxy
- Start the application with PM2

### Step 4: SSL Certificate (Optional but Recommended)

Install Let's Encrypt SSL certificate:

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Step 5: Verify Deployment

```bash
# Check application status
pm2 status

# Check application logs
pm2 logs hsello

# Test the application
curl http://localhost:3001
curl https://your-domain.com
```

## 🔐 Admin Panel Access

After deployment, your admin panel will be available at:

**URL:** `https://your-domain.com/admin/login`

**Credentials:**
- **Admin ID:** `admin`
- **Password:** `Family$786`

## 🛠️ Useful Commands

### PM2 Management
```bash
pm2 status              # Check status
pm2 logs hsello         # View logs
pm2 restart hsello      # Restart app
pm2 stop hsello         # Stop app
pm2 delete hsello       # Remove from PM2
```

### Nginx Management
```bash
sudo systemctl status nginx
sudo systemctl reload nginx
sudo nginx -t              # Test configuration
```

### Application Logs
```bash
# View recent logs
tail -f logs/combined.log

# View error logs
tail -f logs/err.log
```

## 🔧 Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs hsello

# Check if port 3001 is in use
sudo netstat -tulpn | grep :3001

# Restart application
pm2 restart hsello
```

### Database Connection Issues
```bash
# Test MongoDB connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"
```

### Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Check configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx
```

## 🔒 Security Checklist

- [ ] Changed default admin password
- [ ] Updated SESSION_SECRET
- [ ] Configured firewall (UFW)
- [ ] Installed SSL certificate
- [ ] Disabled root SSH login
- [ ] Set up automatic security updates
- [ ] Configured fail2ban

## 📊 Monitoring

### Application Monitoring
```bash
# Monitor with PM2
pm2 monit

# Check system resources
htop
df -h
free -h
```

### Log Monitoring
```bash
# Application logs
pm2 logs hsello --lines 100

# System logs
sudo journalctl -u nginx -f
```

## 🚀 Post-Deployment Tasks

1. **Test all features:**
   - User registration/login
   - Admin panel access
   - Product uploads
   - Payment processing

2. **Configure backups:**
   - Database backups
   - File uploads backup
   - Configuration backups

3. **Set up monitoring:**
   - Server monitoring
   - Application monitoring
   - Error alerting

## 📞 Support

If you encounter issues:

1. Check the logs: `pm2 logs hsello`
2. Verify environment variables in `.env`
3. Test database connectivity
4. Check firewall settings
5. Ensure all dependencies are installed

## 🎉 Success!

Your Hsello marketplace is now live and ready for users!

**Live Site:** `https://your-domain.com`
**Admin Panel:** `https://your-domain.com/admin/login`