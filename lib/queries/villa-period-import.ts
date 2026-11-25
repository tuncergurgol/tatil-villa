import { PeriodImportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type VillaPeriodImportRow = {
  id: string;
  villaId: number;
  villaName: string;
  slug: string;
  active: boolean;
  status: "IMPORTED" | "NOT_IMPORTED";
  lastMessage: string;
  periodCount: number;
  dayCount: number;
  bookedDays: number;
  optionDays: number;
  retryCount: number;
  attemptedAt: Date | null;
  succeededAt: Date | null;
};

export async function getVillaPeriodImportRows(
  fromVillaId = 1,
  toVillaId = 100
): Promise<VillaPeriodImportRow[]> {
  const villas = await prisma.villa.findMany({
    where: { villaId: { gte: fromVillaId, lte: toVillaId } },
    orderBy: { villaId: "asc" },
    select: {
      id: true,
      villaId: true,
      name: true,
      slug: true,
      active: true,
      periodImportLog: {
        select: {
          status: true,
          message: true,
          periodCount: true,
          dayCount: true,
          bookedDays: true,
          optionDays: true,
          retryCount: true,
          attemptedAt: true,
          succeededAt: true,
        },
      },
    },
  });

  return villas.map((villa) => {
    const log = villa.periodImportLog;
    const imported = log?.status === PeriodImportStatus.SUCCESS;

    return {
      id: villa.id,
      villaId: villa.villaId ?? 0,
      villaName: villa.name,
      slug: villa.slug,
      active: villa.active,
      status: imported ? "IMPORTED" : "NOT_IMPORTED",
      lastMessage: log?.message ?? "",
      periodCount: log?.periodCount ?? 0,
      dayCount: log?.dayCount ?? 0,
      bookedDays: log?.bookedDays ?? 0,
      optionDays: log?.optionDays ?? 0,
      retryCount: log?.retryCount ?? 0,
      attemptedAt: log?.attemptedAt ?? null,
      succeededAt: log?.succeededAt ?? null,
    };
  });
}
