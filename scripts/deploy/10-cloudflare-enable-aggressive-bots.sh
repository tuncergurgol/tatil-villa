#!/usr/bin/env bash
# Cloudflare agresif bot koruması: Bot Fight Mode + Security High + BIC On
#
# Free plan: Bot Fight Mode (SBFM Pro+ değildir).
# Meta feed için /feeds/ WAF skip + R2 URL korunur (05 script).
# PageSpeed/Googlebot için WAF skip korunur (08 script); BFM kapatılmaz.
#
# Kullanım (sunucu):
#   set -a; . /root/.cloudflare.env; set +a
#   bash scripts/deploy/10-cloudflare-enable-aggressive-bots.sh
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "HATA: jq gerekli (apt install jq)" >&2
  exit 1
fi

if [[ -f /root/.cloudflare.env && -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  # shellcheck disable=SC1091
  set -a
  # shellcheck source=/dev/null
  . /root/.cloudflare.env
  set +a
fi

TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "HATA: CLOUDFLARE_API_TOKEN tanımlı değil." >&2
  exit 1
fi

API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

ZONES=(
  "tatildeyiz.com.tr"
  "balayivillacisi.com"
  "tatilvillacisi.com"
)

# Bilinen iyi botlar: BFM açıkken bile mümkün olduğunca skip
WAF_RULE_DESC="Allow verified bots and PageSpeed (aggressive BFM)"
WAF_EXPRESSION='(http.user_agent contains "Chrome-Lighthouse") or (http.user_agent contains "Google-PageSpeed") or (http.user_agent contains "Googlebot") or (http.user_agent contains "bingbot") or (http.user_agent contains "facebookexternalhit") or (http.user_agent contains "Facebot") or (http.user_agent contains "facebookcatalog") or (http.user_agent contains "Meta-ExternalAgent") or (cf.client.bot)'

META_FEED_RULE_DESC="Meta catalog feed crawlers (/feeds/)"
META_FEED_EXPRESSION='(http.request.uri.path starts_with "/feeds/") and (http.user_agent contains "facebookexternalhit" or http.user_agent contains "Facebot" or http.user_agent contains "facebookcatalog" or http.user_agent contains "Meta-ExternalAgent")'

cf_get() { curl -fsS "${AUTH[@]}" "$@"; }
cf_try() { curl -sS -o /tmp/cf-aggressive-bots.json -w "%{http_code}" "${AUTH[@]}" "$@"; }

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

patch_setting() {
  local zone_id="$1" key="$2" value_json="$3" label="$4" code
  code="$(cf_try -X PATCH "${API}/zones/${zone_id}/settings/${key}" -d "${value_json}")"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-aggressive-bots.json; then
    echo "    ${label}"
    return 0
  fi
  echo "    UYARI: ${label} ayarlanamadı (HTTP ${code}). Token'a Zone Settings Edit verin veya Dashboard → Security"
  if [[ -f /tmp/cf-aggressive-bots.json ]]; then
    jq -c '{errors,messages}' /tmp/cf-aggressive-bots.json 2>/dev/null || true
  fi
  return 1
}

add_waf_skip_rule() {
  local zone_id="$1" desc="$2" expr="$3" ruleset_id payload code
  ruleset_id="$(ruleset_id_for_phase "$zone_id" "http_request_firewall_custom")"
  if [[ -z "$ruleset_id" || "$ruleset_id" == "null" ]]; then
    # Free planda ruleset yoksa oluşturmayı dene
    code="$(cf_try -X POST "${API}/zones/${zone_id}/rulesets" -d "$(jq -n \
      --arg name "default" \
      --arg phase "http_request_firewall_custom" \
      '{name:$name, kind:"zone", phase:$phase, rules:[]}')")"
    if [[ "$code" == "200" ]] && json_ok /tmp/cf-aggressive-bots.json; then
      ruleset_id="$(jq -r '.result.id // empty' /tmp/cf-aggressive-bots.json)"
      echo "    Custom WAF ruleset oluşturuldu"
    else
      echo "    UYARI: WAF custom ruleset yok/oluşturulamadı (HTTP ${code})"
      return 0
    fi
  fi
  if rule_exists "$zone_id" "http_request_firewall_custom" "$desc"; then
    echo "    WAF skip zaten var: ${desc}"
    return 0
  fi
  payload="$(jq -n --arg desc "$desc" --arg expr "$expr" '{
    description: $desc,
    expression: $expr,
    action: "skip",
    action_parameters: { phases: ["http_request_sbfm", "http_request_firewall_managed", "http_ratelimit"] },
    enabled: true
  }')"
  code="$(cf_try -X POST "${API}/zones/${zone_id}/rulesets/${ruleset_id}/rules" -d "$payload")"
  if [[ "$code" == "200" ]] && json_ok /tmp/cf-aggressive-bots.json; then
    echo "    WAF skip eklendi: ${desc}"
  else
    echo "    UYARI: WAF skip eklenemedi (${desc}, HTTP ${code})"
    jq -c '{errors,messages}' /tmp/cf-aggressive-bots.json 2>/dev/null || true
  fi
}

echo "==> Cloudflare agresif bot koruması açılıyor"
echo "    Bot Fight Mode=on | Security Level=high | Browser Integrity Check=on"
missing=0
failed_settings=0

for zone_name in "${ZONES[@]}"; do
  echo ""
  echo "-- Zone: ${zone_name}"
  zone_id="$(zone_id_for "$zone_name")"
  if [[ -z "$zone_id" ]]; then
    echo "    HATA: Zone bu API token ile görünmüyor."
    missing=1
    continue
  fi
  echo "    id: ${zone_id}"

  patch_setting "$zone_id" "bot_fight_mode" '{"value":"on"}' "Bot Fight Mode: on" || failed_settings=1
  patch_setting "$zone_id" "security_level" '{"value":"high"}' "Security Level: high" || failed_settings=1
  patch_setting "$zone_id" "browser_check" '{"value":"on"}' "Browser Integrity Check: on" || failed_settings=1

  add_waf_skip_rule "$zone_id" "$WAF_RULE_DESC" "$WAF_EXPRESSION"
  add_waf_skip_rule "$zone_id" "$META_FEED_RULE_DESC" "$META_FEED_EXPRESSION"
done

echo ""
if [[ "$missing" -ne 0 ]]; then
  echo "Eksik zone var. Token Zone Resources:"
  echo "  Include → tatildeyiz.com.tr, balayivillacisi.com, tatilvillacisi.com"
fi
if [[ "$failed_settings" -ne 0 ]]; then
  echo "Bazı ayarlar API ile yazılamadı. Dashboard:"
  echo "  Security → Bots → Bot Fight Mode = On"
  echo "  Security → Settings → Security Level = High"
  echo "  Security → Settings → Browser Integrity Check = On"
  exit 1
fi
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "Tamamlandı. Agresif bot koruması aktif."
