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

AUTH_HEADER="Authorization: Bearer ${TOKEN}"
CT_HEADER="Content-Type: application/json"

# Token Zone.Read yetkili; Account.List olmayabilir — account id zone yanıtından alınır.
zones_json="$(curl -sS -H "$AUTH_HEADER" -H "$CT_HEADER" \
  "https://api.cloudflare.com/client/v4/zones?per_page=50")"

account_id="$(printf '%s' "$zones_json" | python3 -c '
import json,sys
data=json.load(sys.stdin)
if not data.get("success"):
  raise SystemExit("zones failed: "+json.dumps(data.get("errors"), ensure_ascii=False))
results=data.get("result") or []
if not results:
  raise SystemExit("no cloudflare zones")
account=(results[0].get("account") or {}).get("id")
if not account:
  raise SystemExit("zone has no account id")
print(account)
')"

echo "Account: $account_id"

# Secret yalnızca create yanıtında gelir. Secret yoksa yeni widget şart.
if grep -qE '^TURNSTILE_SECRET_KEY=.+' /var/www/tatil-villa/.env 2>/dev/null \
  && grep -qE '^NEXT_PUBLIC_TURNSTILE_SITE_KEY=.+' /var/www/tatil-villa/.env 2>/dev/null; then
  echo "Turnstile anahtarları .env içinde mevcut — atlandı."
  exit 0
fi

domains='["www.tatildeyiz.com.tr","tatildeyiz.com.tr","www.balayivillacisi.com","balayivillacisi.com","www.tatilvillacisi.com","tatilvillacisi.com","www.glampingturkey.com","glampingturkey.com","bont.tatildeyiz.com.tr","localhost"]'

create_json="$(curl -sS -X POST -H "$AUTH_HEADER" -H "$CT_HEADER" \
  "https://api.cloudflare.com/client/v4/accounts/${account_id}/challenges/widgets" \
  --data "{\"name\":\"tatildeyiz-sizi-arayalim\",\"domains\":${domains},\"mode\":\"managed\",\"bot_fight_mode\":false,\"region\":\"world\"}")"

printf '%s' "$create_json" | python3 -c '
import json,sys,os,re
data=json.load(sys.stdin)
if not data.get("success"):
  raise SystemExit("create failed: "+json.dumps(data, ensure_ascii=False))
result=data["result"]
sitekey=result["sitekey"]
secret=result["secret"]
env_path="/var/www/tatil-villa/.env"
text=open(env_path,"r",encoding="utf-8").read() if os.path.exists(env_path) else ""

def upsert(text,key,value):
  line=f"{key}=\"{value}\""
  if re.search(rf"^{re.escape(key)}=.*$", text, flags=re.M):
    return re.sub(rf"^{re.escape(key)}=.*$", line, text, flags=re.M)
  sep="" if (not text or text.endswith("\n")) else "\n"
  return text + sep + line + "\n"

text=upsert(text,"NEXT_PUBLIC_TURNSTILE_SITE_KEY",sitekey)
text=upsert(text,"TURNSTILE_SECRET_KEY",secret)
open(env_path,"w",encoding="utf-8").write(text)
print("SITE_KEY="+sitekey)
print("SECRET_WRITTEN=1")
'

echo "Turnstile anahtarları .env dosyasına yazıldı."
