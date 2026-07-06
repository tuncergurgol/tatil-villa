"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { BookingStatus } from "@prisma/client";
import {
  createAdminBookingAction,
  getBookingPeriodFeesAction,
  getBookingPrepaymentRateAction,
  updateAdminBookingAction,
  type AdminBookingActionState,
} from "@/app/actions/admin/bookings";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { BOOKING_STATUS_OPTIONS } from "@/lib/booking-status";
import {
  BOOKING_EXTRA_FEE_FIELDS,
  computeEntrancePayment,
  computePrepaymentAmount,
  computeReservationTotal,
  formatFeeInputValue,
  type BookingDetails,
} from "@/lib/booking-form-details";
import { getSortedCompanyPaymentTypeOptions } from "@/lib/company-payment-types";

interface VillaOption {
  id: string;
  name: string;
}

interface BookingFormModalProps {
  open: boolean;
  villas: VillaOption[];
  booking?: AdminBookingListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

const readonlyClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900";

const labelClass = "text-sm font-semibold text-gray-800";

const sectionTitleClass =
  "border-b border-gray-100 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function formatMoneyDisplay(value: number | null): string {
  if (value == null) return "";
  return value.toLocaleString("tr-TR");
}

const initialState: AdminBookingActionState = {};

const emptyPricing: BookingDetails = {
  grossPrice: null,
  extraAccommodationFee: null,
  cleaningFee: null,
  petCleaningFee: null,
  poolHeatingPrivateFee: null,
  poolHeatingIndoorFee: null,
  underfloorHeatingFee: null,
  prepaymentAmount: null,
  damageDeposit: null,
  importPaymentMethod: "",
};

