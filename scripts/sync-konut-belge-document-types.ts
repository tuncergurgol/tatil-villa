/**
 * Belge no 07-/35-/48-/54- ile başlayan villalarda documentType'ı KONUT_BELGESI yapar.
 *
 *   npx tsx scripts/sync-konut-belge-document-types.ts
 *   npx tsx scripts/sync-konut-belge-document-types.ts --dry-run
 */
import { PrismaClient } from "@prisma/client";
import {
  inferKonutBelgesiType,
  KONUT_BELGE_NO_PREFIXES,
} from "../lib/villa-document-types";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const villas = await prisma.villa.findMany({
    where: {
      documentNo: { not: "" },
      OR: KONUT_BELGE_NO_PREFIXES.map((prefix) => ({
        documentNo: { startsWith: prefix, mode: "insensitive" as const },
      })),
    },
    select: {
      id: true,
      name: true,
      documentNo: true,
      documentType: true,
    },
  });

  const toUpdate = villas.filter(
    (villa) =>
      inferKonutBelgesiType(villa.documentNo) === "KONUT_BELGESI" &&
      villa.documentType !== "KONUT_BELGESI"
  );

  console.log(
    `Konut belge önekli villa: ${villas.length}, güncellenecek: ${toUpdate.length}${
      dryRun ? " (dry-run)" : ""
    }`
  );

  for (const villa of toUpdate) {
    console.log(
      `- ${villa.name} (${villa.id}): ${villa.documentNo} | ${villa.documentType ?? "null"} -> KONUT_BELGESI`
    );
    if (!dryRun) {
      await prisma.villa.update({
        where: { id: villa.id },
        data: { documentType: "KONUT_BELGESI" },
      });
    }
  }

  if (!dryRun && toUpdate.length > 0) {
    console.log("Güncelleme tamamlandı.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
