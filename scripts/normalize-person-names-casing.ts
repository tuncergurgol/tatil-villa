/**
 * Mevcut kayıtlardaki Ad Soyad alanlarını "İlk Harf Büyük Kalanı Küçük"
 * kuralına göre düzeltir:
 *   - Booking.guestName            (Müşteri Adı Soyadı)
 *   - VillaOwner.name/firstName/lastName/authorizedPersonName
 *     (Villa Sahibi Adı Soyadı — tüzel kişilerde şirket ünvanına dokunmaz)
 *   - Villa.greeterName            (Misafir Karşılayan Adı Soyadı)
 *   - Villa.calendarManagerName    (Takvimi Yöneten Adı Soyadı)
 *
 * Bundan sonraki tüm create/update işlemleri lib/db.ts içindeki Prisma
 * extension'ı sayesinde otomatik olarak bu kuralla kaydedilir; bu script
 * sadece geçmiş veriyi bir kerelik düzeltmek için kullanılır.
 *
 * Çalıştırma: npm run normalize:names
 */
import { prisma } from "../lib/db";
import { toProperCaseName } from "../lib/text-case";

async function normalizeBookingGuestNames(): Promise<number> {
  const bookings = await prisma.booking.findMany({
    select: { id: true, guestName: true },
  });

  let updated = 0;
  for (const booking of bookings) {
    const nextGuestName = toProperCaseName(booking.guestName);
    if (nextGuestName === booking.guestName) continue;

    await prisma.booking.update({
      where: { id: booking.id },
      data: { guestName: nextGuestName },
    });
    updated += 1;
  }
  return updated;
}

async function normalizeVillaOwnerNames(): Promise<number> {
  const owners = await prisma.villaOwner.findMany({
    select: {
      id: true,
      type: true,
      name: true,
      firstName: true,
      lastName: true,
      authorizedPersonName: true,
    },
  });

  let updated = 0;
  for (const owner of owners) {
    const nextFirstName = toProperCaseName(owner.firstName);
    const nextLastName = toProperCaseName(owner.lastName);
    const nextAuthorizedPersonName = toProperCaseName(
      owner.authorizedPersonName
    );
    // TUZEL_KISI'de name = şirket ünvanı (companyTitle); dokunulmaz.
    const nextName =
      owner.type === "TUZEL_KISI" ? owner.name : toProperCaseName(owner.name);

    if (
      nextFirstName === owner.firstName &&
      nextLastName === owner.lastName &&
      nextAuthorizedPersonName === owner.authorizedPersonName &&
      nextName === owner.name
    ) {
      continue;
    }

    await prisma.villaOwner.update({
      where: { id: owner.id },
      data: {
        firstName: nextFirstName,
        lastName: nextLastName,
        authorizedPersonName: nextAuthorizedPersonName,
        name: nextName,
      },
    });
    updated += 1;
  }
  return updated;
}

async function normalizeVillaPersonelNames(): Promise<number> {
  const villas = await prisma.villa.findMany({
    select: { id: true, greeterName: true, calendarManagerName: true },
  });

  let updated = 0;
  for (const villa of villas) {
    const nextGreeterName = toProperCaseName(villa.greeterName);
    const nextCalendarManagerName = toProperCaseName(
      villa.calendarManagerName
    );

    if (
      nextGreeterName === villa.greeterName &&
      nextCalendarManagerName === villa.calendarManagerName
    ) {
      continue;
    }

    await prisma.villa.update({
      where: { id: villa.id },
      data: {
        greeterName: nextGreeterName,
        calendarManagerName: nextCalendarManagerName,
      },
    });
    updated += 1;
  }
  return updated;
}

async function main() {
  const bookingCount = await normalizeBookingGuestNames();
  const ownerCount = await normalizeVillaOwnerNames();
  const villaCount = await normalizeVillaPersonelNames();

  console.log("Müşteri Adı Soyadı düzeltilen rezervasyon sayısı:", bookingCount);
  console.log(
    "Villa Sahibi Adı Soyadı düzeltilen kayıt sayısı:",
    ownerCount
  );
  console.log(
    "Misafir Karşılayan / Takvimi Yöneten düzeltilen villa sayısı:",
    villaCount
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
