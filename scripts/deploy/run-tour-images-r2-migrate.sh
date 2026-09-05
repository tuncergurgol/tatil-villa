#!/usr/bin/env bash
# Production'da tur görsellerini R2'ye taşır.
# Önce /var/www/tatil-villa/.env içine R2_* değişkenlerini ekleyin (env.production.example).
set -euo pipefail
cd /var/www/tatil-villa
set -a
# shellcheck disable=SC1091
source .env
set +a
npm run migrate:tour-images-r2
