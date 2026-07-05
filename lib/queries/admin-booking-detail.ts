import { prisma } from "@/lib/db";
import type { BookingDetailRecord } from "@/lib/booking-form-details";

export async function getAdminBookingDetail(
  id: string
): Promise<BookingDetailRecord | null> {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      villa: {
        select: {
          id: true,
          villaId: true,
          name: true,
          originalName: true,
          salesType: true,
          kbsReportable: true,
          owner: {
            select: {
              name: true,
              accountingCode: true,
            },
          },
        },
      },
    },
  });

  return booking as BookingDetailRecord | null;
}
