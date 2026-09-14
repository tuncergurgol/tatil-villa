#!/usr/bin/env bash
# Yerel makinede Google Drive OAuth token üretir (sunucuya yapıştırmak için).
# Kullanım:
#   bash scripts/deploy/authorize-gdrive-local.sh
#
# Çıktıdaki JSON'u sunucuda:
#   RCLONE_DRIVE_TOKEN='...' bash scripts/deploy/08-setup-gdrive-backup.sh

set -euo pipefail

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone yok — https://rclone.org/downloads/ adresinden kurun." >&2
  echo "Windows: winget install Rclone.Rclone" >&2
  exit 1
fi

echo "Tarayıcı açılacak; Google hesabınızla giriş yapıp izin verin."
echo "İşlem bitince token JSON buraya yazılacak."
echo ""
rclone authorize "drive"
