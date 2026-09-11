import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const s = await prisma.companySettings.findUnique({ where: { id: "default" } });
  const key = (s?.evolutionApiKey ?? "").trim();

  console.log(
    JSON.stringify({
      evolutionBaseUrl: s?.evolutionBaseUrl ?? null,
      evolutionInstanceName: s?.evolutionInstanceName ?? null,
      evolutionApiKeyPresent: key.length > 0,
      evolutionApiKeyLen: key.length,
      evolutionApiKeyMasked:
        key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : key.length ? `${key}…` : null,
    })
  );
} finally {
  await prisma.$disconnect();
}

