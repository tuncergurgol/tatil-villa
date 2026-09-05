import { prisma } from "@/lib/db";
import { isExternalIcalSourceName } from "@/lib/villa-external-sync";
import { getWhatsappCalendarGroupsForPicker } from "@/lib/queries/whatsapp-calendar";

export type CalendarPriceTransferLinkSlot = {
  slot: 1 | 2 | 3;
  url: string;
  lastSyncedAt: Date | null;
  lastMessage: string;
  hasError: boolean;
};

export type CalendarPriceTransferIcalSource = {
  id: string;
  name: string;
  url: string;
  lastSyncAt: Date | null;
  lastSyncStatus: string;
  lastSyncMessage: string;
  hasError: boolean;
};

export type CalendarPriceTransferWhatsapp = {
  groupId: string;
  groupName: string;
  differentName: boolean;
  connected: boolean;
};

export type CalendarPriceTransferRow = {
  id: string;
  villaId: number | null;
  name: string;
  originalName: string;
  documentNo: string;
  active: boolean;
  whatsapp: CalendarPriceTransferWhatsapp;
  ical: CalendarPriceTransferIcalSource | null;
  links: CalendarPriceTransferLinkSlot[];
  lastSyncedAt: Date | null;
  reportMessage: string;
  hasError: boolean;
  isUpdated: boolean;
};

export type CalendarPriceTransferWhatsappGroupOption = {
  id: string;
  name: string;
};

function messageLooksLikeError(message: string, status?: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (status && /fail|error|hata/i.test(status)) return true;
  if (/\d+\s*periyot,\s*\d+\s*gün/i.test(text)) return false;
  if (/aktarıldı|güncellendi|işlendi|başarılı|basarili/i.test(text)) {
    return false;
  }
  return /hata|fail|error|başarısız|basarisiz|geçersiz|gecersiz|bulunamadı|bulunamadi/i.test(
    text
  );
}

