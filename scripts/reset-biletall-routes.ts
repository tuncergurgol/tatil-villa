import { prisma } from "../lib/db";
import { DEFAULT_COMPANY_SETTINGS } from "../lib/queries/company-settings";
import {
  DEFAULT_BILETALL_ROUTES,
  normalizeBiletallRouteRecord,
  serializeBiletallRoutes,
} from "../lib/biletall-routes";

async function main() {
  const routes = DEFAULT_BILETALL_ROUTES.map((route) =>
    normalizeBiletallRouteRecord(route)
  );

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      biletallRoutesJson: serializeBiletallRoutes(routes),
    },
    update: {
      biletallRoutesJson: serializeBiletallRoutes(routes),
    },
  });

  console.log("Biletall route kayitlari guncellendi:");
  for (const route of routes) {
    console.log(`- ${route.kind}: ${route.customIframeSrc}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
