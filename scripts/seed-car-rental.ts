import { PrismaClient } from "@prisma/client";
import {
  CAR_RENTAL_CATEGORIES_SEED,
  CAR_RENTAL_CRITERIA_SEED,
  CAR_RENTAL_PAGE_SETTINGS_SEED,
  TURKEY_AIRPORTS_SEED,
} from "../prisma/car-rental-seed-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.carRentalPageSettings.upsert({
    where: { id: "default" },
    create: { ...CAR_RENTAL_PAGE_SETTINGS_SEED },
    update: { ...CAR_RENTAL_PAGE_SETTINGS_SEED },
  });

  for (const cat of CAR_RENTAL_CATEGORIES_SEED) {
    await prisma.carRentalCategory.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        priceFrom: cat.priceFrom,
        currency: "TL",
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      update: {
        name: cat.name,
        priceFrom: cat.priceFrom,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
  }

  for (const loc of TURKEY_AIRPORTS_SEED) {
    const existing = await prisma.carRentalLocation.findFirst({
      where: {
        OR: [
          { iataCode: loc.iataCode },
          { name: loc.name },
        ],
      },
      select: { id: true },
    });

    const data = {
      name: loc.name,
      city: loc.city,
      iataCode: loc.iataCode,
      vehicleCountHint: loc.vehicleCountHint ?? "",
      isAirport: true,
      isPopular: loc.isPopular ?? false,
      sortOrder: loc.sortOrder,
      isActive: true,
    };

    if (existing) {
      await prisma.carRentalLocation.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.carRentalLocation.create({ data });
    }
  }

  const criterionCount = await prisma.carRentalDriverCriterion.count();
  if (criterionCount === 0) {
    await prisma.carRentalDriverCriterion.createMany({
      data: CAR_RENTAL_CRITERIA_SEED.map((c) => ({
        title: c.title,
        description: c.description,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isActive: true,
      })),
    });
  }

  console.log("Car rental CMS seed tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
