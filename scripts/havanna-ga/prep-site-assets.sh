#!/usr/bin/env bash
set -euo pipefail
ROOT=/var/www/havanna-global
mkdir -p "$ROOT/images/site" "$ROOT/files" /tmp/havanna-ref-png

cp -f /tmp/havanna-pdf-pages/slide-03.png "$ROOT/images/site/world-map.png"
cp -f /tmp/havanna-pdf-pages/slide-05.png "$ROOT/images/site/references-board.png"
cp -f /tmp/Havanna_MOJU_Sunum_TR.pdf "$ROOT/files/havanna-dijital-katalog.pdf"

pdfimages -png -f 5 -l 5 /tmp/Havanna_MOJU_Sunum_TR.pdf /tmp/havanna-ref-png/ref || true
i=1
for f in /tmp/havanna-ref-png/*.png; do
  [ -f "$f" ] || continue
  cp -f "$f" "$ROOT/images/site/ref-$i.png"
  i=$((i + 1))
done

ls -la "$ROOT/images/site" "$ROOT/files"
echo PREP_OK
