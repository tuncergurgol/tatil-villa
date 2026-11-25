import { prisma } from "../lib/db";
import { syncAllCustomersFromExcel } from "../lib/customer-from-booking";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Kullanım: npm run sync:customers:excel -- <excel-dosya-yolu>");
    process.exit(1);
  }

  const result = await syncAllCustomersFromExcel(filePath);
  console.log("Excel → Müşteri senkronu tamamlandı.");
  console.log(`  İşlenen satır: ${result.rowsProcessed}`);
  console.log(`  Benzersiz misafir: ${result.uniqueGuests}`);
  console.log(`  Yeni müşteri: ${result.created}`);
  console.log(`  Güncellenen müşteri: ${result.updated}`);
  console.log(`  Telefonu olan: ${result.withPhone}`);
  console.log(`  E-postası olan: ${result.withEmail}`);
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
