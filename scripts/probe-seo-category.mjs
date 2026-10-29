import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const f = await p.facilityCategory.findMany({
  where: { OR: [{ slug: { contains: "isitmali" } }, { slug: { contains: "jakuzi" } }] },
  select: { slug: true, name: true },
});
const r = await p.region.findUnique({
  where: { slug: "kalkan" },
  select: { slug: true, name: true, active: true, published: true },
});
console.log(JSON.stringify({ f, r }, null, 2));
await p.$disconnect();
