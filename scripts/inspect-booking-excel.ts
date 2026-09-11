import * as XLSX from "xlsx";

const filePath =
  process.argv[2] ??
  "G:/Drive'ım/Rezervasyonlar/Rezervasyon Takip - 2026.xlsx";

const workbook = XLSX.readFile(filePath, { cellDates: true });
console.log("Sheets:", workbook.SheetNames);

const sheet = workbook.Sheets["Rezervasyon"] ?? workbook.Sheets[workbook.SheetNames[0]!];
const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  raw: true,
}) as unknown[][];

for (let i = 0; i < Math.min(8, matrix.length); i++) {
  console.log(`Row ${i + 1}:`, JSON.stringify(matrix[i]?.slice(0, 26)));
}
