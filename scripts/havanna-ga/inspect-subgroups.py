#!/usr/bin/env python3
import json
from collections import defaultdict

ps = json.load(open("/var/www/havanna-global/data/products.json", encoding="utf-8"))
d = defaultdict(set)
for p in ps:
    d[p.get("category")].add(p.get("subGroup") or "")
for k, v in sorted(d.items()):
    print(k, "=>", sorted(v))
