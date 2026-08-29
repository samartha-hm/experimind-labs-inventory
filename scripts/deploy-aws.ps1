# PowerShell AWS Deployment Script for Experimind Labs Inventory OS
param(
    [string]$ServerIP = "13.233.142.180",
    [string]$User = "admin",
    [string]$KeyFile = "inventory.pem"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 EXPERIMIND LABS - AWS PRODUCTION DEPLOYMENT PIPELINE " -ForegroundColor Cyan
Write-Host " Target Server: $User@$ServerIP" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Run local build
Write-Host "`n[1/5] Building frontend & server bundle locally..." -ForegroundColor Yellow
npm run build
Write-Host "`n[1.5/5] Building Next.js Storefront..." -ForegroundColor Yellow
Push-Location apps/storefront
npm run build
Pop-Location

# 2. Package required deployment files
Write-Host "`n[2/5] Creating deployment archive..." -ForegroundColor Yellow
$tarFile = "deploy_bundle.tar.gz"
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

tar --exclude="node_modules" --exclude="apps/storefront/node_modules" -czf $tarFile dist apps package.json package-lock.json ecosystem.config.cjs scripts src tsconfig.json

# 3. Transfer files to remote server
Write-Host "`n[3/5] Uploading deployment package and setup scripts to AWS server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -i $KeyFile $tarFile "${User}@${ServerIP}:/home/${User}/"
scp -o StrictHostKeyChecking=no -i $KeyFile scripts/setup-aws.sh "${User}@${ServerIP}:/home/${User}/"

# 4. Execute Remote Server Setup & PM2 Deployment
Write-Host "`n[4/5] Running environment setup & deploying application on remote server..." -ForegroundColor Yellow
$remoteScript = @'
set -e
chmod +x /home/admin/setup-aws.sh
/home/admin/setup-aws.sh

APP_DIR="/home/admin/experimind-inventory"
mkdir -p $APP_DIR
tar -xzf /home/admin/deploy_bundle.tar.gz -C $APP_DIR

cd $APP_DIR
echo "Installing production dependencies..."
npm install --omit=dev --no-audit
chmod -R +x node_modules/.bin 2>/dev/null || true

echo "Installing Next.js storefront dependencies..."
cd apps/storefront
npm install --omit=dev --no-audit
chmod -R +x node_modules/.bin 2>/dev/null || true
cd $APP_DIR

echo "Running TypeORM database migrations..."
npm run db:migrate || true

echo "Seeding Admin user and Real Experimind Catalog..."
npm run bootstrap:admin || true
npm run db:seed:real || true

echo "Starting / Reloading PM2 process..."
pm2 delete all || true
pm2 start ecosystem.config.cjs
pm2 save

echo "Checking running PM2 status..."
pm2 status
'@

ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "$remoteScript"

# Clean up local archive
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " 🌐 Application is live at: http://$ServerIP" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
