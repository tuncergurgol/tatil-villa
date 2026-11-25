/**
 * IndexNow key route TDZ / header smoke.
 * Çalıştır: npx tsx scripts/smoke-indexnow-key-route.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const apiRoute = readFileSync(
  join(process.cwd(), "app/api/indexnow-key/route.ts"),
  "utf8"
);

assert.match(
  apiRoute,
  /const responseHeaders\s*=/,
  "responseHeaders değişkeni headers() ile çakışmamalı"
);
assert.doesNotMatch(
  apiRoute,
  /const headers\s*=\s*\{/,
  "const headers = {...} TDZ üretir; responseHeaders kullan"
);
assert.match(apiRoute, /"X-Robots-Tag":\s*"noindex, nofollow"/);

console.log("ok — indexnow-key route TDZ smoke geçti");
