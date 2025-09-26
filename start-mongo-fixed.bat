@echo off
echo === DigitalMarket Local MongoDB Startup Script (Fixed) ===
echo.

echo Step 1: Creating data directory if needed...
if not exist "D:\Downloads\data\db" (
    mkdir "D:\Downloads\data\db"
    echo ✅ Created D:\Downloads\data\db
) else (
    echo ✅ D:\Downloads\data\db already exists
)

echo.
echo Step 2: Starting MongoDB Server...
echo This will start MongoDB on mongodb://localhost:27017/digitalmarket
echo Using data path: D:\Downloads\data\db
echo.
echo Press Ctrl+C to stop the server
echo.

"D:\Downloads\mongodb-win32-x86_64-windows-8.0.13\bin\mongod.exe" --dbpath "D:\Downloads\data\db" --port 27017 --logpath "D:\Downloads\mongod.log"

pause
