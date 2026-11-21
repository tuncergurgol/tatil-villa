import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Yeni rezervasyon numaraları bu değerden başlar ve 1’er artar. */
export const BOOKING_NUMBER_START = 116000;

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function allocateNextBookingNumber(
  client: DbClient = prisma
): Promise<number> {
  const result = await client.booking.aggregate({
    _max: { externalCode: true },
  });
  const currentMax = result._max.externalCode;
  if (currentMax == null || currentMax < BOOKING_NUMBER_START) {
    return BOOKING_NUMBER_START;
  }
  return currentMax + 1;
}

function isExternalCodeUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (Array.isArray(error.meta?.target)
      ? error.meta.target.includes("externalCode")
      : String(error.meta?.target ?? "").includes("externalCode"))
  );
}

export async function withAllocatedBookingNumber<T>(
  create: (externalCode: number, tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const externalCode = await allocateNextBookingNumber(tx);
        return create(externalCode, tx);
      });
    } catch (error) {
      lastError = error;
      if (isExternalCodeUniqueConflict(error)) continue;
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Rezervasyon numarası atanamadı.");
}
