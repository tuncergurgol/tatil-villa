#!/usr/bin/env bash
# =============================================================================
# WAHA (Bildirim WhatsApp) kurulum / güncelleme scripti — tatildeyiz-app
# =============================================================================
# Bu servis, rezervasyon bildirimleri (müşteri) WhatsApp hattı içindir ve
# Evolution WhatsApp'tan (takvim otomasyonu) BAĞIMSIZ çalışır.
#
# Uygulama tarafı ayarları (Admin → Acente → Bildirim WhatsApp):
#   - WAHA API Sunucu Adresi : http://localhost:3001
#   - WAHA API Anahtarı       : (aşağıdaki WAHA_API_KEY ile aynı olmalı)
#   - Oturum Adı              : default
#
# Çalıştırma (sunucuda root/deploy ile):
#   bash scripts/deploy/waha-setup.sh
# =============================================================================

set -euo pipefail

CONTAINER_NAME="waha"
IMAGE="devlikeapro/waha"
HOST_PORT="3001"        # host portu (uygulama http://localhost:3001 ile bağlanır)
SESSIONS_DIR="/opt/waha/sessions"

# API anahtarı: CompanySettings.wahaApiKey ile AYNI olmalı.
# Ortam değişkeni ile override edilebilir: WAHA_API_KEY=... bash waha-setup.sh
WAHA_API_KEY="${WAHA_API_KEY:-ac7c4526f77f4320ba8497c78a3f2880}"

echo "==> WAHA sessions dizini: $SESSIONS_DIR"
mkdir -p "$SESSIONS_DIR"

echo "==> Docker imajı çekiliyor ($IMAGE)"
docker pull "$IMAGE"

echo "==> Eski konteyner temizleniyor (varsa)"
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

echo "==> WAHA konteyneri başlatılıyor"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:3000" \
  -v "${SESSIONS_DIR}:/app/.sessions" \
  --add-host=host.docker.internal:host-gateway \
  -e "WAHA_API_KEY=${WAHA_API_KEY}" \
  -e "WHATSAPP_DEFAULT_ENGINE=WEBJS" \
  -e "WHATSAPP_RESTART_ALL_SESSIONS=True" \
  -e "WAHA_PRINT_QR=False" \
  -e "TZ=Europe/Istanbul" \
  "$IMAGE"

echo "==> Sağlık kontrolü (max ~30sn)"
for i in $(seq 1 15); do
  CODE="$(curl -s -m 3 -o /dev/null -w '%{http_code}' \
    -H "X-Api-Key: ${WAHA_API_KEY}" \
    "http://127.0.0.1:${HOST_PORT}/api/sessions" || echo 000)"
  if [[ "$CODE" == "200" ]]; then
    echo "    OK — WAHA API yanıt veriyor (HTTP 200)"
    break
  fi
  echo "    bekleniyor... ($i) HTTP $CODE"
  sleep 2
done

echo ""
echo "=========================================================="
echo "  WAHA kurulum tamam"
echo "  Adres : http://localhost:${HOST_PORT} (yalnızca localhost)"
echo "  Oturum: default"
echo "  Admin panelde 'QR ile Bağlan' ile telefonu bağlayın."
echo "=========================================================="
