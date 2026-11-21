#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
import re
text=open("/var/www/tatil-villa/.env",encoding="utf-8",errors="replace").read()
for k in ["NEXT_PUBLIC_TURNSTILE_SITE_KEY","TURNSTILE_SECRET_KEY"]:
  m=re.search(rf"^{re.escape(k)}=(.*)$", text, re.M)
  if not m:
    print(k+"=MISSING")
  else:
    v=m.group(1).strip().strip('"\'')
    print(k+"=SET len="+str(len(v))+" prefix="+v[:8])
PY
curl -sI "https://r2.tatildeyiz.com.tr/" | head -n 8
