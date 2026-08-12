#!/usr/bin/env bash
# =============================================================================
# tatildeyiz-app — Produksiyon guncelleme / deploy scripti
# Calistirma (sunucuda, root veya deploy kullanicisi ile):
#   cd /var/www/tatil-villa
#   bash scripts/deploy/02-deploy-update.sh
#
# Hiz / zero-downtime:
#   1) Once git cekilir, script KENDINI YENIDEN CALISTIRIR (eski kopya kalmaz)
#   2) Build sirasinda PM2 acik kalir (.next-staging + atomik swap)
#   3) Next cache korunur (incremental build)
#   4) npm ci / prisma generate / cron / seed yalnizca degisince
#   5) DB dump varsayilan KAPALI (RUN_DB_DUMP=1 ile acilir)
#
# Ortam bayraklari:
#   RUN_DB_DUMP=1           Postgres dump al (varsayilan kapali)
#   FORCE_NPM_CI=1          Her zaman temiz npm ci
#   RUN_CRM_MIGRATE=1       migrate-customer-crm calistir
#   RUN_META_FEED_WARM=1    Meta katalog feed'i senkron isit
#   RUN_MESSAGE_SEED=1      Zamanlanmis mesaj sablon seed
#   RUN_CRON_SETUP=1        Cron scriptini zorla calistir
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
BRANCH="${BRANCH:-cursor/booking-quick-filters-ui}"
PM2_NAME="${PM2_NAME:-tatil-villa}"
DB_CONTAINER="${DB_CONTAINER:-tatil-villa-db}"
DB_USER="${DB_USER:-tatil}"
DB_NAME="${DB_NAME:-tatil_villa}"
DB_PASS_FILE="${DB_PASS_FILE:-/root/.db_pass}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/admin/login}"
RUN_DB_DUMP="${RUN_DB_DUMP:-0}"
FORCE_NPM_CI="${FORCE_NPM_CI:-0}"
RUN_CRM_MIGRATE="${RUN_CRM_MIGRATE:-0}"
RUN_META_FEED_WARM="${RUN_META_FEED_WARM:-0}"
RUN_MESSAGE_SEED="${RUN_MESSAGE_SEED:-0}"
RUN_CRON_SETUP="${RUN_CRON_SETUP:-0}"
STAGING_DIR=".next-staging"
LOCK_HASH_FILE=".deploy-package-lock.sha256"
PRISMA_HASH_FILE=".deploy-prisma-schema.sha256"
CRON_HASH_FILE=".deploy-cron-script.sha256"

cd "$APP_DIR"

# ---- Boot: git guncelle + script'i yeniden calistir -------------------------
if [[ "${DEPLOY_BOOTED:-0}" != "1" ]]; then
  echo "=========================================================="
  echo "  tatildeyiz-app deploy — boot (git + re-exec)"
  echo "  Dizin : $APP_DIR"
  echo "  Dal   : $BRANCH"
  echo "=========================================================="

  if ! git diff --quiet || ! git diff --cached --quiet; then
    git stash push -u -m "pre-deploy-boot-$(date +%F-%H%M%S)" || true
    echo "    Yerel degisiklikler stash'e alindi"
  fi

  git fetch origin --prune
  git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
  echo "    HEAD: $(git rev-parse --short HEAD) — $(git log -1 --format='%s' | cut -c1-70)"
  echo "    Guncel deploy scripti ile yeniden baslatiliyor..."
  export DEPLOY_BOOTED=1
  exec bash "$APP_DIR/scripts/deploy/02-deploy-update.sh" "$@"
fi

STAMP="$(date +%F-%H%M%S)"

echo "=========================================================="
echo "  tatildeyiz-app deploy — $STAMP"
echo "  Dizin : $APP_DIR"
echo "  Dal   : $BRANCH (zaten guncel)"
echo "=========================================================="

# ---- 1) Yedekler -----------------------------------------------------------
echo ""
echo "==> [1/6] Yedekler"
if [[ -f .env ]]; then
  cp .env ".env.bak.$STAMP"
  echo "    .env  ->  .env.bak.$STAMP"
else
  echo "    UYARI: .env bulunamadi (yedek atlandi)"
fi

DUMP_FILE="(atlandi)"
if [[ "$RUN_DB_DUMP" == "1" ]]; then
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
      rm -f "$DUMP_FILE"
      exit 1
    fi
  else
    echo "    HATA: '$DB_CONTAINER' konteyneri calismiyor. Deploy durduruldu."
    exit 1
  fi
else
  echo "    Postgres dump atlandi (hiz icin; RUN_DB_DUMP=1 ile acilir)"
fi

# ---- 2) Bagimliliklar ------------------------------------------------------
echo ""
echo "==> [2/6] Bagimliliklar"
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
    npm ci --no-audit --no-fund
    sha256sum package-lock.json | awk '{print $1}' > "$LOCK_HASH_FILE"
  else
    npm install --no-audit --no-fund
  fi
else
  echo "    package-lock ayni — npm ci atlandi"
fi

EXPECTED_NEXT="$(node -e "console.log(require('./package.json').dependencies.next)" 2>/dev/null || true)"
INSTALLED_NEXT="$(node -e "console.log(require('next/package.json').version)" 2>/dev/null || echo 'YOK')"
echo "    package.json next: ${EXPECTED_NEXT:-?} | kurulu: $INSTALLED_NEXT"
if [[ -n "${EXPECTED_NEXT:-}" && "$INSTALLED_NEXT" != "$EXPECTED_NEXT" ]]; then
  echo "    HATA: Next surumu eslesmiyor."
  exit 1
