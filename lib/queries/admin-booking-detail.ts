import { prisma } from "@/lib/db";
import type {
  BookingDetailRecord,
  BookingPrepaymentRecord,
} from "@/lib/booking-form-details";
import { cancelExpiredPrepaymentBookingById } from "@/lib/queries/bookings";
import { lockBookingPricingIfConfirmed } from "@/lib/queries/booking-pricing-lock";

export async function getAdminBookingDetail(
  id: string
): Promise<BookingDetailRecord | null> {
  await cancelExpiredPrepaymentBookingById(id);
  // Eski onaylı kayıtlarda kilit yoksa mevcut tutarlardan snapshot üretilir
  await lockBookingPricingIfConfirmed(id);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      prepayments: {
        orderBy: { createdAt: "asc" },
        include: {
          bankAccount: {
            select: {
              id: true,
              bankName: true,
              accountHolder: true,
              iban: true,
            },
          },
        },
      },
      villa: {
        select: {
          id: true,
          villaId: true,
          name: true,
          originalName: true,
          salesType: true,
          kbsReportable: true,
          prepaymentPaymentType: {
            select: {
              id: true,
              name: true,
            },
          },
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

  if (!booking) return null;

  return {
    ...booking,
    prepayments: booking.prepayments.map(
      (item): BookingPrepaymentRecord => ({
        id: item.id,
        paymentChannel: item.paymentChannel,
        bankAccountId: item.bankAccountId,
        amount: item.amount,
        createdAt: item.createdAt,
        bankAccount: item.bankAccount,
      })
    ),
  };
}
