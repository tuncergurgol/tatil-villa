import assert from "node:assert/strict";
import {
  buildDailyInvoiceReportText,
  buildDailyOwnerPaymentReportText,
  formatDateKeyTr,
  workbookBufferFromRows,
} from "../lib/daily-check-in-report-mail";

assert.equal(formatDateKeyTr("2026-08-12"), "12.08.2026");

const emptyInvoice = buildDailyInvoiceReportText({
  checkInDateKey: "2026-08-12",
  matchedCount: 0,
  exportCount: 0,
  incompleteCount: 0,
  incomplete: [],
});
assert.match(emptyInvoice, /Giriş tarihi: 12\.08\.2026/);
assert.match(emptyInvoice, /Bugün gönderilecek konaklama faturası bulunmamaktadır/);
assert.doesNotMatch(emptyInvoice, /Excel ektedir/);

const filledInvoice = buildDailyInvoiceReportText({
  checkInDateKey: "2026-08-12",
  matchedCount: 2,
  exportCount: 1,
  incompleteCount: 1,
  incomplete: [
    {
      externalCode: "1001",
      guestName: "Ali Veli",
      villaName: "Villa Test",
      missing: ["Villa sahibi IBAN"],
    },
  ],
});
assert.match(filledInvoice, /Excel'e alınan konaklama faturası: 1/);
assert.match(filledInvoice, /Konaklama faturaları Excel ektedir/);
assert.match(filledInvoice, /1001 — Ali Veli/);

const emptyOwner = buildDailyOwnerPaymentReportText({
  checkInDateKey: "2026-08-12",
  matchedCount: 0,
  exportCount: 0,
  incompleteCount: 0,
  paidCount: 0,
  incomplete: [],
});
assert.match(
  emptyOwner,
  /Bugün gönderilecek ev sahibi ödemesi bulunmamaktadır/
);

const filledOwner = buildDailyOwnerPaymentReportText({
  checkInDateKey: "2026-08-12",
  matchedCount: 3,
  exportCount: 1,
  incompleteCount: 1,
  paidCount: 1,
  incomplete: [
    {
      externalCode: "2002",
      guestName: "Ayşe",
      villaName: "Villa Deniz",
      missing: ["IBAN"],
    },
  ],
});
assert.match(filledOwner, /Excel'e alınan ev sahibi ödemesi: 1/);
assert.match(filledOwner, /Ödemesi kalmayan/);
assert.match(filledOwner, /Ev sahibi ödemeleri Excel ektedir/);

const buffer = workbookBufferFromRows([
  ["Alıcı", "IBAN", "Tutar"],
  ["Test", "TR00", 100],
]);
assert.ok(buffer.length > 100);
assert.equal(buffer.subarray(0, 2).toString(), "PK", "xlsx zip signature");

console.log("smoke-daily-check-in-reports: OK");
