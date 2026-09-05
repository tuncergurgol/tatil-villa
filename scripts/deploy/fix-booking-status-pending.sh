#!/usr/bin/env bash
# BookingStatus PENDING -> NEW production build fix
# Sunucuda: bash scripts/deploy/fix-booking-status-pending.sh
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/tatil-villa}"
cd "$APP_DIR"
echo "==> cwd: $(pwd)"

python3 <<'PY'
from pathlib import Path
import re

root = Path(".")
skip_sub = ("callback", "konut-belge", "DocumentCheck", "sms-otp", "verification-otp", "node_modules", ".next")
patterns = [
    (re.compile(r'\["PENDING",\s*"CONFIRMED"\]'), '["NEW", "CONFIRMED"]'),
    (re.compile(r"\['PENDING',\s*'CONFIRMED'\]"), "['NEW', 'CONFIRMED']"),
    (re.compile(r"BookingStatus\.PENDING\b"), "BookingStatus.NEW"),
]
booking_hint = re.compile(r"(booking|villa-occupancy|villas\.ts|reservation)", re.I)
changed = []

def skip(p: Path) -> bool:
    s = str(p).replace("\\", "/").lower()
    return any(x.lower() in s for x in skip_sub)

files = list(root.glob("lib/**/*.ts")) + list(root.glob("lib/**/*.tsx"))
files += list(root.glob("app/**/*.ts")) + list(root.glob("app/**/*.tsx"))
files += list(root.glob("components/**/*.ts")) + list(root.glob("components/**/*.tsx"))
pri = root / "lib/queries/villas.ts"
if pri.exists():
    files = [pri] + [f for f in files if f.resolve() != pri.resolve()]

seen = set()
for path in files:
    rp = path.resolve()
    if rp in seen or skip(path):
        continue
    seen.add(rp)
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        continue
    if "PENDING" not in text:
        continue
    orig = text
    for rx, repl in patterns:
        text = rx.sub(repl, text)
    rel = str(path).replace("\\", "/")
    if booking_hint.search(rel) or "BookingStatus" in orig:
        text = re.sub(r'(status\s*:\s*(?:\{\s*in\s*:\s*\[)?["\'])PENDING(["\'])', r"\1NEW\2", text)
        text = re.sub(r'(in:\s*\[[^\]]*)["\']PENDING["\']', lambda m: m.group(0).replace('"PENDING"', '"NEW"').replace("'PENDING'", "'NEW'"), text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        changed.append(rel)

print("Changed:")
for c in changed:
    print(" -", c)
if not changed:
    print(" (none)")

v = root / "lib/queries/villas.ts"
if v.exists():
    t = v.read_text(encoding="utf-8")
    t2 = t.replace('["PENDING", "CONFIRMED"]', '["NEW", "CONFIRMED"]').replace("['PENDING', 'CONFIRMED']", "['NEW', 'CONFIRMED']")
    if t2 != t:
        v.write_text(t2, encoding="utf-8")
        print("Forced villas.ts array fix")
    bad = '"PENDING"' in t2 or "'PENDING'" in t2
    print("villas.ts PENDING left:", bad)
PY

echo "==> prisma generate"
npx prisma generate
echo "==> npm run build"
npm run build
if [[ -f .next/BUILD_ID ]]; then
  echo "==> pm2 restart"
  pm2 restart tatil-villa --update-env || pm2 restart tatil-villa
  echo "BUILD_ID=$(cat .next/BUILD_ID)"
else
  echo "ERROR: no BUILD_ID"; exit 1
fi
echo DONE