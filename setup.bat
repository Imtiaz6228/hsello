@echo off
echo MongoDB Setup for DigitalMarket App
echo ===================================

REM Create mongodb directory
if not exist "C:\mongodb" mkdir "C:\mongodb"
if not exist "C:\mongodb\data" mkdir "C:\mongodb\data"

REM Check if mongod.exe exists in Downloads
if exist "D:\Downloads\mongodb-windows-x86_64-8.0.13-signed.msi" (
    echo Found MongoDB MSI file. Please extract it manually to C:\mongodb
    echo Use 7-Zip or right-click extract, then run: mongod.exe --dbpath "C:\mongodb\data"
    goto :prepare_mongo
)

REM If MSI not found, download alternative
echo MSI not found. Please download MongoDB Community Server ZIP from:
echo https://www.mongodb.com/try/download/community
echo Then extract to C:\mongodb and run: mongod.exe --dbpath "C:\mongodb\data"

:prepare_mongo

REM Start MongoDB (assuming it's extracted)
if exist "C:\mongodb\bin\mongod.exe" (
    echo Starting MongoDB...
    start "MongoDB" "C:\mongodb\bin\mongod.exe" --dbpath "C:\mongodb\data"
    echo MongoDB started. Now run your app in another terminal.
) else (
    echo MongoDB not found at C:\mongodb\bin\mongod.exe
    echo Please extract MongoDB first, then run this script again.
)

pause
