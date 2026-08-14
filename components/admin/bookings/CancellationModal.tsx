"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { cancelBookingAction } from "@/app/actions/admin/booking-cancellation";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log-core";
import {
  BOOKING_CANCELLATION_REASONS,
  getForceMajeureRecipientLabel,
  resolveForceMajeureRefundRecipient,
  type BookingCancellationReasonId,
} from "@/lib/booking-cancellation";
import type { BookingDetails } from "@/lib/booking-form-details";
import { formatMoneyInputValue, formatMoneyPlain } from "@/lib/booking-display";
import { BookingStatus } from "@prisma/client";
import {
  FormRow,
  ReadonlyField,
  bookingInputClass,
} from "@/components/admin/bookings/booking-form-ui";
import CompensationModal from "@/components/admin/bookings/CompensationModal";

type CancelStep =
  | "reason"
  | "compensation_question"
  | "force_majeure_question"
  | "force_majeure_form";

interface CancellationModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  reservationTotal: number | null;
  /** Yalnızca gerçekleşen (kayıtlı) ön ödeme toplamı */
  realizedPrepaymentTotal: number;
  onCompleted: (payload: {
    status: BookingStatus;
    activityLogs: BookingActivityLogEntry[];
    details: Partial<BookingDetails>;
  }) => void;
}

