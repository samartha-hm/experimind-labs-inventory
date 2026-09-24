# PowerShell AWS Rollback Script for Experimind Labs Inventory OS
# Restores a previous release snapshot created by deploy-aws.ps1.
# Usage:
#   .\scripts\rollback-aws.ps1                                  # pick newest snapshot interactively
#   .\scripts\rollback-aws.ps1 -ReleaseFile release_20260924T120000Z.tar.gz
param(
    [string]$ServerIP = "13.233.142.180",
    [string]$User = "admin",
    [string]$KeyFile = "inventory.pem",
    [string]$ReleaseFile = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " EXPERIMIND LABS - AWS ROLLBACK " -ForegroundColor Cyan
Write-Host " Target Server: $User@$ServerIP" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $KeyFile -PathType Leaf)) {
    throw "SSH key was not found: $KeyFile"
}

# Resolve which release snapshot to restore.
if ($ReleaseFile -eq "") {
    Write-Host "`nAvailable release snapshots (newest first):" -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "ls -1t /home/${User}/releases/release_*.tar.gz 2>/dev/null | head -5"
    $ReleaseFile = Read-Host "Enter the release file name to restore (e.g. release_20260924T120000Z.tar.gz)"
    if ($ReleaseFile -eq "") { throw "No release file specified." }
}
if (-not $ReleaseFile.Contains("/")) { $ReleaseFile = "/home/${User}/releases/${ReleaseFile}" }

Write-Host "`n[1/3] Verifying release snapshot $ReleaseFile ..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "test -f '$ReleaseFile' || { echo 'Release snapshot not found.'; ls -1t /home/${User}/releases/ 2>/dev/null | head -5; exit 1; }"
if ($LASTEXITCODE -ne 0) { throw "Release snapshot not found: $ReleaseFile" }

Write-Host "`n[2/3] Restoring release and reloading PM2..." -ForegroundColor Yellow
$remoteScript = @'
set -e
APP_DIR="/home/admin/experimind-inventory"
RELEASE="__RELEASE__"
echo "Restoring $RELEASE over $APP_DIR ..."
tar --overwrite -xzf "$RELEASE" -C "$APP_DIR"
cd "$APP_DIR"
npm install --omit=dev --no-audit --silent
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
'@
$remoteScript = $remoteScript.Replace("__RELEASE__", $ReleaseFile)
$remoteScript = $remoteScript -replace "`r`n", "`n"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($remoteScript)
$b64 = [Convert]::ToBase64String($bytes)
ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "echo $b64 | base64 -d | bash"
if ($LASTEXITCODE -ne 0) { throw "Rollback failed during restore." }

Write-Host "`n[3/3] Checking application health..." -ForegroundColor Yellow
$healthScript = @'
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/health >/dev/null &&
     curl --fail --silent --show-error http://127.0.0.1:3001 >/dev/null; then
    echo "Rollback health checks passed."
    exit 0
  fi
  sleep 3
done
echo "Rollback health checks failed."
pm2 status
pm2 logs --nostream --lines 40
exit 1
'@
$healthScript = $healthScript -replace "`r`n", "`n"
$bytes2 = [System.Text.Encoding]::UTF8.GetBytes($healthScript)
$b642 = [Convert]::ToBase64String($bytes2)
ssh -o StrictHostKeyChecking=no -i $KeyFile "${User}@${ServerIP}" "echo $b642 | base64 -d | bash"
if ($LASTEXITCODE -ne 0) { throw "Rollback health checks failed." }

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ROLLBACK COMPLETE - release restored and healthy." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
