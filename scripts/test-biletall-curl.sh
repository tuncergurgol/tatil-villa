#!/usr/bin/env bash
set -euo pipefail

ORIGIN="${BILETALL_PUBLIC_ORIGIN:-https://www.tatildeyiz.com.tr}"
URL="https://iframe.biletall.com/portals/tatildeyizcomtr/UI/Arama.aspx?AramaUrl=${ORIGIN}/bilet/ara&IslemUrl=${ORIGIN}/bilet/satinal&BiletGosterimUrl=${ORIGIN}/bilet/sonuc"

curl -sL -A 'Mozilla/5.0' -e "${ORIGIN}/bilet/ara" -o /tmp/ba.html -w 'HTTP:%{http_code} SIZE:%{size_download}\n' "$URL"
ls -la /tmp/ba.html
head -c 500 /tmp/ba.html | cat -v
