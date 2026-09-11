import { PrismaClient } from "@prisma/client";
import { runCalendarPriceTransferBatchSync } from "../lib/calendar-price-transfer-sync";
import { ALL_CALENDAR_PRICE_TRANSFER_CRITERIA } from "../lib/calendar-price-transfer-auto-sync.types";

const prisma = new PrismaClient();

async function main() {
  const villas = await prisma.villa.findMany({
    where: { active: true },
    select: {
      id: true,
      villaId: true,
      name: true,
      externalSyncUrl1: true,
      externalSyncLastMessage1: true,
      periodImportLog: { select: { status: true, message: true } },
    },
    orderBy: { villaId: "asc" },
  });

  const errored = villas.filter((v) => {
    if (!v.externalSyncUrl1.trim()) return false;
    const periodErr =
      v.periodImportLog?.status === "ERROR" &&
      Boolean(v.periodImportLog.message?.trim());
    const linkErr = /okunamad|hata|fail|error|bulunamad/i.test(
      v.externalSyncLastMessage1
    );
    return periodErr || linkErr;
  });

  console.log(`Hatali villa: ${errored.length}`);
  let ok = 0;
  let fail = 0;
  for (const v of errored) {
    process.stdout.write(`${v.villaId} ${v.name}... `);
    const r = await runCalendarPriceTransferBatchSync(
      v.id,
      ALL_CALENDAR_PRICE_TRANSFER_CRITERIA
    );
    if (r.ok) {
      ok++;
      console.log("OK");
    } else {
      fail++;
      console.log(`FAIL: ${r.message.slice(0, 120)}`);
    }
  }
  console.log(`Sonuc: ${ok} basarili, ${fail} hatali`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
