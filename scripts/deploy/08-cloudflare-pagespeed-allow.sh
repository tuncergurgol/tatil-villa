#!/usr/bin/env bash
# PageSpeed / Googlebot Cloudflare 403 + noindex,nofollow engel sayfasını kapatır.
#
# PageSpeed Insights Google veri merkezi IP'sinden gelir; ücretsiz plandaki
# Bot Fight Mode bu isteği 403 + <meta name="robots" content="noindex,nofollow">
# ile keser. Uygulama kodu index,follow üretir; asıl düzeltilen CF ayarıdır.
#
# Kullanım (sunucu):
#   set -a; . /root/.cloudflare.env; set +a
#   bash scripts/deploy/08-cloudflare-pagespeed-allow.sh
#
# Token Zone Resources mutlaka tatilvillacisi.com içermeli.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "HATA: jq gerekli (apt install jq)" >&2
  exit 1
fi

if [[ -f /root/.cloudflare.env && -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  # shellcheck disable=SC1091
  set -a
  . /root/.cloudflare.env
  set +a
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN tanımlı değil." >&2
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

WAF_RULE_DESC="Allow PageSpeed Lighthouse and verified bots"
WAF_EXPRESSION='(http.user_agent contains "Chrome-Lighthouse") or (http.user_agent contains "Google-PageSpeed") or (http.user_agent contains "Googlebot") or (cf.client.bot)'

CONFIG_RULE_DESC="PageSpeed Lighthouse low security"
CONFIG_EXPRESSION='(http.user_agent contains "Chrome-Lighthouse") or (http.user_agent contains "Google-PageSpeed") or (cf.client.bot)'

cf_get() { curl -fsS "${AUTH[@]}" "$@"; }
cf_try() { curl -sS -o /tmp/cf-pagespeed-allow.json -w "%{http_code}" "${AUTH[@]}" "$@"; }

json_ok() {
  python3 - "$1" <<'PY'
import json, sys
path = sys.argv[1]
try:
    data = json.load(open(path, encoding="utf-8"))
except Exception:
    sys.exit(1)
sys.exit(0 if data.get("success") else 1)
PY
}

zone_id_for() {
  cf_get "${API}/zones?name=${1}&status=active" | jq -r '.result[0].id // empty'
}

ruleset_id_for_phase() {
  curl -sS "${AUTH[@]}" "${API}/zones/${1}/rulesets/phases/${2}/entrypoint" \
    | jq -r '.result.id // empty'
}

rule_exists() {
  local zone_id="$1" phase="$2" description="$3" ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "$phase")"
  [[ -n "$ruleset_id" && "$ruleset_id" != "null" ]] || return 1
  curl -sS "${AUTH[@]}" "${API}/zones/${zone_id}/rulesets/${ruleset_id}" \
    | jq -e --arg d "$description" '.result.rules[]? | select(.description == $d)' >/dev/null 2>&1
}

disable_bot_fight() {
  local zone_id="$1" code
  code="$(cf_try -X PATCH "${API}/zones/${zone_id}/settings/bot_fight_mode" -d '{"value":"off"}')"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-pagespeed-allow.json; then
    echo "    Bot Fight Mode: off"
  else
    echo "    UYARI: Bot Fight Mode kapatılamadı (HTTP ${code}). Token'a Zone Settings Edit verin veya Dashboard → Security → Bots"
  fi
}

set_security_medium() {
  local zone_id="$1" code
  code="$(cf_try -X PATCH "${API}/zones/${zone_id}/settings/security_level" -d '{"value":"medium"}')"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-pagespeed-allow.json; then
    echo "    Security Level: medium"
  else
    echo "    UYARI: Security Level ayarlanamadı (HTTP ${code})"
  fi
}

add_waf_skip_rule() {
  local zone_id="$1" ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "http_request_firewall_custom")"
  if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
    echo "    UYARI: WAF custom ruleset yok (ücretsiz planda skip sınırlı olabilir)"
    return 0
  fi
  if rule_exists "$zone_id" "http_request_firewall_custom" "$WAF_RULE_DESC"; then
    echo "    WAF skip kuralı zaten var"
    return 0
  fi
  local payload code
  payload="$(jq -n --arg desc "$WAF_RULE_DESC" --arg expr "$WAF_EXPRESSION" '{
    description: $desc,
    expression: $expr,
    action: "skip",
    action_parameters: { phases: ["http_request_sbfm", "http_request_firewall_managed", "http_ratelimit"] },
    enabled: true
  }')"
  code="$(cf_try -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload")"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-pagespeed-allow.json; then
    echo "    WAF skip kuralı eklendi"
  else
    echo "    UYARI: WAF skip eklenemedi (HTTP ${code}). Token'a Zone WAF Edit verin"
  fi
}

add_config_rule() {
  local zone_id="$1" ruleset_id
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "http_config_settings")"
  if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
    echo "    UYARI: Configuration ruleset yok"
    return 0
  fi
  if rule_exists "$zone_id" "http_config_settings" "$CONFIG_RULE_DESC"; then
    echo "    Config kuralı zaten var"
    return 0
  fi
  local payload code
  payload="$(jq -n --arg desc "$CONFIG_RULE_DESC" --arg expr "$CONFIG_EXPRESSION" '{
    description: $desc,
    expression: $expr,
    action: "set_config",
    action_parameters: { security_level: "essentially_off", bic: false },
    enabled: true
  }')"
  code="$(cf_try -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload")"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-pagespeed-allow.json; then
    echo "    Config kuralı eklendi"
  else
    echo "    UYARI: Config kuralı eklenemedi (HTTP ${code})"
  fi
}

echo "==> Cloudflare PageSpeed / crawler allow"
missing=0
for zone_name in "${ZONES[@]}"; do
  echo ""
  echo "-- Zone: ${zone_name}"
  zone_id="$(zone_id_for "$zone_name")"
  if [[ -z "$zone_id" ]]; then
    echo "    HATA: Zone bu API token ile görünmüyor."
    echo "    Token'a bu zone'u ekleyin veya domain'i tatildeyiz ile aynı Cloudflare hesabına alın."
    missing=1
    continue
  fi
  echo "    id: ${zone_id}"
  disable_bot_fight "$zone_id"
  set_security_medium "$zone_id"
  add_waf_skip_rule "$zone_id"
  add_config_rule "$zone_id"
done

echo ""
if [[ "$missing" -ne 0 ]]; then
  echo "Eksik zone var. Cloudflare → My Profile → API Tokens → token'ı Edit:"
  echo "  Zone Resources: Include → tatildeyiz.com.tr, balayivillacisi.com, tatilvillacisi.com"
  echo "Dashboard (tatilvillacisi.com): Security → Bots → Bot Fight Mode = Off"
  echo "  Security → Settings → Security Level = Medium"
  exit 1
fi

echo "Tamamlandı. PageSpeed'i www.tatilvillacisi.com için yeniden çalıştırın."
