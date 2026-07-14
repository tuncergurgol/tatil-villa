"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";
import { sendBookingPrepaymentInfoAction } from "@/app/actions/admin/booking-prepayment-share";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log";
import { alertBookingClosedDatesError } from "@/lib/booking-closed-dates";
import {
  BOOKING_PREPAYMENT_OPTION_HOURS,
  formatPrepaymentOptionLabel,
  getPrepaymentShareChannelLabel,
} from "@/lib/booking-prepayment-share";
import { formatMoneyPlain } from "@/lib/booking-display";
import { getCompanyPaymentTypeLabel } from "@/lib/company-payment-types";
import {
  FormRow,
  ReadonlyField,
  bookingInputClass,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";

interface PrepaymentShareModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (payload: {
    optionExpiresAt: Date;
    activityLogs: BookingActivityLogEntry[];
  }) => void;
  bookingId: string;
  prepaymentAmount: number | null;
  paymentMethod: string;
}

function buildSuccessMessage(
  channels: Array<"whatsapp" | "email" | "sms">
): string {
  const parts = channels.map(
    (channel) =>
      `${getPrepaymentShareChannelLabel(channel)} üzerinden gönderildi`
  );
  return parts.join(". ") + ".";
}

export default function PrepaymentShareModal({
  open,
  onClose,
  onSuccess,
  bookingId,
  prepaymentAmount,
  paymentMethod,
}: PrepaymentShareModalProps) {
  const [optionHours, setOptionHours] = useState<number>(12);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const sendSms = false;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const paymentChannelLabel = paymentMethod
    ? getCompanyPaymentTypeLabel(paymentMethod)
    : "";

  useEffect(() => {
    if (!open) return;
    setOptionHours(12);
    setSendWhatsApp(true);
    setSendEmail(true);
    setError(null);
    setSuccessMessage(null);
  }, [open]);

  if (!open) return null;

  function handleSend() {
    if (prepaymentAmount == null || prepaymentAmount <= 0) {
      setError("Ön ödeme tutarı girilmelidir");
      return;
    }

    if (!paymentMethod.trim()) {
      setError("Ödeme türü seçilmelidir");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await sendBookingPrepaymentInfoAction({
        bookingId,
        prepaymentAmount,
        paymentMethod,
        optionHours,
        sendWhatsApp,
        sendEmail,
        sendSms,
      });

      if (!result.success) {
        alertBookingClosedDatesError(result.error);
        setError(result.error);
        return;
      }

      setSuccessMessage(buildSuccessMessage(result.channels));
      onSuccess?.({
        optionExpiresAt: new Date(Date.now() + optionHours * 60 * 60 * 1000),
        activityLogs: result.activityLogs,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">
            Ön Ödeme Bilgisi Paylaş
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
          {successMessage ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <FormRow label="Ön Ödeme Tutarı">
            <ReadonlyField
              value={
                prepaymentAmount != null
                  ? formatMoneyPlain(prepaymentAmount)
                  : "—"
              }
            />
          </FormRow>

          <FormRow label="Ödeme Kanalı">
            <ReadonlyField value={paymentChannelLabel || "—"} />
          </FormRow>

          <FormRow label="Müşteri Opsiyon Süresi">
            <select
              value={optionHours}
              onChange={(event) =>
                setOptionHours(Number(event.target.value))
              }
              className={bookingInputClass}
            >
              {BOOKING_PREPAYMENT_OPTION_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {formatPrepaymentOptionLabel(hours)}
                </option>
              ))}
            </select>
          </FormRow>

          <div>
            <p className={bookingLabelClass}>Bildirim Kanalı</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(event) => setSendWhatsApp(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                WhatsApp
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(event) => setSendEmail(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                E-posta
              </label>
              <label
                className="inline-flex cursor-not-allowed items-center gap-2 text-sm font-medium text-gray-400"
                title="SMS sağlayıcısı henüz yapılandırılmadı"
              >
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                SMS (yakında)
              </label>
            </div>
            {sendWhatsApp ? (
              <p className="mt-2 text-xs text-gray-500">
                WhatsApp seçildiğinde mesaj Sistem WhatsApp (Evolution API)
                üzerinden otomatik gönderilir.
              </p>
            ) : null}
          </div>
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
            onClick={handleSend}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Ön Ödeme Bilgisi Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
