#!/usr/bin/env bash
# Cloudflare: Meta crawler'larının gizlilik sayfalarına erişimi (tatilvillacisi.com)
#
# Kullanım:
#   export CLOUDFLARE_API_TOKEN="..."   # Zone Settings Edit + Zone WAF Edit + Zone Read
#   bash scripts/deploy/06-cloudflare-meta-legal-bot-allowlist.sh
#
# Token oluşturma: Cloudflare → My Profile → API Tokens → Create Token
#   - Edit zone DNS / Zone Settings / Zone WAF (tatilvillacisi.com)

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "HATA: jq gerekli (apt install jq)" >&2
  exit 1
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN tanımlı değil." >&2
  echo ""
  echo "Cloudflare → My Profile → API Tokens → Create Token"
  echo "  Permissions: Zone / Zone Settings / Edit"
  echo "               Zone / Zone / Read"
  echo "               Zone / Firewall Services / Edit (Configuration rules)"
  echo "  Zone Resources: tatilvillacisi.com"
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

ZONE_NAME="tatilvillacisi.com"
CONFIG_RULE_DESC="Meta privacy pages low security"
CONFIG_EXPRESSION='(http.request.uri.path eq "/privacy.html") or (http.request.uri.path starts_with "/meta/") or (http.request.uri.path eq "/privacy-policy")'

cf_get() { curl -fsS "${AUTH[@]}" "$@"; }
cf_patch() { curl -fsS -X PATCH "${AUTH[@]}" "$@"; }
cf_post() { curl -fsS -X POST "${AUTH[@]}" "$@"; }

zone_id="$(cf_get "${API}/zones?name=${ZONE_NAME}&status=active" | jq -r '.result[0].id // empty')"
if [[ -z "$zone_id" ]]; then
  echo "HATA: Zone bulunamadı: ${ZONE_NAME}" >&2
  exit 1
fi

echo "==> Cloudflare Meta privacy fix (${ZONE_NAME})"
echo "    Zone id: ${zone_id}"

echo ""
echo "--> Bot Fight Mode kapatılıyor..."
if cf_patch "${API}/zones/${zone_id}/settings/bot_fight_mode" -d '{"value":"off"}' | jq -e '.success' >/dev/null; then
  echo "    Bot Fight Mode: off"
else
  echo "    UYARI: Bot Fight Mode ayarlanamadı (plan veya izin)"
fi

echo ""
echo "--> Security Level: medium..."
if cf_patch "${API}/zones/${zone_id}/settings/security_level" -d '{"value":"medium"}' | jq -e '.success' >/dev/null; then
  echo "    Security Level: medium"
else
  echo "    UYARI: Security Level ayarlanamadı"
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

echo ""
echo "--> Configuration rule ekleniyor..."
ruleset_id="$(ruleset_id_for_phase http_config_settings)"
if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
  echo "    UYARI: Configuration ruleset bulunamadı"
else
  if rule_exists http_config_settings "$CONFIG_RULE_DESC"; then
    echo "    Configuration rule zaten var"
  else
    payload="$(jq -n --arg desc "$CONFIG_RULE_DESC" --arg expr "$CONFIG_EXPRESSION" '{
      description: $desc,
      expression: $expr,
      action: "set_config",
      action_parameters: { security_level: "essentially_off", bic: false },
      enabled: true
    }')"
    if cf_post "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload" | jq -e '.success' >/dev/null; then
      echo "    Configuration rule eklendi"
    else
      echo "    UYARI: Configuration rule eklenemedi"
    fi
  fi
fi

echo ""
echo "Tamamlandı."
echo "Test: https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Fwww.tatilvillacisi.com%2Fprivacy.html"
echo "      Response Code 200 olmalı (Scrape Again)."
