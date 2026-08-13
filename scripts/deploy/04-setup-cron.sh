#!/usr/bin/env bash
# Radore tatildeyiz-app — arka plan cron işleri (root)
# Kullanım: bash scripts/deploy/04-setup-cron.sh

set -euo pipefail

APP_DIR="/var/www/tatil-villa"
ENV_FILE="$APP_DIR/.env"
BASE_URL="http://127.0.0.1:3000"
LOG_DIR="/var/log/tatil-villa-cron"
BACKUP_SCRIPT="${APP_DIR}/scripts/deploy/backup-to-gdrive.sh"

echo "==> Cron kurulumu: $APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "HATA: $ENV_FILE bulunamadı" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

if ! grep -q '^CRON_SECRET=' "$ENV_FILE"; then
  SECRET="$(openssl rand -hex 32)"
  printf '\nCRON_SECRET=%s\n' "$SECRET" >> "$ENV_FILE"
  echo "    CRON_SECRET oluşturuldu (.env)"
else
  echo "    CRON_SECRET zaten tanımlı"
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "HATA: CRON_SECRET boş" >&2
  exit 1
fi

CRON_FILE="$(mktemp)"
# Eski tatil-villa satırlarını temizle (meta feed / backup duplicate birikimini önle)
crontab -l 2>/dev/null \
  | grep -v 'tatil-villa cron' \
  | grep -v '/api/cron/' \
  | grep -v 'warm-meta-catalog-feed' \
  | grep -v 'backup-to-gdrive' \
  | grep -v 'feeds/meta-catalog.xml' \
  > "$CRON_FILE" || true

cat >> "$CRON_FILE" <<EOF
# tatil-villa cron — takvim/fiyat otomatik güncelleme (her 15 dk; villa başına aralık admin ayarından)
*/15 * * * * curl -fsS -m 900 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/calendar-price-transfer" >>"${LOG_DIR}/calendar-price-transfer.log" 2>&1
# tatil-villa cron — harici villa link senkronu (saatte bir)
15 * * * * curl -fsS -m 900 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/villa-external-sync" >>"${LOG_DIR}/villa-external-sync.log" 2>&1
# tatil-villa cron — yapay zeka blog üretimi (saatte bir; yayın sıklığı admin ayarından)
5 * * * * curl -fsS -m 900 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/blog-generate" >>"${LOG_DIR}/blog-generate.log" 2>&1
# tatil-villa cron — zamanlanmış rezervasyon mesajları (saat başı; 11.4 yorum, 40.2 havuz ısıtma vb.)
0 * * * * curl -fsS -m 300 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/booking-scheduled-messages" >>"${LOG_DIR}/booking-scheduled-messages.log" 2>&1
# tatil-villa cron — planlanmış toplu WhatsApp kampanyaları (5 dakikada bir)
*/5 * * * * curl -fsS -m 300 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/bulk-whatsapp" >>"${LOG_DIR}/bulk-whatsapp.log" 2>&1
# tatil-villa cron — konut belge kontrolü (her gün 07:15; geçersiz belgeleri sil + rapor maili)
15 7 * * * curl -fsS -m 900 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/konut-belge-check" >>"${LOG_DIR}/konut-belge-check.log" 2>&1
# tatil-villa cron — giriş+1 gün konaklama faturası ve ev sahibi ödemesi Excel maili (her gün 08:55)
55 8 * * * curl -fsS -m 300 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/daily-check-in-reports" >>"${LOG_DIR}/daily-check-in-reports.log" 2>&1
# tatil-villa cron — Meta katalog feed önbellek (saatte bir; Commerce Manager doğrulayıcısı için hızlı XML)
45 * * * * cd ${APP_DIR} && npx tsx scripts/warm-meta-catalog-feed.ts >>"${LOG_DIR}/meta-catalog-feed-warm.log" 2>&1 && for FEED_HOST in www.tatildeyiz.com.tr www.tatilvillacisi.com www.balayivillacisi.com; do curl -fsS -m 180 -H "Host: \${FEED_HOST}" "http://127.0.0.1:3000/feeds/meta-catalog.xml" >/dev/null; done
# tatil-villa cron — SQL + site dosyaları Google Drive yedek (her gece 04:30 Europe/Istanbul)
30 4 * * * /bin/bash ${BACKUP_SCRIPT} >>"${LOG_DIR}/gdrive-backup.log" 2>&1
EOF

crontab "$CRON_FILE"
rm -f "$CRON_FILE"

echo "==> PM2 env yenileme"
cd "$APP_DIR"
pm2 restart tatil-villa --update-env >/dev/null

echo "==> Cron test (calendar-price-transfer)"
HTTP_CODE="$(curl -s -o /tmp/tatil-cron-test.json -w '%{http_code}' -m 120 -H "x-cron-secret: ${CRON_SECRET}" "${BASE_URL}/api/cron/calendar-price-transfer" || echo 000)"
echo "    HTTP ${HTTP_CODE} — $(head -c 200 /tmp/tatil-cron-test.json 2>/dev/null || true)"
rm -f /tmp/tatil-cron-test.json

echo "=========================================================="
echo "  Cron kuruldu."
echo "  Log: ${LOG_DIR}/"
echo "  Takvim/fiyat: her 15 dakikada bir tetiklenir."
echo "  Blog AI    : saatte bir tetiklenir (sıklık admin ayarından)."
echo "  Zamanlı msg: saat başı tetiklenir (11.4 yorum 11:00, 40.2 havuz 14:00 vb.)."
echo "  Belge kontrol: her gün 07:15'te tetiklenir."
echo "  Fatura/ödeme : her gün 08:55'te Excel maili gider (kayıt yoksa da bilgilendirme)."
echo "  Meta feed  : saat :45'te önbellek yenilenir."
echo "  GDrive yedek: her gece 04:30 (SQL + dosyalar ayrı)."
echo "=========================================================="
