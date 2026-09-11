# OneDrive repo -> yerel Projects kopyasina senkron (gelistirme sunucusu)
# Kullanim: powershell -ExecutionPolicy Bypass -File scripts/sync-to-projects.ps1

$ErrorActionPreference = "Stop"

$source = Split-Path $PSScriptRoot -Parent
$target = Join-Path $env:USERPROFILE "Projects\PROJELER\tatil-villa"

if (-not (Test-Path $source)) {
  throw "Kaynak bulunamadi: $source"
}

New-Item -ItemType Directory -Path $target -Force | Out-Null

$excludeDirs = @("node_modules", ".next", "out", "coverage", ".vercel", ".git")

Write-Host "Kaynak: $source"
Write-Host "Hedef:  $target"

robocopy $source $target /E /XD $excludeDirs /NFL /NDL /NJH /NJS /NC /NS /NP
$code = $LASTEXITCODE
if ($code -ge 8) {
  throw "Senkron basarisiz (kod: $code)"
}

Write-Host "Senkron tamamlandi."
