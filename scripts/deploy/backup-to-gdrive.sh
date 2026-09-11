#!/usr/bin/env bash
# =============================================================================
# tatildeyiz-app — SQL + site dosyalarını Google Drive'a ayrı ayrı yedekle
#
# Kullanım (sunucuda, root):
#   bash scripts/deploy/backup-to-gdrive.sh
#   bash scripts/deploy/backup-to-gdrive.sh --sql-only
#   bash scripts/deploy/backup-to-gdrive.sh --files-only
#
# Gereksinim: rclone remote adı "gdrive" (08-setup-gdrive-backup.sh)
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
DB_CONTAINER="${DB_CONTAINER:-tatil-villa-db}"
DB_USER="${DB_USER:-tatil}"
DB_NAME="${DB_NAME:-tatil_villa}"
DB_PASS_FILE="${DB_PASS_FILE:-/root/.db_pass}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/var/backups/tatil-villa}"
LOG_DIR="${LOG_DIR:-/var/log/tatil-villa-cron}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
GDRIVE_ROOT="${GDRIVE_ROOT:-tatildeyiz-yedek}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%F_%H%M)"
HOST_LABEL="$(hostname -s 2>/dev/null || echo tatildeyiz-app)"

SQL_ONLY=0
FILES_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --sql-only) SQL_ONLY=1 ;;
    --files-only) FILES_ONLY=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
  esac
done

mkdir -p "$LOCAL_BACKUP_DIR/sql" "$LOCAL_BACKUP_DIR/files" "$LOG_DIR"
chmod 700 "$LOCAL_BACKUP_DIR"

log() {
  echo "[$(date '+%F %T')] $*"
}

die() {
  log "HATA: $*"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' bulunamadı"
}

need_cmd rclone
need_cmd tar
need_cmd docker

if ! rclone listremotes 2>/dev/null | grep -qx "${RCLONE_REMOTE}:"; then
  die "rclone remote '${RCLONE_REMOTE}:' tanımlı değil. Önce: bash scripts/deploy/08-setup-gdrive-backup.sh"
fi

# Drive klasörlerini hazırla
rclone mkdir "${RCLONE_REMOTE}:${GDRIVE_ROOT}/sql" 2>/dev/null || true
rclone mkdir "${RCLONE_REMOTE}:${GDRIVE_ROOT}/dosyalar" 2>/dev/null || true

SQL_NAME="${HOST_LABEL}_sql_${STAMP}.dump"
FILES_NAME="${HOST_LABEL}_dosyalar_${STAMP}.tar.gz"
SQL_LOCAL="${LOCAL_BACKUP_DIR}/sql/${SQL_NAME}"
FILES_LOCAL="${LOCAL_BACKUP_DIR}/files/${FILES_NAME}"

backup_sql() {
  log "SQL yedek başlıyor → $SQL_NAME"
  if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    die "Postgres konteyneri '$DB_CONTAINER' çalışmıyor"
  fi

  DB_PASS=""
  if [[ -f "$DB_PASS_FILE" ]]; then
    DB_PASS="$(tr -d '\r\n' < "$DB_PASS_FILE")"
  fi

  if ! docker exec -e PGPASSWORD="$DB_PASS" "$DB_CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -Z 9 > "$SQL_LOCAL"; then
    rm -f "$SQL_LOCAL"
    die "pg_dump başarısız"
  fi

  local size
  size="$(du -h "$SQL_LOCAL" | awk '{print $1}')"
  log "SQL dump tamam ($size) — Drive'a yükleniyor"
  rclone copyto "$SQL_LOCAL" "${RCLONE_REMOTE}:${GDRIVE_ROOT}/sql/${SQL_NAME}" \
    --retries 5 --low-level-retries 10 --stats 30s
  log "SQL Drive yüklendi: ${GDRIVE_ROOT}/sql/${SQL_NAME}"
}

backup_files() {
  log "Site dosyaları yedek başlıyor → $FILES_NAME"
  if [[ ! -d "$APP_DIR" ]]; then
    die "Uygulama dizini yok: $APP_DIR"
  fi

  # Yeniden üretilebilir / geçici dizinleri hariç tut; uploads + .env + kod dahil
  tar -C "$(dirname "$APP_DIR")" \
    --exclude='tatil-villa/node_modules' \
    --exclude='tatil-villa/.next' \
    --exclude='tatil-villa/.next-prev' \
    --exclude='tatil-villa/.next-staging' \
    --exclude='tatil-villa/.git' \
    --exclude='tatil-villa/waha/sessions' \
    --exclude='tatil-villa/evolution' \
    --exclude='tatil-villa/**/*.log' \
    --exclude='tatil-villa/.deploy-*.sha256' \
    -czf "$FILES_LOCAL" "$(basename "$APP_DIR")"

  local size
  size="$(du -h "$FILES_LOCAL" | awk '{print $1}')"
  log "Site arşivi tamam ($size) — Drive'a yükleniyor"
  rclone copyto "$FILES_LOCAL" "${RCLONE_REMOTE}:${GDRIVE_ROOT}/dosyalar/${FILES_NAME}" \
    --retries 5 --low-level-retries 10 --stats 30s
  log "Dosyalar Drive yüklendi: ${GDRIVE_ROOT}/dosyalar/${FILES_NAME}"
}

prune_old() {
  log "Eski yedekler temizleniyor (yerel + Drive, ${KEEP_DAYS} gün)"
  find "$LOCAL_BACKUP_DIR/sql" -type f -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true
  find "$LOCAL_BACKUP_DIR/files" -type f -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true

  # rclone delete --min-age: Drive tarafında eski dosyalar
  rclone delete "${RCLONE_REMOTE}:${GDRIVE_ROOT}/sql" --min-age "${KEEP_DAYS}d" 2>/dev/null || true
  rclone delete "${RCLONE_REMOTE}:${GDRIVE_ROOT}/dosyalar" --min-age "${KEEP_DAYS}d" 2>/dev/null || true
}

log "=== Yedekleme başladı (stamp=$STAMP) ==="

if [[ "$FILES_ONLY" != "1" ]]; then
  backup_sql
fi
if [[ "$SQL_ONLY" != "1" ]]; then
  backup_files
fi

prune_old

log "=== Yedekleme tamam ==="
rclone lsf "${RCLONE_REMOTE}:${GDRIVE_ROOT}/sql" 2>/dev/null | tail -n 5 || true
rclone lsf "${RCLONE_REMOTE}:${GDRIVE_ROOT}/dosyalar" 2>/dev/null | tail -n 5 || true
