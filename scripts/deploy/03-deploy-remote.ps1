# Local Windows -> production deploy
# Kullanim (proje kokunden):
#   .\scripts\deploy\03-deploy-remote.ps1
# Opsiyonel:
#   .\scripts\deploy\03-deploy-remote.ps1 -Branch cursor/booking-quick-filters-ui

param(
  [string]$HostName = "185.184.210.96",
  [string]$User = "root",
  [string]$RemoteApp = "/var/www/tatil-villa",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\tatildeyiz_deploy",
  [string]$Branch = "cursor/booking-quick-filters-ui"
)

$ErrorActionPreference = "Stop"
$Target = "${User}@${HostName}"

if (-not (Test-Path $IdentityFile)) {
  throw "SSH key bulunamadi: $IdentityFile"
}

$sshArgs = @(
  "-i", $IdentityFile,
  "-o", "IdentitiesOnly=yes",
  "-o", "StrictHostKeyChecking=accept-new"
)

Write-Host "==> Deploy: $Target:$RemoteApp (BRANCH=$Branch)"
& ssh @sshArgs $Target "cd $RemoteApp && BRANCH='$Branch' bash scripts/deploy/02-deploy-update.sh"
if ($LASTEXITCODE -ne 0) {
  throw "Deploy basarisiz (exit=$LASTEXITCODE)"
}
Write-Host "==> Deploy tamam"
