#!/usr/bin/env bash
# R2 kovasına kök (/) için HTML 301 meta + JS yönlendirme nesnesi koy.
# Cloudflare custom domain bazen boş key veya index.html ile / cevaplar.
set -euo pipefail
cd /var/www/tatil-villa
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${R2_ACCOUNT_ID:?}"
: "${R2_ACCESS_KEY_ID:?}"
: "${R2_SECRET_ACCESS_KEY:?}"
: "${R2_BUCKET:?}"

ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
TMP="$(mktemp)"
cat >"$TMP" <<'HTML'
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>Yönlendiriliyor…</title>
  <meta http-equiv="refresh" content="0;url=https://www.tatildeyiz.com.tr/"/>
  <link rel="canonical" href="https://www.tatildeyiz.com.tr/"/>
  <meta name="robots" content="noindex,nofollow"/>
  <script>location.replace("https://www.tatildeyiz.com.tr/");</script>
</head>
<body>
  <p><a href="https://www.tatildeyiz.com.tr/">www.tatildeyiz.com.tr</a></p>
</body>
</html>
HTML

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

upload() {
  local key="$1"
  echo "Upload key=[$key]"
  aws s3 cp "$TMP" "s3://${R2_BUCKET}/${key}" \
    --endpoint-url "$ENDPOINT" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "public, max-age=300"
}

# Boş key (kök) + index.html yedek
upload ""
upload "index.html"

rm -f "$TMP"
echo "DONE"
curl -sI "https://r2.tatildeyiz.com.tr/" | head -n 15 || true
curl -sI "https://r2.tatildeyiz.com.tr/index.html" | head -n 10 || true
