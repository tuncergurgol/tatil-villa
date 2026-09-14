import assert from "node:assert/strict";
import {
  extractDateRange,
  parseWhatsappCalendarMessage,
} from "../lib/whatsapp-calendar-parser";

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

const carpediem = parseWhatsappCalendarMessage(
  "Villa Carpe diem islamlar 5-9 Eylül opsiyon lütfen."
);
assert.ok(carpediem, "Carpediem opsiyon mesajı parse edilmeli");
assert.equal(carpediem!.intent, "OPTION");
assert.equal(carpediem!.startDateKey, "2026-09-05");
assert.equal(carpediem!.endDateKey, "2026-09-09");

console.log("smoke-whatsapp-calendar-date: OK");
