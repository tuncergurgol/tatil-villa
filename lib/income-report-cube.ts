export const INCOME_TYPES = [
  { id: "konaklama", label: "Konaklama" },
  { id: "otel", label: "Otel" },
  { id: "bilet", label: "Bilet" },
  { id: "arac_kiralama", label: "Araç Kiralama" },
  { id: "transfer", label: "Transfer" },
] as const;

export type IncomeTypeId = (typeof INCOME_TYPES)[number]["id"];

export const INCOME_TYPE_LABELS: Record<IncomeTypeId, string> = {
  konaklama: "Konaklama",
  otel: "Otel",
  bilet: "Bilet",
  arac_kiralama: "Araç Kiralama",
  transfer: "Transfer",
};

export const MONTH_LABELS_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

export const INCOME_DIMENSION_FIELDS = [
  { id: "reservationYear", label: "Yıl (Rezervasyon)", kind: "year" },
  { id: "reservationMonth", label: "Ay (Rezervasyon)", kind: "month" },
  { id: "reservationDay", label: "Gün (Rezervasyon)", kind: "day" },
  { id: "incomeType", label: "Gelir Türü", kind: "incomeType" },
  { id: "villaName", label: "Villa Adı", kind: "villa" },
  { id: "province", label: "Bölge (İl)", kind: "region" },
  { id: "district", label: "Bölge (İlçe)", kind: "region" },
  { id: "neighborhood", label: "Bölge (Mahalle)", kind: "region" },
  { id: "stayYear", label: "Yıl (Konaklama/Hizmet)", kind: "year" },
  { id: "stayMonth", label: "Ay (Konaklama/Hizmet)", kind: "month" },
  { id: "stayDay", label: "Gün (Konaklama/Hizmet)", kind: "day" },
] as const;

export const INCOME_MEASURE_FIELDS = [
  { id: "reservationCount", label: "Rezervasyon Sayısı", kind: "measure" },
  { id: "commissionAmount", label: "Gelir Tutarı", kind: "measure" },
] as const;

export type IncomeDimensionId = (typeof INCOME_DIMENSION_FIELDS)[number]["id"];
export type IncomeMeasureId = (typeof INCOME_MEASURE_FIELDS)[number]["id"];
export type IncomeFieldId = IncomeDimensionId | IncomeMeasureId;

export type IncomeCubeZone = "palette" | "filters" | "rows" | "columns" | "values";

export type IncomeFact = {
  id: string;
  incomeType: IncomeTypeId;
  reservationDate: string;
  stayDate: string;
  villaName: string;
  province: string;
  district: string;
  neighborhood: string;
  commissionAmount: number;
};

export type MissingCommissionBooking = {
  id: string;
  reservationNo: string;
  villaName: string;
  guestName: string;
  reservationDate: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number | null;
};

export function isStoredCommissionEmpty(
  amount: number | null | undefined
): boolean {
  return amount == null || !Number.isFinite(amount) || amount <= 0;
}

export type IncomeCubeLayout = {
  filters: IncomeDimensionId[];
  rows: IncomeDimensionId[];
  columns: IncomeDimensionId[];
  values: IncomeMeasureId[];
};

export type IncomeDateFilters = {
  reservationFrom: string;
  reservationTo: string;
  stayFrom: string;
  stayTo: string;
};

export type IncomeValueFilters = Partial<Record<IncomeDimensionId, string[]>>;

export type IncomeRowSort = {
  fieldId: IncomeDimensionId;
  direction: "asc" | "desc";
};

export const EMPTY_INCOME_DATE_FILTERS: IncomeDateFilters = {
  reservationFrom: "",
  reservationTo: "",
  stayFrom: "",
  stayTo: "",
};

export const DEFAULT_INCOME_CUBE_LAYOUT: IncomeCubeLayout = {
  filters: [],
  rows: ["reservationYear", "reservationMonth"],
  columns: ["incomeType"],
  values: ["reservationCount", "commissionAmount"],
};

const PREFERRED_MEASURE_ORDER: IncomeMeasureId[] = [
  "reservationCount",
  "commissionAmount",
];

