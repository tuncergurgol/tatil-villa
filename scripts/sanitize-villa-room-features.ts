/**
 * Oda özelliklerini Türkçe alfabetik ve tekrarsız hale getirir.
 * Villa özel özellikleri DEFAULT listeye yazılmaz; villadaki tüm odalara yayılır.
 *
 * Çalıştırma: npx tsx scripts/sanitize-villa-room-features.ts
 */
import { prisma } from "../lib/db";
import { sanitizeAllVillaRoomFeatures } from "../lib/queries/villa-rooms";

async function main() {
  const result = await sanitizeAllVillaRoomFeatures();
  console.log(
    `Oda özellikleri temizlendi: ${result.updatedRooms} oda, ${result.updatedVillas}/${result.villaCount} villa`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
