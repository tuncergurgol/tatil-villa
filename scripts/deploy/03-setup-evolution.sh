#!/usr/bin/env bash
# Production Evolution API setup for the independent Takvim WhatsApp line.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
EVOLUTION_DIR="$APP_DIR/evolution"
APP_DB_CONTAINER="${APP_DB_CONTAINER:-tatil-villa-db}"
APP_DB_USER="${APP_DB_USER:-tatil}"
APP_DB_NAME="${APP_DB_NAME:-tatil_villa}"
APP_DB_PASS_FILE="${APP_DB_PASS_FILE:-/root/.db_pass}"

cd "$EVOLUTION_DIR"

if [[ ! -f "$APP_DB_PASS_FILE" ]]; then
  echo "ERROR: App database password file not found: $APP_DB_PASS_FILE"
  exit 1
fi

APP_DB_PASSWORD="$(tr -d '\r\n' < "$APP_DB_PASS_FILE")"
EVOLUTION_API_KEY="$(
  docker exec -e PGPASSWORD="$APP_DB_PASSWORD" "$APP_DB_CONTAINER" \
    psql -U "$APP_DB_USER" -d "$APP_DB_NAME" -Atc \
    "SELECT COALESCE(\"evolutionApiKey\", '') FROM \"CompanySettings\" WHERE id = 'default';"
)"

if [[ -z "$EVOLUTION_API_KEY" ]]; then
  echo "ERROR: Evolution API key is empty in CompanySettings."
  exit 1
fi

if [[ -f .env ]]; then
  EVOLUTION_DB_PASSWORD="$(
    awk -F= '$1 == "EVOLUTION_DB_PASSWORD" { print substr($0, index($0, "=") + 1); exit }' .env
  )"
else
  EVOLUTION_DB_PASSWORD=""
fi

if [[ -z "$EVOLUTION_DB_PASSWORD" ]]; then
  EVOLUTION_DB_PASSWORD="$(openssl rand -hex 24)"
fi

umask 077
cat > .env <<EOF
AUTHENTICATION_API_KEY=$EVOLUTION_API_KEY
SERVER_URL=http://127.0.0.1:8080
SERVER_PORT=8080
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:$EVOLUTION_DB_PASSWORD@postgres:5432/evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/0
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_LOCAL_ENABLED=false
LOG_LEVEL=ERROR
EVOLUTION_DB_PASSWORD=$EVOLUTION_DB_PASSWORD
EOF
chmod 600 .env

echo "==> Pulling Evolution API images"
docker compose pull

echo "==> Starting Evolution API, PostgreSQL and Redis"
docker compose up -d --remove-orphans

echo "==> Waiting for Evolution API"
for attempt in $(seq 1 60); do
  if curl -fsS --max-time 3 http://127.0.0.1:8080 >/dev/null; then
    echo "Evolution API is ready on 127.0.0.1:8080"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "ERROR: Evolution API did not become ready."
docker compose ps
docker compose logs --no-color --since=5m evolution-api
exit 1
