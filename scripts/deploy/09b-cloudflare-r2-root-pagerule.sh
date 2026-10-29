#!/usr/bin/env bash
# Fallback: Page Rule ile r2 kökünü www'ye yönlendir.
set -euo pipefail
if [[ -f /root/.cloudflare.env ]]; then
  # shellcheck disable=SC1091
  set -a
  source /root/.cloudflare.env
  set +a
fi
TOKEN="${CLOUDFLARE_API_TOKEN:-}"
[[ -n "$TOKEN" ]] || { echo "HATA: CLOUDFLARE_API_TOKEN yok" >&2; exit 1; }

AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
ZONE_NAME="tatildeyiz.com.tr"

zone_id="$(curl -sS "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["result"][0]["id"])')"

echo "Zone=$zone_id"

# Mevcut page rules
existing="$(curl -sS "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/zones/${zone_id}/pagerules")"
printf '%s' "$existing" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("list_success", d.get("success"), "count", len(d.get("result") or []), "errs", d.get("errors"))
for r in d.get("result") or []:
  targets=r.get("targets") or []
  print("rule", r.get("id"), targets, r.get("actions"), r.get("status"))
'

# Exact root only
payload='{"targets":[{"target":"url","constraint":{"operator":"matches","value":"r2.tatildeyiz.com.tr/"}}],"actions":[{"id":"forwarding_url","value":{"url":"https://www.tatildeyiz.com.tr/","status_code":301}}],"priority":1,"status":"active"}'

create="$(curl -sS -X POST "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/zones/${zone_id}/pagerules" \
  --data "$payload")"
printf '%s' "$create" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("create_success", d.get("success"))
print("errors", d.get("errors"))
print("result_id", (d.get("result") or {}).get("id"))
'
