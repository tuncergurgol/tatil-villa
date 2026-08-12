#!/usr/bin/env bash
# =============================================================================
# tatildeyiz-app — Produksiyon guncelleme / deploy scripti
# Calistirma (sunucuda, root veya deploy kullanicisi ile):
#   cd /var/www/tatil-villa
#   bash scripts/deploy/02-deploy-update.sh
#
# Hiz / zero-downtime:
#   - Build sirasinda PM2 CALISMAYA DEVAM EDER (site acik kalir)
#   - Build .next-staging klasorune alinir, sonra atomik swap + kisa restart
#   - npm ci yalnizca package-lock degistiyse (aksi halde npm install --prefer-offline)
#   - Agir CRM migrasyonu ve meta feed warm varsayilan olarak atlanir / arka planda
#
# Ortam bayraklari:
#   SKIP_DB_DUMP=1          Postgres dump atla (daha hizli)
#   FORCE_NPM_CI=1          Her zaman temiz npm ci
#   RUN_CRM_MIGRATE=1       migrate-customer-crm calistir
#   RUN_META_FEED_WARM=1    Meta katalog feed'i senkron isit
# =============================================================================

set -euo pipefail

# ---- Ayarlar (gerekirse ortam degiskeni ile ezilebilir) --------------------
APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
BRANCH="${BRANCH:-cursor/booking-quick-filters-ui}"
PM2_NAME="${PM2_NAME:-tatil-villa}"
DB_CONTAINER="${DB_CONTAINER:-tatil-villa-db}"
DB_USER="${DB_USER:-tatil}"
DB_NAME="${DB_NAME:-tatil_villa}"
DB_PASS_FILE="${DB_PASS_FILE:-/root/.db_pass}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/admin/login}"
SKIP_DB_DUMP="${SKIP_DB_DUMP:-0}"
FORCE_NPM_CI="${FORCE_NPM_CI:-0}"
RUN_CRM_MIGRATE="${RUN_CRM_MIGRATE:-0}"
RUN_META_FEED_WARM="${RUN_META_FEED_WARM:-0}"
STAGING_DIR=".next-staging"
LOCK_HASH_FILE=".deploy-package-lock.sha256"

STAMP="$(date +%F-%H%M%S)"

echo "=========================================================="
echo "  tatildeyiz-app deploy — $STAMP"
echo "  Dizin : $APP_DIR"
echo "  Dal   : $BRANCH"
echo "=========================================================="

cd "$APP_DIR"

# ---- 1) Yedekler -----------------------------------------------------------
echo ""
echo "==> [1/7] Yedekler aliniyor"

if [[ -f .env ]]; then
  cp .env ".env.bak.$STAMP"
  echo "    .env  ->  .env.bak.$STAMP"
else
  echo "    UYARI: .env bulunamadi (yedek atlandi)"
fi

DUMP_FILE="/root/pre-deploy-${STAMP}.dump"
if [[ "$SKIP_DB_DUMP" == "1" ]]; then
  echo "    Postgres dump atlandi (SKIP_DB_DUMP=1)"
  DUMP_FILE="(atlandi)"
elif docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  DB_PASS=""
  if [[ -f "$DB_PASS_FILE" ]]; then
    DB_PASS="$(tr -d '\r\n' < "$DB_PASS_FILE")"
  fi
  echo "    Postgres dump -> $DUMP_FILE"
  if docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
       pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$DUMP_FILE"; then
    echo "    Dump tamam ($(du -h "$DUMP_FILE" | cut -f1))"
  else
    echo "    HATA: Postgres dump alinamadi. Deploy durduruldu."
    echo "    (Sifreyi kontrol edin: $DB_PASS_FILE)"
    rm -f "$DUMP_FILE"
    exit 1
  fi
else
  echo "    HATA: '$DB_CONTAINER' konteyneri calismiyor. Deploy durduruldu."
  exit 1
fi

# ---- 2) Git: cek + sert sifirla --------------------------------------------
echo ""
echo "==> [2/7] Git guncelleniyor ($BRANCH)"
echo "    UYARI: Sunucudaki elle yapilan degisiklikler (git-disi yamalar)"
echo "           git surumu ile DEGISTIRILECEK."

# Sunucudaki lokal degisiklikleri once bir stash'e alalim (geri donus icin arsiv)
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -u -m "pre-deploy-$STAMP" || true
  echo "    Yerel degisiklikler stash'e alindi (git stash list ile gorebilirsiniz)"
fi

git fetch origin --prune
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
echo "    HEAD: $(git rev-parse --short HEAD) — $(git log -1 --format='%s' | cut -c1-70)"

# ---- 3) Bagimliliklar ------------------------------------------------------
echo ""
echo "==> [3/7] Bagimliliklar kuruluyor"
NEED_NPM_CI=0
if [[ "$FORCE_NPM_CI" == "1" ]]; then
  NEED_NPM_CI=1
elif [[ ! -d node_modules ]]; then
  NEED_NPM_CI=1
elif [[ -f package-lock.json ]]; then
  NEW_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
  OLD_HASH=""
  if [[ -f "$LOCK_HASH_FILE" ]]; then
    OLD_HASH="$(tr -d ' \r\n' < "$LOCK_HASH_FILE" || true)"
  fi
  if [[ "$NEW_HASH" != "$OLD_HASH" ]]; then
    NEED_NPM_CI=1
  fi
fi

if [[ "$NEED_NPM_CI" == "1" ]]; then
  echo "    npm ci (package-lock degisti veya node_modules yok)"
  rm -rf node_modules
  if [[ -f package-lock.json ]]; then
    npm ci
    sha256sum package-lock.json | awk '{print $1}' > "$LOCK_HASH_FILE"
  else
    echo "    package-lock.json yok, npm install kullaniliyor"
    npm install
  fi
