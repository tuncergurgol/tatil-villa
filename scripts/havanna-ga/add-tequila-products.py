#!/usr/bin/env python3
"""Add La Cofradia Ed. Catrina tequila products + tequila group."""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/var/www/havanna-global")
PRODUCTS = ROOT / "data" / "products.json"
GROUPS = ROOT / "data" / "groups.json"
UPLOADS = ROOT / "images" / "uploads"
SRC = Path("/tmp/havanna-tequila-imgs")

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

PRODUCTS_TO_ADD = [
    {
        "id": "la-cofradia-ed-catrina-blanco",
        "name": "La Cofradía Ed. Catrina Blanco",
        "category": "tequila",
        "subGroup": "Ed. Catrina",
        "labelKey": "cat.tequila",
        "meta": "Meksika · %100 agave · 40% ABV",
        "description": (
            "La Cofradía Edición Catrina Blanco, Meksika’nın Día de Muertos geleneğinden "
            "ilham alan özel bir tekila serisidir.\n\n"
            "Temel özellikler:\n"
            "• %100 mavi agave\n"
            "• Çift damıtma\n"
            "• 40% ABV\n"
            "• El yapımı cam şişe\n\n"
            "Taze agave ve bitkisel notalarla öne çıkan Blanco, otel barları ve kokteyl "
            "menüleri için güçlü bir baz sunar."
        ),
        "file": "la-cofradia-ed-catrina-blanco.jpg",
        "seo": {
            "title": "La Cofradía Ed. Catrina Blanco | Havanna Global",
            "description": (
                "La Cofradía Ed. Catrina Blanco — Meksika menşeli %100 agave tekila. "
                "Otel ve konaklama işletmeleri için kurumsal tedarik."
            ),
            "keywords": (
                "La Cofradia, Ed Catrina, Catrina Blanco, tequila, tekila, "
                "Havanna Global, otel içecek"
            ),
            "slug": "la-cofradia-ed-catrina-blanco",
        },
    },
    {
        "id": "la-cofradia-ed-catrina-reposado",
        "name": "La Cofradía Ed. Catrina Reposado",
        "category": "tequila",
        "subGroup": "Ed. Catrina",
        "labelKey": "cat.tequila",
        "meta": "Meksika · Amerikan meşe · 40% ABV",
        "description": (
            "La Cofradía Edición Catrina Reposado, Amerikan meşe fıçılarda dinlendirilmiş "
            "%100 agave tekiladır.\n\n"
            "Temel özellikler:\n"
            "• %100 mavi agave\n"
            "• Yaklaşık 11 ay fıçı dinlendirme\n"
            "• 40% ABV\n"
            "• Çift damıtma\n\n"
            "Yumuşak agave, meyvemsi meşe ve dengeli gövdesiyle premium otel servisi "
            "için uygundur."
        ),
        "file": "la-cofradia-ed-catrina-reposado.jpg",
        "seo": {
            "title": "La Cofradía Ed. Catrina Reposado | Havanna Global",
            "description": (
                "La Cofradía Ed. Catrina Reposado — fıçı dinlendirmeli %100 agave tekila. "
                "Kurumsal otel içecek tedariği."
            ),
            "keywords": (
                "La Cofradia, Ed Catrina Reposado, tequila reposado, tekila, "
                "Havanna Global"
            ),
            "slug": "la-cofradia-ed-catrina-reposado",
        },
    },
    {
        "id": "la-cofradia-ed-catrina-anejo",
        "name": "La Cofradía Ed. Catrina Añejo",
        "category": "tequila",
        "subGroup": "Ed. Catrina",
        "labelKey": "cat.tequila",
        "meta": "Meksika · 14 ay fıçı · 40% ABV",
        "description": (
            "La Cofradía Edición Catrina Añejo, Amerikan meşe fıçılarda uzun süre "
            "dinlendirilmiş premium %100 agave tekiladır.\n\n"
            "Temel özellikler:\n"
            "• %100 mavi agave\n"
            "• Yaklaşık 14 ay fıçı dinlendirme\n"
            "• 40% ABV\n"
            "• Çift damıtma\n\n"
            "Derin altın rengi, yumuşak meşe, vanilya ve olgun agave notalarıyla "
            "özel servis ve tadım için idealdir."
        ),
        "file": "la-cofradia-ed-catrina-anejo.jpg",
        "seo": {
            "title": "La Cofradía Ed. Catrina Añejo | Havanna Global",
            "description": (
                "La Cofradía Ed. Catrina Añejo — uzun fıçı dinlendirmeli %100 agave tekila. "
                "Havanna Global kurumsal portföyü."
            ),
            "keywords": (
                "La Cofradia, Ed Catrina Anejo, tequila anejo, tekila, "
                "Havanna Global"
            ),
            "slug": "la-cofradia-ed-catrina-anejo",
        },
    },
]


