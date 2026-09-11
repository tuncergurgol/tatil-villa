"use client";

import { Info } from "lucide-react";
import { formatMoneyPlain } from "@/lib/booking-display";
import { countNightsBetween } from "@/lib/villa-period-selection";

interface NewBookingPriceSummaryProps {
  title?: string;
  villaName?: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  accommodationTotal: number | null;
  cleaningFee: number | null;
  underfloorHeatingFee: number | null;
  includeUnderfloorHeating: boolean;
  onToggleUnderfloorHeating?: (value: boolean) => void;
  reservationTotal: number | null;
  prepaymentAmount: number | null;
  prepaymentRate: number;
  entrancePayment: number | null;
  damageDeposit: number | null;
  compact?: boolean;
}

export default function NewBookingPriceSummary({
  title = "Rezervasyon Bilgileri",
  villaName,
  checkIn,
  checkOut,
  adults,
  children,
  babies,
  accommodationTotal,
  cleaningFee,
  underfloorHeatingFee,
  includeUnderfloorHeating,
  onToggleUnderfloorHeating,
  reservationTotal,
  prepaymentAmount,
  prepaymentRate,
  entrancePayment,
  damageDeposit,
  compact = false,
}: NewBookingPriceSummaryProps) {
  const nights =
    checkIn && checkOut ? countNightsBetween(checkIn, checkOut) : 0;
  const guestSummary = `${adults + children + babies} Misafir (${adults}+${children}+${babies})`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-sm font-bold text-gray-900">{title}</p>

      {villaName ? (
        <p className="mt-2 text-sm font-semibold text-gray-800">{villaName}</p>
      ) : null}

      {checkIn && checkOut ? (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <p>
            {new Date(`${checkIn}T00:00:00.000Z`).toLocaleDateString("tr-TR")} –{" "}
            {new Date(`${checkOut}T00:00:00.000Z`).toLocaleDateString("tr-TR")}
          </p>
          <p className="text-xs text-gray-500">
            {nights} Gece · {guestSummary}
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-gray-600">
            Konaklama ({nights} Gece)
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </span>
          <span className="font-medium text-gray-900">
            {accommodationTotal != null
              ? formatMoneyPlain(accommodationTotal)
              : "—"}
          </span>
        </div>

        {cleaningFee != null && cleaningFee > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-600">Temizlik Ücreti</span>
            <span className="font-medium text-gray-900">
              {formatMoneyPlain(cleaningFee)}
            </span>
          </div>
        ) : null}

        {underfloorHeatingFee != null && underfloorHeatingFee > 0 ? (
          <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <span className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={includeUnderfloorHeating}
                onChange={(event) =>
                  onToggleUnderfloorHeating?.(event.target.checked)
                }
                disabled={!onToggleUnderfloorHeating}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Yerden Isıtma Bedeli
            </span>
            <span className="font-medium text-gray-900">
              +{formatMoneyPlain(underfloorHeatingFee)}
            </span>
          </label>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
        <div className="flex items-center justify-between gap-3 font-bold text-gray-900">
          <span>Toplam</span>
          <span>
            {reservationTotal != null
              ? formatMoneyPlain(reservationTotal)
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-gray-700">
          <span>Ön Ödeme (%{prepaymentRate})</span>
          <span className="font-semibold">
            {prepaymentAmount != null
              ? formatMoneyPlain(prepaymentAmount)
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-gray-700">
          <span>Giriş Ödemesi (Kalan)</span>
          <span className="font-semibold">
            {entrancePayment != null
              ? formatMoneyPlain(entrancePayment)
              : "—"}
          </span>
        </div>
        {!compact && damageDeposit != null && damageDeposit > 0 ? (
          <div className="flex items-center justify-between gap-3 text-gray-700">
            <span>Hasar Depozitosu</span>
            <span className="font-semibold">
              {formatMoneyPlain(damageDeposit)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
