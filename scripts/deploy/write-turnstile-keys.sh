#!/usr/bin/env bash
# Turnstile site/secret anahtarlarını production .env'e yazar.
# Kullanım: SITE_KEY=... SECRET_KEY=... bash scripts/deploy/write-turnstile-keys.sh
set -euo pipefail

SITE_KEY="${SITE_KEY:?SITE_KEY gerekli}"
SECRET_KEY="${SECRET_KEY:?SECRET_KEY gerekli}"
ENV_PATH="${ENV_PATH:-/var/www/tatil-villa/.env}"

python3 - "$ENV_PATH" "$SITE_KEY" "$SECRET_KEY" <<'PY'
import os, re, sys
path, site, secret = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, "r", encoding="utf-8").read() if os.path.exists(path) else ""

def upsert(text: str, key: str, value: str) -> str:
    line = f'{key}="{value}"'
    if re.search(rf"^{re.escape(key)}=.*$", text, flags=re.M):
        return re.sub(rf"^{re.escape(key)}=.*$", line, text, flags=re.M)
    sep = "" if (not text or text.endswith("\n")) else "\n"
    return text + sep + line + "\n"

text = upsert(text, "NEXT_PUBLIC_TURNSTILE_SITE_KEY", site)
text = upsert(text, "TURNSTILE_SECRET_KEY", secret)
open(path, "w", encoding="utf-8").write(text)
print("TURNSTILE_KEYS_WRITTEN=1")
PY

grep -E '^(NEXT_PUBLIC_TURNSTILE_SITE_KEY|TURNSTILE_SECRET_KEY)=' "$ENV_PATH" | sed 's/=.*/=SET/'
