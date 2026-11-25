import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import { getWhatsappCalendarGroupsForPicker } from "@/lib/queries/whatsapp-calendar";
import {
  getExternalSyncSlots,
  isExternalIcalSourceName,
} from "@/lib/villa-external-sync";
import {
  buildVillaIcalExportUrl,
  resolveSiteOrigin,
} from "@/lib/villa-ical-url";

export async function getVillaIcalTabData(
  villaId: string,
  requestOrigin?: { host?: string | null; protocol?: string | null }
) {
  const [sources, syncEvents, companySettings, villa, whatsappGroups] =
    await Promise.all([
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
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncUrl4: true,
        externalSyncLastSyncedAt1: true,
        externalSyncLastSyncedAt2: true,
        externalSyncLastSyncedAt3: true,
        externalSyncLastSyncedAt4: true,
        externalSyncLastMessage1: true,
        externalSyncLastMessage2: true,
        externalSyncLastMessage3: true,
        externalSyncLastMessage4: true,
      },
    }),
    getWhatsappCalendarGroupsForPicker(),
  ]);

  if (!villa) {
    return null;
  }

  const siteOrigin = resolveSiteOrigin({
    host: requestOrigin?.host,
    protocol: requestOrigin?.protocol,
    companyDomain: companySettings.domain,
  });

  return {
    sources: sources.filter((source) => !isExternalIcalSourceName(source.name)),
    syncEvents,
    exportUrl: buildVillaIcalExportUrl(
      siteOrigin,
      villaId,
      villa.icalExportToken
    ),
    externalSyncLinks: getExternalSyncSlots(villa),
    whatsappGroupId: villa.whatsappGroupId,
    whatsappGroupDifferentName: villa.whatsappGroupDifferentName,
    whatsappModuleConnected: companySettings.whatsappCalendarEnabled,
    whatsappGroups: whatsappGroups.map((group) => ({
      id: group.externalId,
      name: group.name,
    })),
  };
}

export type VillaIcalTabData = NonNullable<
  Awaited<ReturnType<typeof getVillaIcalTabData>>
>;
