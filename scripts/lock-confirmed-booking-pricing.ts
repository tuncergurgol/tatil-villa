/**
 * Onaylanmis tum rezervasyonlarin fiyat kalemlerini dondurur.
 *
 * Kilit normalde kayit ilk acildiginda olusur; bu script kayitlar hic
 * acilmadan da korunmalarini saglar. Idempotenttir, kilitli kayda dokunmaz.
 *
 *   npx tsx scripts/lock-confirmed-booking-pricing.ts [--dry-run]
 */
import { BookingStatus } from "@prisma/client";
import { prisma } from "../lib/db";
import { lockBookingPricingIfConfirmed } from "../lib/queries/booking-pricing-lock";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const pending = await prisma.booking.findMany({
    where: { status: BookingStatus.CONFIRMED, pricingLockedAt: null },
    select: { id: true, externalCode: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`kilitlenecek onayli rezervasyon: ${pending.length}`);
  if (dryRun) {
    console.log("dry-run: degisiklik yapilmadi");
    return;
  }

  let locked = 0;
  let failed = 0;
  for (const booking of pending) {
    try {
      const snapshot = await lockBookingPricingIfConfirmed(booking.id);
      if (snapshot) locked += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `  ! #${booking.externalCode ?? booking.id}:`,
        error instanceof Error ? error.message : error
      );
    }
    if ((locked + failed) % 250 === 0) {
      console.log(`  ... ${locked + failed}/${pending.length}`);
    }
  }

  const remaining = await prisma.booking.count({
    where: { status: BookingStatus.CONFIRMED, pricingLockedAt: null },
  });
  console.log(`kilitlendi: ${locked} | hata: ${failed} | kalan: ${remaining}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
