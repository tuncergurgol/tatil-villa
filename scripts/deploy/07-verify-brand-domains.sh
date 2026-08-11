#!/usr/bin/env bash
# Alt marka domainlerinin tatildeyiz'e yonlenmedigini dogrular.
set -euo pipefail

check() {
  local label="$1"
  local url="$2"
  local final
  final=$(curl -sSIL -o /dev/null -w '%{url_effective}' "$url" || echo "FAIL")
  echo "$label -> $final"
  if [[ "$final" == *"tatildeyiz.com.tr"* ]]; then
    echo "  HATA: $url tatildeyiz'e yonleniyor!"
    return 1
  fi
  if [[ "$final" != *"tatilvillacisi.com"* && "$final" != *"balayivillacisi.com"* && "$label" != *"tatildeyiz"* ]]; then
    echo "  UYARI: beklenmeyen hedef"
  fi
  return 0
}

failed=0
check "tatilvillacisi apex" "https://tatilvillacisi.com/" || failed=1
check "tatilvillacisi www" "https://www.tatilvillacisi.com/" || failed=1
check "balayi apex" "https://balayivillacisi.com/" || failed=1
check "balayi www" "https://www.balayivillacisi.com/" || failed=1

if [[ -f /root/.cloudflare.env ]]; then
  # shellcheck disable=SC1091
  source /root/.cloudflare.env
  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    echo ""
    echo "=== Cloudflare zones (API token) ==="
    zones=$(curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/zones?per_page=50")
    python3 - <<'PY' "$zones"
import json, sys
d = json.loads(sys.argv[1])
names = [z["name"] for z in d.get("result", [])]
for name in sorted(names):
    print(" ", name)
for required in ("tatilvillacisi.com", "balayivillacisi.com", "tatildeyiz.com.tr"):
    if required not in names:
        print(f"  UYARI: {required} zone bu API token hesabinda YOK — Redirect Rules ayri hesapta olabilir.")
PY
  fi
fi

if [[ "$failed" -ne 0 ]]; then
  echo ""
  echo "Cloudflare'de tatilvillacisi.com → Redirect Rule / Page Rule kontrol edin."
  exit 1
fi

echo ""
echo "OK — alt marka domainleri tatildeyiz'e yonlenmiyor."
