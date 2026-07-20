import { prisma } from "@/lib/db";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { normalizeActivityLogs } from "@/lib/booking-activity-log-core";
import {
  normalizeBookingSiteInfo,
  parseBookingDetails,
} from "@/lib/booking-form-details";
import {
  buildAgencySiteDomainMap,
  resolveBookingSiteBrand,
  resolveDomainFromSiteMap,
} from "@/lib/booking-site-brand";
import { cancelExpiredPrepaymentBookings } from "@/lib/queries/bookings";

function resolveConfirmedAt(details: unknown): Date | null {
  const logs = normalizeActivityLogs(parseBookingDetails(details).activityLogs);
  const confirmationLogs = logs.filter(
    (log) => log.action === "status_changed" && log.meta?.to === "CONFIRMED"
  );
  if (confirmationLogs.length === 0) return null;
  const latest = confirmationLogs[confirmationLogs.length - 1];
  const at = new Date(latest!.at);
  return Number.isNaN(at.getTime()) ? null : at;
}

export async function getAdminBookingListData() {
  await cancelExpiredPrepaymentBookings();

  const [bookings, villas, companySettings, agencySites] = await Promise.all([
    prisma.booking.findMany({
      include: {
        villa: {
          select: {
            id: true,
            villaId: true,
            slug: true,
            name: true,
            originalName: true,
            documentNo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.villa.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.companySettings.findUnique({
      where: { id: "default" },
      select: { domain: true, brandName: true, logoUrl: true },
    }),
    prisma.agencySite.findMany({
      where: { active: true },
      select: { name: true, domain: true },
    }),
  ]);

  const fallbackDomain =
    companySettings?.domain?.trim() ||
    companySettings?.brandName?.trim() ||
    "www.tatildeyiz.com.tr";
  const domainBySiteName = buildAgencySiteDomainMap(agencySites);
  const companyBrand = {
    brandName: companySettings?.brandName?.trim() || "Tatildeyiz",
    domain: fallbackDomain,
    logoUrl: companySettings?.logoUrl?.trim() || "",
  };

  const mapped: AdminBookingListItem[] = bookings.map((booking) => {
    const details = parseBookingDetails(booking.details);
    const prepaymentAmount =
      details.prepaymentAmount != null &&
      Number.isFinite(details.prepaymentAmount)
        ? Math.round(details.prepaymentAmount)
        : null;
    const paymentMethod =
      details.importPaymentMethod?.trim() ||
      details.prepaymentBank?.trim() ||
      details.paymentMethod?.trim() ||
      null;

    const siteInfo = normalizeBookingSiteInfo(details.siteInfo);
    const brand = resolveBookingSiteBrand({
      siteInfo,
      originDomain: details.originDomain,
      company: companyBrand,
      agencySites,
    });
    const siteDomain =
      brand.domain ||
      resolveDomainFromSiteMap(siteInfo, domainBySiteName, fallbackDomain);

    return {
      id: booking.id,
      externalCode: booking.externalCode,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
      pets: booking.pets,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt,
      confirmedAt: resolveConfirmedAt(booking.details),
      optionExpiresAt: booking.optionExpiresAt,
      prepaymentAmount,
      paymentMethod,
      siteInfo,
      siteDomain,
      villa: booking.villa,
    };
  });

  return {
    bookings: mapped,
    villas,
    siteDomain: fallbackDomain,
  };
}
