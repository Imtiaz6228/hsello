# Manual Multi-Language Deployment Guide for Hsello

This guide provides step-by-step instructions to deploy the locales directory and enable multi-language support on your VPS.

## 🚨 Problem Identified

The multi-language functionality is not working on https://hsello.com/ because the `locales/` directory containing translation files is not deployed to the VPS server.

## ✅ Solution Overview

We need to:
1. Upload the `locales/` directory to your VPS
2. Ensure proper file permissions
3. Restart the application
4. Test language switching

## 📋 Step-by-Step Deployment

### Step 1: Prepare the Locales Package

On your local machine (where the hsello code is):

```bash
cd hsello
# Verify locales directory exists
ls -la locales/
# Should show: en/ and ru/ directories
```

### Step 2: Upload to VPS

#### Option A: Using SCP (Secure Copy)

```bash
# Upload the entire locales directory
scp -r locales/ user@your-vps-ip:/var/www/hsello/

# Or if using SSH key
scp -i ~/.ssh/your-key -r locales/ user@your-vps-ip:/var/www/hsello/
```

#### Option B: Using SFTP

```bash
# Connect via SFTP
sftp user@your-vps-ip
cd /var/www/hsello
put -r locales/
exit
```

#### Option C: Manual Upload

1. Zip the locales directory on your local machine:
   ```bash
   cd hsello
   tar -czf locales.tar.gz locales/
   ```

2. Upload `locales.tar.gz` to your VPS via FTP/SFTP

3. Extract on VPS:
   ```bash
   cd /var/www/hsello
   tar -xzf locales.tar.gz
   ```

### Step 3: Verify Deployment on VPS

Connect to your VPS via SSH:

```bash
ssh user@your-vps-ip
cd /var/www/hsello

# Check if locales directory exists
ls -la locales/

# Should show:
# drwxr-xr-x 4 user user 4096 Oct 1 07:54 .
# drwxr-xr-x 12 user user 4096 Oct 1 07:54 ..
# drwxr-xr-x 2 user user 4096 Oct 1 07:54 en
# drwxr-xr-x 2 user user 4096 Oct 1 07:54 ru

# Check translation files
ls -la locales/en/
ls -la locales/ru/

# Should show translation.json files
```

### Step 4: Set Proper Permissions

```bash
# Ensure proper permissions
sudo chown -R www-data:www-data /var/www/hsello/locales/
# OR
sudo chown -R $USER:$USER /var/www/hsello/locales/

# Make sure files are readable
chmod -R 644 /var/www/hsello/locales/
chmod 755 /var/www/hsello/locales/
chmod 755 /var/www/hsello/locales/en/
chmod 755 /var/www/hsello/locales/ru/
```

### Step 5: Restart Application

```bash
# If using PM2
pm2 restart hsello

# Or if running directly
pkill -f "node app.js"
cd /var/www/hsello
node app.js &
```

### Step 6: Test Multi-Language Functionality

#### Test 1: Check Application Logs

```bash
# Check PM2 logs
pm2 logs hsello

# Should see:
# ✅ i18n initialized successfully
# 🔧 Available languages: [ 'en', 'ru' ]
# 🔧 Current language: en
```

#### Test 2: Test Language Switching

```bash
# Test English (default)
curl -I http://your-domain.com/

# Test Russian
curl -I http://your-domain.com/lang/ru

# Check if language cookie is set
curl -c cookies.txt http://your-domain.com/lang/ru
cat cookies.txt
```

#### Test 3: Manual Browser Test

1. Visit `https://hsello.com/`
2. Look for language switcher in the navbar (EN | RU)
3. Click "RU" to switch to Russian
4. Verify the page content changes to Russian

## 🔧 Troubleshooting

### Issue: Locales directory not found

**Symptoms**: Application starts but only English is available

**Solutions**:
```bash
# Check if directory exists
ls -la /var/www/hsello/locales/

# If missing, re-upload
# Follow Step 2 again
```

### Issue: Permission denied

**Symptoms**: i18n initialization fails with permission errors

**Solutions**:
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/hsello/locales/
sudo chmod -R 644 /var/www/hsello/locales/
```

### Issue: Translation files corrupted

**Symptoms**: i18n loads but translations are missing

**Solutions**:
```bash
# Verify JSON files are valid
cd /var/www/hsello
node -e "JSON.parse(require('fs').readFileSync('locales/en/translation.json'))"
node -e "JSON.parse(require('fs').readFileSync('locales/ru/translation.json'))"

# If invalid, re-upload the files
```

### Issue: Language doesn't switch

**Symptoms**: Clicking language links doesn't change the interface

**Solutions**:
1. Check browser cookies are enabled
2. Clear browser cache
3. Check application logs for errors
4. Verify the `/lang/:lang` route is working

## 📝 Verification Checklist

- [ ] `locales/` directory exists on VPS
- [ ] `locales/en/translation.json` exists and is readable
- [ ] `locales/ru/translation.json` exists and is readable
- [ ] Application logs show i18n initialization success
- [ ] Language switcher appears in navbar
- [ ] Clicking "RU" changes page to Russian
- [ ] Clicking "EN" changes page back to English
- [ ] Language preference persists across pages

## 🎉 Success!

Once completed, https://hsello.com/ will support both English and Russian languages with full translation coverage for:

- Navigation menu
- Hero section
- Categories
- Features
- Trust indicators
- How it works
- Success stories
- Footer
- Support chat
- And more...

## 📞 Need Help?

If you encounter issues:

1. Check the application logs: `pm2 logs hsello`
2. Verify file permissions and existence
3. Test with the curl commands above
4. Contact support with specific error messages