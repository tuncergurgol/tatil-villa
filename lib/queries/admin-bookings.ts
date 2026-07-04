import { prisma } from "@/lib/db";
import type { AdminBookingListItem } from "@/lib/booking-display";

export async function getAdminBookingListData() {
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

  return {
    bookings: bookings as AdminBookingListItem[],
    villas,
    siteDomain:
      companySettings?.domain ||
      companySettings?.brandName ||
      "www.tatildeyiz.com.tr",
  };
}
