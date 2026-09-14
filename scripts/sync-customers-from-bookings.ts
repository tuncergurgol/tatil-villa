import { prisma } from "../lib/db";
import { syncAllCustomersFromBookings } from "../lib/customer-from-booking";

async function main() {
  const result = await syncAllCustomersFromBookings();
  console.log("Rezervasyon → Müşteri senkronu tamamlandı.");
  console.log(`  İşlenen rezervasyon: ${result.bookingsProcessed}`);
  console.log(`  Benzersiz misafir: ${result.uniqueGuests}`);
  console.log(`  Yeni müşteri: ${result.created}`);
  console.log(`  Güncellenen müşteri: ${result.updated}`);
  console.log(`  Toplam müşteri: ${result.totalCustomers}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
