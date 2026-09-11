# Local public/uploads -> production Radore sunucusu
# Kullanim (proje kokunden):
#   .\scripts\deploy\sync-uploads.ps1
# Opsiyonel:
#   .\scripts\deploy\sync-uploads.ps1 -Part company
#   .\scripts\deploy\sync-uploads.ps1 -HostName 185.184.210.96 -User root

param(
  [string]$HostName = "185.184.210.96",
  [string]$User = "root",
  [string]$RemoteApp = "/var/www/tatil-villa",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\tatildeyiz_deploy",
  [ValidateSet("all", "company", "villas")]
  [string]$Part = "all"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$LocalUploads = Join-Path $RepoRoot "public\uploads"
$Target = "${User}@${HostName}"

$sshArgs = @("-o", "StrictHostKeyChecking=accept-new")
if (Test-Path $IdentityFile) {
  $sshArgs += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
}

if (-not (Test-Path $LocalUploads)) {
  throw "Local uploads yok: $LocalUploads"
}

Write-Host "==> Hedef: ${Target}:${RemoteApp}/public/uploads"
Write-Host "==> Kaynak: $LocalUploads (Part=$Part)"
if (Test-Path $IdentityFile) {
  Write-Host "==> SSH key: $IdentityFile"
} else {
  Write-Host "==> SSH key yok - sifre sorulacak"
}

& ssh @sshArgs $Target "mkdir -p ${RemoteApp}/public/uploads"

function Sync-Dir([string]$Name) {
  $src = Join-Path $LocalUploads $Name
  if (-not (Test-Path $src)) {
    Write-Host "    ATLANDI (yok): $Name"
    return
  }
  Write-Host "==> scp -r $Name ..."
  $scpArgs = $sshArgs + @("-r", $src, "${Target}:${RemoteApp}/public/uploads/")
  & scp @scpArgs
  Write-Host "    OK: $Name"
}

if ($Part -eq "all" -or $Part -eq "company") { Sync-Dir "company" }
if ($Part -eq "all" -or $Part -eq "villas") { Sync-Dir "villas" }

Write-Host "==> Izinler + dogrulama (uzak)"
$remoteCmd = @"
chmod -R a+rX ${RemoteApp}/public/uploads
echo -n 'company files: '; find ${RemoteApp}/public/uploads/company -type f 2>/dev/null | wc -l
echo -n 'villa dirs: '; ls -1 ${RemoteApp}/public/uploads/villas 2>/dev/null | wc -l
curl -sI http://127.0.0.1:3000/uploads/company/logo-1783080885848.svg | head -3
"@
& ssh @sshArgs $Target $remoteCmd

Write-Host ""
Write-Host "Bitti. Tarayicida https://www.tatildeyiz.com.tr hard refresh yapin."
Write-Host "Hala 404 ise Cloudflare Purge Cache."
