import { prisma } from "@/lib/db";
import { CAR_RENTAL_PAGE_SETTINGS_SEED } from "@/prisma/car-rental-seed-data";

export type CarRentalPageSettingsData = {
  id: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  sameLocationDefault: boolean;
  showSameLocationToggle: boolean;
  sameLocationLabel: string;
  pickupLabel: string;
  returnLabel: string;
  pickupDateLabel: string;
  returnDateLabel: string;
  driverAgeLabel: string;
  driverAgeOptionsJson: string;
  defaultDriverAge: string;
  ctaText: string;
  rentalDaysHint: string;
  categoriesTitle: string;
  categoriesSubtitle: string;
  locationsTitle: string;
  locationsSubtitle: string;
  criteriaTitle: string;
  criteriaSubtitle: string;
};

export type CarRentalCategoryItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceFrom: number;
  currency: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
};

export type CarRentalLocationItem = {
  id: string;
  name: string;
  city: string;
  iataCode: string;
  vehicleCountHint: string;
  isAirport: boolean;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type CarRentalDriverCriterionItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export function parseDriverAgeOptions(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return ["21-24 yaş", "25-69 yaş", "70+ yaş"];
    return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  } catch {
    return ["21-24 yaş", "25-69 yaş", "70+ yaş"];
  }
}

export async function getCarRentalPageSettings(): Promise<CarRentalPageSettingsData> {
  const existing = await prisma.carRentalPageSettings.findUnique({
    where: { id: "default" },
  });
  if (existing) return existing;

  return prisma.carRentalPageSettings.create({
    data: { ...CAR_RENTAL_PAGE_SETTINGS_SEED },
  });
}

export async function getCarRentalCategoriesAdminData() {
  const items = await prisma.carRentalCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return {
    items: items as CarRentalCategoryItem[],
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getCarRentalLocationsAdminData() {
  const items = await prisma.carRentalLocation.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return {
    items: items as CarRentalLocationItem[],
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getCarRentalCriteriaAdminData() {
  const items = await prisma.carRentalDriverCriterion.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return {
    items: items as CarRentalDriverCriterionItem[],
    totalCount: items.length,
    activeCount: items.filter((i) => i.isActive).length,
  };
}

export async function getCarRentalPublicPageData() {
  const [settings, categories, locations, criteria] = await Promise.all([
    getCarRentalPageSettings(),
    prisma.carRentalCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.carRentalLocation.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.carRentalDriverCriterion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
  ]);

  return {
    settings,
    categories: categories as CarRentalCategoryItem[],
    locations: locations as CarRentalLocationItem[],
    criteria: criteria as CarRentalDriverCriterionItem[],
    driverAgeOptions: parseDriverAgeOptions(settings.driverAgeOptionsJson),
  };
}
