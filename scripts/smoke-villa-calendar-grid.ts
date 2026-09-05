import assert from "node:assert/strict";
import {
  buildMonthGrid,
  buildNextMonthFirstWeekRow,
  toDateKey,
} from "../lib/villa-period-calendar";

const septemberGrid = buildMonthGrid(2026, 8);
assert.equal(
  toDateKey(septemberGrid.at(-1)!.date),
  "2026-10-04",
  "Eylül 2026 görünür takvimi 4 Ekim'de biter"
);

const octoberContinuation = buildNextMonthFirstWeekRow(2026, 8);
assert.deepEqual(
  octoberContinuation.map((cell) => toDateKey(cell!.date)),
  [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
    "2026-10-10",
    "2026-10-11",
  ],
  "Ek satır, Ekim 5–11'i tekrar etmeden gösterir"
);

console.log("smoke-villa-calendar-grid: OK");
