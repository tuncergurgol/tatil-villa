import { prisma } from "../lib/db";
import { DEFAULT_COMPANY_SETTINGS } from "../lib/queries/company-settings";

async function main() {
  const current = await prisma.companySettings.findUnique({
    where: { id: "default" },
    select: {
      wahaBaseUrl: true,
      wahaApiKey: true,
      assistantWahaBaseUrl: true,
      assistantWahaApiKey: true,
      assistantWahaSessionName: true,
    },
  });

  const baseUrl =
    current?.wahaBaseUrl?.trim() ||
    process.env.WAHA_BASE_URL?.trim() ||
    "http://127.0.0.1:3001";
  const apiKey =
    current?.wahaApiKey?.trim() || process.env.WAHA_API_KEY?.trim() || "";

  if (!apiKey) {
    console.error("WAHA API anahtarı bulunamadı (wahaApiKey veya WAHA_API_KEY).");
    process.exit(1);
  }

  const sessionName =
    current?.assistantWahaSessionName?.trim() || "tatil-asistani";

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      assistantWahaBaseUrl: baseUrl,
      assistantWahaApiKey: apiKey,
      assistantWahaSessionName: sessionName,
    },
    update: {
      assistantWahaBaseUrl: baseUrl,
      assistantWahaApiKey: apiKey,
      assistantWahaSessionName: sessionName,
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      assistantWahaBaseUrl: baseUrl,
      assistantWahaSessionName: sessionName,
      apiKeyLength: apiKey.length,
    })
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
