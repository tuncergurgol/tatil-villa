"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";
import {
  previewCheckInInfoShareAction,
  sendCheckInInfoShareAction,
  type CheckInInfoShareAudience,
} from "@/app/actions/admin/booking-check-in-info-share";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log";
import { getPrepaymentShareChannelLabel } from "@/lib/booking-prepayment-share";
import { bookingLabelClass } from "@/components/admin/bookings/booking-form-ui";

interface CheckInInfoShareModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (payload: {
    previewPath: string;
    activityLogs: BookingActivityLogEntry[];
  }) => void;
  bookingId: string;
  audience: CheckInInfoShareAudience;
  previewPath?: string;
}

function buildSuccessMessage(
  channels: Array<"whatsapp" | "email" | "sms">,
  warning?: string
): string {
  const parts = channels.map(
    (channel) =>
      `${getPrepaymentShareChannelLabel(channel)} üzerinden gönderildi`
  );
  const base = parts.join(". ") + ".";
  return warning ? `${base} Uyarı: ${warning}` : base;
}

export default function CheckInInfoShareModal({
  open,
  onClose,
  onSuccess,
  bookingId,
  audience,
  previewPath,
}: CheckInInfoShareModalProps) {
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const sendSms = false;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resolvedPreview, setResolvedPreview] = useState<string | null>(
    previewPath ?? null
  );
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);
  const [templateLabel, setTemplateLabel] = useState<string | null>(null);
  const [templateRowNo, setTemplateRowNo] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const title =
    audience === "guest"
      ? "Müşteri Bilgilendirme"
      : "Villa Yetkilisi Bilgilendir";

  useEffect(() => {
    if (!open) return;
    setSendWhatsApp(true);
    setSendEmail(true);
    setError(null);
    setSuccessMessage(null);
    setResolvedPreview(previewPath ?? null);
    setMessagePreview(null);
    setEmailPreview(null);
    setTemplateLabel(null);
    setTemplateRowNo(null);
    setIsPreviewLoading(true);

    let cancelled = false;
    void (async () => {
      try {
        const result = await previewCheckInInfoShareAction({
          bookingId,
          audience,
        });
        if (cancelled) return;
        setIsPreviewLoading(false);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setResolvedPreview(result.previewPath);
        setMessagePreview(result.whatsappPreview);
        setEmailPreview(result.emailPreview);
        setTemplateLabel(result.templateLabel);
        setTemplateRowNo(result.templateRowNo);
      } catch (previewError) {
        if (cancelled) return;
        setIsPreviewLoading(false);
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Önizleme yüklenemedi"
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, previewPath, bookingId, audience]);

  if (!open) return null;

  function handleSend() {
    if (!sendWhatsApp && !sendEmail) {
      setError("En az bir bildirim kanalı seçilmelidir");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const result = await sendCheckInInfoShareAction({
          bookingId,
          audience,
          sendWhatsApp,
          sendEmail,
          sendSms,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setSuccessMessage(
          buildSuccessMessage(result.channels, result.warning)
        );
        setResolvedPreview(result.previewPath);
        onSuccess?.({
          previewPath: result.previewPath,
          activityLogs: result.activityLogs,
        });
      } catch (sendError) {
        setError(
          sendError instanceof Error
            ? sendError.message
            : "Bilgilendirme gönderilemedi"
        );
      }
    });
  }

  const previewText =
    sendEmail && !sendWhatsApp && emailPreview
      ? emailPreview
      : messagePreview;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
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

          {templateLabel && templateRowNo != null ? (
            <p className="text-xs text-gray-500">
              Mesaj İçeriği {templateLabel} (ID {templateRowNo})
            </p>
          ) : null}

          {isPreviewLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mesaj önizlemesi yükleniyor…
            </div>
          ) : previewText ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-relaxed text-gray-800">
              {previewText}
            </pre>
          ) : null}

          {resolvedPreview ? (
            <p className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-800">
              Önizleme:{" "}
              <a
                href={resolvedPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                {resolvedPreview}
              </a>
            </p>
          ) : null}

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
            {sendEmail ? (
              <p className="mt-1 text-xs text-gray-500">
                E-posta rezervasyon@tatildeyiz.com.tr adresinden gönderilir.
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
            disabled={isPending || isPreviewLoading || !previewText}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
