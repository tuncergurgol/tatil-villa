import * as XLSX from "xlsx";
import { writeFileSync } from "fs";
import { resolve } from "path";

type RawRow = {
  "İLÇE KODU": number;
  "İLÇE ADI": string;
  "İL KODU": number;
  "İL ADI": string;
};

export type MernisIlceCode = {
  code: string;
  ilceAdi: string;
  ilKodu: number;
  ilAdi: string;
  label: string;
};

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function toTitleCaseTr(value: string) {
  return cleanText(value)
    .toLocaleLowerCase("tr-TR")
    .split(" ")
    .map((part) =>
      part ? part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1) : part
    )
    .join(" ");
}

const source = resolve("c:/Users/BARAN/Downloads/mernis-il-kodlari.xls");
const workbook = XLSX.readFile(source);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<RawRow>(sheet);

const items: MernisIlceCode[] = rows
  .map((row) => {
    const code = String(row["İLÇE KODU"]).padStart(4, "0");
    const ilceAdi = toTitleCaseTr(row["İLÇE ADI"]);
    const ilAdi = toTitleCaseTr(row["İL ADI"]);

    return {
      code,
      ilceAdi,
      ilKodu: row["İL KODU"],
      ilAdi,
      label: `${ilceAdi} — ${ilAdi} (${code})`,
    };
  })
  .sort((a, b) =>
    a.ilceAdi.localeCompare(b.ilceAdi, "tr", { sensitivity: "base" })
  );

const target = resolve("lib/data/mernis-ilce-codes.json");
writeFileSync(target, JSON.stringify(items, null, 2), "utf8");
console.log(`Wrote ${items.length} MERNİS ilçe kodu -> ${target}`);
