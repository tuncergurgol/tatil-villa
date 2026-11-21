# OneDrive -> Yerel NTFS + Google Drive senkronu kurulumu
# Google Drive "Stream" (G:\) uzerinde npm/prisma calismaz (sanal dosya sistemi).
# Cozum: Projeyi yerel diske al, Google Drive masaustu uygulamasinda bu klasoru senkronize et.
#
# Kullanim: powershell -ExecutionPolicy Bypass -File scripts/google-drive-migrate.ps1

$ErrorActionPreference = "Stop"

$source = "C:\Users\BARAN\OneDrive\Desktop\PROJELER"
$localRoot = Join-Path $env:USERPROFILE "Projects\PROJELER"
$cloudBackup = $null
$gdrive = Get-ChildItem "G:\" -Directory | Where-Object { $_.Name -like "Drive*" } | Select-Object -First 1
if ($gdrive) {
  $cloudBackup = Join-Path $gdrive.FullName "Desktop\PROJELER"
}

Write-Host "Kaynak (OneDrive): $source"
Write-Host "Hedef (yerel NTFS): $localRoot"
if ($cloudBackup) {
  Write-Host "Bulut yedek (G:): $cloudBackup"
}

Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
robocopy $source $localRoot /E /XD node_modules .next out coverage .vercel /NFL /NDL /NJH /NJS /NC /NS /NP
if ($LASTEXITCODE -ge 8) {
  throw "Yerel kopya basarisiz (kod: $LASTEXITCODE)"
}

if ($cloudBackup) {
  New-Item -ItemType Directory -Path (Split-Path $cloudBackup) -Force | Out-Null
  robocopy $source $cloudBackup /E /XD node_modules .next out coverage .vercel /NFL /NDL /NJH /NJS /NC /NS /NP
}

$project = Join-Path $localRoot "tatil-villa"
Set-Location $project
npm install
npx prisma generate

Write-Host ""
Write-Host "=== Tamamlandi ==="
Write-Host "Gelistirme klasoru: $project"
Write-Host ""
Write-Host "Google Drive senkronu icin:"
Write-Host "  1. Google Drive masaustu > Ayarlar > Google Drive"
Write-Host "  2. 'Bilgisayarimdan yedekle ve senkronize et' veya klasor ekle"
Write-Host "  3. Su klasoru secin: $(Split-Path $localRoot)"
Write-Host "  4. node_modules ve .next zaten .gitignore'da; mumkunse Drive'da da haric tutun"
Write-Host ""
Write-Host "Cursor: File > Open Folder > $project"
