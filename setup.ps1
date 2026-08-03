# Experimind Inventory System - PowerShell Setup Script
# Run this in PowerShell from the project directory

Write-Host "Experimind Inventory System - Automated Setup" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Error "Please run this script from the project root directory"
    Exit 1
}

Write-Host "Step 1: Creating database if it doesn't exist..." -ForegroundColor Yellow
node .\create-database.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error creating database. Please check:"
    Write-Error "1. PostgreSQL service is running"
    Write-Error "2. Credentials in .env file are correct"
    Pause
    Exit 1
}

Write-Host ""
Write-Host "Step 2: Running data migration..." -ForegroundColor Yellow
npm run migrate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error during migration. Please check:"
    Write-Error "1. Database was created successfully"
    Write-Error "2. Firebase/Google Sheets credentials are in .env (if migrating legacy data)"
    Pause
    Exit 1
}

Write-Host ""
Write-Host "Step 3: Starting development server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
npm run dev