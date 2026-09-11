import * as XLSX from "xlsx";

const filePath =
  process.argv[2] ??
  "G:/Drive'ım/Rezervasyonlar/Rezervasyon Takip - 2026.xlsx";

const workbook = XLSX.readFile(filePath, { cellDates: true });
const sheet = workbook.Sheets["Rezervasyon"]!;
const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  raw: true,
}) as unknown[][];

const header = matrix[3] ?? [];
console.log("Header count:", header.length);
for (let i = 0; i < header.length; i++) {
  const col = XLSX.utils.encode_col(i);
  console.log(`${col} (${i}): ${JSON.stringify(header[i])}`);
}

console.log("\nSample row 5:");
const row = matrix[4] ?? [];
for (let i = 0; i < row.length; i++) {
  const col = XLSX.utils.encode_col(i);
  if (row[i] !== "" && row[i] != null) {
    console.log(`${col}: ${JSON.stringify(row[i])}`);
  }
}
