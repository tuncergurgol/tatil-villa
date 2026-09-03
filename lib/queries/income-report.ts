import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseBookingDetails,
  resolveBookingCommissionAmount,
} from "@/lib/booking-form-details";
import {
  type IncomeFact,
  type IncomeTypeId,
} from "@/lib/income-report-cube";
import { resolveVillaRegionAddress } from "@/lib/villa-region-address";
import { dbDateToDateKey, toDateKey } from "@/lib/villa-period-calendar";

const INCOME_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PREPAYMENT,
  BookingStatus.CONFIRMATION_SENT,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPENSATION,
];

const bookingSelect = {
  id: true,
  createdAt: true,
  checkIn: true,
  totalPrice: true,
  status: true,
  details: true,
  villa: {
    select: {
      region: {
        select: {
          name: true,
          level: true,
          parent: {
            select: {
              name: true,
              level: true,
              parent: {
                select: {
                  name: true,
                  level: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function resolveStayCommission(
  status: BookingStatus,
  details: ReturnType<typeof parseBookingDetails>,
  totalPrice: number | null
) {
  if (status === BookingStatus.COMPENSATION) {
    return Math.round(
      details.compensationAmount ??
        details.commissionAmount ??
        details.invoiceAmount ??
        0
    );
  }
  return resolveBookingCommissionAmount(details, totalPrice);
}

function toKonaklamaFact(booking: {
  id: string;
  createdAt: Date;
  checkIn: Date;
  totalPrice: number | null;
  status: BookingStatus;
  details: unknown;
  villa: {
    region: {
      name: string;
      level: string;
      parent?: {
        name: string;
        level: string;
        parent?: { name: string; level: string } | null;
      } | null;
    };
  };
}): IncomeFact {
  const details = parseBookingDetails(booking.details);
  const address = resolveVillaRegionAddress(booking.villa.region);
  return {
    id: `konaklama:${booking.id}`,
    incomeType: "konaklama" satisfies IncomeTypeId,
    reservationDate: toDateKey(booking.createdAt),
    stayDate: dbDateToDateKey(booking.checkIn),
    province: address.il,
    district: address.ilce,
    neighborhood: address.mahalle,
    commissionAmount: resolveStayCommission(
      booking.status,
      details,
      booking.totalPrice
    ),
  };
}

export async function getIncomeReportFacts(): Promise<IncomeFact[]> {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: INCOME_BOOKING_STATUSES } },
    select: bookingSelect,
    orderBy: [{ createdAt: "desc" }],
  });

  return bookings.map(toKonaklamaFact);
}
