#!/usr/bin/env bash
# Cloudflare Turnstile widget oluştur / mevcut anahtarları .env'e yaz.
# Kullanım (sunucuda): bash scripts/deploy/create-turnstile-widget.sh
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

accounts_json="$(curl -sS "${AUTH[@]}" "https://api.cloudflare.com/client/v4/accounts?per_page=50")"
account_id="$(python3 - <<'PY' "$accounts_json"
import json,sys
data=json.loads(sys.argv[1])
if not data.get("success"):
  raise SystemExit("accounts failed: "+json.dumps(data.get("errors")))
print(data["result"][0]["id"])
PY
)"

echo "Account: $account_id"

list_json="$(curl -sS "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/accounts/${account_id}/challenges/widgets?per_page=50")"

existing="$(python3 - <<'PY' "$list_json"
import json,sys
data=json.loads(sys.argv[1])
if not data.get("success"):
  print("")
  raise SystemExit(0)
for w in data.get("result") or []:
  name=(w.get("name") or "").lower()
  if "sizi" in name or "callback" in name or "tatildeyiz-turnstile" in name:
    print(w.get("sitekey",""))
    break
else:
  print("")
PY
)"

domains='["www.tatildeyiz.com.tr","tatildeyiz.com.tr","www.balayivillacisi.com","balayivillacisi.com","www.tatilvillacisi.com","tatilvillacisi.com","www.glampingturkey.com","glampingturkey.com","bont.tatildeyiz.com.tr"]'

if [[ -n "$existing" ]]; then
  echo "Mevcut widget sitekey: $existing"
  sitekey="$existing"
  # Secret yalnızca create yanıtında gelir; mevcut widget'ta secret alınamaz.
  # Secret yoksa yeni widget oluşturmak gerekir.
  if grep -q '^TURNSTILE_SECRET_KEY=' /var/www/tatil-villa/.env 2>/dev/null; then
    echo "TURNSTILE_SECRET_KEY zaten .env içinde — güncelleme atlandı."
    exit 0
  fi
  echo "Secret .env'de yok; yeni widget oluşturuluyor..."
fi

create_json="$(curl -sS -X POST "${AUTH[@]}" \
  "https://api.cloudflare.com/client/v4/accounts/${account_id}/challenges/widgets" \
  --data "{\"name\":\"tatildeyiz-sizi-arayalim\",\"domains\":${domains},\"mode\":\"managed\",\"bot_fight_mode\":false,\"region\":\"world\"}")"

python3 - <<'PY' "$create_json"
import json,sys,os
data=json.loads(sys.argv[1])
if not data.get("success"):
  raise SystemExit("create failed: "+json.dumps(data, ensure_ascii=False))
result=data["result"]
sitekey=result["sitekey"]
secret=result["secret"]
env_path="/var/www/tatil-villa/.env"
text=open(env_path,"r",encoding="utf-8").read() if os.path.exists(env_path) else ""
def upsert(text,key,value):
  line=f'{key}="{value}"'
  import re
  if re.search(rf'^{re.escape(key)}=.*$', text, flags=re.M):
    return re.sub(rf'^{re.escape(key)}=.*$', line, text, flags=re.M)
  sep="" if text.endswith("\n") or not text else "\n"
  return text + sep + line + "\n"
text=upsert(text,"NEXT_PUBLIC_TURNSTILE_SITE_KEY",sitekey)
text=upsert(text,"TURNSTILE_SECRET_KEY",secret)
open(env_path,"w",encoding="utf-8").write(text)
print("SITE_KEY="+sitekey)
print("SECRET_WRITTEN=1")
PY

echo "Turnstile anahtarları .env dosyasına yazıldı."
