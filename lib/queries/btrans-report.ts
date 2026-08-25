import { prisma } from "@/lib/db";
import { getCompanySettings } from "@/lib/queries/company-settings";
import {
  buildBtransFilename,
  buildBtransXml,
  buildIslemXml,
  checkMissingFields,
  formatYYYYMMDD,
  getOwnerDisplayName,
  isValidBtransIban,
  isWithinMonth,
  normalizeIbanForBtrans,
  type BtransBookingInput,
  type BtransDateBasis,
  type BtransIncompleteRow,
  type BtransOwnerInput,
  type BtransRegionCodes,
} from "@/lib/btrans-report";
import {
  computeGuestReservationTotal,
  parseBookingDetails,
  resolveBookingCommissionAmount,
  resolveExternalCode,
} from "@/lib/booking-form-details";
import { normalizeActivityLogs } from "@/lib/booking-activity-log-core";
import { getIlPlakaKodu } from "@/lib/turkey-il-plaka-codes";
import { villaPublicUrl } from "@/lib/villa-public-path";

/**
 * "Onay tarihi": rezervasyon CONFIRMED durumuna geçtiği en son
 * status_changed aktivite kaydının tarihi; log yoksa oluşturma tarihi.
 * DB'ye bağlı modülleri (booking-activity-log) kullandığından bilerek
 * burada (server-only query dosyasında) tutulur — lib/btrans-report.ts
 * client component'lerden de import edildiği için oraya taşınmaz.
 */
function resolveApprovedAt(details: unknown, createdAt: Date): Date {
  const parsed = parseBookingDetails(details);
  const logs = normalizeActivityLogs(parsed.activityLogs);
  const approvalLog = logs.find(
    (log) => log.action === "status_changed" && log.meta?.to === "CONFIRMED"
  );
  if (approvalLog) {
    const at = new Date(approvalLog.at);
    if (!Number.isNaN(at.getTime())) return at;
  }
  return createdAt;
}

type RegionChainNode = {
  name: string;
  level: string;
  mernisIlceCode: string | null;
};

type RegionWithAncestors = RegionChainNode & {
  parent:
    | (RegionChainNode & {
        parent: RegionChainNode | null;
      })
    | null;
};

function resolveRegionCodes(region: RegionWithAncestors | null): BtransRegionCodes {
  const chain: RegionChainNode[] = [];
  if (region) {
    chain.push(region);
    if (region.parent) {
      chain.push(region.parent);
      if (region.parent.parent) {
        chain.push(region.parent.parent);
      }
    }
  }

  const mahalle = chain.find((node) => node.level === "MAHALLE");
  const ilce = chain.find((node) => node.level === "ILCE");
  const il = chain.find((node) => node.level === "IL");

  return {
    ilAdi: il?.name ?? "",
    ilKodu: getIlPlakaKodu(il?.name),
    ilceAdi: ilce?.name ?? "",
    ilceKodu: ilce?.mernisIlceCode?.trim() || null,
    mahalleAdi: mahalle?.name ?? "",
  };
}

