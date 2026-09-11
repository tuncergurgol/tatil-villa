import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";
import { isValidAgencyMessageRecipient } from "../lib/agency-message-recipients";

const DEFAULT_EXCEL_PATH = resolve(
  "C:/Users/BARAN/Downloads/Acente Mesaj Sistemi (4).xlsx"
);
const SHEET_NAME = "Mesaj Şablonları";

const prisma = new PrismaClient();

type ExcelRow = {
  rowNo: number;
  name: string;
  recipient: string;
  smsBody: string;
  whatsappBody: string;
  mailBody: string;
};

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const fileArg = argv.find((arg) => !arg.startsWith("--"));
  const filePath = fileArg ? resolve(fileArg) : DEFAULT_EXCEL_PATH;

  return { dryRun, force, filePath };
}

function readRowsFromExcel(filePath: string): ExcelRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`"${SHEET_NAME}" sayfası bulunamadı: ${filePath}`);
  }

  const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
  });

  const rows: ExcelRow[] = [];

  for (let index = 1; index < rawRows.length; index++) {
    const row = rawRows[index];
    if (!row || row.length === 0) continue;

    const rowNo = Number(row[0]);
    const name = String(row[1] ?? "").trim();
    const recipient = String(row[2] ?? "").trim();

    if (!name || !recipient) continue;

    if (!Number.isFinite(rowNo) || rowNo < 1) {
      throw new Error(`Satır ${index + 1}: geçersiz sıra no`);
    }

    if (!isValidAgencyMessageRecipient(recipient)) {
      throw new Error(
        `Satır ${index + 1}: geçersiz alıcı "${recipient}". Beklenen: KARŞILAYAN, MİSAFİR, TAKVİM YÖNETEN, YÖNETİM`
      );
    }

    rows.push({
      rowNo,
      name,
      recipient,
      smsBody: String(row[3] ?? ""),
      whatsappBody: String(row[4] ?? ""),
      mailBody: String(row[5] ?? ""),
    });
  }

  return rows;
}

async function main() {
  const { dryRun, force, filePath } = parseArgs(process.argv.slice(2));

  if (!existsSync(filePath)) {
    throw new Error(`Excel dosyası bulunamadı: ${filePath}`);
  }

  const existingCount = await prisma.agencyMessageTemplate.count();
  if (existingCount > 0 && !force) {
    console.log(
      `Tabloda ${existingCount} kayıt var. Import atlandı. (--force ile zorlayabilirsiniz)`
    );
    return;
  }

  const rows = readRowsFromExcel(filePath);
  console.log(`Kaynak: ${filePath}`);
  console.log(`Okunan satır: ${rows.length}`);
  console.log(dryRun ? "Mod: dry-run" : "Mod: import");

  if (dryRun) {
    rows.forEach((row) => {
      console.log(
        `${row.rowNo}. ${row.name} -> ${row.recipient} (sms:${row.smsBody.length}, wa:${row.whatsappBody.length}, mail:${row.mailBody.length})`
      );
    });
    return;
  }

  if (force && existingCount > 0) {
    const deleted = await prisma.agencyMessageTemplate.deleteMany();
    console.log(`Mevcut ${deleted.count} kayıt silindi (--force).`);
  }

  await prisma.agencyMessageTemplate.createMany({
    data: rows.map((row, index) => ({
      rowNo: row.rowNo,
      name: row.name,
      recipient: row.recipient,
      smsBody: row.smsBody,
      whatsappBody: row.whatsappBody,
      mailBody: row.mailBody,
      sortOrder: index,
    })),
  });

  console.log(`${rows.length} mesaj şablonu içe aktarıldı.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
