import type { VillaDayOccupancy } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getVillaShowcaseImage } from "@/lib/villa-gallery";
import { dbDateToDateKey } from "@/lib/villa-period-calendar";
import { getStayNightKeys } from "@/lib/stay-quote";
import {
  computeStayQuote,
  type StayQuote,
  type StayQuoteDayInput,
} from "@/lib/stay-quote";
import type { BookingExtraFeeFieldKey } from "@/lib/booking-form-details";
import { resolveBookingPeriodFees } from "@/lib/queries/booking-prepayment";

export type AdminBookingWizardVilla = {
  id: string;
  name: string;
  image: string;
  location: string;
  regionName: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  active: boolean;
};

export type AdminBookingWizardQuote = {
  quote: StayQuote;
  fees: Record<BookingExtraFeeFieldKey, number | null>;
  damageDeposit: number | null;
};

function mapPeriodDayToQuoteInput(
  dateKey: string,
  day: {
    nightlyPrice: number;
    nightlyPriceWithoutCommission: number | null;
    discountedNightlyPrice: number | null;
    nightlyPriceCurrency: StayQuoteDayInput["nightlyPriceCurrency"];
    availability: StayQuoteDayInput["availability"];
    occupancyStatus: VillaDayOccupancy;
    minStayNights: number | null;
    prepaymentRate: number | null;
    cleaningFee: number | null;
    cleaningFeeCurrency: StayQuoteDayInput["cleaningFeeCurrency"];
  }
): StayQuoteDayInput {
  return {
    dateKey,
    nightlyPrice: day.nightlyPrice,
    nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission,
    discountedNightlyPrice: day.discountedNightlyPrice,
    nightlyPriceCurrency: day.nightlyPriceCurrency,
    availability: day.availability,
    occupancyStatus: day.occupancyStatus,
    minStayNights: day.minStayNights,
    prepaymentRate: day.prepaymentRate,
    cleaningFee: day.cleaningFee,
    cleaningFeeCurrency: day.cleaningFeeCurrency,
  };
}

export async function getAdminBookingWizardVillas(): Promise<
  AdminBookingWizardVilla[]
> {
  const villas = await prisma.villa.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      image: true,
      images: true,
      location: true,
      guests: true,
      bedrooms: true,
      bathrooms: true,
      active: true,
      region: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return villas.map((villa) => ({
    id: villa.id,
    name: villa.name,
    image: getVillaShowcaseImage(villa),
    location: villa.location,
    regionName: villa.region.name,
    guests: villa.guests,
    bedrooms: villa.bedrooms,
    bathrooms: villa.bathrooms,
    active: villa.active,
  }));
}

export async function resolveAdminBookingWizardQuote(
  villaId: string,
  checkIn: string,
  checkOut: string
): Promise<AdminBookingWizardQuote | null> {
  const nightKeys = getStayNightKeys(checkIn, checkOut);
  if (nightKeys.length === 0) return null;

  const rangeStart = new Date(`${nightKeys[0]}T00:00:00.000Z`);
  const rangeEnd = new Date(`${nightKeys[nightKeys.length - 1]}T00:00:00.000Z`);

  const [periodDays, fees, periodMeta] = await Promise.all([
    prisma.villaPricePeriodDay.findMany({
      where: {
        villaId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        date: true,
        nightlyPrice: true,
        nightlyPriceWithoutCommission: true,
        discountedNightlyPrice: true,
        nightlyPriceCurrency: true,
        availability: true,
        occupancyStatus: true,
        minStayNights: true,
        prepaymentRate: true,
        cleaningFee: true,
        cleaningFeeCurrency: true,
        period: {
          select: {
            damageDeposit: true,
          },
        },
      },
    }),
    resolveBookingPeriodFees(villaId, rangeStart),
    prisma.villaPricePeriodDay.findFirst({
      where: { villaId, date: rangeStart },
      select: {
        period: { select: { damageDeposit: true } },
      },
    }),
  ]);

  const daysByDateKey = new Map<string, StayQuoteDayInput>();
  for (const day of periodDays) {
    const dateKey = dbDateToDateKey(new Date(day.date));
    daysByDateKey.set(
      dateKey,
      mapPeriodDayToQuoteInput(dateKey, {
        nightlyPrice: day.nightlyPrice,
        nightlyPriceWithoutCommission: day.nightlyPriceWithoutCommission,
        discountedNightlyPrice: day.discountedNightlyPrice,
        nightlyPriceCurrency: day.nightlyPriceCurrency,
        availability: day.availability,
        occupancyStatus: day.occupancyStatus,
        minStayNights: day.minStayNights,
        prepaymentRate: day.prepaymentRate,
        cleaningFee: day.cleaningFee,
        cleaningFeeCurrency: day.cleaningFeeCurrency,
      })
    );
  }

  const quote = computeStayQuote(checkIn, checkOut, daysByDateKey);

  return {
    quote,
    fees,
    damageDeposit: periodMeta?.period.damageDeposit ?? null,
  };
}
