#!/usr/bin/env python3
from rembg import new_session

print("loading session...")
s = new_session("u2net")
print("session ready", type(s))