export const MISSING_REGION_LABEL = "Belirtilmedi";

export type IncomePivotColumn = {
  keys: string[];
  labels: string[];
};

export type IncomePivotRow = {
  keys: string[];
  labels: string[];
  cells: number[][];
  totals: number[];
  total: number;
  depth: number;
  isSubtotal: boolean;
};

export type IncomePivotResult = {
  columnLeaves: IncomePivotColumn[];
  measures: IncomeMeasureId[];
  rows: IncomePivotRow[];
  columnTotals: number[][];
  grandTotals: number[];
  grandTotal: number;
  factCount: number;
};

export function isMoneyMeasure(measureId: IncomeMeasureId) {
  return measureId === "commissionAmount";
}

export function measureDelta(fact: IncomeFact, measureId: IncomeMeasureId): number {
  if (measureId === "commissionAmount") return fact.commissionAmount;
  if (measureId === "reservationCount") return 1;
  return 0;
}

const DIMENSION_IDS = new Set<string>(
  INCOME_DIMENSION_FIELDS.map((field) => field.id)
);
const MEASURE_IDS = new Set<string>(
  INCOME_MEASURE_FIELDS.map((field) => field.id)
);

const INCOME_TYPE_ORDER = new Map(
  INCOME_TYPES.map((item, index) => [item.id, index])
);

export function isIncomeDimensionId(value: string): value is IncomeDimensionId {
  return DIMENSION_IDS.has(value);
}

export function isIncomeMeasureId(value: string): value is IncomeMeasureId {
  return MEASURE_IDS.has(value);
}

export function getIncomeFieldLabel(fieldId: IncomeFieldId): string {
  const dimension = INCOME_DIMENSION_FIELDS.find((field) => field.id === fieldId);
  if (dimension) return dimension.label;
  const measure = INCOME_MEASURE_FIELDS.find((field) => field.id === fieldId);
  return measure?.label ?? fieldId;
}

function parseDateParts(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return { year: "", month: "", day: "", monthIndex: 0, dayNum: 0 };
  }
  return {
    year: match[1],
    month: `${match[1]}-${match[2]}`,
    day: dateKey,
    monthIndex: Number(match[2]),
    dayNum: Number(match[3]),
  };
}

function regionValue(value: string) {
  const trimmed = value.trim();
  return trimmed || MISSING_REGION_LABEL;
}

export function getFactDimensionKey(
  fact: IncomeFact,
  fieldId: IncomeDimensionId
): string {
  const reservation = parseDateParts(fact.reservationDate);
  const stay = parseDateParts(fact.stayDate);

  switch (fieldId) {
    case "reservationYear":
      return reservation.year;
    case "reservationMonth":
      return reservation.month;
    case "reservationDay":
      return reservation.day;
    case "stayYear":
      return stay.year;
    case "stayMonth":
      return stay.month;
    case "stayDay":
      return stay.day;
    case "incomeType":
      return fact.incomeType;
    case "villaName":
      return regionValue(fact.villaName);
    case "province":
      return regionValue(fact.province);
    case "district":
      return regionValue(fact.district);
    case "neighborhood":
      return regionValue(fact.neighborhood);
    default:
      return "";
  }
}

function formatMonthLabel(monthKey: string, includeYear: boolean) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey || MISSING_REGION_LABEL;
  const monthName = MONTH_LABELS_TR[Number(match[2]) - 1] ?? match[2];
  return includeYear ? `${monthName} ${match[1]}` : monthName;
}

function formatDayLabel(dayKey: string, includeMonthYear: boolean) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return dayKey || MISSING_REGION_LABEL;
  if (!includeMonthYear) return String(Number(match[3]));
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function getDimensionKeyLabel(
  fieldId: IncomeDimensionId,
  key: string,
  axisFields: IncomeDimensionId[] = []
): string {
  if (!key) return MISSING_REGION_LABEL;

  switch (fieldId) {
    case "reservationYear":
    case "stayYear":
      return key;
    case "reservationMonth":
      return formatMonthLabel(key, !axisFields.includes("reservationYear"));
    case "stayMonth":
      return formatMonthLabel(key, !axisFields.includes("stayYear"));
    case "reservationDay":
      return formatDayLabel(
        key,
        !(
          axisFields.includes("reservationYear") &&
          axisFields.includes("reservationMonth")
        )
      );
    case "stayDay":
      return formatDayLabel(
        key,
        !(axisFields.includes("stayYear") && axisFields.includes("stayMonth"))
      );
    case "incomeType":
      return INCOME_TYPE_LABELS[key as IncomeTypeId] ?? key;
    default:
      return key;
  }
}

