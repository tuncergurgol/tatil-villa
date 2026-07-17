#!/usr/bin/env bash
# =============================================================================
# tatildeyiz-app — Produksiyon guncelleme / deploy scripti
# Calistirma (sunucuda, root veya deploy kullanicisi ile):
#   cd /var/www/tatil-villa
#   bash scripts/deploy/02-deploy-update.sh
#
# Ne yapar (Option A - GitHub pull + migrate + build + pm2 restart):
#   1. .env yedegi + Postgres dump yedegi alir
#   2. origin'den ilgili dal'i ceker ve SERT sifirlar (git reset --hard)
#      -> Sunucudaki elle yapilan yamalar (BookingStatus enum, sed edit'leri)
#         git'teki dogru surumle DEGISTIRILIR. Bu KASITLIDIR.
#   3. npm ci ile bagimliliklari kurar
#   4. prisma generate + prisma migrate deploy (DB migration calisir)
#   5. next build
#   6. pm2 restart + save
#   7. localhost:3000/admin/login dogrulamasi
#
# Idempotent ve guvenlidir: hata olursa aninda durur (set -euo pipefail).
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
if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
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
echo "==> [3/7] Bagimliliklar kuruluyor (npm ci)"
if [[ -f package-lock.json ]]; then
  npm ci
else
  echo "    package-lock.json yok, npm install kullaniliyor"
  npm install
fi

# ---- 4) Prisma generate + migrate ------------------------------------------
echo ""
echo "==> [4/7] Prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

# ---- 5) Build --------------------------------------------------------------
echo ""
echo "==> [5/7] Next build (npm run build)"
npm run build
if [[ ! -f .next/BUILD_ID ]]; then
  echo "    HATA: .next/BUILD_ID olusmadi, build basarisiz. pm2 restart atlandi."
  exit 1
fi
echo "    BUILD_ID=$(cat .next/BUILD_ID)"

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

# ---- 7) Saglik kontrolu ----------------------------------------------------
echo ""
echo "==> [7/7] Saglik kontrolu ($HEALTH_URL)"
sleep 4
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" || "$HTTP_CODE" == "307" ]]; then
  echo "    OK — HTTP $HTTP_CODE"
else
  echo "    UYARI: Beklenmeyen HTTP $HTTP_CODE. Loglari kontrol edin:"
  echo "           pm2 logs $PM2_NAME --lines 50"
fi

echo ""
echo "=========================================================="
echo "  DEPLOY TAMAMLANDI — $STAMP"
echo "  Yedekler:"
echo "    - .env.bak.$STAMP"
echo "    - $DUMP_FILE"
echo "  Geri alma gerekirse dump'i geri yukleyin ve onceki commit'e"
echo "  git reset --hard <eski_hash> yapip yeniden build alin."
echo "=========================================================="
