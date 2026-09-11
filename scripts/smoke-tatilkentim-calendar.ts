/**
 * Tatilkentim takvim parser: giriş/çıkış günleri opsiyon değil kapama.
 *   npx tsx scripts/smoke-tatilkentim-calendar.ts
 */
import { parseTatilkentimCalendar } from "../lib/external-villa-page-scrape";

const HTML = `
<div class="calendar-month">Ağustos 2026</div>
<div class="calendar-days">
  <div class="day-rented"><span>1</span></div>
  <div class=" day-checkin day-checkout"><span>2</span></div>
  <div class="day-rented"><span>3</span></div>
  <div class=" day-checkout"><span>4</span></div>
  <div class=""><span>5</span></div>
  <div class=" day-checkin"><span>6</span></div>
  <div class="day-rented"><span>7</span></div>
</div>
</div>
`;

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const parsed = parseTatilkentimCalendar(HTML);
assert(parsed.occupancyByDateKey.get("2026-08-01") === "BOOKED", "1 rented");
assert(parsed.occupancyByDateKey.get("2026-08-02") === "BOOKED", "2 turnover");
assert(parsed.occupancyByDateKey.get("2026-08-03") === "BOOKED", "3 rented");
assert(!parsed.occupancyByDateKey.has("2026-08-04"), "4 checkout empty");
assert(!parsed.occupancyByDateKey.has("2026-08-05"), "5 empty");
assert(parsed.occupancyByDateKey.get("2026-08-06") === "BOOKED", "6 checkin");
assert(parsed.occupancyByDateKey.get("2026-08-07") === "BOOKED", "7 rented");
assert(parsed.checkInDateKeys.has("2026-08-02"), "2 checkin flag");
assert(parsed.checkInDateKeys.has("2026-08-06"), "6 checkin flag");
assert(!parsed.checkInDateKeys.has("2026-08-04"), "4 not checkin");

console.log("smoke-tatilkentim-calendar: OK");