export default function BookingFormModal({
  open,
  villas,
  booking,
  onClose,
  onSuccess,
}: BookingFormModalProps) {
  const isEdit = Boolean(booking);
  const action = isEdit ? updateAdminBookingAction : createAdminBookingAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [villaId, setVillaId] = useState(booking?.villa.id ?? "");
  const [checkIn, setCheckIn] = useState(
    booking ? toDateInputValue(booking.checkIn) : ""
  );
  const [pricing, setPricing] = useState<BookingDetails>(emptyPricing);
  const [prepaymentRate, setPrepaymentRate] = useState(20);
  const prepaymentManuallyEdited = useRef(false);

  useEffect(() => {
    if (state.success) {
      onSuccess();
      onClose();
    }
  }, [state.success, onClose, onSuccess]);

  useEffect(() => {
    if (!open) return;
    setVillaId(booking?.villa.id ?? "");
    setCheckIn(booking ? toDateInputValue(booking.checkIn) : "");
    setPricing({
      ...emptyPricing,
      grossPrice: booking?.totalPrice ?? null,
    });
    prepaymentManuallyEdited.current = false;
  }, [open, booking]);

  useEffect(() => {
    if (!villaId || !checkIn) return;

    let cancelled = false;
    Promise.all([
      getBookingPrepaymentRateAction(villaId, checkIn),
      getBookingPeriodFeesAction(villaId, checkIn),
    ])
      .then(([rate, fees]) => {
        if (cancelled) return;
        setPrepaymentRate(rate);
        setPricing((current) => ({
          ...current,
          extraAccommodationFee:
            current.extraAccommodationFee ?? fees.extraAccommodationFee,
          cleaningFee: current.cleaningFee ?? fees.cleaningFee,
          petCleaningFee: current.petCleaningFee ?? fees.petCleaningFee,
          poolHeatingPrivateFee:
            current.poolHeatingPrivateFee ?? fees.poolHeatingPrivateFee,
          poolHeatingIndoorFee:
            current.poolHeatingIndoorFee ?? fees.poolHeatingIndoorFee,
          underfloorHeatingFee:
            current.underfloorHeatingFee ?? fees.underfloorHeatingFee,
        }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [villaId, checkIn]);

  const reservationTotal = useMemo(
    () => computeReservationTotal(pricing),
    [pricing]
  );

  const entrancePayment = useMemo(
    () => computeEntrancePayment(reservationTotal, pricing.prepaymentAmount),
    [reservationTotal, pricing.prepaymentAmount]
  );

  useEffect(() => {
    if (prepaymentManuallyEdited.current) return;
    const suggested = computePrepaymentAmount(
      pricing.grossPrice ?? null,
      prepaymentRate
    );
    setPricing((current) => ({
      ...current,
      prepaymentAmount: suggested,
      prepaymentRate,
    }));
  }, [pricing.grossPrice, prepaymentRate]);

  function patchPricing(patch: Partial<BookingDetails>) {
    setPricing((current) => ({ ...current, ...patch }));
  }

  if (!open) return null;

  const paymentTypeOptions = getSortedCompanyPaymentTypeOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Rezervasyonu Düzenle" : "Yeni Rezervasyon"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {booking ? <input type="hidden" name="id" value={booking.id} /> : null}
          <input type="hidden" name="totalPrice" value={reservationTotal ?? ""} />

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className={sectionTitleClass}>Rezervasyon Bilgileri</p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Durum</label>
                <select
                  name="status"
                  defaultValue={booking?.status ?? BookingStatus.NEW}
                  className={`${inputClass} mt-1`}
                >
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Villa</label>
                <select
                  name="villaId"
                  value={villaId}
                  onChange={(event) => setVillaId(event.target.value)}
                  required
                  className={`${inputClass} mt-1`}
                >
                  <option value="">Villa seçin...</option>
                  {villas.map((villa) => (
                    <option key={villa.id} value={villa.id}>
                      {villa.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Misafir Adı Soyadı</label>
                <input
                  name="guestName"
                  defaultValue={booking?.guestName ?? ""}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>E-posta</label>
                <input
                  name="guestEmail"
                  type="email"
                  defaultValue={booking?.guestEmail ?? ""}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Telefon</label>
                <input
                  name="guestPhone"
                  defaultValue={booking?.guestPhone ?? ""}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Giriş Tarihi</label>
                <input
                  name="checkIn"
                  type="date"
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Çıkış Tarihi</label>
                <input
                  name="checkOut"
                  type="date"
                  defaultValue={booking ? toDateInputValue(booking.checkOut) : ""}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Yetişkin</label>
                <input
                  name="adults"
                  type="number"
                  min={1}
                  defaultValue={booking?.adults ?? 2}
                  required
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Çocuk</label>
                <input
                  name="children"
                  type="number"
                  min={0}
                  defaultValue={booking?.children ?? 0}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Bebek</label>
                <input
                  name="babies"
                  type="number"
                  min={0}
                  defaultValue={booking?.babies ?? 0}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div>
                <label className={labelClass}>Evcil Hayvan</label>
                <input
                  name="pets"
                  type="number"
                  min={0}
                  defaultValue={booking?.pets ?? 0}
                  className={`${inputClass} mt-1`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className={sectionTitleClass}>Fiyat Bilgileri</p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Konaklama Bedeli</label>
                <input
                  name="grossPrice"
                  value={formatFeeInputValue(pricing.grossPrice)}
                  onChange={(event) =>
                    patchPricing({ grossPrice: parseNumber(event.target.value) })
                  }
                  className={`${inputClass} mt-1`}
                  placeholder="0"
                />
              </div>

              {BOOKING_EXTRA_FEE_FIELDS.map(({ key, label }) => (
                <div key={key} className="sm:col-span-2">
                  <label className={labelClass}>{label}</label>
                  <input
                    name={key}
                    value={formatFeeInputValue(pricing[key])}
                    onChange={(event) =>
                      patchPricing({
                        [key]: parseNumber(event.target.value),
                      })
                    }
                    className={`${inputClass} mt-1`}
                    placeholder="0"
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className={labelClass}>Rezervasyon Toplamı</label>
                <div className={`${readonlyClass} mt-1`}>
                  {formatMoneyDisplay(reservationTotal)}
                  {reservationTotal != null ? " TL" : ""}
                </div>
              </div>

              <div>
                <label className={labelClass}>Gerçekleşen Ön Ödeme</label>
                <div className="mt-1 flex gap-2">
                  <input
                    name="prepaymentAmount"
                    value={formatFeeInputValue(pricing.prepaymentAmount)}
                    onChange={(event) => {
                      prepaymentManuallyEdited.current = true;
                      patchPricing({
                        prepaymentAmount: parseNumber(event.target.value),
                      });
                    }}
                    className={inputClass}
                    placeholder="0"
                  />
                  <div className="flex w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-600">
                    %{prepaymentRate}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Ödeme Türü</label>
                <select
                  name="prepaymentMethod"
                  value={pricing.importPaymentMethod ?? ""}
                  onChange={(event) =>
                    patchPricing({
                      importPaymentMethod: event.target.value,
                      prepaymentBank: event.target.value,
                    })
                  }
                  className={`${inputClass} mt-1`}
                >
                  <option value="">Seçiniz</option>
                  {paymentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Girişte Ödenecek Tutar</label>
                <div className={`${readonlyClass} mt-1`}>
                  {formatMoneyDisplay(entrancePayment)}
                  {entrancePayment != null ? " TL" : ""}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Hasar Depozitosu</label>
                <input
                  name="damageDeposit"
                  value={formatFeeInputValue(pricing.damageDeposit)}
                  onChange={(event) =>
                    patchPricing({
                      damageDeposit: parseNumber(event.target.value),
                    })
                  }
                  className={`${inputClass} mt-1`}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {state.error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
