"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  Share2,
} from "lucide-react";
import { submitBooking, type BookingActionState } from "@/app/actions/booking";
import { getMemberBookingBenefitsAction } from "@/app/actions/member-booking-benefits";
import type { PreReservationMemberBenefits } from "@/components/PreReservationModal";
import FloatingPanel from "@/components/FloatingPanel";
import GuestPicker from "@/components/GuestPicker";
import { useIsMobile } from "@/hooks/use-is-mobile";
import PreReservationModal, {
  type PreReservationSubmitPayload,
} from "@/components/PreReservationModal";
import ReservationPriceSummary, {
  getReservationGrandTotal,
} from "@/components/ReservationPriceSummary";
import {
  convertNullableCurrencyAmount,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";
import { useVillaStaySelection } from "@/components/villa-detail/VillaStaySelectionContext";
import { canSelectStayDay } from "@/lib/booking-calendar-selection";
import {
  formatTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
  normalizeTurkishPhoneDigits,
} from "@/lib/phone-utils";
import {
  emptyStayPeriodFees,
  type HeatedPoolOption,
  type PoolHeatingSelections,
  type StayFeeSelections,
  type StayPeriodFees,
} from "@/lib/stay-period-fees";
import {
  buildStayQuoteDayMap,
  computeStayQuote,
} from "@/lib/stay-quote";
import { buildVillaReservationShareText } from "@/lib/villa-reservation-share";
import {
  getPublicVillaDayVisualStyle,
  resolveVillaDayVisualFromMap,
} from "@/lib/villa-period-day-visual";
import {
  buildMonthGrid,
  compareDates,
  getMonthLabel,
  getWeekdayLabels,
  parseDateKey,
  todayDate,
  toDateKey,
} from "@/lib/villa-period-calendar";
import {
  isDateKeyInRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";

interface BookingFormProps {
  villaId: string;
  maxGuests: number;
  baseCapacity: number;
  pricePerNight: number | null;
  companyPhone?: string;
  brandName?: string;
  exchangeRates: PublicExchangeRates;
  heatedPools?: HeatedPoolOption[];
  villaSummary: {
    name: string;
    slug: string;
    code: string;
    image: string;
    guests: number;
    bedrooms: number;
    bathrooms: number;
  };
  allowPrepaymentOption?: boolean;
  allowFullPaymentOption?: boolean;
  calendarDays?: Array<{
    date: string;
    occupancyStatus: string;
    availability?: string;
    nightlyPrice: number;
    nightlyPriceWithoutCommission?: number | null;
    discountedNightlyPrice?: number | null;
    nightlyPriceCurrency?: string;
    currency?: string;
    minStayNights?: number | null;
    prepaymentRate?: number | null;
    cleaningFee?: number | null;
    cleaningFeeCurrency?: string;
    cleaningDayCount?: number | null;
    damageDeposit?: number | null;
    damageDepositCurrency?: string;
    petCleaningFee?: number | null;
    petCleaningFeeCurrency?: string;
    petDamageDeposit?: number | null;
    petDamageDepositCurrency?: string;
    underfloorHeatingFee?: number | null;
    underfloorHeatingFeeCurrency?: string;
    extraBedFee?: number | null;
    extraBedFeeCurrency?: string;
    poolHeatingPrivateFee?: number | null;
    poolHeatingPrivateFeeCurrency?: string;
    poolHeatingIndoorFee?: number | null;
    poolHeatingIndoorFeeCurrency?: string;
    poolHeatingKidsFee?: number | null;
    poolHeatingKidsFeeCurrency?: string;
    price?: number;
  }>;
}

const initialState: BookingActionState = {};

function formatBookingDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date
    .toLocaleDateString("tr-TR", { month: "long" })
    .toLocaleUpperCase("tr-TR");
  const weekday = date
    .toLocaleDateString("tr-TR", { weekday: "long" })
    .toLocaleUpperCase("tr-TR");
  return `${day} ${month} ${year} ${weekday}`;
}

function formatCompanyPhoneDisplay(phone: string) {
  const digits = normalizeTurkishPhoneDigits(phone);
  if (digits.length !== 10) {
    return phone.trim() || formatTurkishPhoneDisplay(phone);
  }
  return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

function guestSummary(
  counts: { adults: number; children: number; babies: number; pets: number },
  allowPets: boolean
) {
  const base = `${counts.adults} Yetişkin, ${counts.children} Çocuk, ${counts.babies} Bebek`;
  if (!allowPets) return base;
  return `${base}, ${counts.pets} Evcil Hayvan`;
}

export default function BookingForm({
  villaId,
  maxGuests,
  baseCapacity,
  pricePerNight,
  companyPhone = "",
  brandName = "Wings Tatil",
  exchangeRates,
  heatedPools = [],
  villaSummary,
  calendarDays = [],
  allowPrepaymentOption = true,
  allowFullPaymentOption = false,
}: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);
  const [modalOpen, setModalOpen] = useState(false);
  const [memberBenefits, setMemberBenefits] =
    useState<PreReservationMemberBenefits | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [minStayInfoVisible, setMinStayInfoVisible] = useState(false);
  const [feeSelections, setFeeSelections] = useState<StayFeeSelections>({});
  const [poolHeatingSelections, setPoolHeatingSelections] =
    useState<PoolHeatingSelections>({});
  const {
    checkIn,
    checkOut,
    pendingStart,
    hoverDate,
    guests,
    datesOpen,
    guestsOpen,
    occupancyMap,
    previewStart,
    previewEnd,
    previewNights,
    previewRangeBlocked,
    allowPets,
    setGuests,
    setDatesOpen,
    setGuestsOpen,
    setHoverDate,
    selectDay,
    openDatePicker,
  } = useVillaStaySelection();

  const quoteDaysMap = useMemo(
    () => buildStayQuoteDayMap(calendarDays, exchangeRates),
    [calendarDays, exchangeRates]
  );

  const quote = useMemo(() => {
    if (!checkIn || !checkOut || checkIn === checkOut) return null;
    return computeStayQuote(checkIn, checkOut, quoteDaysMap);
  }, [checkIn, checkOut, quoteDaysMap]);

  useEffect(() => {
    if (!quote?.belowMinStay || quote.minStayNights == null) {
      setMinStayInfoVisible(false);
      return;
    }
    setMinStayInfoVisible(true);
    const timer = window.setTimeout(() => setMinStayInfoVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, [checkIn, checkOut, quote?.belowMinStay, quote?.minStayNights]);

  const periodFees = useMemo<StayPeriodFees>(() => {
    if (!checkIn) return emptyStayPeriodFees();
    const day = calendarDays.find((item) => item.date === checkIn);
    if (!day) return emptyStayPeriodFees();
    const toTl = (
      amount: number | null | undefined,
      currency: string | undefined
    ) => convertNullableCurrencyAmount(amount, currency, "TL", exchangeRates);
    return {
      cleaningFee: toTl(day.cleaningFee, day.cleaningFeeCurrency),
      damageDeposit: toTl(day.damageDeposit, day.damageDepositCurrency),
      petCleaningFee: toTl(
        day.petCleaningFee,
        day.petCleaningFeeCurrency
      ),
      petDamageDeposit: toTl(
        day.petDamageDeposit,
        day.petDamageDepositCurrency
      ),
      underfloorHeatingFee: toTl(
        day.underfloorHeatingFee,
        day.underfloorHeatingFeeCurrency
      ),
      extraBedFee: toTl(day.extraBedFee, day.extraBedFeeCurrency),
      poolHeatingPrivateFee: toTl(
        day.poolHeatingPrivateFee,
        day.poolHeatingPrivateFeeCurrency
      ),
      poolHeatingIndoorFee: toTl(
        day.poolHeatingIndoorFee,
        day.poolHeatingIndoorFeeCurrency
      ),
      poolHeatingKidsFee: toTl(
        day.poolHeatingKidsFee,
        day.poolHeatingKidsFeeCurrency
      ),
    };
  }, [calendarDays, checkIn, exchangeRates]);

  const heatedPoolsInTl = useMemo<HeatedPoolOption[]>(
    () =>
      heatedPools.map((pool) => ({
        ...pool,
        periods: pool.periods.map((period) => ({
          ...period,
          heatingFee: convertNullableCurrencyAmount(
            period.heatingFee,
            period.heatingFeeCurrency,
            "TL",
            exchangeRates
          ),
          heatingFeeCurrency: "TL",
        })),
      })),
    [exchangeRates, heatedPools]
  );

  const pricingTotals = useMemo(() => {
    if (!quote?.valid) return null;
    return getReservationGrandTotal(
      quote,
      periodFees,
      guests.pets,
      feeSelections,
      {
        adults: guests.adults,
        children: guests.children,
        baseCapacity,
        heatedPools: heatedPoolsInTl,
        poolHeatingSelections,
        checkIn,
        checkOut,
      }
    );
  }, [
    quote,
    periodFees,
    guests.pets,
    guests.adults,
    guests.children,
    feeSelections,
    poolHeatingSelections,
    heatedPoolsInTl,
    baseCapacity,
    checkIn,
    checkOut,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeeSelections({});
    setPoolHeatingSelections({});
  }, [checkIn, checkOut]);

  const rootRef = useRef<HTMLDivElement>(null);
  const dateAnchorRef = useRef<HTMLButtonElement>(null);
  const datePanelRef = useRef<HTMLDivElement>(null);
  const guestAnchorRef = useRef<HTMLButtonElement>(null);
  const guestPanelRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => todayDate(), []);
  const isMobile = useIsMobile();
  const minViewYear = today.getFullYear();
  const minViewMonth = today.getMonth();
  const [viewYear, setViewYear] = useState(minViewYear);
  const [viewMonth, setViewMonth] = useState(minViewMonth);
  const weekdayLabels = getWeekdayLabels();

  const phoneDisplay = companyPhone
    ? formatCompanyPhoneDisplay(companyPhone)
    : "";
  const phoneHref = companyPhone
    ? normalizeStoredTurkishPhone(companyPhone)
    : "";

  useEffect(() => {
    if (!datesOpen && !guestsOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        datePanelRef.current?.contains(target) ||
        guestPanelRef.current?.contains(target)
      ) {
        return;
      }
      setDatesOpen(false);
      setGuestsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [datesOpen, guestsOpen, setDatesOpen, setGuestsOpen]);

  function shiftMonth(offset: number) {
    const date = new Date(viewYear, viewMonth + offset, 1);
    const nextYear = date.getFullYear();
    const nextMonth = date.getMonth();
    if (
      offset < 0 &&
      (nextYear < minViewYear ||
        (nextYear === minViewYear && nextMonth < minViewMonth))
    ) {
      return;
    }
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  }

  function renderMonth(
    year: number,
    month: number,
    options?: { hideOutsideDays?: boolean; fullWidth?: boolean }
  ) {
    const hideOutsideDays = options?.hideOutsideDays ?? false;
    const fullWidth = options?.fullWidth ?? false;
    const cells = buildMonthGrid(year, month);
    return (
      <div className={fullWidth ? "w-full min-w-0 shrink" : "w-[248px] shrink-0"}>
        <p className="mb-2 text-center text-sm font-semibold text-slate-800">
          {getMonthLabel(year, month)}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium text-slate-400"
            >
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            if (hideOutsideDays && !cell.inCurrentMonth) {
              return (
                <div
                  key={`${year}-${month}-pad-${index}`}
                  className="aspect-square min-h-0 sm:aspect-auto sm:min-h-[38px]"
                  aria-hidden
                />
              );
            }

            const dateKey = toDateKey(cell.date);
            const isPast = compareDates(cell.date, today) < 0;
            const current = occupancyMap.get(dateKey) ?? "EMPTY";
            const kind = resolveVillaDayVisualFromMap(dateKey, occupancyMap);
            const visual = getPublicVillaDayVisualStyle(kind);

            const inRange =
              previewStart &&
              previewEnd &&
              isDateKeyInRange(dateKey, previewStart, previewEnd);
            const isStart = dateKey === previewStart;
            const isEnd =
              dateKey === previewEnd && previewStart !== previewEnd;

            const canClick = canSelectStayDay({
              dateKey,
              today,
              pendingStart,
              occupancyMap,
              allowOption: true,
            });

            const showOccupancyBg =
              !isPast && (current !== "EMPTY" || kind !== "empty");

            const showNightHint =
              Boolean(pendingStart) &&
              hoverDate === dateKey &&
              previewStart &&
              previewEnd &&
              previewStart !== previewEnd &&
              previewNights > 0 &&
              !previewRangeBlocked &&
              (dateKey === previewStart || dateKey === previewEnd);

            return (
              <button
                key={`${year}-${month}-${index}`}
                type="button"
                disabled={!canClick}
                onMouseEnter={() => {
                  if (pendingStart) setHoverDate(dateKey);
                }}
                onMouseLeave={() => {
                  if (pendingStart) setHoverDate(pendingStart);
                }}
                onClick={() => selectDay(dateKey)}
                className={`relative flex aspect-square min-h-0 items-start justify-start overflow-visible rounded-md border p-0.5 text-left transition sm:aspect-auto sm:min-h-[38px] ${
                  !cell.inCurrentMonth && !hideOutsideDays ? "opacity-45" : ""
                } ${
                  isPast
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : canClick
                      ? "cursor-pointer border-slate-100/80 hover:brightness-[0.98]"
                      : "cursor-not-allowed border-slate-100/80 opacity-80"
                } ${
                  isStart || isEnd
                    ? "z-[1] ring-2 ring-sky-500 ring-offset-0"
                    : inRange && !previewRangeBlocked
                      ? "ring-1 ring-sky-300"
                      : ""
                } ${
                  inRange && previewRangeBlocked && !isStart
                    ? "ring-1 ring-red-300"
                    : ""
                }`}
                style={{
                  background: isPast
                    ? "#f8fafc"
                    : showOccupancyBg
                      ? visual.background
                      : "#ffffff",
                }}
              >
                <span
                  className={`text-[11px] font-semibold leading-none ${
                    isPast ? "text-slate-300" : "text-slate-800"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {showNightHint ? (
                  <span className="pointer-events-none absolute -bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
                    {previewNights} Gece
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const canGoPrevious =
    viewYear > minViewYear ||
    (viewYear === minViewYear && viewMonth > minViewMonth);

  const canOpenModal = Boolean(checkIn && checkOut && quote?.valid);

  async function handleShare() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const text = buildVillaReservationShareText({
      brandName,
      villaName: villaSummary.name,
      slug: villaSummary.slug,
      origin,
      checkIn,
      checkOut,
      adults: guests.adults,
      children: guests.children,
      pets: allowPets ? guests.pets : 0,
      baseCapacity,
      quote,
      fees: periodFees,
      selections: feeSelections,
      heatedPools,
      poolHeatingSelections,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${brandName} - ${villaSummary.name}`,
          text,
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* kullanıcı paylaşımı iptal etti */
    }
  }

  async function handleOpenModal() {
    if (!canOpenModal) return;
    setDatesOpen(false);
    setGuestsOpen(false);
    if (quote?.valid) {
      const benefits = await getMemberBookingBenefitsAction(
        quote.accommodationTotal
      );
      setMemberBenefits(benefits);
    } else {
      setMemberBenefits(null);
    }
    setModalOpen(true);
  }

  function handleModalSubmit(payload: PreReservationSubmitPayload) {
    if (!checkIn || !checkOut || !quote?.valid) return;

    const formData = new FormData();
    formData.set("villaId", villaId);
    formData.set("checkIn", checkIn);
    formData.set("checkOut", checkOut);
    formData.set("adults", String(guests.adults));
    formData.set("children", String(guests.children));
    formData.set("babies", String(guests.babies));
    formData.set("pets", String(allowPets ? guests.pets : 0));
    formData.set("guestName", payload.guestName);
    formData.set("guestEmail", payload.guestEmail);
    formData.set("guestPhone", payload.guestPhone);
    formData.set("paymentMethod", payload.paymentMethod);
    formData.set("paymentAmount", payload.paymentAmount);
    formData.set("acceptMarketing", payload.acceptMarketing ? "true" : "false");
    if (payload.couponCode) formData.set("couponCode", payload.couponCode);
    if (payload.couponDiscountAmount) {
      formData.set("couponDiscountAmount", String(payload.couponDiscountAmount));
    }
    if (payload.loyaltyVoucherId) {
      formData.set("loyaltyVoucherId", payload.loyaltyVoucherId);
    }
    if (payload.couponBalanceAmount) {
      formData.set("couponBalanceAmount", String(payload.couponBalanceAmount));
    }
    formData.set("feeSelections", JSON.stringify(feeSelections));
    formData.set(
      "poolHeatingSelections",
      JSON.stringify(poolHeatingSelections)
    );
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <div
      id="rezervasyon-yap"
      ref={rootRef}
      className="sticky top-[var(--villa-detail-sticky-below-nav,9rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-50 shadow-[0_12px_40px_rgba(15,23,42,0.1)]"
    >
      <div className="border-b border-slate-200/70 bg-white/80 px-3.5 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-900">
              Rezervasyon Yap
            </h3>
            {!checkIn || !checkOut ? (
              pricePerNight ? (
                <p className="mt-0.5 text-xs text-slate-500">
                  Tarih seçerek konaklama bedelini hesaplayın
                </p>
              ) : (
                <p className="mt-0.5 text-xs font-semibold text-amber-600">
                  Tarih Seçiniz
                </p>
              )
            ) : quote?.valid ? (
              <p className="mt-1 text-[15px] font-bold leading-tight text-slate-900">
                {quote.nights} Gece
                <span className="mx-1.5 font-semibold text-slate-400">·</span>
                Toplam{" "}
                <span className="text-emerald-600">
                  {(pricingTotals?.grandTotal ?? quote.total).toLocaleString(
                    "tr-TR"
                  )}{" "}
                  {quote.currency}
                </span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-amber-700">
                {quote?.invalidReason ?? "Hesaplama için tarih seçin"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              void handleShare();
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Paylaş"
          >
            {shareCopied ? (
              <Check className="h-3.5 w-3.5 text-teal-600" />
            ) : (
              <Share2 className="h-3.5 w-3.5 text-slate-600" />
            )}
            {shareCopied ? "Kopyalandı" : "Paylaş"}
          </button>
        </div>
      </div>

      <div className="space-y-1.5 p-2.5 sm:p-3">
        {state.error && !modalOpen ? (
          <div className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        {minStayInfoVisible && quote?.belowMinStay && quote.minStayNights ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-800">
            Bilgi: Minimum konaklama {quote.minStayNights} gecedir.
          </div>
        ) : null}

        <div>
          <button
            ref={dateAnchorRef}
            type="button"
            onClick={() => {
              if (datesOpen) {
                setDatesOpen(false);
                return;
              }
              openDatePicker();
              if (checkIn) {
                const date = parseDateKey(checkIn);
                setViewYear(date.getFullYear());
                setViewMonth(date.getMonth());
              }
            }}
            className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-emerald-300"
          >
            <div className="flex items-center gap-1.5 border-r border-slate-100 px-2.5 py-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Giriş Tarihi
                </p>
                <p
                  className={`text-[12px] font-semibold leading-snug ${
                    checkIn ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {checkIn ? formatBookingDate(checkIn) : "Tarih seçin"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Çıkış Tarihi
                </p>
                <p
                  className={`text-[12px] font-semibold leading-snug ${
                    checkOut ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {checkOut ? formatBookingDate(checkOut) : "Tarih seçin"}
                </p>
              </div>
            </div>
          </button>

          <FloatingPanel
            open={datesOpen}
            anchorRef={dateAnchorRef}
            panelRef={datePanelRef}
            align="center"
            fitContent
            className="w-[min(100vw-2rem,32rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-auto"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrevious}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-4">
              {renderMonth(viewYear, viewMonth, {
                hideOutsideDays: isMobile,
                fullWidth: isMobile,
              })}
              {!isMobile ? renderMonth(rightYear, rightMonth) : null}
            </div>
          </FloatingPanel>
        </div>

        <div>
          <button
            ref={guestAnchorRef}
            type="button"
            onClick={() => {
              setGuestsOpen(!guestsOpen);
              setDatesOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-emerald-300"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Misafir
              </p>
              <p className="truncate text-[12px] font-semibold text-slate-900">
                {guestSummary(guests, allowPets)}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition ${
                guestsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <FloatingPanel
            open={guestsOpen}
            anchorRef={guestAnchorRef}
            panelRef={guestPanelRef}
            className="rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            <GuestPicker
              counts={guests}
              onChange={setGuests}
              showPets={allowPets}
              maxGuests={maxGuests}
              confirmLabel="Tamam"
              onConfirm={() => setGuestsOpen(false)}
            />
          </FloatingPanel>
        </div>

        <ReservationPriceSummary
          quote={quote}
          fees={periodFees}
          pets={allowPets ? guests.pets : 0}
          adults={guests.adults}
          childGuests={guests.children}
          baseCapacity={baseCapacity}
          checkIn={checkIn}
          checkOut={checkOut}
          heatedPools={heatedPoolsInTl}
          selections={feeSelections}
          poolHeatingSelections={poolHeatingSelections}
          onSelectionChange={(key, value) =>
            setFeeSelections((prev) => ({ ...prev, [key]: value }))
          }
          onPoolHeatingChange={(poolId, value) =>
            setPoolHeatingSelections((prev) => ({ ...prev, [poolId]: value }))
          }
        />

        <button
          type="button"
          onClick={handleOpenModal}
          disabled={pending || !canOpenModal || guestsOpen}
          className={`w-full rounded-lg py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed ${
            guestsOpen || !canOpenModal || pending
              ? "bg-emerald-600/40 hover:bg-emerald-600/40"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          Ön Rezervasyon Talebi Gönder
        </button>
      </div>

      {phoneDisplay && phoneHref ? (
        <div className="border-t border-slate-200/80 px-2.5 pb-2.5 pt-0">
          <a
            href={`tel:${phoneHref}`}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
            {phoneDisplay}
          </a>
        </div>
      ) : null}

      {quote?.valid ? (
        <PreReservationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleModalSubmit}
          pending={pending}
          error={modalOpen ? state.error : null}
          villa={villaSummary}
          guests={guests}
          quote={{
            ...quote,
            total: pricingTotals?.grandTotal ?? quote.total,
            prepaymentAmount:
              pricingTotals?.prepaymentAmount ?? quote.prepaymentAmount,
            checkInPayment:
              pricingTotals?.checkInPayment ?? quote.checkInPayment,
          }}
          brandName={brandName}
          memberBenefits={memberBenefits}
          allowPrepaymentOption={allowPrepaymentOption}
          allowFullPaymentOption={allowFullPaymentOption}
        />
      ) : null}
    </div>
  );
}
