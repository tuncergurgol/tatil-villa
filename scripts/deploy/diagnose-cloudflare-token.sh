#!/usr/bin/env bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
source /root/.cloudflare.env
set +a
echo "env_keys=$(grep -oE '^[A-Z_]+' /root/.cloudflare.env | tr '\n' ' ')"
curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("verify", d.get("success"), (d.get("result") or {}).get("status"), d.get("errors"))
'
curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?per_page=5" | python3 -c '
import json,sys
d=json.load(sys.stdin)
rs=d.get("result") or []
print("zones", d.get("success"), "count", len(rs), "errs", d.get("errors"))
if rs:
  print("zone", rs[0].get("name"), "account", (rs[0].get("account") or {}).get("id"))
'
curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts?per_page=5" | python3 -c '
import json,sys
d=json.load(sys.stdin)
print("accounts", d.get("success"), "count", len(d.get("result") or []), "errs", d.get("errors"))
'