export function compareDimensionKeys(
  fieldId: IncomeDimensionId,
  left: string,
  right: string
): number {
  if (fieldId === "incomeType") {
    const leftOrder = INCOME_TYPE_ORDER.get(left as IncomeTypeId) ?? 99;
    const rightOrder = INCOME_TYPE_ORDER.get(right as IncomeTypeId) ?? 99;
    return leftOrder - rightOrder;
  }

  if (
    fieldId === "reservationYear" ||
    fieldId === "stayYear" ||
    fieldId === "reservationMonth" ||
    fieldId === "stayMonth" ||
    fieldId === "reservationDay" ||
    fieldId === "stayDay"
  ) {
    return left.localeCompare(right, "tr");
  }

  if (left === MISSING_REGION_LABEL && right !== MISSING_REGION_LABEL) return 1;
  if (right === MISSING_REGION_LABEL && left !== MISSING_REGION_LABEL) return -1;
  return left.localeCompare(right, "tr");
}

function uniqueKeysForField(
  facts: IncomeFact[],
  fieldId: IncomeDimensionId,
  allowedKeys?: string[] | null
): string[] {
  let keys: string[];
  if (fieldId === "incomeType") {
    keys = INCOME_TYPES.map((item) => item.id);
  } else {
    const set = new Set<string>();
    for (const fact of facts) {
      set.add(getFactDimensionKey(fact, fieldId));
    }
    keys = [...set].sort((left, right) =>
      compareDimensionKeys(fieldId, left, right)
    );
  }

  if (allowedKeys != null) {
    const allowed = new Set(allowedKeys);
    keys = keys.filter((key) => allowed.has(key));
  }

  return keys;
}

function inDateRange(dateKey: string, from: string, to: string) {
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  return true;
}

export function filterIncomeFacts(
  facts: IncomeFact[],
  dateFilters: IncomeDateFilters,
  valueFilters: IncomeValueFilters = {}
): IncomeFact[] {
  return facts.filter((fact) => {
    if (
      !inDateRange(
        fact.reservationDate,
        dateFilters.reservationFrom,
        dateFilters.reservationTo
      )
    ) {
      return false;
    }
    if (!inDateRange(fact.stayDate, dateFilters.stayFrom, dateFilters.stayTo)) {
      return false;
    }

    for (const [fieldId, selected] of Object.entries(valueFilters) as Array<
      [IncomeDimensionId, string[] | undefined]
    >) {
      if (selected == null) continue;
      if (selected.length === 0) return false;
      const key = getFactDimensionKey(fact, fieldId);
      if (!selected.includes(key)) return false;
    }

    return true;
  });
}

