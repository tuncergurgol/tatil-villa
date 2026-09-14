#!/usr/bin/env bash
# Cloudflare WAF: /feeds/* yolunda Meta katalog botlarına izin ver.
# Kullanım:
#   export CLOUDFLARE_API_TOKEN="..."   # Zone.WAF Edit + Zone.Read
#   bash scripts/deploy/05-cloudflare-feed-bot-allowlist.sh
#
# Manuel: scripts/deploy/cloudflare-feed-waf.md

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "HATA: jq gerekli (apt install jq)" >&2
  exit 1
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN tanımlı değil." >&2
  echo "Cloudflare → My Profile → API Tokens → Create Token" >&2
  echo "İzinler: Zone / Zone / Read, Zone / WAF / Edit" >&2
  echo "Zone Resources: tatildeyiz.com.tr, balayivillacisi.com, tatilvillacisi.com" >&2
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

ZONES=(
  "tatildeyiz.com.tr"
  "balayivillacisi.com"
  "tatilvillacisi.com"
)

WAF_RULE_DESC="Meta catalog feed crawlers (/feeds/)"
WAF_EXPRESSION='(http.request.uri.path starts_with "/feeds/") and (http.user_agent contains "facebookexternalhit" or http.user_agent contains "Facebot" or http.user_agent contains "facebookcatalog" or http.user_agent contains "Meta-ExternalAgent")'

CONFIG_RULE_DESC="Meta catalog feed low security (/feeds/)"
CONFIG_EXPRESSION='(http.request.uri.path starts_with "/feeds/")'

cf_get() {
  curl -fsS "${AUTH[@]}" "$@"
}

zone_id_for() {
  local name="$1"
  cf_get "${API}/zones?name=${name}&status=active" | jq -r '.result[0].id // empty'
}

ruleset_id_for_phase() {
  local zone_id="$1"
  local phase="$2"
  cf_get "${API}/zones/${zone_id}/rulesets/phases/${phase}/entrypoint" | jq -r '.result.id // empty'
}

rule_exists() {
  local zone_id="$1"
  local phase="$2"
  local description="$3"
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "$phase")"
  [[ -n "$ruleset_id" && "$ruleset_id" != "null" ]] || return 1
  cf_get "${API}/zones/${zone_id}/rulesets/${ruleset_id}" | jq -e --arg d "$description" '.result.rules[]? | select(.description == $d)' >/dev/null
}

add_waf_skip_rule() {
  local zone_id="$1"
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "http_request_firewall_custom")"
  if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
    echo "    UYARI: WAF custom ruleset bulunamadı (plan?)"
    return 0
  fi
  if rule_exists "$zone_id" "http_request_firewall_custom" "$WAF_RULE_DESC"; then
    echo "    WAF skip kuralı zaten var"
    return 0
  fi
  local payload
  payload="$(jq -n \
    --arg desc "$WAF_RULE_DESC" \
    --arg expr "$WAF_EXPRESSION" \
    '{
      description: $desc,
      expression: $expr,
      action: "skip",
      action_parameters: { phases: ["http_request_sbfm", "http_request_firewall_managed", "http_ratelimit"] },
      enabled: true
    }')"
  cf_get -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload" | jq -e '.success' >/dev/null
  echo "    WAF skip kuralı eklendi"
}

add_config_rule() {
  local zone_id="$1"
  local ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "http_config_settings")"
  if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
    echo "    UYARI: Configuration ruleset bulunamadı"
    return 0
  fi
  if rule_exists "$zone_id" "http_config_settings" "$CONFIG_RULE_DESC"; then
    echo "    Config kuralı zaten var"
    return 0
  fi
  local payload
  payload="$(jq -n \
    --arg desc "$CONFIG_RULE_DESC" \
    --arg expr "$CONFIG_EXPRESSION" \
    '{
      description: $desc,
      expression: $expr,
      action: "set_config",
      action_parameters: { security_level: "essentially_off", bic: false },
      enabled: true
    }')"
  cf_get -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload" | jq -e '.success' >/dev/null
  echo "    Config kuralı eklendi (/feeds/ düşük güvenlik)"
}

echo "==> Cloudflare Meta feed allowlist"
for zone_name in "${ZONES[@]}"; do
  echo ""
  echo "-- Zone: ${zone_name}"
  zone_id="$(zone_id_for "$zone_name")"
  if [[ -z "$zone_id" ]]; then
    echo "    HATA: Zone bulunamadı"
    continue
  fi
  echo "    id: ${zone_id}"
  add_waf_skip_rule "$zone_id"
  add_config_rule "$zone_id"
done

echo ""
echo "Tamamlandı. Meta için R2 URL de kullanılabilir:"
echo "  https://r2.tatildeyiz.com.tr/feeds/meta-catalog/tatil-villacisi.xml"
