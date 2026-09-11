import { writeFileSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";

const filePath =
  process.argv[2] ??
  resolve(process.cwd(), "scripts/aylik-ilan-raporu-7464-2026-06.xlsx");
const outputPath =
  process.argv[3] ??
  resolve(process.cwd(), "scripts/aylik-ilan-addresses.json");

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumnIndex(headers: unknown[], matchers: string[]) {
  return headers.findIndex((header) => {
    const text = normalizeHeader(header);
    return matchers.every((matcher) => text.includes(matcher));
  });
}

function extractSlugFromListingUrl(url: string) {
  const trimmed = url.trim().replace(/^https?:\/\//i, "");
  const parts = trimmed.split("/").filter(Boolean);
  return (parts[parts.length - 1] ?? "").trim();
}

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
}) as unknown[][];

const headers = matrix[0] ?? [];
const linkIndex = findColumnIndex(headers, ["ilan", "link"]);
const addressIndex = findColumnIndex(headers, ["ilan", "adres"]);
const documentNoIndex = findColumnIndex(headers, ["belge", "numara"]);

const rows: Array<{
  slug: string;
  documentNo: string;
  address: string;
}> = [];

for (let index = 1; index < matrix.length; index += 1) {
  const cells = matrix[index] ?? [];
  const slug = extractSlugFromListingUrl(String(cells[linkIndex] ?? "").trim());
  const address = String(cells[addressIndex] ?? "").trim();
  const documentNo = String(cells[documentNoIndex] ?? "").trim();
  if (!address || (!slug && !documentNo)) continue;
  rows.push({ slug, documentNo, address });
}

writeFileSync(outputPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`Yazildi: ${outputPath} (${rows.length} kayit)`);
