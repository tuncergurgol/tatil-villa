import { PrismaClient } from "@prisma/client";
import { backfillVillaPricePeriodDays } from "../lib/villa-period-day-sync";

const prisma = new PrismaClient();

function parseArgs() {
  const villaIdArg = process.argv.find((arg) => arg.startsWith("--villa-id="));
  const dbVillaIdArg = process.argv.find((arg) => arg.startsWith("--db-villa-id="));

  const villaId = villaIdArg?.split("=")[1]?.trim() || process.env.VILLA_ID?.trim();
  const dbVillaIdRaw = dbVillaIdArg?.split("=")[1] ?? process.env.DB_VILLA_ID;
  const dbVillaId = dbVillaIdRaw ? parseInt(dbVillaIdRaw, 10) : undefined;

  return {
    villaId: villaId || undefined,
    dbVillaId: Number.isFinite(dbVillaId) ? dbVillaId : undefined,
  };
}

async function resolveVillaIds(options: ReturnType<typeof parseArgs>) {
  if (options.villaId) {
    return [options.villaId];
  }

  if (options.dbVillaId != null) {
    const villa = await prisma.villa.findFirst({
      where: { villaId: options.dbVillaId },
      select: { id: true },
    });
    if (!villa) {
      throw new Error(`villaId=${options.dbVillaId} bulunamadi`);
    }
    return [villa.id];
  }

  const villas = await prisma.villa.findMany({ select: { id: true } });
  return villas.map((villa) => villa.id);
}

async function main() {
  const options = parseArgs();
  const villaIds = await resolveVillaIds(options);

  for (const id of villaIds) {
    await backfillVillaPricePeriodDays(id);
    console.log(`Backfilled ${id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