function formatTrDateTime(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export async function getCalendarPriceTransferAdminData(): Promise<{
  rows: CalendarPriceTransferRow[];
  whatsappGroups: CalendarPriceTransferWhatsappGroupOption[];
}> {
  const [villas, whatsappGroups] = await Promise.all([
    prisma.villa.findMany({
      select: {
        id: true,
        villaId: true,
        name: true,
        originalName: true,
        documentNo: true,
        active: true,
        whatsappGroupId: true,
        whatsappGroupDifferentName: true,
        externalSyncUrl1: true,
        externalSyncUrl2: true,
        externalSyncUrl3: true,
        externalSyncLastSyncedAt1: true,
        externalSyncLastSyncedAt2: true,
        externalSyncLastSyncedAt3: true,
        externalSyncLastMessage1: true,
        externalSyncLastMessage2: true,
        externalSyncLastMessage3: true,
        icalSources: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            url: true,
            lastSyncAt: true,
            lastSyncStatus: true,
            lastSyncMessage: true,
          },
        },
        periodImportLog: {
          select: {
            status: true,
            message: true,
            succeededAt: true,
            attemptedAt: true,
          },
        },
      },
      orderBy: [{ villaId: "asc" }, { name: "asc" }],
    }),
    getWhatsappCalendarGroupsForPicker(),
  ]);

  const groupNameByExternalId = new Map(
    whatsappGroups.map((group) => [group.externalId, group.name] as const)
  );

  const rows = villas.map((villa) => {
    const manualSources = villa.icalSources.filter(
      (source) => !isExternalIcalSourceName(source.name)
    );
    const primaryIcal = manualSources[0] ?? null;
    const ical: CalendarPriceTransferIcalSource | null = primaryIcal
      ? {
          id: primaryIcal.id,
          name: primaryIcal.name,
          url: primaryIcal.url,
          lastSyncAt: primaryIcal.lastSyncAt,
          lastSyncStatus: primaryIcal.lastSyncStatus,
          lastSyncMessage: primaryIcal.lastSyncMessage,
          hasError: messageLooksLikeError(
            primaryIcal.lastSyncMessage,
            primaryIcal.lastSyncStatus
          ),
        }
      : null;

    const linkDefs: Array<{
      slot: 1 | 2 | 3;
      url: string;
      lastSyncedAt: Date | null;
      lastMessage: string;
    }> = [
      {
        slot: 1,
        url: villa.externalSyncUrl1,
        lastSyncedAt: villa.externalSyncLastSyncedAt1,
        lastMessage: villa.externalSyncLastMessage1,
      },
      {
        slot: 2,
        url: villa.externalSyncUrl2,
        lastSyncedAt: villa.externalSyncLastSyncedAt2,
        lastMessage: villa.externalSyncLastMessage2,
      },
      {
        slot: 3,
        url: villa.externalSyncUrl3,
        lastSyncedAt: villa.externalSyncLastSyncedAt3,
        lastMessage: villa.externalSyncLastMessage3,
      },
    ];

    const links: CalendarPriceTransferLinkSlot[] = linkDefs.map((link) => ({
      ...link,
      hasError: messageLooksLikeError(link.lastMessage),
    }));

    const syncDates: Date[] = [];
    for (const source of manualSources) {
      if (source.lastSyncAt) syncDates.push(source.lastSyncAt);
    }
    for (const link of links) {
      if (link.lastSyncedAt) syncDates.push(link.lastSyncedAt);
    }
    if (villa.periodImportLog?.succeededAt) {
      syncDates.push(villa.periodImportLog.succeededAt);
    }

    const lastSyncedAt =
      syncDates.length > 0
        ? new Date(Math.max(...syncDates.map((d) => d.getTime())))
        : null;

    const errorParts: string[] = [];
    if (ical?.hasError && ical.lastSyncMessage.trim()) {
      errorParts.push(`iCal: ${ical.lastSyncMessage.trim()}`);
    }
    for (const link of links) {
      if (link.hasError && link.lastMessage.trim()) {
        errorParts.push(`Link ${link.slot}: ${link.lastMessage.trim()}`);
      }
    }
    if (
      villa.periodImportLog &&
      villa.periodImportLog.status === "ERROR" &&
      villa.periodImportLog.message.trim()
    ) {
      errorParts.push(`Periyot: ${villa.periodImportLog.message.trim()}`);
    }

    const hasError = errorParts.length > 0;
    const reportMessage = hasError
      ? errorParts.join(" | ")
      : lastSyncedAt
        ? `Son güncelleme: ${formatTrDateTime(lastSyncedAt)}`
        : "Henüz güncellenmedi";

    const hasAnySource =
      Boolean(ical?.url.trim()) || links.some((link) => link.url.trim());

    const whatsappGroupId = villa.whatsappGroupId.trim();
    const whatsapp: CalendarPriceTransferWhatsapp = {
      groupId: whatsappGroupId,
      groupName: whatsappGroupId
        ? groupNameByExternalId.get(whatsappGroupId) || whatsappGroupId
        : "",
      differentName: villa.whatsappGroupDifferentName,
      connected: Boolean(whatsappGroupId),
    };

    return {
      id: villa.id,
      villaId: villa.villaId,
      name: villa.name,
      originalName: villa.originalName.trim(),
      documentNo: villa.documentNo.trim(),
      active: villa.active,
      whatsapp,
      ical,
      links,
      lastSyncedAt,
      reportMessage,
      hasError,
      isUpdated: Boolean(lastSyncedAt) && !hasError && hasAnySource,
    };
  });

  return {
    rows,
    whatsappGroups: whatsappGroups.map((group) => ({
      id: group.externalId,
      name: group.name,
    })),
  };
}

/** @deprecated getCalendarPriceTransferAdminData kullanın */
export async function getCalendarPriceTransferRows(): Promise<
  CalendarPriceTransferRow[]
> {
  const data = await getCalendarPriceTransferAdminData();
  return data.rows;
}