function parseMoneyField(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

export default function CancellationModal({
  open,
  onClose,
  bookingId,
  reservationTotal,
  realizedPrepaymentTotal,
  onCompleted,
}: CancellationModalProps) {
  const hasRealizedPrepayment = realizedPrepaymentTotal > 0;
  const [step, setStep] = useState<CancelStep>("reason");
  const [reasonId, setReasonId] = useState<BookingCancellationReasonId | null>(
    null
  );
  const [guestRefundInput, setGuestRefundInput] = useState("");
  const [ownerRefundInput, setOwnerRefundInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [compensationOpen, setCompensationOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("reason");
    setReasonId(null);
    setGuestRefundInput("");
    setOwnerRefundInput("");
    setError(null);
    setCompensationOpen(false);
  }, [open, realizedPrepaymentTotal]);

  const recipient = useMemo(() => {
    if (!reasonId) return null;
    return resolveForceMajeureRefundRecipient(reasonId);
  }, [reasonId]);

  if (!open) return null;

  function handleReasonContinue() {
    if (!reasonId) {
      setError("İptal nedeni seçin");
      return;
    }
    if (reasonId === "calendar_full" && hasRealizedPrepayment) {
      setError("Ön ödeme alınmış rezervasyonda Takvimi Dolu seçilemez");
      return;
    }
    setError(null);
    if (!hasRealizedPrepayment) {
      submitCancel({ forceMajeure: false });
      return;
    }
    setStep("compensation_question");
  }

  function openForceMajeureForm() {
    // Mücbir Sebep VAR → ön ödeme varsayılan olarak misafir iadesine yazılır
    const defaultAmount = formatMoneyInputValue(realizedPrepaymentTotal);
    setGuestRefundInput(defaultAmount);
    setOwnerRefundInput("0");
    setStep("force_majeure_form");
  }

  function submitCancel(options: {
    forceMajeure: boolean;
    refundAmount?: number;
    guestRefundAmount?: number;
    ownerPayableAmount?: number;
  }) {
    if (!reasonId) {
      setError("İptal nedeni seçin");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId,
        reasonId,
        forceMajeure: options.forceMajeure,
        refundAmount: options.refundAmount,
        guestRefundAmount: options.guestRefundAmount,
        ownerPayableAmount: options.ownerPayableAmount,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCompleted({
        status: result.status,
        activityLogs: result.activityLogs,
        details: result.details,
      });
      onClose();
    });
  }

  function handleForceMajeureSubmit() {
    if (!recipient) {
      setError("İptal nedeni seçin");
      return;
    }
    const guestAmount = parseMoneyField(guestRefundInput) ?? 0;
    const ownerAmount = parseMoneyField(ownerRefundInput) ?? 0;
    submitCancel({
      forceMajeure: true,
      guestRefundAmount: guestAmount,
      ownerPayableAmount: ownerAmount,
    });
  }

  return (
    <>
      {!compensationOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">
                Rezervasyon İptali
              </h3>
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

              {step === "reason" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">
                    İptal Nedeni
                  </p>
                  <p className="text-xs text-gray-500">
                    Yalnızca bir seçenek işaretlenebilir.
                    {hasRealizedPrepayment
                      ? " Ön ödeme alındığı için Takvimi Dolu seçilemez."
                      : ""}
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-semibold text-gray-700">
                        1. Müşteri İptali
                      </p>
                      {BOOKING_CANCELLATION_REASONS.filter(
                        (item) => item.group === "customer"
                      ).map((item) => (
                        <label
                          key={item.id}
                          className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                        >
                          <input
                            type="radio"
                            name="cancellation-reason"
                            checked={reasonId === item.id}
                            onChange={() => setReasonId(item.id)}
                            className="h-4 w-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          {item.id === "customer_withdraw" ? "1.a. " : "1.b. "}
                          {item.label}
                        </label>
                      ))}
                    </div>

                    {BOOKING_CANCELLATION_REASONS.filter(
                      (item) => item.group !== "customer"
                    ).map((item, index) => {
                      const disabled =
                        item.id === "calendar_full" && hasRealizedPrepayment;
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm ${
                            disabled
                              ? "cursor-not-allowed bg-gray-50 text-gray-400"
                              : "cursor-pointer text-gray-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cancellation-reason"
                            checked={reasonId === item.id}
                            disabled={disabled}
                            onChange={() => setReasonId(item.id)}
                            className="h-4 w-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                          {index + 2}. {item.label}
                          {disabled ? " (pasif)" : ""}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === "compensation_question" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Tazminat var mı?
                  </p>
                  <p className="text-xs text-gray-500">
                    Gerçekleşen ön ödeme:{" "}
                    {formatMoneyPlain(realizedPrepaymentTotal)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCompensationOpen(true);
                      }}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                    >
                      Var
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("force_majeure_question")}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Yok
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "force_majeure_question" ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-800">
                    Mücbir sebep var mı?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openForceMajeureForm}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Var
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => submitCancel({ forceMajeure: false })}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Yok
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "force_majeure_form" && recipient ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Mücbir Sebep İadesi
                  </p>
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
                    <ReadonlyField
                      value={formatMoneyPlain(realizedPrepaymentTotal)}
                    />
                  </FormRow>
                  <FormRow label="Misafire İade Edilecek Tutar">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={guestRefundInput}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "");
                        setGuestRefundInput(
                          digits === ""
                            ? "0"
                            : formatMoneyInputValue(Number(digits))
                        );
                      }}
                      className={bookingInputClass}
                    />
                  </FormRow>
                  <FormRow label="Villa Sahibine Ödenecek Tutar">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ownerRefundInput}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "");
                        setOwnerRefundInput(
                          digits === ""
                            ? "0"
                            : formatMoneyInputValue(Number(digits))
                        );
                      }}
                      className={bookingInputClass}
                    />
                  </FormRow>
                  <p className="text-xs text-gray-500">
                    Mücbir sebep iadesinde ön ödeme varsayılan olarak misafir
                    alanına yazılır. Her iki alan da manuel düzeltilebilir;
                    kayıtta her iki tutar da yapılacak ödeme olarak saklanır.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              {step !== "reason" && step !== "force_majeure_form" ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (step === "force_majeure_question") {
                      setStep("compensation_question");
                      return;
                    }
                    setStep("reason");
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Geri
                </button>
              ) : null}
              {step === "force_majeure_form" ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("force_majeure_question");
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Geri
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Kapat
              </button>
              {step === "reason" ? (
                <button
                  type="button"
                  onClick={handleReasonContinue}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {hasRealizedPrepayment ? "Devam" : "İptal Et"}
                </button>
              ) : null}
              {step === "force_majeure_form" ? (
                <button
                  type="button"
                  onClick={handleForceMajeureSubmit}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  İptali Uygula
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <CompensationModal
        open={compensationOpen}
        onClose={() => setCompensationOpen(false)}
        bookingId={bookingId}
        reservationTotal={reservationTotal}
        prepaymentTotal={realizedPrepaymentTotal}
        cancellationReason={reasonId}
        onSuccess={(payload) => {
          onCompleted({
            status: payload.status,
            activityLogs: payload.activityLogs,
            details: payload.details,
          });
          setCompensationOpen(false);
          onClose();
        }}
      />
    </>
  );
}