function cartesianColumns(
  facts: IncomeFact[],
  columnFields: IncomeDimensionId[],
  options?: {
    valueFilters?: IncomeValueFilters;
    columnSort?: IncomeRowSort | null;
  }
): IncomePivotColumn[] {
  if (columnFields.length === 0) {
    return [{ keys: [], labels: [] }];
  }

  const valueSets = columnFields.map((fieldId) => {
    let keys = uniqueKeysForField(
      facts,
      fieldId,
      options?.valueFilters?.[fieldId]
    );
    const sort = options?.columnSort;
    if (sort?.fieldId === fieldId) {
      keys = [...keys].sort((left, right) => {
        const cmp = compareDimensionKeys(fieldId, left, right);
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }
    return keys;
  });

  let combinations: string[][] = [[]];
  for (const values of valueSets) {
    if (values.length === 0) {
      return [{ keys: [], labels: [] }];
    }
    const next: string[][] = [];
    for (const current of combinations) {
      for (const value of values) {
        next.push([...current, value]);
      }
    }
    combinations = next;
  }

  return combinations.map((keys) => ({
    keys,
    labels: keys.map((key, index) =>
      getDimensionKeyLabel(columnFields[index], key, columnFields.slice(0, index))
    ),
  }));
}

function columnIndexMap(columns: IncomePivotColumn[]) {
  const map = new Map<string, number>();
  columns.forEach((column, index) => {
    map.set(column.keys.join("\0"), index);
  });
  return map;
}

function emptyValues(size: number) {
  return Array.from({ length: size }, () => 0);
}

function emptyCells(columnCount: number, measureCount: number) {
  return Array.from({ length: Math.max(1, columnCount) }, () =>
    emptyValues(Math.max(1, measureCount))
  );
}

function measureTotalsFromCells(cells: number[][]) {
  const measureCount = cells[0]?.length ?? 0;
  const totals = emptyValues(measureCount);
  for (const column of cells) {
    column.forEach((value, index) => {
      totals[index] += value;
    });
  }
  return totals;
}

function leadingMeasureTotal(totals: number[], measures: IncomeMeasureId[]) {
  const moneyIndex = measures.indexOf("commissionAmount");
  if (moneyIndex >= 0) return totals[moneyIndex] ?? 0;
  return totals[0] ?? 0;
}

type GroupNode = {
  key: string;
  facts: IncomeFact[];
  children: Map<string, GroupNode>;
};

function groupFacts(
  facts: IncomeFact[],
  fields: IncomeDimensionId[],
  depth = 0
): Map<string, GroupNode> {
  const groups = new Map<string, GroupNode>();
  if (fields.length === 0 || depth >= fields.length) return groups;

  const fieldId = fields[depth];
  for (const fact of facts) {
    const key = getFactDimensionKey(fact, fieldId);
    let group = groups.get(key);
    if (!group) {
      group = { key, facts: [], children: new Map() };
      groups.set(key, group);
    }
    group.facts.push(fact);
  }

  if (depth < fields.length - 1) {
    for (const group of groups.values()) {
      group.children = groupFacts(group.facts, fields, depth + 1);
    }
  }

  return groups;
}

function sortedGroupKeys(fieldId: IncomeDimensionId, groups: Map<string, GroupNode>) {
  return [...groups.keys()].sort((left, right) =>
    compareDimensionKeys(fieldId, left, right)
  );
}

function accumulateFacts(
  facts: IncomeFact[],
  columnFields: IncomeDimensionId[],
  indexByKey: Map<string, number>,
  columnCount: number,
  measures: IncomeMeasureId[]
) {
  const cells = emptyCells(columnCount, measures.length || 1);
  if (measures.length === 0) return cells;

  for (const fact of facts) {
    const columnKey =
      columnFields.length === 0
        ? ""
        : columnFields.map((fieldId) => getFactDimensionKey(fact, fieldId)).join("\0");
    const index = indexByKey.get(columnKey) ?? 0;
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
      cells[index][measureIndex] += measureDelta(fact, measures[measureIndex]);
    }
  }
  return cells;
}

function toPivotRow(
  keys: string[],
  labels: string[],
  cells: number[][],
  depth: number,
  isSubtotal: boolean,
  measures: IncomeMeasureId[]
): IncomePivotRow {
  const totals = measureTotalsFromCells(cells);
  return {
    keys,
    labels,
    cells,
    totals,
    total: leadingMeasureTotal(totals, measures),
    depth,
    isSubtotal,
  };
}

function flattenGroups(
  groups: Map<string, GroupNode>,
  rowFields: IncomeDimensionId[],
  columnFields: IncomeDimensionId[],
  indexByKey: Map<string, number>,
  columnCount: number,
  measures: IncomeMeasureId[],
  depth: number,
  parentKeys: string[],
  parentLabels: string[]
): IncomePivotRow[] {
  const fieldId = rowFields[depth];
  const rows: IncomePivotRow[] = [];

  for (const key of sortedGroupKeys(fieldId, groups)) {
    const group = groups.get(key);
    if (!group) continue;

    const label = getDimensionKeyLabel(
      fieldId,
      key,
      rowFields.slice(0, depth)
    );
    const keys = [...parentKeys, key];
    const labels = [...parentLabels, label];
    const isLeaf = depth === rowFields.length - 1;

    if (isLeaf) {
      rows.push(
        toPivotRow(
          keys,
          labels,
          accumulateFacts(
            group.facts,
            columnFields,
            indexByKey,
            columnCount,
            measures
          ),
          depth,
          false,
          measures
        )
      );
      continue;
    }

    const childRows = flattenGroups(
      group.children,
      rowFields,
      columnFields,
      indexByKey,
      columnCount,
      measures,
      depth + 1,
      keys,
      labels
    );
    const cells = emptyCells(columnCount, measures.length || 1);
    for (const child of childRows) {
      if (child.depth !== rowFields.length - 1) continue;
      child.cells.forEach((column, columnIndex) => {
        column.forEach((value, measureIndex) => {
          cells[columnIndex][measureIndex] += value;
        });
      });
    }

    rows.push(toPivotRow(keys, labels, cells, depth, true, measures));
    rows.push(...childRows);
  }

  return rows;
}

function partitionPivotBlocksAtDepth(
  rows: IncomePivotRow[],
  depth: number
): IncomePivotRow[][] {
  if (rows.length === 0) return [];
  const blocks: IncomePivotRow[][] = [];
  let start = 0;
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].depth === depth && rows[index].isSubtotal) {
      blocks.push(rows.slice(start, index));
      start = index;
    }
  }
  blocks.push(rows.slice(start));
  return blocks;
}

