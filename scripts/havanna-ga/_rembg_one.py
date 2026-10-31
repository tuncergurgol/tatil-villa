#!/usr/bin/env python3
"""Tek dosya: rembg cutout -> PNG (upload pipeline için)."""
import sys
from pathlib import Path
from rembg import new_session, remove

inp, out = sys.argv[1], sys.argv[2]
session = new_session("u2net")
Path(out).write_bytes(remove(Path(inp).read_bytes(), session=session))
print("done")
