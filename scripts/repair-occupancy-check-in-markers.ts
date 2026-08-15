/**
 * Blok başlangıçlarını takvimde açık hale getirir: önceki gecesi boş olan her
 * dolu güne giriş işareti (occupancyCheckIn) yazar. Böylece bitişik iki blok
 * (19 çıkış + 20 giriş) tek parça dolu gibi görünmez.
 *
 * Aynı gün çıkış+giriş günleri (zaten işaretli) korunur, hiçbir işaret silinmez.
 * Çalıştır: npx tsx scripts/repair-occupancy-check-in-markers.ts [--apply]
 */
import { PrismaClient, type VillaDayOccupancy } from "@prisma/client";
import { dbDateToDateKey, dateKeyToDbDate } from "../lib/villa-period-calendar";
import { offsetDateKey } from "../lib/villa-period-selection";

const prisma = new PrismaClient();

function isOccupied(status?: VillaDayOccupancy): boolean {
  return status === "BOOKED" || status === "RESERVED" || status === "OPTION";
}

async function main() {
  const apply = process.argv.includes("--apply");
  const villas = await prisma.villa.findMany({
    select: { id: true, villaId: true, name: true },
    orderBy: { villaId: "asc" },
  });

  let totalFixed = 0;
  for (const villa of villas) {
    const days = await prisma.villaPricePeriodDay.findMany({
      where: { villaId: villa.id },
      select: { date: true, occupancyStatus: true, occupancyCheckIn: true },
      orderBy: { date: "asc" },
    });
    if (days.length === 0) continue;

    const statusByKey = new Map<string, VillaDayOccupancy>();
    const checkInByKey = new Map<string, boolean>();
    for (const day of days) {
      const key = dbDateToDateKey(day.date);
      statusByKey.set(key, day.occupancyStatus);
      checkInByKey.set(key, day.occupancyCheckIn);
    }

    const missing: string[] = [];
    for (const [key, status] of statusByKey) {
      if (!isOccupied(status)) continue;
      if (checkInByKey.get(key)) continue;
      const prevKey = offsetDateKey(key, -1);
      if (isOccupied(statusByKey.get(prevKey))) continue;
      // Önceki gün aynı gün çıkış+giriş ise blok orada başlar, burada değil.
      if (checkInByKey.get(prevKey)) continue;
      missing.push(key);
    }

    if (missing.length === 0) continue;
    totalFixed += missing.length;
    console.log(
      `${villa.villaId} ${villa.name}: ${missing.length} giriş işareti`,
      missing.slice(0, 10).join(", ") + (missing.length > 10 ? " …" : "")
    );

    if (apply) {
      await prisma.villaPricePeriodDay.updateMany({
        where: {
          villaId: villa.id,
          date: { in: missing.map((key) => dateKeyToDbDate(key)) },
        },
        data: { occupancyCheckIn: true },
      });
    }
  }

  console.log(
    apply
      ? `toplam ${totalFixed} gün güncellendi`
      : `toplam ${totalFixed} gün eksik (--apply ile yaz)`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
