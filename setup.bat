@echo off
:: Experimind Inventory System Setup Batch File
:: This script automates the setup process for Windows users

echo.
echo ============================================
echo Experimind Inventory System Setup
echo ============================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo Error: Please run this script from the project root directory
    echo (where package.json is located)
    pause
    exit /b 1
)

:: Step 1: Create database
echo Step 1: Creating database if it doesn't exist...
node create-database.js
if errorlevel 1 (
    echo Error: Failed to create/check database
    pause
    exit /b 1
)
echo.

:: Step 2: Run migration
echo Step 2: Running data migration...
npm run migrate
if errorlevel 1 (
    echo Error: Migration failed
    echo.
    echo Make sure:
    echo 1. Database was created successfully
    echo 2. Firebase/Google Sheets credentials are in .env (if migrating legacy data)
    pause
    exit /b 1
)
echo.

:: Step 3: Start development server
echo Step 3: Starting development server...
echo.
echo Press Ctrl+C to stop the server when you're done
echo.
npm run dev

:: Keep window open if script ends unexpectedly
pause