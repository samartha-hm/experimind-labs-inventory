$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$devRoot = Join-Path $repoRoot '.local-dev'
$binRoot = Join-Path $devRoot 'tools/node_modules/@embedded-postgres/windows-x64/native/bin'
$clusterRoot = Join-Path $devRoot 'postgres-data'
if (!(Test-Path (Join-Path $binRoot 'initdb.exe'))) { throw 'Install portable PostgreSQL tools as documented in docs/erp/28_DRAFT_KIT_BUILDER_RUNBOOK.md' }
New-Item -ItemType Directory -Path $devRoot -Force | Out-Null
if (!(Test-Path (Join-Path $clusterRoot 'PG_VERSION'))) {
  $randomBytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
  $dbPassword = [Convert]::ToHexString($randomBytes).ToLowerInvariant()
  $passwordPath = Join-Path $devRoot 'postgres-password.txt'
  Set-Content -LiteralPath $passwordPath -Value $dbPassword -NoNewline
  & (Join-Path $binRoot 'initdb.exe') -D $clusterRoot -U kitbuilder_dev --auth=scram-sha-256 --pwfile=$passwordPath --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  Add-Content -LiteralPath (Join-Path $clusterRoot 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = 55432"
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
  $jwtSecret = [Convert]::ToHexString($randomBytes).ToLowerInvariant()
  $envText = "NODE_ENV=development`nHOST=127.0.0.1`nPORT=3100`nAPP_URL=http://127.0.0.1:3100`nDATABASE_URL=postgres://kitbuilder_dev:$dbPassword@127.0.0.1:55432/experimind_kitbuilder_development`nKIT_BUILDER_TEST_DATABASE_URL=postgres://kitbuilder_dev:$dbPassword@127.0.0.1:55432/experimind_kitbuilder_test`nJWT_SECRET=$jwtSecret`nALLOW_GUEST=false`n"
  Set-Content -LiteralPath (Join-Path $repoRoot '.env.kit-builder-development') -Value $envText
}
& (Join-Path $binRoot 'pg_ctl.exe') -D $clusterRoot status
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $binRoot 'pg_ctl.exe') -D $clusterRoot -l (Join-Path $devRoot 'postgres.log') -w start
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL start failed' }
}
Push-Location $repoRoot
try {
  node --env-file=.env.kit-builder-development scripts/create-kit-builder-databases.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Development database creation failed' }
} finally { Pop-Location }
Write-Output 'Isolated PostgreSQL ready on 127.0.0.1:55432. No existing database was accessed.'
