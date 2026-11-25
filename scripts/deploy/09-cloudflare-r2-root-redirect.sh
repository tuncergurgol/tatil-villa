#!/usr/bin/env bash
# r2.tatildeyiz.com.tr/ (yalnızca kök) → https://www.tatildeyiz.com.tr/
# Nesne yolları (/feeds/..., medya) etkilenmez.
set -euo pipefail

if [[ -f /root/.cloudflare.env ]]; then
  # shellcheck disable=SC1091
  set -a
  source /root/.cloudflare.env
  set +a
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN yok" >&2
  exit 1
fi

AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")
ZONE_NAME="tatildeyiz.com.tr"
HOST="r2.tatildeyiz.com.tr"
TARGET="https://www.tatildeyiz.com.tr/"
RULE_DESC="r2 root to www"

zones_json="$(curl -sS "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")"

zone_id="$(printf '%s' "$zones_json" | python3 -c '
import json,sys
data=json.load(sys.stdin)
if not data.get("success"):
  raise SystemExit("zones failed: "+json.dumps(data.get("errors"), ensure_ascii=False))
rows=data.get("result") or []
if not rows:
  raise SystemExit("zone not found")
print(rows[0]["id"])
')"

echo "Zone: $ZONE_NAME ($zone_id)"
export ZONE_ID="$zone_id"
export CLOUDFLARE_API_TOKEN="$TOKEN"

# Mevcut dynamic redirect entrypoint
phase_url="https://api.cloudflare.com/client/v4/zones/${zone_id}/rulesets/phases/http_request_dynamic_redirect/entrypoint"
current="$(curl -sS "${AUTH[@]}" "$phase_url" || true)"

python3 - "$current" "$HOST" "$TARGET" "$RULE_DESC" <<'PY'
import json,sys,urllib.request,os

current_raw=sys.argv[1]
host=sys.argv[2]
target=sys.argv[3]
desc=sys.argv[4]
token=os.environ["CLOUDFLARE_API_TOKEN"]
zone_id=os.environ["ZONE_ID"]

new_rule={
  "ref":"r2_root_to_www",
  "description":desc,
  "expression":f'(http.host eq "{host}" and http.request.uri.path eq "/")',
  "action":"redirect",
  "action_parameters":{
    "from_value":{
      "status_code":301,
      "target_url":{"value":target},
      "preserve_query_string":False
    }
  }
}

rules=[]
ruleset_id=None
try:
  data=json.loads(current_raw) if current_raw.strip() else {}
except Exception:
  data={}

if data.get("success") and isinstance(data.get("result"), dict):
  result=data["result"]
  ruleset_id=result.get("id")
  for rule in result.get("rules") or []:
    expr=rule.get("expression") or ""
    ref=rule.get("ref") or ""
    description=rule.get("description") or ""
    if ref=="r2_root_to_www" or "r2 root to www" in description.lower() or (
      host in expr and 'uri.path eq "/"' in expr.replace(" ","")
    ) or (host in expr and "uri.path eq \"/\"" in expr):
      continue
    # keep other redirect rules (strip id for rewrite)
    keep={k:v for k,v in rule.items() if k not in ("id","version","last_updated")}
    rules.append(keep)

rules.insert(0, new_rule)
payload={"rules":rules}

url=f"https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/phases/http_request_dynamic_redirect/entrypoint"
body=json.dumps(payload).encode()
req=urllib.request.Request(url, data=body, method="PUT", headers={
  "Authorization":f"Bearer {token}",
  "Content-Type":"application/json",
})
with urllib.request.urlopen(req) as res:
  out=json.load(res)
if not out.get("success"):
  raise SystemExit("upsert failed: "+json.dumps(out, ensure_ascii=False))
print("OK — redirect rule upserted")
print("expression:", new_rule["expression"])
print("target:", target)
PY
