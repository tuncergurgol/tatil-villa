import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { buildVillaIcalExportUrl } from "@/lib/villa-ical-url";

export async function getVillaIcalTabData(villaId: string) {
  const [sources, syncEvents, companySettings, villa] = await Promise.all([
    prisma.villaIcalSource.findMany({
      where: { villaId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.villaIcalSyncEvent.findMany({
      where: { villaId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getCompanySettings(),
    prisma.villa.findUnique({
      where: { id: villaId },
      select: {
        icalExportToken: true,
        whatsappGroupId: true,
        whatsappGroupDifferentName: true,
      },
    }),
  ]);

  if (!villa) {
    return null;
  }

  const apiDomain =
    companySettings.domain.replace(/^www\./, "") || "tatildeyiz.com.tr";

  return {
    sources,
    syncEvents,
    exportUrl: buildVillaIcalExportUrl(
      apiDomain,
      villaId,
      villa.icalExportToken
    ),
    whatsappGroupId: villa.whatsappGroupId,
    whatsappGroupDifferentName: villa.whatsappGroupDifferentName,
    whatsappModuleConnected: false,
    whatsappGroups: [] as { id: string; name: string }[],
  };
}

export type VillaIcalTabData = NonNullable<
  Awaited<ReturnType<typeof getVillaIcalTabData>>
>;
