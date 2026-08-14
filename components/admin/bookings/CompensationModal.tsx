"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { applyCompensationAction } from "@/app/actions/admin/booking-compensation";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log-core";
import { computeCompensationBreakdown } from "@/lib/booking-compensation";
import { formatMoneyInputValue, formatMoneyPlain } from "@/lib/booking-display";
import { BookingStatus } from "@prisma/client";
import {
  FormRow,
  ReadonlyField,
  bookingInputClass,
} from "@/components/admin/bookings/booking-form-ui";

interface CompensationModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  reservationTotal: number | null;
  prepaymentTotal: number;
  initialCompensationAmount?: number | null;
  initialGuestRefundAmount?: number | null;
  /** İptal akışından geliyorsa neden kodu tazminatla birlikte kaydedilir */
  cancellationReason?: string | null;
  onSuccess: (payload: {
    status: BookingStatus;
    activityLogs: BookingActivityLogEntry[];
    details: {
      compensationAmount: number;
      guestRefundAmount: number;
      guestRefundPaymentDate: string | null;
      ownerPayableAmount: number;
      commissionAmount: number;
      invoiceAmount: number;
      prepaymentAmount: number;
      cancellationReason?: string | null;
      cancellationHasCompensation?: boolean | null;
      cancellationHasForceMajeure?: boolean | null;
      cancelledAt?: string | null;
    };
  }) => void;
}

/** 0 dahil; boş alan için null. */
function parseMoneyField(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

export default function CompensationModal({
  open,
  onClose,
  bookingId,
  reservationTotal,
  prepaymentTotal,
  initialCompensationAmount,
  initialGuestRefundAmount,
  cancellationReason,
  onSuccess,
}: CompensationModalProps) {
  const [compensationInput, setCompensationInput] = useState("");
  const [guestRefundInput, setGuestRefundInput] = useState("");
  const [guestRefundTouched, setGuestRefundTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const defaultCompensation =
      initialCompensationAmount != null && initialCompensationAmount > 0
        ? initialCompensationAmount
        : prepaymentTotal;
    const hasSavedRefund = initialGuestRefundAmount != null;
    const breakdown = computeCompensationBreakdown({
      reservationTotal,
      prepaymentTotal,
      compensationAmount: defaultCompensation,
      guestRefundAmount: hasSavedRefund
        ? Math.max(0, Math.round(initialGuestRefundAmount))
        : undefined,
    });
    setCompensationInput(formatMoneyInputValue(breakdown.compensationAmount));
    setGuestRefundInput(formatMoneyInputValue(breakdown.guestRefundAmount));
    // Kayıtlı iade varsa koru; tazminat değişince false yapılıp fark yeniden hesaplanır
    setGuestRefundTouched(hasSavedRefund);
    setError(null);
  }, [
    open,
    reservationTotal,
    prepaymentTotal,
    initialCompensationAmount,
    initialGuestRefundAmount,
  ]);

  const compensationAmount = useMemo(
    () => parseMoneyField(compensationInput),
    [compensationInput]
  );

  const guestRefundParsed = useMemo(() => {
    if (!guestRefundTouched) return undefined;
    const parsed = parseMoneyField(guestRefundInput);
    // Kullanıcı alanı boşalttıysa 0 kabul et (villa sahibine kalan fark)
    if (parsed == null) return 0;
    return parsed;
  }, [guestRefundInput, guestRefundTouched]);

  const breakdown = useMemo(() => {
    if (compensationAmount == null) return null;
    return computeCompensationBreakdown({
      reservationTotal,
      prepaymentTotal,
      compensationAmount,
      guestRefundAmount: guestRefundTouched ? guestRefundParsed : undefined,
    });
  }, [
    compensationAmount,
    reservationTotal,
    prepaymentTotal,
    guestRefundTouched,
    guestRefundParsed,
  ]);

  useEffect(() => {
    if (!open || !breakdown || guestRefundTouched) return;
    setGuestRefundInput(formatMoneyInputValue(breakdown.guestRefundAmount));
  }, [open, breakdown, guestRefundTouched]);

  if (!open) return null;

  function handleSubmit() {
    if (compensationAmount == null || !breakdown) {
      setError("Geçerli bir tazminat tutarı girin");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await applyCompensationAction({
        bookingId,
        compensationAmount: breakdown.compensationAmount,
        guestRefundAmount: breakdown.guestRefundAmount,
        ...(cancellationReason
          ? { cancellationReason }
          : {}),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess({
        status: result.status,
        activityLogs: result.activityLogs,
        details: result.details,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">Tazminat</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <FormRow label="Rezervasyon Tutarı">
            <ReadonlyField
              value={
                reservationTotal != null
                  ? formatMoneyPlain(reservationTotal)
                  : "—"
              }
            />
          </FormRow>

          <FormRow label="Ön Ödeme Tutarı">
            <ReadonlyField value={formatMoneyPlain(prepaymentTotal)} />
          </FormRow>

          <FormRow label="Tazminat Tutarı">
            <input
              type="text"
              inputMode="numeric"
              value={compensationInput}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "");
                setCompensationInput(
                  digits === ""
                    ? ""
                    : formatMoneyInputValue(Number(digits))
                );
                setGuestRefundTouched(false);
              }}
              className={bookingInputClass}
            />
          </FormRow>

          <FormRow label="Komisyon Tutarı">
            <ReadonlyField
              value={
                breakdown
                  ? formatMoneyPlain(breakdown.commissionAmount)
                  : "—"
              }
            />
          </FormRow>

          {breakdown && breakdown.difference > 0 ? (
            <>
              <FormRow label="Misafire İade">
                <div className="space-y-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={guestRefundInput}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "");
                      setGuestRefundTouched(true);
                      setGuestRefundInput(
                        digits === ""
                          ? "0"
                          : formatMoneyInputValue(Number(digits))
                      );
                    }}
                    className={bookingInputClass}
                  />
                  <p className="text-xs text-gray-500">
                    Formül: Ön ödeme − Komisyon − Misafire iade = Villa
                    sahibine ödeme
                  </p>
                </div>
              </FormRow>

              <FormRow label="Villa Sahibine Ödeme">
                <ReadonlyField
                  value={formatMoneyPlain(breakdown.ownerPayableAmount)}
                />
              </FormRow>
            </>
          ) : null}

          <p className="text-xs leading-relaxed text-gray-500">
            Tazminat tutarı, giriş+1 gün fatura listesinde misafire “ACENTE
            HİZMET BEDELİ” olarak yansır. Villa sahibine fatura düzenlenmez.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Tazminatı Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
