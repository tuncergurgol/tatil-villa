/**
 * Gelir raporu küp motoru smoke testi.
 *
 *   npx tsx scripts/smoke-income-report-cube.ts
 */
import {
  DEFAULT_INCOME_CUBE_LAYOUT,
  buildIncomePivot,
  filterIncomeFacts,
  getFactDimensionKey,
  isStoredCommissionEmpty,
  moveIncomeField,
  pivotToExcelRows,
  type IncomeFact,
} from "../lib/income-report-cube";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const facts: IncomeFact[] = [
  {
    id: "1",
    incomeType: "konaklama",
    reservationDate: "2026-01-10",
    stayDate: "2026-07-01",
    villaName: "Villa Test A",
    province: "Muğla",
    district: "Fethiye",
    neighborhood: "Ölüdeniz",
    commissionAmount: 1000,
  },
  {
    id: "2",
    incomeType: "konaklama",
    reservationDate: "2026-01-20",
    stayDate: "2026-07-15",
    villaName: "Villa Test B",
    province: "Muğla",
    district: "Bodrum",
    neighborhood: "Yalıkavak",
    commissionAmount: 2500,
  },
  {
    id: "3",
    incomeType: "transfer",
    reservationDate: "2026-02-05",
    stayDate: "2026-07-01",
    villaName: "Villa Test C",
    province: "Antalya",
    district: "Kaş",
    neighborhood: "Kalkan",
    commissionAmount: 400,
  },
  {
    id: "4",
    incomeType: "konaklama",
    reservationDate: "2025-12-15",
    stayDate: "2026-08-01",
    villaName: "Villa Test A",
    province: "Muğla",
    district: "Fethiye",
    neighborhood: "Ölüdeniz",
    commissionAmount: 800,
  },
];

function main() {
  assert(
    getFactDimensionKey(facts[0], "reservationYear") === "2026",
    "reservation year"
  );
  assert(
    getFactDimensionKey(facts[0], "reservationMonth") === "2026-01",
    "reservation month"
  );
  assert(getFactDimensionKey(facts[0], "stayDay") === "2026-07-01", "stay day");
  assert(getFactDimensionKey(facts[0], "province") === "Muğla", "province");
  assert(
    getFactDimensionKey(facts[0], "villaName") === "Villa Test A",
    "villa name"
  );
  assert(isStoredCommissionEmpty(null), "null commission is empty");
  assert(isStoredCommissionEmpty(0), "zero commission is empty");
  assert(!isStoredCommissionEmpty(1500), "positive commission is filled");

  const defaultPivot = buildIncomePivot(facts, DEFAULT_INCOME_CUBE_LAYOUT);
  assert(defaultPivot.grandTotal === 4700, "default grand total");
  assert(defaultPivot.factCount === 4, "fact count");
  assert(defaultPivot.grandTotals[1] === 4, "reservation count total");
  assert(
    defaultPivot.columnLeaves.some((column) => column.keys[0] === "konaklama"),
    "konaklama column"
  );
  assert(
    defaultPivot.columnLeaves.some((column) => column.keys[0] === "transfer"),
    "transfer column"
  );

  const year2026 = defaultPivot.rows.find(
    (row) => row.keys[0] === "2026" && row.isSubtotal
  );
  assert(year2026?.total === 3900, "2026 subtotal");
  assert(year2026?.totals[1] === 3, "2026 reservation count");

  const january = defaultPivot.rows.find(
    (row) => row.keys.join("|") === "2026|2026-01" && !row.isSubtotal
  );
  assert(january?.total === 3500, "january 2026 total");
  assert(january?.totals[1] === 2, "january reservation count");

  const swapped = moveIncomeField(
    moveIncomeField(DEFAULT_INCOME_CUBE_LAYOUT, "reservationMonth", "palette"),
    "incomeType",
    "rows",
    0
  );
  const swappedPivot = buildIncomePivot(facts, swapped);
  assert(swappedPivot.grandTotal === 4700, "reordered grand total stays");
  const konaklamaRow = swappedPivot.rows.find(
    (row) => row.keys[0] === "konaklama" && row.isSubtotal
  );
  assert(konaklamaRow?.total === 4300, "konaklama after reorder");
  assert(konaklamaRow?.totals[1] === 3, "konaklama reservation count");

  const muglaOnly = filterIncomeFacts(
    facts,
    {
      reservationFrom: "",
      reservationTo: "",
      stayFrom: "",
      stayTo: "",
    },
    { province: ["Muğla"] }
  );
  const muglaPivot = buildIncomePivot(muglaOnly, DEFAULT_INCOME_CUBE_LAYOUT);
  assert(muglaPivot.grandTotal === 4300, "province filter");
  assert(muglaPivot.factCount === 3, "province filter count");
  assert(muglaPivot.grandTotals[1] === 3, "province reservation count");

  const noneSelected = filterIncomeFacts(
    facts,
    {
      reservationFrom: "",
      reservationTo: "",
      stayFrom: "",
      stayTo: "",
    },
    { province: [] }
  );
  assert(noneSelected.length === 0, "empty value filter matches nothing");

  const stayFiltered = filterIncomeFacts(facts, {
    reservationFrom: "",
    reservationTo: "",
    stayFrom: "2026-08-01",
    stayTo: "2026-08-31",
  });
  assert(stayFiltered.length === 1, "stay date filter");
  assert(stayFiltered[0].commissionAmount === 800, "august stay amount");

  const excelRows = pivotToExcelRows(defaultPivot, DEFAULT_INCOME_CUBE_LAYOUT);
  const lastRow = excelRows[excelRows.length - 1];
  assert(lastRow[0] === "Genel Toplam", "excel total label");
  assert(lastRow[lastRow.length - 2] === 4700, "excel commission total");
  assert(lastRow[lastRow.length - 1] === 4, "excel reservation count");

  const byDayLayout = moveIncomeField(
    DEFAULT_INCOME_CUBE_LAYOUT,
    "reservationDay",
    "rows",
    2
  );
  const byDay = buildIncomePivot(facts, byDayLayout);
  assert(byDay.grandTotal === 4700, "day grouping total");
  assert(
    byDay.rows.some((row) => row.keys[2] === "2026-01-10"),
    "day key present"
  );

  const villaLayout = moveIncomeField(
    DEFAULT_INCOME_CUBE_LAYOUT,
    "villaName",
    "rows",
    0
  );
  const villaPivot = buildIncomePivot(facts, villaLayout);
  const villaA = villaPivot.rows.find(
    (row) => row.keys[0] === "Villa Test A" && row.isSubtotal
  );
  assert(villaA?.total === 1800, "villa A commission");
  assert(villaA?.totals[1] === 2, "villa A reservation count");

  console.log("smoke-income-report-cube: OK");
}

main();
