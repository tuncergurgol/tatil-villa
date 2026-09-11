import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

function readEnvValue(filePath, key) {
  const content = fs
    .readFileSync(filePath, "utf8")
    // BOM varsa temizle
    .replace(/^\uFEFF/, "");
  const match = content.match(
    new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, "m")
  );
  return (match?.[1] ?? "").trim();
}

try {
  const envPath = path.resolve("evolution/.env");
  const authKey = readEnvValue(envPath, "AUTHENTICATION_API_KEY");
  const serverUrl = readEnvValue(envPath, "SERVER_URL") || "http://localhost:8080";

  if (!authKey) {
    console.error("AUTHENTICATION_API_KEY boş (evolution/.env).");
    process.exit(1);
  }

  await prisma.companySettings.update({
    where: { id: "default" },
    data: {
      evolutionBaseUrl: serverUrl,
      evolutionApiKey: authKey,
      // Instance adı UI’dan düzenlenebilir; burada yoksa fallback tutuyoruz.
      evolutionInstanceName: "tatil-villa",
    },
  });

  console.log(
    JSON.stringify({
      ok: true,
      evolutionBaseUrl: serverUrl,
      evolutionApiKeyPresent: authKey.length > 0,
      evolutionApiKeyLen: authKey.length,
    })
  );
} finally {
  await prisma.$disconnect();
}

