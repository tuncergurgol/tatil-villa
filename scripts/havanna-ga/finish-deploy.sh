#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/havanna-global
rm -f "$ROOT/settings.json"
python3 - <<'PY'
from pathlib import Path
idx = Path("/var/www/havanna-global/index.html")
txt = idx.read_text(encoding="utf-8")
txt2 = txt.replace('src="app.js"', 'src="app.js?v=20261031ga"')
txt2 = txt2.replace('src="app.js?v=20261031ga?v=20261031ga"', 'src="app.js?v=20261031ga"')
idx.write_text(txt2, encoding="utf-8")
urun = Path("/var/www/havanna-global/urun.html")
ut = urun.read_text(encoding="utf-8")
ut2 = ut.replace('src="/urun.js"', 'src="/urun.js?v=20261031ga"')
ut2 = ut2.replace('src="/urun.js?v=20261031ga?v=20261031ga"', 'src="/urun.js?v=20261031ga"')
urun.write_text(ut2, encoding="utf-8")
import json
s = json.loads(Path("/var/www/havanna-global/data/settings.json").read_text(encoding="utf-8"))
print("GA:", s.get("googleAnalyticsId"))
PY
grep -n "googleAnalyticsId\|ensureGoogleAnalytics\|settings-ga\|20261031ga" \
  "$ROOT/app.js" "$ROOT/urun.js" "$ROOT/server.js" \
  "$ROOT/admin/panel.js" "$ROOT/admin/panel.html" \
  "$ROOT/index.html" "$ROOT/urun.html" | head -40
pm2 restart havanna-global --update-env
sleep 2
curl -sS https://havannaglobal.com/api/settings | python3 -c 'import sys,json; d=json.load(sys.stdin); print("api GA:", d.get("settings",{}).get("googleAnalyticsId"))'
