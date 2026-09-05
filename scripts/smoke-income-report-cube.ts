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
  sortPivotRows,
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
    getFactDimensionKey(facts[0], "reservationMonth") === "01",
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
  assert(defaultPivot.grandTotals[0] === 4, "reservation count total");
  assert(defaultPivot.grandTotals[1] === 4700, "commission total");
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
  assert(year2026?.totals[0] === 3, "2026 reservation count");
  assert(year2026?.totals[1] === 3900, "2026 commission subtotal");

  const january = defaultPivot.rows.find(
    (row) => row.keys.join("|") === "2026|01" && !row.isSubtotal
  );
  assert(january?.total === 3500, "january 2026 total");
  assert(january?.totals[0] === 2, "january reservation count");
  assert(january?.totals[1] === 3500, "january 2026 commission");

  const monthPivot = buildIncomePivot(facts, {
    filters: [],
    rows: ["reservationMonth", "reservationYear"],
    columns: ["incomeType"],
    values: ["reservationCount", "commissionAmount"],
  });
  const ocakGroup = monthPivot.rows.find(
    (row) => row.keys[0] === "01" && row.isSubtotal
  );
  assert(ocakGroup?.labels[0] === "Ocak", "month label is Ocak without year");
  assert(
    monthPivot.rows.some(
      (row) => row.keys.join("|") === "01|2026" && !row.isSubtotal
    ),
    "ocak then 2026 leaf"
  );
  assert(
    monthPivot.rows.some(
      (row) => row.keys.join("|") === "12|2025" && !row.isSubtotal
    ),
    "aralik then 2025 leaf"
  );

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
  assert(konaklamaRow?.totals[0] === 3, "konaklama reservation count");
  assert(konaklamaRow?.totals[1] === 4300, "konaklama commission after reorder");

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
  assert(muglaPivot.grandTotals[0] === 3, "province reservation count");

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
  assert(lastRow[lastRow.length - 2] === 4, "excel reservation count");
  assert(lastRow[lastRow.length - 1] === 4700, "excel commission total");

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
  assert(villaA?.totals[0] === 2, "villa A reservation count");
  assert(villaA?.totals[1] === 1800, "villa A commission");

  const descSorted = sortPivotRows(defaultPivot.rows, DEFAULT_INCOME_CUBE_LAYOUT.rows, {
    fieldId: "reservationYear",
    direction: "desc",
  });
  const firstYear = descSorted.find((row) => row.isSubtotal)?.keys[0];
  assert(firstYear === "2026", "desc sort puts 2026 first");

  const onlyKonaklama = filterIncomeFacts(
    facts,
    {
      reservationFrom: "",
      reservationTo: "",
      stayFrom: "",
      stayTo: "",
    },
    { incomeType: ["konaklama"] }
  );
  const konaklamaCols = buildIncomePivot(onlyKonaklama, DEFAULT_INCOME_CUBE_LAYOUT, {
    columnValueFilters: { incomeType: ["konaklama"] },
  });
  assert(
    konaklamaCols.columnLeaves.length === 1 &&
      konaklamaCols.columnLeaves[0].keys[0] === "konaklama",
    "column filter keeps only konaklama"
  );

  const reversedCols = buildIncomePivot(facts, DEFAULT_INCOME_CUBE_LAYOUT, {
    columnSort: { fieldId: "incomeType", direction: "desc" },
  });
  assert(
    reversedCols.columnLeaves[0].keys[0] === "transfer",
    "column sort desc starts with transfer"
  );

  console.log("smoke-income-report-cube: OK");
}

main();