fi

# ---- 3) Prisma -------------------------------------------------------------
echo ""
echo "==> [3/6] Prisma"
SCHEMA_HASH="$(sha256sum prisma/schema.prisma | awk '{print $1}')"
OLD_SCHEMA_HASH=""
if [[ -f "$PRISMA_HASH_FILE" ]]; then
  OLD_SCHEMA_HASH="$(tr -d ' \r\n' < "$PRISMA_HASH_FILE" || true)"
fi

if [[ "$SCHEMA_HASH" != "$OLD_SCHEMA_HASH" || ! -d node_modules/.prisma ]]; then
  echo "    prisma generate"
  npx prisma generate
  echo "$SCHEMA_HASH" > "$PRISMA_HASH_FILE"
else
  echo "    prisma generate atlandi (schema degismedi)"
fi

npx prisma migrate deploy

if [[ "$RUN_MESSAGE_SEED" == "1" ]]; then
  npx tsx scripts/seed-agency-message-scheduled-templates.ts || echo "    UYARI: mesaj seed atlandi"
else
  echo "    mesaj seed atlandi (RUN_MESSAGE_SEED=1 ile acilir)"
fi

if [[ "$RUN_CRM_MIGRATE" == "1" ]]; then
  npx tsx scripts/migrate-customer-crm.ts || echo "    UYARI: CRM migrasyonu atlandi"
else
  echo "    CRM migrasyonu atlandi (RUN_CRM_MIGRATE=1 ile acilir)"
fi

# ---- 4) Build (canli .next dokunulmaz, cache korunur) ----------------------
echo ""
echo "==> [4/6] Next build -> $STAGING_DIR (PM2 acik, cache korunur)"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
# Onceki build cache'ini tasi — incremental derlemeyi ciddi hizlandirir
if [[ -d .next/cache ]]; then
  mkdir -p "$STAGING_DIR/cache"
  cp -a .next/cache/. "$STAGING_DIR/cache/" 2>/dev/null || true
  echo "    .next/cache staging'e kopyalandi"
fi

NEXT_DIST_DIR="$STAGING_DIR" npm run build
if [[ ! -f "$STAGING_DIR/BUILD_ID" ]]; then
  echo "    HATA: $STAGING_DIR/BUILD_ID olusmadi. Canli .next bozulmadi."
  exit 1
fi
echo "    BUILD_ID=$(cat "$STAGING_DIR/BUILD_ID")"

echo "    .next swap + PM2 restart"
rm -rf .next-prev
if [[ -d .next ]]; then
  mv .next .next-prev
fi
mv "$STAGING_DIR" .next

# ---- 5) PM2 + saglik -------------------------------------------------------
echo ""
echo "==> [5/6] PM2 yeniden baslatiliyor ($PM2_NAME)"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" -- start
fi
pm2 save
rm -rf .next-prev

echo ""
echo "==> Saglik kontrolu ($HEALTH_URL)"
sleep 2
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || echo 000)"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" || "$HTTP_CODE" == "307" ]]; then
  echo "    OK — HTTP $HTTP_CODE"
else
  echo "    UYARI: Beklenmeyen HTTP $HTTP_CODE"
  echo "           pm2 logs $PM2_NAME --lines 50"
fi

if [[ "$RUN_META_FEED_WARM" == "1" ]]; then
  echo "==> Meta feed warm (senkron)"
  npx tsx scripts/warm-meta-catalog-feed.ts || echo "    UYARI: meta feed warm atlandi"
else
  (npx tsx scripts/warm-meta-catalog-feed.ts >/var/log/tatil-villa-meta-feed-warm.log 2>&1 || true) &
  disown || true
  echo "    Meta feed arka planda (RUN_META_FEED_WARM=1 = senkron)"
fi

# ---- 6) Cron (yalnizca degisse) --------------------------------------------
echo ""
echo "==> [6/6] Cron"
CRON_SCRIPT="scripts/deploy/04-setup-cron.sh"
NEED_CRON=0
if [[ "$RUN_CRON_SETUP" == "1" ]]; then
  NEED_CRON=1
elif [[ -f "$CRON_SCRIPT" ]]; then
  NEW_CRON_HASH="$(sha256sum "$CRON_SCRIPT" | awk '{print $1}')"
  OLD_CRON_HASH=""
  if [[ -f "$CRON_HASH_FILE" ]]; then
    OLD_CRON_HASH="$(tr -d ' \r\n' < "$CRON_HASH_FILE" || true)"
  fi
  if [[ "$NEW_CRON_HASH" != "$OLD_CRON_HASH" ]]; then
    NEED_CRON=1
  fi
fi

if [[ "$NEED_CRON" == "1" && -f "$CRON_SCRIPT" ]]; then
  bash "$CRON_SCRIPT"
  sha256sum "$CRON_SCRIPT" | awk '{print $1}' > "$CRON_HASH_FILE"
else
  echo "    Cron setup atlandi (degisiklik yok)"
fi

echo ""
echo "=========================================================="
echo "  DEPLOY TAMAMLANDI — $STAMP"
echo "  Yedek: .env.bak.$STAMP | dump: $DUMP_FILE"
echo "  Not: public/uploads Git'te yoktur."
echo "=========================================================="