def main() -> None:
    groups = json.loads(GROUPS.read_text(encoding="utf-8"))
    if not any(g.get("id") == "tequila" for g in groups):
        groups.append(
            {
                "id": "tequila",
                "name": {"tr": "Tekila", "en": "Tequila", "ar": "تكيلا"},
                "sort": 3,
                "active": True,
                "subGroups": [
                    {
                        "id": "ed-catrina",
                        "name": {
                            "tr": "Ed. Catrina",
                            "en": "Ed. Catrina",
                            "ar": "Ed. Catrina",
                        },
                        "sort": 1,
                        "active": True,
                    }
                ],
            }
        )
        # shift wine/sampanya sorts if needed
        for g in groups:
            if g.get("id") == "wine" and int(g.get("sort") or 0) <= 3:
                g["sort"] = 4
            if g.get("id") == "sampanya" and int(g.get("sort") or 0) <= 4:
                g["sort"] = 5
    else:
        # ensure Ed. Catrina subgroup exists
        for g in groups:
            if g.get("id") != "tequila":
                continue
            subs = g.get("subGroups") or []
            if not any(s.get("id") == "ed-catrina" for s in subs):
                subs.append(
                    {
                        "id": "ed-catrina",
                        "name": {
                            "tr": "Ed. Catrina",
                            "en": "Ed. Catrina",
                            "ar": "Ed. Catrina",
                        },
                        "sort": 1,
                        "active": True,
                    }
                )
                g["subGroups"] = subs

    GROUPS.write_text(
        json.dumps(groups, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    by_id = {p.get("id"): i for i, p in enumerate(products)}

    # Move San José into tequila group if present
    if "tequila-san-jose-silver" in by_id:
        p = products[by_id["tequila-san-jose-silver"]]
        p["category"] = "tequila"
        p["labelKey"] = "cat.tequila"
        p["subGroup"] = p.get("subGroup") or "San José"
        p["meta"] = p.get("meta") or "Tequila"

    UPLOADS.mkdir(parents=True, exist_ok=True)
    added = []
    for item in PRODUCTS_TO_ADD:
        src = SRC / item["file"]
        if not src.exists():
            raise SystemExit(f"Missing image: {src}")
        dest_name = item["file"]
        dest = UPLOADS / dest_name
        shutil.copy2(src, dest)
        rel = f"images/uploads/{dest_name}"
        payload = {
            "id": item["id"],
            "name": item["name"],
            "category": item["category"],
            "subGroup": item["subGroup"],
            "labelKey": item["labelKey"],
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
            # insert after san jose if exists, else append near spirits/tequila
            insert_at = len(products)
            if "tequila-san-jose-silver" in by_id:
                insert_at = by_id["tequila-san-jose-silver"] + 1
            products.insert(insert_at, payload)
            by_id = {p.get("id"): i for i, p in enumerate(products)}
            added.append(f"added:{item['id']}")

    PRODUCTS.write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print("OK", ", ".join(added))
    print("total products", len(products))
    print("groups", [g.get("id") for g in groups])


if __name__ == "__main__":
    main()
