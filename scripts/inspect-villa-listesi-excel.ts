import * as XLSX from "xlsx";

const filePath =
  process.argv[2] ??
  "G:/Drive'ım/Rezervasyonlar/Rezervasyon Takip - 2026.xlsx";

const workbook = XLSX.readFile(filePath, { cellDates: true });
const sheetName =
  workbook.SheetNames.find((name) =>
    name.toLocaleLowerCase("tr-TR").includes("villa listesi")
  ) ?? "Villa Listesi";

const sheet = workbook.Sheets[sheetName];
if (!sheet) {
  console.error("Villa Listesi sayfası bulunamadı");
  process.exit(1);
}

const matrix = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
}) as unknown[][];

console.log("Sheet:", sheetName, "rows:", matrix.length);
for (let i = 0; i < Math.min(10, matrix.length); i++) {
  console.log(i, JSON.stringify(matrix[i]?.slice(0, 8)));
}
