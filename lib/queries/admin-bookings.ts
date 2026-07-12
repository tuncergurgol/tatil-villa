import { prisma } from "@/lib/db";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { cancelExpiredPrepaymentBookings } from "@/lib/queries/bookings";

export async function getAdminBookingListData() {
  await cancelExpiredPrepaymentBookings();

  const [bookings, villas, companySettings] = await Promise.all([
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
      select: { domain: true, brandName: true },
    }),
  ]);

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
      optionExpiresAt: booking.optionExpiresAt,
      prepaymentAmount,
      paymentMethod,
      villa: booking.villa,
    };
  });

  return {
    bookings: mapped,
    villas,
    siteDomain:
      companySettings?.domain ||
      companySettings?.brandName ||
      "www.tatildeyiz.com.tr",
  };
}
