import { prisma } from "../lib/db";
import { syncAllCustomerLoyaltyFromStays } from "../lib/customer-loyalty";

async function main() {
  const result = await syncAllCustomerLoyaltyFromStays();
  console.log("Müşteri üyelik (sadakat) senkronu:");
  console.log(`  Taranan müşteri: ${result.customersScanned}`);
  console.log(`  Konaklaması olan: ${result.withStays}`);
  console.log(`  MemberAccount güncellenen: ${result.memberAccountsUpdated}`);
  console.log(`  Değişmeyen üye hesabı: ${result.unchanged}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
