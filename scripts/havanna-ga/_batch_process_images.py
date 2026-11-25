#!/usr/bin/env python3
"""Tek rembg oturumuyla ürün görsellerini: zemin sil → ortala → webp."""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path("/var/www/havanna-global")
PRODUCTS = ROOT / "data" / "products.json"
UPLOAD_DIR = ROOT / "images" / "uploads"
BACKUP_DIR = ROOT / "images" / "_pre-webp-backup"
MAX_EDGE = 1200
PAD = 0.08
WEBP_QUALITY = 82


def sanitize(name: str) -> str:
    s = unicodedata.normalize("NFKC", name or "urun")
    s = re.sub(r'[\/\\?%*:|"<>]', "", s)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return (s[:80] or "urun")


def already_done(rel: str) -> bool:
    return bool(re.search(r"-Havanna-.+\.webp$", Path(rel).name, re.I))


def center_transparent(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    # trim by alpha
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    max_side = max(w, h)
    target = min(MAX_EDGE, max(640, int(max_side * (1 + PAD * 2) + 0.5)))
    inner = int(target * (1 - PAD * 2) + 0.5)
    # resize inside
    scale = min(inner / w, inner / h, 1.0)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    if (nw, nh) != (w, h):
        img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    ox = (target - img.size[0]) // 2
    oy = (target - img.size[1]) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def main() -> int:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    print("loading rembg session...", flush=True)
    session = new_session("u2net")
    print("session ready", flush=True)

    changed = 0
    to_delete: list[Path] = []

    for product in products:
        name = product.get("name") or "urun"
        prev = product.get("images") if isinstance(product.get("images"), list) else []
        if not prev and product.get("image"):
            prev = [product["image"]]
        if not prev:
            continue
        if all(already_done(r) and (ROOT / r).exists() for r in prev):
            print(f"SKIP {name}", flush=True)
            continue

        next_images: list[str] = []
        for i, rel in enumerate(prev):
            src = ROOT / rel
            if already_done(rel) and src.exists():
                next_images.append(rel)
                continue
            if not src.exists():
                print(f"MISSING {product.get('id')} {rel}", flush=True)
                continue

            before = src.stat().st_size
            print(f"Processing {name} [{i+1}/{len(prev)}] {rel} ({before} bytes)...", flush=True)
            t0 = time.time()
            raw = src.read_bytes()
            cut = remove(raw, session=session)
            img = Image.open(__import__("io").BytesIO(cut)).convert("RGBA")
            out_img = center_transparent(img)
            seq = f"{i+1}{int(time.time()*1000)%100000:x}"
            filename = f"{sanitize(name)}-Havanna-{seq}.webp"
            out_path = UPLOAD_DIR / filename
            out_img.save(out_path, "WEBP", quality=WEBP_QUALITY, method=4)
            after = out_path.stat().st_size
            rel_out = f"images/uploads/{filename}"
            next_images.append(rel_out)
            print(f"  -> {filename} {after} bytes in {time.time()-t0:.1f}s", flush=True)

            bak = BACKUP_DIR / f"{product.get('id')}-{i}-{src.name}"
            try:
                bak.write_bytes(src.read_bytes())
            except Exception:
                pass
            if src.resolve() != out_path.resolve():
                to_delete.append(src)

        if next_images:
            product["image"] = next_images[0]
            product["images"] = next_images
            changed += 1
            PRODUCTS.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    PRODUCTS.write_text(json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for p in to_delete:
        try:
            if p.exists():
                p.unlink()
        except Exception:
            pass

    print(f"Updated products: {changed}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
