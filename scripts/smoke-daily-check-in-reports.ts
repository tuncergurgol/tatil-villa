import assert from "node:assert/strict";
import {
  buildDailyInvoiceReportText,
  buildDailyOwnerPaymentReportText,
  buildDailyReportHtml,
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
  overdueCount: 2,
  payments: [
    {
      externalCode: "115033",
      ownerName: "Barış Çiçek",
      villaName: "Villa Deniz",
      amount: 2590,
    },
  ],
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
assert.match(filledOwner, /Vadesi geçmiş ve açık ödeme: 2/);
assert.match(filledOwner, /Ev sahibi ödemeleri Excel ektedir/);
assert.match(filledOwner, /Ödeme listesi:/);
assert.match(filledOwner, /115033 — Barış Çiçek — Villa Deniz — 2\.590 TL/);
assert.match(filledOwner, /Toplam: 2\.590 TL/);

const ownerHtml = buildDailyReportHtml({
  title: "Ev sahibi ödemeleri günlük kontrolü — TEST",
  checkInDateKey: "2026-08-12",
  matchedCount: 3,
  exportCount: 1,
  incompleteCount: 0,
  emptyMessage: "Bugün gönderilecek ev sahibi ödemesi bulunmamaktadır.",
  attachedMessage: "Ev sahibi ödemeleri Excel ektedir.",
  incomplete: [],
  payments: [
    {
      externalCode: "115033",
      ownerName: "Barış Çiçek",
      villaName: "Villa Deniz",
      amount: 2590,
    },
  ],
});
assert.match(ownerHtml, /Rezervasyon No/);
assert.match(ownerHtml, /Villa Sahibi Adı/);
assert.match(ownerHtml, /Villa Adı/);
assert.match(ownerHtml, /Ödenecek Tutar/);
assert.match(ownerHtml, /115033/);
assert.match(ownerHtml, /Barış Çiçek/);
assert.match(ownerHtml, /Villa Deniz/);
assert.match(ownerHtml, /2\.590 TL/);

const buffer = workbookBufferFromRows([
  ["Alıcı", "IBAN", "Tutar"],
  ["Test", "TR00", 100],
]);
assert.ok(buffer.length > 100);
assert.equal(buffer.subarray(0, 2).toString(), "PK", "xlsx zip signature");

console.log("smoke-daily-check-in-reports: OK");
