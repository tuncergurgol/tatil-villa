#!/usr/bin/env python3
"""Add classic La Cofradía Blanco Tekila product."""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/var/www/havanna-global")
PRODUCTS = ROOT / "data" / "products.json"
GROUPS = ROOT / "data" / "groups.json"
UPLOADS = ROOT / "images" / "uploads"
SRC = Path("/tmp/havanna-tequila-classic")
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

ITEM = {
    "id": "la-cofradia-blanco",
    "name": "La Cofradía Blanco Tekila",
    "subGroup": "La Cofradía",
    "meta": "Meksika · %100 agave · dinlendirilmemiş · 40% ABV",
    "file": "la-cofradia-blanco-classic.jpg",
    "description": (
        "La Cofradía Blanco, Meksika Jalisco’da üretilen %100 mavi agave tekiladır.\n\n"
        "Temel özellikler:\n"
        "• %100 mavi agave\n"
        "• Çift damıtma\n"
        "• Dinlendirilmemiş (blanco) profil\n"
        "• 40% ABV\n\n"
        "Taze agave ve bitkisel notalarla öne çıkan klasik La Cofradía hattının "
        "giriş ifadesidir; otel barları ve kokteyl menüleri için uygundur."
    ),
    "seo": {
        "title": "La Cofradía Blanco Tekila | Havanna Global",
        "description": (
            "La Cofradía Blanco Tekila — Meksika menşeli %100 agave tekila. "
            "Havanna Global otel tedarik portföyünde."
        ),
        "keywords": (
            "La Cofradia Blanco, La Cofradia Blanco Tekila, tequila blanco, "
            "tekila, Havanna Global"
        ),
        "slug": "la-cofradia-blanco",
    },
}


def ensure_subgroup(groups: list) -> None:
    for g in groups:
        if g.get("id") != "tequila":
            continue
        subs = g.setdefault("subGroups", [])
        if not any(s.get("id") == "la-cofradia" for s in subs):
            subs.insert(
                0,
                {
                    "id": "la-cofradia",
                    "name": {
                        "tr": "La Cofradía",
                        "en": "La Cofradía",
                        "ar": "La Cofradía",
                    },
                    "sort": 1,
                    "active": True,
                },
            )


def main() -> None:
    src = SRC / ITEM["file"]
    if not src.exists():
        raise SystemExit(f"missing {src}")

    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
    ensure_subgroup(groups)
    GROUPS.write_text(
        json.dumps(groups, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    by_id = {p.get("id"): i for i, p in enumerate(products)}
    UPLOADS.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, UPLOADS / ITEM["file"])
    rel = f"images/uploads/{ITEM['file']}"

    payload = {
        "id": ITEM["id"],
        "name": ITEM["name"],
        "category": "tequila",
        "subGroup": ITEM["subGroup"],
        "labelKey": "cat.tequila",
        "meta": ITEM["meta"],
        "description": ITEM["description"],
        "image": rel,
        "images": [rel],
        "seo": ITEM["seo"],
        "active": True,
        "createdAt": NOW,
        "updatedAt": NOW,
    }

    if ITEM["id"] in by_id:
        products[by_id[ITEM["id"]]] = {**products[by_id[ITEM["id"]]], **payload}
        action = f"updated:{ITEM['id']}"
    else:
        # Klasik sıra: Blanco → Reposado → Añejo
        anchor = by_id.get("la-cofradia-reposado")
        if anchor is None:
            anchor = by_id.get("tequila-san-jose-silver")
            insert_at = (anchor + 1) if anchor is not None else len(products)
        else:
            insert_at = anchor
        products.insert(insert_at, payload)
        action = f"added:{ITEM['id']}"

    by_id = {p.get("id"): i for i, p in enumerate(products)}
    order = [
        "tequila-san-jose-silver",
        "la-cofradia-blanco",
        "la-cofradia-reposado",
        "la-cofradia-anejo",
        "la-cofradia-ed-catrina-blanco",
        "la-cofradia-ed-catrina-reposado",
        "la-cofradia-ed-catrina-anejo",
    ]
    picked = {}
    rest = []
    for p in products:
        if p.get("id") in order:
            picked[p["id"]] = p
        else:
            rest.append(p)
    teqs = [picked[k] for k in order if k in picked]
    teqs += [p for p in rest if p.get("category") == "tequila"]
    non = [p for p in rest if p.get("category") != "tequila"]
    last_spirits = max(
        (i for i, p in enumerate(non) if p.get("category") == "spirits"), default=-1
    )
    insert_at = last_spirits + 1
    final = non[:insert_at] + teqs + non[insert_at:]

    PRODUCTS.write_text(
        json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("OK", action)
    print("tequila:", [p["id"] for p in final if p.get("category") == "tequila"])


if __name__ == "__main__":
    main()
