#!/usr/bin/env bash
set -euo pipefail
cd /var/www/tatil-villa
git fetch origin
git reset --hard origin/cursor/booking-quick-filters-ui
chmod +x scripts/deploy/create-turnstile-widget.sh
bash scripts/deploy/create-turnstile-widget.sh
# NEXT_PUBLIC_* build'e gömülsün diye widget sonrası deploy
bash scripts/deploy/02-deploy-update.sh
