import { PrismaClient } from "@prisma/client";
import { syncAllAmenitySortOrders } from "../lib/amenity-sort";

const prisma = new PrismaClient();

async function main() {
  await syncAllAmenitySortOrders();
  console.log("Tesis olanakları alfabetik olarak sıralandı.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