else
  echo "    package-lock ayni — npm ci atlandi (hizli yol)"
  # Guvenli tamamlayici: eksik paket varsa tamamla
  npm install --prefer-offline --no-audit --no-fund 2>/dev/null || true
fi

EXPECTED_NEXT="$(node -e "console.log(require('./package.json').dependencies.next)" 2>/dev/null || true)"
INSTALLED_NEXT="$(node -e "console.log(require('next/package.json').version)" 2>/dev/null || echo 'YOK')"
echo "    package.json next: ${EXPECTED_NEXT:-?}"
echo "    kurulu next     : $INSTALLED_NEXT"
if [[ -n "${EXPECTED_NEXT:-}" && "$INSTALLED_NEXT" != "$EXPECTED_NEXT" ]]; then
  echo "    HATA: Next surumu eslesmiyor (beklenen $EXPECTED_NEXT, kurulu $INSTALLED_NEXT)."
  echo "    package-lock.json / npm ci sonucunu kontrol edin."
  exit 1
fi

# ---- 4) Prisma generate + migrate ------------------------------------------
echo ""
echo "==> [4/7] Prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy
npx tsx scripts/seed-agency-message-scheduled-templates.ts || echo "    UYARI: zamanlanmış mesaj şablon seed atlandı"
if [[ "$RUN_CRM_MIGRATE" == "1" ]]; then
  npx tsx scripts/migrate-customer-crm.ts || echo "    UYARI: CRM müşteri migrasyonu atlandı"
else
  echo "    CRM migrasyonu atlandi (RUN_CRM_MIGRATE=1 ile acilir)"
fi

# ---- 5) Build (canli .next dokunulmaz) --------------------------------------
echo ""
echo "==> [5/7] Next build -> $STAGING_DIR (PM2 acik kalir)"
rm -rf "$STAGING_DIR"
NEXT_DIST_DIR="$STAGING_DIR" npm run build
if [[ ! -f "$STAGING_DIR/BUILD_ID" ]]; then
  echo "    HATA: $STAGING_DIR/BUILD_ID olusmadi, build basarisiz. Canli .next bozulmadi."
  exit 1
fi
echo "    BUILD_ID=$(cat "$STAGING_DIR/BUILD_ID")"

# Atomik swap — kisa kesinti yalnizca burada
echo "    .next swap + PM2 restart"
rm -rf .next-prev
if [[ -d .next ]]; then
  mv .next .next-prev
fi
mv "$STAGING_DIR" .next

# ---- 6) PM2 restart --------------------------------------------------------
echo ""
echo "==> [6/7] PM2 yeniden baslatiliyor ($PM2_NAME)"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  echo "    UYARI: '$PM2_NAME' PM2 process bulunamadi, yeni baslatiliyor"
  pm2 start npm --name "$PM2_NAME" -- start
fi
pm2 save

# Eski build'i temizle (basarili restart sonrasi)
rm -rf .next-prev

# ---- 7) Saglik kontrolu ----------------------------------------------------
echo ""
echo "==> [7/8] Saglik kontrolu ($HEALTH_URL)"
sleep 3
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" || "$HTTP_CODE" == "307" ]]; then
  echo "    OK — HTTP $HTTP_CODE"
else
  echo "    UYARI: Beklenmeyen HTTP $HTTP_CODE. Loglari kontrol edin:"
  echo "           pm2 logs $PM2_NAME --lines 50"
fi

echo ""
echo "==> [7b/8] Meta katalog feed"
if [[ "$RUN_META_FEED_WARM" == "1" ]]; then
  if npx tsx scripts/warm-meta-catalog-feed.ts; then
    for FEED_HOST in www.tatildeyiz.com.tr www.tatilvillacisi.com www.balayivillacisi.com; do
      FEED_STATS="$(curl -s -o /dev/null -w '%{http_code} %{time_total}s' -m 180 -H "Host: ${FEED_HOST}" "http://127.0.0.1:3000/feeds/meta-catalog.xml" || echo '000 0s')"
      echo "    ${FEED_HOST} -> ${FEED_STATS}"
    done
  else
    echo "    UYARI: Meta feed warm atlandi"
  fi
else
  echo "    Atlandi (RUN_META_FEED_WARM=1 ile acilir) — arka planda tetikleniyor"
  (npx tsx scripts/warm-meta-catalog-feed.ts >/var/log/tatil-villa-meta-feed-warm.log 2>&1 || true) &
  disown || true
fi

# ---- 8) Cron (blog AI dahil) ------------------------------------------------
echo ""
echo "==> [8/8] Cron guncelleniyor (blog-generate dahil)"
if [[ -f scripts/deploy/04-setup-cron.sh ]]; then
  bash scripts/deploy/04-setup-cron.sh
else
  echo "    UYARI: scripts/deploy/04-setup-cron.sh bulunamadi"
fi

echo ""
echo "=========================================================="
echo "  DEPLOY TAMAMLANDI — $STAMP"
echo "  Yedekler:"
echo "    - .env.bak.$STAMP"
echo "    - $DUMP_FILE"
echo "  Geri alma gerekirse dump'i geri yukleyin ve onceki commit'e"
echo "  git reset --hard <eski_hash> yapip yeniden build alin."
echo ""
echo "  Hatirlatma: public/uploads Git'te yoktur."
echo "  Logo/villa 404 ise PC'den sync-uploads.ps1 calistirin"
echo "  (bkz. scripts/deploy/sync-uploads.md)."
if [[ ! -d "$APP_DIR/public/uploads/company" ]]; then
  echo "  UYARI: public/uploads/company YOK — gorseller icin sync gerekli."
fi
echo "=========================================================="