export function sortPivotRows(
  rows: IncomePivotRow[],
  rowFields: IncomeDimensionId[],
  sort: IncomeRowSort | null
): IncomePivotRow[] {
  if (!sort || rows.length === 0 || rowFields.length === 0) return rows;

  const fieldIndex = rowFields.indexOf(sort.fieldId);
  if (fieldIndex < 0) return rows;

  const fieldId = sort.fieldId;
  const compareKeys = (left: string, right: string) => {
    const cmp = compareDimensionKeys(fieldId, left, right);
    return sort.direction === "asc" ? cmp : -cmp;
  };

  function sortLevel(slice: IncomePivotRow[], depth: number): IncomePivotRow[] {
    if (slice.length === 0) return slice;

    if (depth === fieldIndex && depth === rowFields.length - 1) {
      return [...slice].sort((left, right) =>
        compareKeys(left.keys[depth] ?? "", right.keys[depth] ?? "")
      );
    }

    if (depth === fieldIndex) {
      const blocks = partitionPivotBlocksAtDepth(slice, depth);
      blocks.sort((left, right) =>
        compareKeys(
          left[0]?.keys[depth] ?? "",
          right[0]?.keys[depth] ?? ""
        )
      );
      return blocks.flat();
    }

    if (depth < fieldIndex) {
      const blocks = partitionPivotBlocksAtDepth(slice, depth);
      return blocks.flatMap((block) => {
        if (block.length === 0) return block;
        const [header, ...rest] = block;
        return [header, ...sortLevel(rest, depth + 1)];
      });
    }

    return slice;
  }

  return sortLevel(rows, 0);
}

