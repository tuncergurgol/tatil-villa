#!/usr/bin/env bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
source /root/.cloudflare.env
set +a
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")
ZONE_ID=77bf192c2d8b552f64263d1ff1c9d250
echo "== DNS records for r2 =="
curl -sS "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=r2.tatildeyiz.com.tr" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print("success",d.get("success"),"errs",d.get("errors"));
[print(r.get("id"),r.get("type"),r.get("name"),r.get("content"),r.get("proxied")) for r in d.get("result") or []]'
echo "== token verify =="
curl -sS "${AUTH[@]}" "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("success"), (d.get("result") or {}).get("status"))'
