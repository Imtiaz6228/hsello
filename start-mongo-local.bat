@echo off
echo === DigitalMarket Local MongoDB Startup Script ===
echo.

echo Step 1: Creating data directory...
if not exist "C:\data\db" (
    mkdir "C:\data\db"
    echo ✅ Created C:\data\db
) else (
    echo ✅ C:\data\db already exists
)

echo.
echo Step 2: Starting MongoDB Server...
echo This will start MongoDB on mongodb://localhost:27017/digitalmarket
echo.
echo Press Ctrl+C to stop the server
echo.

mongod --dbpath "C:\data\db" --port 27017

pause
