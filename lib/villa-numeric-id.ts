import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Postgres advisory lock — Villa.villaId tahsisi aynı anda tek işlemde yürüsün. */
const VILLA_NUMERIC_ID_LOCK = 872_451;

async function lockVillaNumericId(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${VILLA_NUMERIC_ID_LOCK})`;
}

async function peekNextVillaId(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ next: bigint | number | null }>>`
    SELECT COALESCE(MAX("villaId"), 0) + 1 AS next FROM "Villa"
  `;
  return Number(rows[0]?.next ?? 1);
}

export async function allocateNextVillaId(tx: Prisma.TransactionClient) {
  await lockVillaNumericId(tx);
  return peekNextVillaId(tx);
}

export async function assignMissingVillaNumericIds() {
  return prisma.$transaction(async (tx) => {
    await lockVillaNumericId(tx);

    const missing = await tx.villa.findMany({
      where: { villaId: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true, slug: true },
    });

    if (missing.length === 0) return [];

    let next = await peekNextVillaId(tx);
    const assigned: Array<{ id: string; name: string; villaId: number }> = [];

    for (const villa of missing) {
      await tx.villa.update({
        where: { id: villa.id },
        data: { villaId: next },
      });
      assigned.push({ id: villa.id, name: villa.name, villaId: next });
      next += 1;
    }

    return assigned;
  });
}