export function buildIncomePivot(
  facts: IncomeFact[],
  layout: IncomeCubeLayout,
  options?: {
    columnValueFilters?: IncomeValueFilters;
    columnSort?: IncomeRowSort | null;
  }
): IncomePivotResult {
  const columnFields = layout.columns;
  const rowFields = layout.rows;
  const measures = layout.values;
  const columnLeaves = cartesianColumns(facts, columnFields, {
    valueFilters: options?.columnValueFilters,
    columnSort: options?.columnSort ?? null,
  });
  const indexByKey = columnIndexMap(columnLeaves);
  const columnCount = Math.max(1, columnLeaves.length);

  if (rowFields.length === 0) {
    const cells = accumulateFacts(
      facts,
      columnFields,
      indexByKey,
      columnCount,
      measures
    );
    const grandTotals = measureTotalsFromCells(cells);
    return {
      columnLeaves,
      measures,
      rows: [
        toPivotRow(["toplam"], ["Toplam"], cells, 0, false, measures),
      ],
      columnTotals: cells,
      grandTotals,
      grandTotal: leadingMeasureTotal(grandTotals, measures),
      factCount: facts.length,
    };
  }

  const groups = groupFacts(facts, rowFields);
  const rows = flattenGroups(
    groups,
    rowFields,
    columnFields,
    indexByKey,
    columnCount,
    measures,
    0,
    [],
    []
  );

  const columnTotals = emptyCells(columnCount, measures.length || 1);
  for (const row of rows) {
    if (row.depth !== rowFields.length - 1) continue;
    row.cells.forEach((column, columnIndex) => {
      column.forEach((value, measureIndex) => {
        columnTotals[columnIndex][measureIndex] += value;
      });
    });
  }
  const grandTotals = measureTotalsFromCells(columnTotals);

  return {
    columnLeaves,
    measures,
    rows,
    columnTotals,
    grandTotals,
    grandTotal: leadingMeasureTotal(grandTotals, measures),
    factCount: facts.length,
  };
}

export function uniqueFilterValues(
  facts: IncomeFact[],
  fieldId: IncomeDimensionId
): Array<{ key: string; label: string }> {
  return uniqueKeysForField(facts, fieldId).map((key) => ({
    key,
    label: getDimensionKeyLabel(fieldId, key),
  }));
}

function removeFromArray<T extends string>(items: T[], value: string): T[] {
  return items.filter((item) => item !== value);
}

export function fieldZone(
  layout: IncomeCubeLayout,
  fieldId: IncomeFieldId
): IncomeCubeZone {
  if (isIncomeMeasureId(fieldId)) {
    return layout.values.includes(fieldId) ? "values" : "palette";
  }
  if (layout.filters.includes(fieldId)) return "filters";
  if (layout.rows.includes(fieldId)) return "rows";
  if (layout.columns.includes(fieldId)) return "columns";
  return "palette";
}

export function usedFieldIds(layout: IncomeCubeLayout): Set<IncomeFieldId> {
  return new Set<IncomeFieldId>([
    ...layout.filters,
    ...layout.rows,
    ...layout.columns,
    ...layout.values,
  ]);
}

function insertAt<T>(items: T[], item: T, index: number): T[] {
  const next = [...items];
  const safeIndex = Math.max(0, Math.min(index, next.length));
  next.splice(safeIndex, 0, item);
  return next;
}

export function moveIncomeField(
  layout: IncomeCubeLayout,
  fieldId: IncomeFieldId,
  toZone: IncomeCubeZone,
  toIndex = 0
): IncomeCubeLayout {
  const next: IncomeCubeLayout = {
    filters: [...layout.filters],
    rows: [...layout.rows],
    columns: [...layout.columns],
    values: [...layout.values],
  };

  if (isIncomeMeasureId(fieldId)) {
    next.values = removeFromArray(next.values, fieldId);
    if (toZone === "values") {
      next.values = insertAt(next.values, fieldId, toIndex);
    } else if (toZone !== "palette") {
      next.values = insertAt(next.values, fieldId, next.values.length);
    }
    return next;
  }

  if (!isIncomeDimensionId(fieldId)) return next;

  next.filters = removeFromArray(next.filters, fieldId);
  next.rows = removeFromArray(next.rows, fieldId);
  next.columns = removeFromArray(next.columns, fieldId);

  if (toZone === "filters") {
    next.filters = insertAt(next.filters, fieldId, toIndex);
  } else if (toZone === "rows") {
    next.rows = insertAt(next.rows, fieldId, toIndex);
  } else if (toZone === "columns") {
    next.columns = insertAt(next.columns, fieldId, toIndex);
  }

  return next;
}

