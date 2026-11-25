#!/usr/bin/env python3
"""Add classic La Cofradia Reposado + Añejo (catalog non-white bottles)."""
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

ITEMS = [
    {
        "id": "la-cofradia-reposado",
        "name": "La Cofradía Reposado",
        "subGroup": "La Cofradía",
        "meta": "Meksika · %100 agave · 8 ay fıçı · 40% ABV",
        "file": "la-cofradia-reposado.jpg",
        "description": (
            "La Cofradía Reposado, Meksika Jalisco’da üretilen %100 mavi agave tekiladır.\n\n"
            "Temel özellikler:\n"
            "• %100 mavi agave\n"
            "• Çift damıtma\n"
            "• Yaklaşık 8 ay beyaz meşe fıçıda dinlendirme\n"
            "• 40% ABV\n\n"
            "Katalogdaki klasik La Cofradía hattının fıçı dinlendirmeli ifadesidir."
        ),
        "seo": {
            "title": "La Cofradía Reposado | Havanna Global",
            "description": "La Cofradía Reposado — Meksika menşeli %100 agave tekila.",
            "keywords": "La Cofradia Reposado, tequila, tekila, Havanna Global",
            "slug": "la-cofradia-reposado",
        },
    },
    {
        "id": "la-cofradia-anejo",
        "name": "La Cofradía Añejo",
        "subGroup": "La Cofradía",
        "meta": "Meksika · %100 agave · uzun fıçı · 40% ABV",
        "file": "la-cofradia-anejo.jpg",
        "description": (
            "La Cofradía Añejo, klasik hattın uzun fıçı dinlendirmeli %100 mavi agave tekilasıdır.\n\n"
            "Temel özellikler:\n"
            "• %100 mavi agave\n"
            "• Çift damıtma\n"
            "• Uzun fıçı dinlendirme\n"
            "• 40% ABV\n\n"
            "Premium otel servisi ve tadım için olgun bir profil sunar."
        ),
        "seo": {
            "title": "La Cofradía Añejo | Havanna Global",
            "description": "La Cofradía Añejo — uzun fıçı dinlendirmeli %100 agave tekila.",
            "keywords": "La Cofradia Anejo, tequila anejo, tekila, Havanna Global",
            "slug": "la-cofradia-anejo",
        },
    },
]


def main() -> None:
    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
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
    GROUPS.write_text(
        json.dumps(groups, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    by_id = {p.get("id"): i for i, p in enumerate(products)}
    UPLOADS.mkdir(parents=True, exist_ok=True)
    added = []

    for item in ITEMS:
        src = SRC / item["file"]
        if not src.exists():
            raise SystemExit(f"missing {src}")
        shutil.copy2(src, UPLOADS / item["file"])
        rel = f"images/uploads/{item['file']}"
        payload = {
            "id": item["id"],
            "name": item["name"],
            "category": "tequila",
            "subGroup": item["subGroup"],
            "labelKey": "cat.tequila",
            "meta": item["meta"],
            "description": item["description"],
            "image": rel,
            "images": [rel],
            "seo": item["seo"],
            "active": True,
            "createdAt": NOW,
            "updatedAt": NOW,
        }
        if item["id"] in by_id:
            products[by_id[item["id"]]] = {**products[by_id[item["id"]]], **payload}
            added.append(f"updated:{item['id']}")
        else:
            anchor = by_id.get("tequila-san-jose-silver")
            insert_at = (anchor + 1) if anchor is not None else len(products)
            products.insert(insert_at, payload)
            by_id = {p.get("id"): i for i, p in enumerate(products)}
            added.append(f"added:{item['id']}")

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
    print("OK", ", ".join(added))
    print("tequila:", [p["id"] for p in final if p.get("category") == "tequila"])


if __name__ == "__main__":
    main()
