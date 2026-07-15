"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ReservationPriceSummary from "@/components/ReservationPriceSummary";
import type { AdminBookingWizardQuote } from "@/lib/queries/admin-booking-wizard";
import {
  buildStayBookingFeeDetails,
  type PoolHeatingSelections,
  type StayFeeSelections,
} from "@/lib/stay-period-fees";
import {
  applyStayQuoteToBookingDetails,
  clearBookingDiscountAndCouponFields,
  formatBookingDate,
  getNightCount,
  type BookingDetails,
} from "@/lib/booking-form-details";

export type BookingEntryQuoteApplyPayload = {
  details: BookingDetails;
  prepaymentRate: number;
};

type BookingEntryQuotePreviewModalProps = {
  open: boolean;
  loading?: boolean;
  quote: AdminBookingWizardQuote | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  pets: number;
  villaName?: string;
  onApply: (payload: BookingEntryQuoteApplyPayload) => void;
  onClose: () => void;
};

export default function BookingEntryQuotePreviewModal({
  open,
  loading = false,
  quote,
  checkIn,
  checkOut,
  adults,
  children,
  babies,
  pets,
  villaName,
  onApply,
  onClose,
}: BookingEntryQuotePreviewModalProps) {
  const [feeSelections, setFeeSelections] = useState<StayFeeSelections>({});
  const [poolHeatingSelections, setPoolHeatingSelections] =
    useState<PoolHeatingSelections>({});

  useEffect(() => {
    if (!open) return;
    setFeeSelections({});
    setPoolHeatingSelections({});
  }, [open, checkIn, checkOut, quote?.quote.nights]);

  if (!open) return null;

  const nights =
    checkIn && checkOut
      ? getNightCount(
          new Date(`${checkIn}T00:00:00.000Z`),
          new Date(`${checkOut}T00:00:00.000Z`)
        )
      : 0;
  const guestSummary = `${adults + children + babies} Misafir (${adults}+${children}+${babies})`;
  const quoteValid = Boolean(quote?.quote.valid);
  const periodFees = quote?.periodFees ?? null;
  const heatedPools = quote?.heatedPools ?? [];
  const baseCapacity = quote?.baseCapacity ?? 0;

  function handleApply() {
    if (!quote?.quote.valid || !periodFees) return;

    const fees = buildStayBookingFeeDetails({
      fees: periodFees,
      selections: feeSelections,
      pets,
      nights: quote.quote.nights,
      adults,
      children,
      baseCapacity,
      cleaningFee: quote.quote.cleaningFee,
      heatedPools,
      poolHeatingSelections,
      checkIn,
      checkOut,
    });

    const details = applyStayQuoteToBookingDetails(
      clearBookingDiscountAndCouponFields({}),
      {
        quote: quote.quote,
        fees,
        damageDeposit: quote.damageDeposit ?? periodFees.damageDeposit,
      },
      {
        pets,
        petDamageDeposit: pets > 0 ? periodFees.petDamageDeposit : null,
      }
    );

    onApply({
      details,
      prepaymentRate: quote.quote.prepaymentRate,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            Yeni Rezervasyon Hesabı
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-gray-500">Fiyat hesaplanıyor…</p>
          ) : null}

          {!loading && quote && !quoteValid ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              {quote.quote.invalidReason ??
                "Bu tarihler için rezervasyon hesaplanamadı."}
              {quote.quote.minStayNights != null ? (
                <p className="mt-1 text-xs text-amber-700">
                  Minimum konaklama: {quote.quote.minStayNights} gece
                </p>
              ) : null}
            </div>
          ) : null}

          {!loading && !quote ? (
            <p className="text-sm text-gray-500">
              Seçilen tarihler için fiyat bulunamadı.
            </p>
          ) : null}

          {quoteValid && quote ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-sm font-bold text-gray-900">
                  Rezervasyon Bilgileri
                </p>

                {villaName ? (
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {villaName}
                  </p>
                ) : null}

                {checkIn && checkOut ? (
                  <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                    <p>
                      {formatBookingDate(new Date(`${checkIn}T00:00:00.000Z`))}{" "}
                      –{" "}
                      {formatBookingDate(new Date(`${checkOut}T00:00:00.000Z`))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {nights} Gece · {guestSummary}
                      {pets > 0 ? ` · ${pets} Evcil hayvan` : ""}
                    </p>
                  </div>
                ) : null}
              </div>

              <ReservationPriceSummary
                quote={quote.quote}
                fees={periodFees}
                pets={pets}
                adults={adults}
                children={children}
                baseCapacity={baseCapacity}
                checkIn={checkIn}
                checkOut={checkOut}
                heatedPools={heatedPools}
                selections={feeSelections}
                poolHeatingSelections={poolHeatingSelections}
                onSelectionChange={(key, value) =>
                  setFeeSelections((prev) => ({ ...prev, [key]: value }))
                }
                onPoolHeatingChange={(poolId, value) =>
                  setPoolHeatingSelections((prev) => ({
                    ...prev,
                    [poolId]: value,
                  }))
                }
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={loading || !quoteValid || !periodFees}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
