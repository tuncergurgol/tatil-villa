import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  parseBookingDetails,
  resolveBookingCommissionAmount,
} from "@/lib/booking-form-details";
import { formatBookingReservationNo } from "@/lib/booking-display";
import {
  isStoredCommissionEmpty,
  type IncomeFact,
  type IncomeTypeId,
  type MissingCommissionBooking,
} from "@/lib/income-report-cube";
import { resolveVillaRegionAddress } from "@/lib/villa-region-address";
import { dbDateToDateKey, toDateKey } from "@/lib/villa-period-calendar";

const INCOME_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.COMPENSATION,
];

const bookingSelect = {
  id: true,
  externalCode: true,
  createdAt: true,
  checkIn: true,
  checkOut: true,
  guestName: true,
  totalPrice: true,
  status: true,
  details: true,
  villa: {
    select: {
      name: true,
      originalName: true,
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

type IncomeBookingRecord = {
  id: string;
  externalCode: number | null;
  createdAt: Date;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  totalPrice: number | null;
  status: BookingStatus;
  details: unknown;
  villa: {
    name: string;
    originalName: string;
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
};

function formatDateKeyTr(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function resolveVillaName(villa: IncomeBookingRecord["villa"]) {
  return villa.name.trim() || villa.originalName.trim() || "";
}

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

function toKonaklamaFact(booking: IncomeBookingRecord): IncomeFact {
  const details = parseBookingDetails(booking.details);
  const address = resolveVillaRegionAddress(booking.villa.region);
  return {
    id: `konaklama:${booking.id}`,
    incomeType: "konaklama" satisfies IncomeTypeId,
    reservationDate: toDateKey(booking.createdAt),
    stayDate: dbDateToDateKey(booking.checkIn),
    villaName: resolveVillaName(booking.villa),
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

function toMissingCommissionRow(
  booking: IncomeBookingRecord
): MissingCommissionBooking {
  return {
    id: booking.id,
    reservationNo: formatBookingReservationNo(booking.externalCode),
    villaName: resolveVillaName(booking.villa) || "Belirtilmedi",
    guestName: booking.guestName,
    reservationDate: formatDateKeyTr(toDateKey(booking.createdAt)),
    checkIn: formatDateKeyTr(dbDateToDateKey(booking.checkIn)),
    checkOut: formatDateKeyTr(dbDateToDateKey(booking.checkOut)),
    totalPrice: booking.totalPrice,
  };
}

export async function getIncomeReportData(): Promise<{
  facts: IncomeFact[];
  missingCommission: MissingCommissionBooking[];
}> {
  const bookings = await prisma.booking.findMany({
    where: { status: { in: INCOME_BOOKING_STATUSES } },
    select: bookingSelect,
    orderBy: [{ createdAt: "desc" }],
  });

  const facts: IncomeFact[] = [];
  const missingCommission: MissingCommissionBooking[] = [];

  for (const booking of bookings) {
    facts.push(toKonaklamaFact(booking));
    if (booking.status !== BookingStatus.CONFIRMED) continue;
    const details = parseBookingDetails(booking.details);
    if (isStoredCommissionEmpty(details.commissionAmount)) {
      missingCommission.push(toMissingCommissionRow(booking));
    }
  }

  return { facts, missingCommission };
}
