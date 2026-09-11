import assert from "node:assert/strict";
import { extractDateRange } from "../lib/whatsapp-calendar-parser";

const range = extractDateRange("1-8 ağaustos dolu");
assert.ok(range, "1-8 ağaustos should parse");
assert.equal(range!.startDateKey, "2026-08-01");
assert.equal(range!.endDateKey, "2026-08-08");

const trained = extractDateRange("villa 1-8 ağaustos kapatalım", [
  {
    samplePattern: "1-8 ağaustos",
    startDateKey: "2026-08-01",
    endDateKey: "2026-08-08",
    active: true,
  },
]);
assert.ok(trained);
assert.equal(trained!.startDateKey, "2026-08-01");

console.log("smoke-whatsapp-calendar-date: OK");
