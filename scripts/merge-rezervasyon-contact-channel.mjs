/**
 * "Rezervasyon" ulaşım kanalını "Eski Misafir" ile birleştirir.
 * Müşteri kayıtlarını taşır ve Rezervasyon kanalını pasifleştirir.
 * Tekrar çalıştırılması güvenlidir.
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function channelKey(name) {
  return name.trim().toLocaleLowerCase("tr-TR");
}

loadEnv(new URL("../.env", import.meta.url));

const prisma = new PrismaClient();

const channels = await prisma.customerContactChannel.findMany();
let eski = channels.find((item) => channelKey(item.name) === "eski misafir");
if (!eski) {
  eski = await prisma.customerContactChannel.create({
    data: { name: "Eski Misafir", sortOrder: 12, active: true },
  });
} else if (!eski.active) {
  eski = await prisma.customerContactChannel.update({
    where: { id: eski.id },
    data: { active: true },
  });
}

const retired = channels.filter(
  (item) => channelKey(item.name) === "rezervasyon"
);
let moved = 0;
for (const channel of retired) {
  const result = await prisma.customer.updateMany({
    where: { contactChannelId: channel.id },
    data: { contactChannelId: eski.id },
  });
  moved += result.count;
  if (channel.active) {
    await prisma.customerContactChannel.update({
      where: { id: channel.id },
      data: { active: false },
    });
  }
}

console.log(
  JSON.stringify({
    eskiMisafirId: eski.id,
    moved,
    deactivated: retired.map((item) => item.id),
  })
);

await prisma.$disconnect();
