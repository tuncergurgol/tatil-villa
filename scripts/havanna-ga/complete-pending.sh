#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/havanna-global
IMG="$ROOT/images/site"
mkdir -p "$IMG" "$ROOT/files" /tmp/havanna-pdf-png

# Convert reference/map assets from PDF extracts
python3 - <<'PY'
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image

out = Path("/tmp/havanna-pdf-png")
out.mkdir(exist_ok=True)
# page 3 world map strip is img-001; references logos img-007..012; slide renders already exist
mapping = {
    "img-001.ppm": "world-map-raw.png",
    "img-007.ppm": "ref-logo-1.png",
    "img-008.ppm": "ref-logo-2.png",
    "img-009.ppm": "ref-logo-3.png",
    "img-010.ppm": "ref-logo-4.png",
    "img-011.ppm": "ref-logo-5.png",
    "img-012.ppm": "ref-logo-6.png",
}
src_dir = Path("/tmp/havanna-pdf-imgs")
for src_name, dest_name in mapping.items():
    src = src_dir / src_name
    if not src.exists():
        print("missing", src)
        continue
    im = Image.open(src).convert("RGBA")
    im.save(out / dest_name, optimize=True)
    print("saved", dest_name, im.size)

# Also copy rendered slides for map/refs full-bleed fallbacks
from shutil import copy2
pages = Path("/tmp/havanna-pdf-pages")
if (pages / "slide-03.png").exists():
    copy2(pages / "slide-03.png", out / "slide-map.png")
if (pages / "slide-05.png").exists():
    copy2(pages / "slide-05.png", out / "slide-refs.png")
print("done converts")
PY

# Prefer full slide for map (cleaner with labels); crop logos from slide-05 if needed
cp -f /tmp/havanna-pdf-png/slide-map.png "$IMG/world-map.png" 2>/dev/null || true
cp -f /tmp/havanna-pdf-pages/slide-03.png "$IMG/world-map.png"
cp -f /tmp/havanna-pdf-pages/slide-05.png "$IMG/references-board.png"

# Individual logos if converted
i=1
for f in /tmp/havanna-pdf-png/ref-logo-*.png; do
  [ -f "$f" ] || continue
  cp -f "$f" "$IMG/ref-logo-$i.png"
  i=$((i+1))
done

# Digital catalog PDF
if [ -f /tmp/Havanna_MOJU_Sunum_TR.pdf ]; then
  cp -f /tmp/Havanna_MOJU_Sunum_TR.pdf "$ROOT/files/havanna-dijital-katalog.pdf"
elif [ -f /tmp/Havanna-Global-Catalog.pdf ]; then
  cp -f /tmp/Havanna-Global-Catalog.pdf "$ROOT/files/havanna-dijital-katalog.pdf"
fi

ls -la "$IMG" "$ROOT/files" || true
echo "ASSETS_OK"
