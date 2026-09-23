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

if (-not (Test-Path -LiteralPath $KeyFile -PathType Leaf)) {
    throw "SSH key was not found: $KeyFile"
}

# 1. Run local build
Write-Host "`n[1/5] Building frontend & server bundle locally..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { throw "Application build failed." }
Write-Host "`n[1.5/5] Building Next.js Storefront..." -ForegroundColor Yellow
Push-Location apps/storefront
npm install --no-audit
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Storefront dependency installation failed." }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Storefront build failed." }
Pop-Location

# 2. Package required deployment files
Write-Host "`n[2/5] Creating deployment archive..." -ForegroundColor Yellow
$tarFile = "deploy_bundle.tar.gz"
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

tar --exclude="node_modules" --exclude="apps/storefront/node_modules" --exclude="apps/storefront/.next" -czf $tarFile dist apps public package.json package-lock.json ecosystem.config.cjs scripts src tsconfig.json

# 3. Transfer files to remote server
Write-Host "`n[3/5] Uploading deployment package and setup scripts to AWS server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -i $KeyFile $tarFile "${User}@${ServerIP}:/home/${User}/"
scp -o StrictHostKeyChecking=no -i $KeyFile scripts/setup-aws.sh "${User}@${ServerIP}:/home/${User}/"

# 4. Execute Remote Server Setup & PM2 Deployment
Write-Host "`n[4/5] Running environment setup & deploying application on remote server..." -ForegroundColor Yellow
$remoteScript = @'
set -e
chmod +x /home/admin/setup-aws.sh
sed -i 's/\r$//' /home/admin/setup-aws.sh
/home/admin/setup-aws.sh

APP_DIR="/home/admin/experimind-inventory"
mkdir -p $APP_DIR
chmod -R u+w $APP_DIR 2>/dev/null || true
tar --overwrite -xzf /home/admin/deploy_bundle.tar.gz -C $APP_DIR
chmod -R u+w $APP_DIR 2>/dev/null || true

cd $APP_DIR
echo "Installing production dependencies..."
npm install --omit=dev --no-audit
chmod -R +x node_modules/.bin 2>/dev/null || true

echo "Installing Next.js storefront dependencies and building natively..."
cd apps/storefront
npm install --no-audit
npm run build
cd $APP_DIR

echo "Running TypeORM database migrations..."
npm run db:migrate

echo "Seeding Admin user and Real Experimind Catalog..."
npm run bootstrap:admin
npm run db:seed:real

echo "Starting / Reloading PM2 process..."
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "Checking running PM2 status..."
pm2 status

echo "Checking application health endpoints..."
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/health >/dev/null &&
     curl --fail --silent --show-error http://127.0.0.1:3001 >/dev/null; then
    echo "Application health checks passed."
    exit 0
  fi
  sleep 3
done

echo "Application health checks failed."
pm2 status
pm2 logs --nostream --lines 80
exit 1
'@

$remoteScript = $remoteScript -replace "`r`n", "`n"
$remoteScriptBytes = [System.Text.Encoding]::UTF8.GetBytes($remoteScript)
$remoteScriptBase64 = [Convert]::ToBase64String($remoteScriptBytes)
ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "echo $remoteScriptBase64 | base64 -d | bash"
if ($LASTEXITCODE -ne 0) {
    if (Test-Path $tarFile) { Remove-Item $tarFile -Force }
    throw "AWS deployment failed during remote setup or health checks."
}

# Clean up local archive
if (Test-Path $tarFile) { Remove-Item $tarFile -Force }

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host " 🌐 Application is live at: http://$ServerIP" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
