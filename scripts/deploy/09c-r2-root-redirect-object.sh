#!/usr/bin/env bash
# R2 kovasına kök (/) için HTML yönlendirme nesnesi koy.
set -euo pipefail
cd /var/www/tatil-villa

env_get() {
  local key="$1"
  python3 - "$key" <<'PY'
import sys
key=sys.argv[1]
for line in open("/var/www/tatil-villa/.env", encoding="utf-8", errors="replace"):
  line=line.strip()
  if not line or line.startswith("#") or "=" not in line:
    continue
  k,v=line.split("=",1)
  if k.strip()!=key:
    continue
  v=v.strip()
  if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
    v=v[1:-1]
  print(v)
  break
else:
  raise SystemExit(f"missing {key}")
PY
}

R2_ACCOUNT_ID="$(env_get R2_ACCOUNT_ID)"
R2_ACCESS_KEY_ID="$(env_get R2_ACCESS_KEY_ID)"
R2_SECRET_ACCESS_KEY="$(env_get R2_SECRET_ACCESS_KEY)"
R2_BUCKET="$(env_get R2_BUCKET)"

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

if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli yok — pip ile awscli kuruluyor"
  pip3 install --quiet awscli
fi

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

echo "Upload index.html"
aws s3 cp "$TMP" "s3://${R2_BUCKET}/index.html" \
  --endpoint-url "$ENDPOINT" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "public, max-age=300"

echo "Upload empty key (root)"
aws s3api put-object \
  --bucket "$R2_BUCKET" \
  --key "" \
  --body "$TMP" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "public, max-age=300" \
  --endpoint-url "$ENDPOINT" || echo "empty key upload failed (bazı R2 hesaplarında desteklenmez)"

rm -f "$TMP"
echo "--- probe ---"
curl -sI "https://r2.tatildeyiz.com.tr/" | head -n 20
echo "---"
curl -sI "https://r2.tatildeyiz.com.tr/index.html" | head -n 15
