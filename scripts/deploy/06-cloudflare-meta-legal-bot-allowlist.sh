#!/usr/bin/env bash
# Cloudflare WAF: /meta/* ve /privacy-policy yollarında Meta botlarına izin ver.
# Kullanım:
#   export CLOUDFLARE_API_TOKEN="..."
#   bash scripts/deploy/06-cloudflare-meta-legal-bot-allowlist.sh

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "HATA: jq gerekli (apt install jq)" >&2
  exit 1
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN tanımlı değil." >&2
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

ZONE_NAME="tatilvillacisi.com"
WAF_RULE_DESC="Meta legal page crawlers (/meta/)"
WAF_EXPRESSION='(http.request.uri.path starts_with "/meta/") and (http.user_agent contains "facebookexternalhit" or http.user_agent contains "Facebot" or http.user_agent contains "facebookcatalog" or http.user_agent contains "Meta-ExternalAgent")'
CONFIG_RULE_DESC="Meta legal pages low security (/meta/)"
CONFIG_EXPRESSION='(http.request.uri.path starts_with "/meta/") or (http.request.uri.path eq "/privacy-policy")'

cf_get() { curl -fsS "${AUTH[@]}" "$@"; }

zone_id="$(cf_get "${API}/zones?name=${ZONE_NAME}&status=active" | jq -r '.result[0].id // empty')"
if [[ -z "$zone_id" ]]; then
  echo "HATA: Zone bulunamadı: ${ZONE_NAME}" >&2
  exit 1
fi

ruleset_id_for_phase() {
  cf_get "${API}/zones/${zone_id}/rulesets/phases/$1/entrypoint" | jq -r '.result.id // empty'
}

rule_exists() {
  local phase="$1" desc="$2"
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$phase")"
  [[ -n "$ruleset_id" && "$ruleset_id" != "null" ]] || return 1
  cf_get "${API}/zones/${zone_id}/rulesets/${ruleset_id}" | jq -e --arg d "$desc" '.result.rules[]? | select(.description == $d)' >/dev/null
}

add_waf_skip_rule() {
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase http_request_firewall_custom)"
  if rule_exists http_request_firewall_custom "$WAF_RULE_DESC"; then
    echo "WAF skip kuralı zaten var"
    return 0
  fi
  local payload
  payload="$(jq -n --arg desc "$WAF_RULE_DESC" --arg expr "$WAF_EXPRESSION" '{
    description: $desc, expression: $expr, action: "skip",
    action_parameters: { phases: ["http_request_sbfm", "http_request_firewall_managed", "http_ratelimit"] },
    enabled: true
  }')"
  cf_get -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload" | jq -e '.success' >/dev/null
  echo "WAF skip kuralı eklendi"
}

add_config_rule() {
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase http_config_settings)"
  if rule_exists http_config_settings "$CONFIG_RULE_DESC"; then
    echo "Config kuralı zaten var"
    return 0
  fi
  local payload
  payload="$(jq -n --arg desc "$CONFIG_RULE_DESC" --arg expr "$CONFIG_EXPRESSION" '{
    description: $desc, expression: $expr, action: "set_config",
    action_parameters: { security_level: "essentially_off", bic: false },
    enabled: true
  }')"
  cf_get -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload" | jq -e '.success' >/dev/null
  echo "Config kuralı eklendi"
}

echo "==> Cloudflare Meta legal allowlist (${ZONE_NAME})"
echo "Zone id: ${zone_id}"
add_waf_skip_rule
add_config_rule
echo "Tamamlandı."