async function fetchConfirmedBookings(dateFilter: { gte: Date; lt: Date } | null, byField: "checkIn" | "createdAt" | null) {
  return prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      ...(dateFilter && byField ? { [byField]: dateFilter } : {}),
    },
    select: {
      id: true,
      externalCode: true,
      guestEmail: true,
      checkIn: true,
      checkOut: true,
      createdAt: true,
      totalPrice: true,
      details: true,
      villa: {
        select: {
          name: true,
          villaId: true,
          slug: true,
          latitude: true,
          longitude: true,
          owner: {
            select: {
              type: true,
              name: true,
              firstName: true,
              lastName: true,
              companyTitle: true,
              tcKimlikNo: true,
              taxNumber: true,
              bankIban: true,
              phone: true,
              email: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
              level: true,
              mernisIlceCode: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  level: true,
                  mernisIlceCode: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      level: true,
                      mernisIlceCode: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function generateBtransReport(input: {
  year: number;
  month: number;
  dateBasis: BtransDateBasis;
}) {
  const { year, month, dateBasis } = input;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const [companySettings, bookings] = await Promise.all([
    getCompanySettings(),
    dateBasis === "checkIn"
      ? fetchConfirmedBookings({ gte: monthStart, lt: monthEnd }, "checkIn")
      : dateBasis === "createdAt"
        ? fetchConfirmedBookings({ gte: monthStart, lt: monthEnd }, "createdAt")
        : fetchConfirmedBookings(null, null),
  ]);

  const islemXmlBlocks: string[] = [];
  const incomplete: BtransIncompleteRow[] = [];
  const komisyonIban = normalizeIbanForBtrans(companySettings.iban);
  if (!isValidBtransIban(komisyonIban)) {
    const length = komisyonIban.length;
    return {
      xml: "",
      filename: buildBtransFilename(year, month),
      count: 0,
      incompleteCount: 0,
      incomplete: [],
      warnings: [],
      error:
        length === 0
          ? "Şirket komisyon IBAN'ı boş. Acente > Şirket ayarlarından 26 haneli TR IBAN girin."
          : `Şirket komisyon IBAN'ı GİB formatında değil (${length} hane, 26 olmalı). XML üretilmedi.`,
    };
  }

  for (const booking of bookings) {
    const approvedAt = resolveApprovedAt(booking.details, booking.createdAt);
    if (dateBasis === "approvedAt" && !isWithinMonth(approvedAt, year, month)) {
      continue;
    }

    const details = parseBookingDetails(booking.details);
    const regionCodes = resolveRegionCodes(booking.villa.region);
    const owner: BtransOwnerInput = booking.villa.owner
      ? {
          type: booking.villa.owner.type,
          name: booking.villa.owner.name,
          firstName: booking.villa.owner.firstName,
          lastName: booking.villa.owner.lastName,
          companyTitle: booking.villa.owner.companyTitle,
          tcKimlikNo: booking.villa.owner.tcKimlikNo,
          taxNumber: booking.villa.owner.taxNumber,
          bankIban: booking.villa.owner.bankIban,
          phone: booking.villa.owner.phone,
          email: booking.villa.owner.email,
        }
      : null;

    const missing = checkMissingFields(owner, regionCodes);
    const externalCode = resolveExternalCode(booking.externalCode, booking.guestEmail);

    if (missing.length > 0 || !owner) {
      incomplete.push({
        bookingId: booking.id,
        externalCode,
        villaName: booking.villa.name,
        il: regionCodes.ilAdi,
        ilce: regionCodes.ilceAdi,
        ownerName: getOwnerDisplayName(owner),
        checkIn: formatYYYYMMDD(booking.checkIn),
        missing,
      });
      continue;
    }

    const rezervasyonTutari = computeGuestReservationTotal(details);
    const komisyonTutari = resolveBookingCommissionAmount(
      details,
      booking.totalPrice
    );

    islemXmlBlocks.push(
      buildIslemXml({
        siteAdi: booking.villa.name,
        siteKodu: booking.villa.villaId != null ? String(booking.villa.villaId) : "0",
        webAdresi: villaPublicUrl(
          companySettings.domain
            .trim()
            .replace(/^https?:\/\//i, "")
            .replace(/\/+$/g, ""),
          booking.villa.slug
        ).replace(/^https?:\/\//i, ""),
        ilKodu: regionCodes.ilKodu ?? "0",
        ilceKodu: regionCodes.ilceKodu ?? "0",
        mahalleAdi: regionCodes.mahalleAdi,
        enlem: booking.villa.latitude,
        boylam: booking.villa.longitude,
        girisTarihi: booking.checkIn,
        cikisTarihi: booking.checkOut,
        rezervasyonTutari,
        // Ödeme tahsilat tarihi için ayrı bir kayıt tutulmuyor;
        // en yakın karşılık olarak konaklamanın tamamlandığı çıkış tarihi kullanılıyor.
        tahsilTarihi: booking.checkOut,
        komisyonIban,
        komisyonOrani: details.commissionRate ?? 0,
        komisyonTutari,
        owner,
      })
    );
  }

  const xml = buildBtransXml({
    companyTaxNumber: companySettings.taxNumber,
    companyTitle: companySettings.companyTitle,
    domain: companySettings.domain,
    year,
    month,
    islemXmlBlocks,
  });

  const warnings = [
    "Tapu alanları (zemin/yevmiye no) ve cadde/sokak/kapı no kılavuza göre '0' geçildi.",
  ];
  if (incomplete.length > 0) {
    warnings.push(
      `${incomplete.length} rezervasyon, zorunlu alanları (IBAN 26 hane / ev sahibi TC-VKN / cep / il-ilçe kodu) eksik veya hatalı olduğu için DOSYAYA ALINMADI. Aşağıdaki listeden eksikleri tamamlayıp tekrar üretin.`
    );
  }

  return {
    xml,
    filename: buildBtransFilename(year, month),
    count: islemXmlBlocks.length,
    incompleteCount: incomplete.length,
    incomplete,
    warnings,
  };
}

export type { BtransBookingInput };
