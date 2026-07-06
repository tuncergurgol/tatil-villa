"use client";

import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Loader2, Send, X } from "lucide-react";
import { sendBookingPrepaymentInfoAction } from "@/app/actions/admin/booking-prepayment-share";
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
  onSuccess?: (payload: { optionExpiresAt: Date }) => void;
  bookingId: string;
  prepaymentAmount: number | null;
  paymentMethod: string;
}

function buildSuccessMessage(
  channels: Array<"whatsapp" | "email" | "sms">,
  whatsappOpened: boolean
): string {
  const parts: string[] = [];

  for (const channel of channels) {
    if (channel === "whatsapp") {
      parts.push(
        whatsappOpened
          ? "WhatsApp penceresi açıldı (mesajı göndermek için WhatsApp'ta Gönder'e basın)"
          : "WhatsApp bağlantısı hazırlandı"
      );
    } else {
      parts.push(
        `${getPrepaymentShareChannelLabel(channel)} üzerinden gönderildi`
      );
    }
  }

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
  const [sendSms, setSendSms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const paymentChannelLabel = paymentMethod
    ? getCompanyPaymentTypeLabel(paymentMethod)
    : "";

  useEffect(() => {
    if (!open) return;
    setOptionHours(12);
    setSendWhatsApp(true);
    setSendEmail(true);
    setSendSms(false);
    setError(null);
    setSuccessMessage(null);
    setWhatsappUrl(null);
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
    setWhatsappUrl(null);

    const popup = sendWhatsApp ? window.open("about:blank", "_blank") : null;

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
        popup?.close();
        setError(result.error);
        return;
      }

      let whatsappOpened = false;

      if (result.whatsappUrl) {
        setWhatsappUrl(result.whatsappUrl);
        if (popup) {
          popup.location.href = result.whatsappUrl;
          whatsappOpened = true;
        }
      } else if (popup) {
        popup.close();
      }

      setSuccessMessage(
        buildSuccessMessage(result.channels, whatsappOpened)
      );
      onSuccess?.({
        optionExpiresAt: new Date(Date.now() + optionHours * 60 * 60 * 1000),
      });
    });
  }

  function handleOpenWhatsApp() {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyWhatsAppLink() {
    if (!whatsappUrl) return;
    try {
      await navigator.clipboard.writeText(whatsappUrl);
      setSuccessMessage("WhatsApp bağlantısı panoya kopyalandı.");
    } catch {
      setError("Bağlantı kopyalanamadı");
    }
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
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(event) => setSendSms(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                SMS
              </label>
            </div>
            {sendWhatsApp ? (
              <p className="mt-2 text-xs text-gray-500">
                WhatsApp seçildiğinde mesaj hazır açılır; göndermek için
                WhatsApp&apos;ta Gönder&apos;e basın.
              </p>
            ) : null}
          </div>

          {whatsappUrl ? (
            <div className="flex flex-wrap gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                WhatsApp&apos;ta Aç
              </button>
              <button
                type="button"
                onClick={handleCopyWhatsAppLink}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Bağlantıyı Kopyala
              </button>
            </div>
          ) : null}
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
