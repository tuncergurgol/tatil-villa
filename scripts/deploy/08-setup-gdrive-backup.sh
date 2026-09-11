#!/usr/bin/env bash
# =============================================================================
# tatildeyiz-app — Google Drive (rclone) yedek kurulumu
#
# Kullanım (sunucuda, root):
#   bash scripts/deploy/08-setup-gdrive-backup.sh
#
# İlk kurulumda Google OAuth gerekir. İki yol:
#   A) Bu script interaktif: tarayıcı URL'si basar, kodu yapıştırırsınız
#   B) Yerelde: rclone authorize "drive" → token JSON'u sunucuya
#      RCLONE_DRIVE_TOKEN='{"access_token":...}' bash scripts/deploy/08-setup-gdrive-backup.sh
#
# Cron: 04-setup-cron.sh her gece 04:30'da backup-to-gdrive.sh çalıştırır.
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
GDRIVE_ROOT="${GDRIVE_ROOT:-tatildeyiz-yedek}"
RCLONE_CONF_DIR="/root/.config/rclone"
RCLONE_CONF="${RCLONE_CONF_DIR}/rclone.conf"
BACKUP_SCRIPT="${APP_DIR}/scripts/deploy/backup-to-gdrive.sh"

echo "==> Google Drive yedek kurulumu"

# ---- rclone kurulumu ----
if ! command -v rclone >/dev/null 2>&1; then
  echo "    rclone kuruluyor..."
  curl -fsSL https://rclone.org/install.sh | bash
else
  echo "    rclone mevcut: $(rclone version | head -n 1)"
fi

mkdir -p "$RCLONE_CONF_DIR"
chmod 700 "$RCLONE_CONF_DIR"

ensure_remote() {
  if rclone listremotes 2>/dev/null | grep -qx "${RCLONE_REMOTE}:"; then
    echo "    Remote '${RCLONE_REMOTE}:' zaten tanımlı"
    return 0
  fi

  if [[ -n "${RCLONE_DRIVE_TOKEN:-}" ]]; then
    echo "    RCLONE_DRIVE_TOKEN ile remote oluşturuluyor..."
    # Token tek satır JSON olmalı
    rclone config create "$RCLONE_REMOTE" drive \
      scope=drive \
      token="$RCLONE_DRIVE_TOKEN" \
      config_is_local=false \
      --non-interactive
    return 0
  fi

  echo ""
  echo "=========================================================="
  echo "  Google Drive yetkilendirme gerekli"
  echo "=========================================================="
  echo "  1) Bu sunucuda şu komutu çalıştırın (interaktif):"
  echo "       rclone config"
  echo "     → n (new) → adı: gdrive → Storage: drive → defaults"
  echo "     → tarayıcıda Google hesabı ile onaylayın"
  echo ""
  echo "  2) VEYA bilgisayarınızda:"
  echo "       rclone authorize \"drive\""
  echo "     Çıkan JSON token'ı sunucuya taşıyın:"
  echo "       RCLONE_DRIVE_TOKEN='...' bash scripts/deploy/08-setup-gdrive-backup.sh"
  echo "=========================================================="

  # Headless otomatik deneme: config create + auto config URL
  if [[ "${RCLONE_AUTO_CONFIG:-0}" == "1" ]]; then
    echo "    RCLONE_AUTO_CONFIG=1 — rclone config create başlıyor..."
    rclone config create "$RCLONE_REMOTE" drive scope=drive config_is_local=false
  else
    return 1
  fi
}

if ! ensure_remote; then
  echo "HATA: Google Drive remote kurulamadı (yetkilendirme bekleniyor)." >&2
  exit 2
fi

chmod 600 "$RCLONE_CONF" 2>/dev/null || true

echo "==> Drive klasörleri"
rclone mkdir "${RCLONE_REMOTE}:${GDRIVE_ROOT}/sql" || true
rclone mkdir "${RCLONE_REMOTE}:${GDRIVE_ROOT}/dosyalar" || true

echo "==> Bağlantı testi"
rclone about "${RCLONE_REMOTE}:" || {
  echo "HATA: Drive erişimi başarısız (token süresi dolmuş olabilir)." >&2
  exit 1
}

echo "==> Backup scripti çalıştırılabilir"
chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true
chmod +x "${APP_DIR}/scripts/deploy/08-setup-gdrive-backup.sh" 2>/dev/null || true

echo "==> Cron güncellemesi (04:30 yedek satırı)"
if [[ -f "${APP_DIR}/scripts/deploy/04-setup-cron.sh" ]]; then
  bash "${APP_DIR}/scripts/deploy/04-setup-cron.sh"
else
  echo "    UYARI: 04-setup-cron.sh bulunamadı — cron elle ekleyin"
fi

echo "=========================================================="
echo "  Google Drive yedek hazır."
echo "  Remote : ${RCLONE_REMOTE}:"
echo "  Klasör : ${GDRIVE_ROOT}/sql  ve  ${GDRIVE_ROOT}/dosyalar"
echo "  İlk yedek: bash ${BACKUP_SCRIPT}"
echo "=========================================================="
