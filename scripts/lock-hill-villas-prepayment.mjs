/**
 * HILL VILLAS villalarının dönem ve gün ön ödeme oranını %35 yapar.
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

loadEnv(new URL("../.env", import.meta.url));

const prisma = new PrismaClient();
const RATE = 35;

const villas = await prisma.villa.findMany({
  where: {
    OR: [
      { originalName: { contains: "HILL VILLAS", mode: "insensitive" } },
      { name: { contains: "HILL VILLAS", mode: "insensitive" } },
    ],
  },
  select: { id: true, name: true, originalName: true },
  orderBy: { name: "asc" },
});

const ids = villas.map((villa) => villa.id);
const periods =
  ids.length === 0
    ? { count: 0 }
    : await prisma.villaPricePeriod.updateMany({
        where: { villaId: { in: ids } },
        data: { prepaymentRate: RATE },
      });
const days =
  ids.length === 0
    ? { count: 0 }
    : await prisma.villaPricePeriodDay.updateMany({
        where: { villaId: { in: ids } },
        data: { prepaymentRate: RATE },
      });

console.log(
  JSON.stringify({
    villas: villas.map((villa) => ({
      name: villa.name,
      originalName: villa.originalName,
    })),
    villaCount: villas.length,
    periods: periods.count,
    days: days.count,
    prepaymentRate: RATE,
  })
);

await prisma.$disconnect();
