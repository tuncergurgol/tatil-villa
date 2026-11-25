# Yerel NTFS proje kokunde calistirin (G:\ uzerinde degil).
# Kullanim: powershell -ExecutionPolicy Bypass -File scripts/google-drive-setup.ps1

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$drive = [System.IO.Path]::GetPathRoot($projectRoot)

if ($drive -eq "G:\") {
  throw @"
Proje Google Drive sanal diskinde (G:\). npm ve Prisma burada calismaz.
Once scripts/google-drive-migrate.ps1 ile projeyi %USERPROFILE%\Projects\PROJELER altina tasiyin.
"@
}

Set-Location $projectRoot
npm install
npx prisma generate

Write-Host "Yerel gelistirme ortami hazir: $projectRoot"