export function normalizeIncomeCubeLayout(
  layout: Partial<IncomeCubeLayout> | null | undefined
): IncomeCubeLayout {
  const used = new Set<string>();
  const takeDimensions = (items: unknown): IncomeDimensionId[] => {
    if (!Array.isArray(items)) return [];
    const result: IncomeDimensionId[] = [];
    for (const item of items) {
      if (typeof item !== "string" || !isIncomeDimensionId(item) || used.has(item)) {
        continue;
      }
      used.add(item);
      result.push(item);
    }
    return result;
  };
  const takeMeasures = (items: unknown): IncomeMeasureId[] => {
    if (!Array.isArray(items)) return [];
    const result: IncomeMeasureId[] = [];
    for (const item of items) {
      if (typeof item !== "string" || !isIncomeMeasureId(item) || used.has(item)) {
        continue;
      }
      used.add(item);
      result.push(item);
    }
    return result;
  };

  const values = takeMeasures(layout?.values);
  const orderedValues = [
    ...PREFERRED_MEASURE_ORDER.filter((measureId) => values.includes(measureId)),
    ...values.filter((measureId) => !PREFERRED_MEASURE_ORDER.includes(measureId)),
  ];

  return {
    filters: takeDimensions(layout?.filters),
    rows: takeDimensions(layout?.rows),
    columns: takeDimensions(layout?.columns),
    values: orderedValues.length > 0 ? orderedValues : [...PREFERRED_MEASURE_ORDER],
  };
}

export function pivotToExcelRows(
  pivot: IncomePivotResult,
  layout: IncomeCubeLayout
): (string | number)[][] {
  const rowHeaders = layout.rows.map((fieldId) => getIncomeFieldLabel(fieldId));
  if (rowHeaders.length === 0) rowHeaders.push("Toplam");
  const measures =
    pivot.measures.length > 0 ? pivot.measures : layout.values;

  const columnHeaders = pivot.columnLeaves.flatMap((column) => {
    const base = column.labels.filter(Boolean).join(" / ");
    if (measures.length === 0) return [base || "Değer"];
    return measures.map((measureId) => {
      const measureLabel = getIncomeFieldLabel(measureId);
      return base ? `${base} / ${measureLabel}` : measureLabel;
    });
  });
  const totalHeaders = measures.map((measureId) =>
    measures.length === 1
      ? "Toplam"
      : `Toplam / ${getIncomeFieldLabel(measureId)}`
  );

  const header = [...rowHeaders, ...columnHeaders, ...totalHeaders];
  const rows: (string | number)[][] = [header];

  for (const row of pivot.rows) {
    const labels = layout.rows.map((_, index) => row.labels[index] ?? "");
    if (labels.length === 0) labels.push(row.labels[0] ?? "Toplam");
    if (row.isSubtotal) {
      const last = labels.length - 1;
      if (last >= 0 && labels[last]) {
        labels[last] = `${labels[last]} (Toplam)`;
      }
    }
    const cellValues = row.cells.flatMap((column) =>
      column.map((value) => Math.round(value))
    );
    rows.push([
      ...labels,
      ...cellValues,
      ...row.totals.map((value) => Math.round(value)),
    ]);
  }

  const totalLabels = rowHeaders.map((_, index) =>
    index === 0 ? "Genel Toplam" : ""
  );
  rows.push([
    ...totalLabels,
    ...pivot.columnTotals.flatMap((column) =>
      column.map((value) => Math.round(value))
    ),
    ...pivot.grandTotals.map((value) => Math.round(value)),
  ]);

  return rows;
}

export function buildIncomeReportFilename(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `gelir-raporu-${year}${month}${day}.xlsx`;
}

export function buildMissingCommissionFilename(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `komisyonu-bos-onayli-rezervasyonlar-${year}${month}${day}.xlsx`;
}

export function missingCommissionToExcelRows(
  rows: MissingCommissionBooking[]
): (string | number)[][] {
  return [
    [
      "Rezervasyon No",
      "Villa Adı",
      "Misafir",
      "Rezervasyon Tarihi",
      "Giriş",
      "Çıkış",
      "Toplam Tutar",
    ],
    ...rows.map((row) => [
      row.reservationNo,
      row.villaName,
      row.guestName,
      row.reservationDate,
      row.checkIn,
      row.checkOut,
      row.totalPrice ?? "",
    ]),
  ];
}
