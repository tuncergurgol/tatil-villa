import { readFileSync } from "fs";

export const DEFAULT_VILLA_REVIEWS_CSV_PATH =
  "c:/Users/BARAN/Downloads/villa-yorumlar.csv";

export type VillaReviewCsvRow = {
  rowNumber: number;
  legacyVillaId: number;
  villaName: string;
  guestName: string;
  title: string;
  comment: string;
  rating: number | null;
  reviewDate: Date | null;
};

export type ParsedVillaReviewsCsv = {
  rows: VillaReviewCsvRow[];
  skippedRows: number;
};

const MONTH_LABELS = [
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

function cleanText(value: unknown): string {
  const text = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.toUpperCase() === "NULL") return "";
  return text;
}

function parseSemicolonCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
      if (char === "\r") i++;
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  return rows;
}

export function parseReviewDate(value: unknown): Date | null {
  const text = cleanText(value);
  if (!text) return null;

  const match = text.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/
  );
  if (!match) return null;

  const [, day, month, year, hour = "12", minute = "0"] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    )
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatStayMonth(date: Date | null): string {
  if (!date) return "";
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function parseRating(value: unknown): number | null {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

export function buildReviewFingerprint(input: {
  villaId: string;
  guestName: string;
  comment: string;
  createdAt: Date;
}): string {
  const comment = input.comment.replace(/\s+/g, " ").trim().slice(0, 240);
  return [
    input.villaId,
    input.guestName.toLocaleLowerCase("tr-TR"),
    comment.toLocaleLowerCase("tr-TR"),
    input.createdAt.toISOString().slice(0, 10),
  ].join("|");
}

export function readVillaReviewRowsFromCsv(filePath: string): ParsedVillaReviewsCsv {
  const content = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const table = parseSemicolonCsv(content);
  if (table.length === 0) {
    return { rows: [], skippedRows: 0 };
  }

  const [header, ...dataRows] = table;
  const columnIndex = new Map(header.map((name, index) => [name.trim(), index]));

  const get = (cells: string[], key: string) =>
    cleanText(cells[columnIndex.get(key) ?? -1] ?? "");

  const rows: VillaReviewCsvRow[] = [];
  let skippedRows = 0;

  for (let index = 0; index < dataRows.length; index++) {
    const cells = dataRows[index] ?? [];
    const legacyVillaId = Number.parseInt(get(cells, "fldUrunID"), 10);
    const guestName = get(cells, "fldYazan");
    const comment = get(cells, "fldYorum");

    if (!Number.isFinite(legacyVillaId) || legacyVillaId <= 0) {
      skippedRows += 1;
      continue;
    }
    if (!guestName || !comment) {
      skippedRows += 1;
      continue;
    }

    rows.push({
      rowNumber: index + 2,
      legacyVillaId,
      villaName: get(cells, "fldUrunAdi"),
      guestName,
      title: get(cells, "fldYorumBaslik"),
      comment,
      rating: parseRating(get(cells, "fldPuan")),
      reviewDate: parseReviewDate(get(cells, "fldTarih")),
    });
  }

  return { rows, skippedRows };
}
