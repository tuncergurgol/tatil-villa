/**
 * BTRANS aylık rapor yardımcılar smoke.
 * Çalıştır: npx tsx scripts/smoke-btrans-monthly-report.ts
 */
import { getPreviousMonthIstanbul } from "../lib/btrans-monthly-report";
import {
  buildBtransMonthlyReportText,
  formatBtransPeriodLabel,
} from "../lib/btrans-monthly-report-mail";

function assert(condition: boolean, label: string) {
  if (!condition) throw new Error("FAIL: " + label);
  console.log("ok — " + label);
}

function main() {
  assert(formatBtransPeriodLabel(2026, 7) === "Temmuz 2026", "dönem etiketi");

  const prev = getPreviousMonthIstanbul(new Date("2026-08-25T10:00:00+03:00"));
  assert(prev.year === 2026 && prev.month === 7, "Ağustos → Temmuz");

  const jan = getPreviousMonthIstanbul(new Date("2026-01-01T10:00:00+03:00"));
  assert(jan.year === 2025 && jan.month === 12, "Ocak → Aralık");

  const text = buildBtransMonthlyReportText({
    year: 2026,
    month: 7,
    dateBasisLabel: "Onay Tarihi (varsayılan)",
    count: 2,
    incompleteCount: 1,
    incomplete: [
      {
        bookingId: "x",
        externalCode: "115453",
        villaName: "Test",
        il: "Antalya",
        ilce: "Kaş",
        ownerName: "Ev Sahibi",
        checkIn: "20260701",
        missing: ["IBAN 25 hane (GİB 26 hane ister)"],
      },
    ],
    warnings: ["Tapu alanları 0"],
    test: true,
  });
  assert(text.includes("TEST"), "test satırı");
  assert(text.includes("115453"), "eksik rez no");
  assert(text.includes("Temmuz 2026"), "dönem metinde");

  console.log("smoke ok — btrans monthly report");
}

main();
