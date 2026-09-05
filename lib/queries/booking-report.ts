import { prisma } from "@/lib/db";
import { parseBookingDetails } from "@/lib/booking-form-details";
import { buildBookingExcelRowValues } from "@/lib/booking-excel-rows";
import { BOOKING_EXCEL_HEADERS } from "@/lib/booking-excel-import";

function buildReportFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `rezervasyon-raporu-${stamp}.xlsx`;
}

export async function generateBookingReportExport(bookingIds: string[]) {
  const uniqueIds = Array.from(new Set(bookingIds));
  const bookings = await prisma.booking.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      villa: {
        select: {
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
    orderBy: [{ createdAt: "desc" }, { externalCode: "desc" }],
  });

  const rows: (string | number)[][] = [BOOKING_EXCEL_HEADERS];

  for (const booking of bookings) {
    const details = parseBookingDetails(booking.details);
    const values = buildBookingExcelRowValues({
      externalCode: booking.externalCode,
      createdAt: booking.createdAt,
      guestName: booking.guestName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      facilityName: booking.villa.name,
      totalPrice: booking.totalPrice,
      status: booking.status,
      stayStatus: booking.stayStatus,
      details,
      ownerAccountingCode: booking.villa.owner?.accountingCode,
      ownerName: booking.villa.owner?.name,
      salesType: booking.villa.salesType,
      kbsReportable: booking.villa.kbsReportable,
    });

    rows.push(
      values.map((value) =>
        value === "" || value == null
          ? ""
          : typeof value === "number"
            ? value
            : String(value)
      )
    );
  }

  return {
    rows,
    filename: buildReportFilename(),
    count: bookings.length,
    requestedCount: uniqueIds.length,
  };
}
