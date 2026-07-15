"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { sendBookingConfirmationAction } from "@/app/actions/admin/booking-confirmation-send";
import { changeBookingStatusAction } from "@/app/actions/admin/bookings";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log";
import { alertBookingClosedDatesError } from "@/lib/booking-closed-dates";
import { getPrepaymentShareChannelLabel } from "@/lib/booking-prepayment-share";
import type {
  BookingConfirmationSendRecord,
  BookingPrepaymentRecord,
} from "@/lib/booking-form-details";
import { resolveExternalCode } from "@/lib/booking-form-details";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { BookingStatus } from "@prisma/client";
import {
  FormSection,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";
import CheckInInfoShareModal from "@/components/admin/bookings/CheckInInfoShareModal";
import type { CheckInInfoShareAudience } from "@/app/actions/admin/booking-check-in-info-share";
import { buildCheckInInfoSharePath } from "@/lib/agency-message-render";

interface BookingKonfirmeTabProps {
  bookingId: string;
  bookingStatus: BookingStatus;
  externalCode: number | null;
  guestEmail: string;
  prepayments: BookingPrepaymentRecord[];
  confirmationSentAt: Date | string | null;
  confirmationSends: BookingConfirmationSendRecord[];
  onConfirmationSent: (payload: {
    confirmationSentAt: Date;
    confirmationSends: BookingConfirmationSendRecord[];
    activityLogs: BookingActivityLogEntry[];
    salesRep: {
      salesRepUserId: string;
      salesRepName: string;
      salesRepCommissionRate: number;
      salesRepCommissionEarned: number | null;
    } | null;
  }) => void;
  onStatusChanged: (
    status: BookingStatus,
    activityLogs: BookingActivityLogEntry[]
  ) => void;
  onActivityLogs?: (activityLogs: BookingActivityLogEntry[]) => void;
}

function buildSuccessMessage(
  channels: Array<"whatsapp" | "email" | "sms">
): string {
  const parts = channels.map((channel) => {
    if (channel === "whatsapp") {
      return "Sistem WhatsApp üzerinden gönderildi";
    }
    return `${getPrepaymentShareChannelLabel(channel)} üzerinden gönderildi`;
  });
  return parts.join(". ") + ".";
}

function resolveHistoryItems(
  confirmationSends: BookingConfirmationSendRecord[],
  confirmationSentAt: Date | string | null
): BookingConfirmationSendRecord[] {
  if (confirmationSends.length > 0) return confirmationSends;
  if (!confirmationSentAt) return [];
  return [
    {
      id: "legacy-confirmation-sent",
      sentAt: new Date(confirmationSentAt).toISOString(),
      channels: [],
      status: "sent",
    },
  ];
}

export default function BookingKonfirmeTab({
  bookingId,
  bookingStatus,
  externalCode,
  guestEmail,
  prepayments,
  confirmationSentAt,
  confirmationSends,
  onConfirmationSent,
  onStatusChanged,
  onActivityLogs,
}: BookingKonfirmeTabProps) {
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const sendSms = false;
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(
    null
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [isStatusPending, startStatusTransition] = useTransition();
  const [checkInShareAudience, setCheckInShareAudience] =
    useState<CheckInInfoShareAudience | null>(null);

  const hasPrepayments = prepayments.length > 0;
  const canSendConfirmation = hasPrepayments && !isConfirmPending;
  const canNotifyCheckIn = bookingStatus === BookingStatus.CONFIRMED;
  const resolvedCode =
    resolveExternalCode(externalCode, guestEmail) || bookingId;
  const guestPreviewPath = buildCheckInInfoSharePath(resolvedCode, "guest");
  const ownerPreviewPath = buildCheckInInfoSharePath(resolvedCode, "owner");
  const historyItems = useMemo(
    () => resolveHistoryItems(confirmationSends, confirmationSentAt),
    [confirmationSends, confirmationSentAt]
  );
  const hasSentConfirmation = historyItems.length > 0;

  function handleSendConfirmation() {
    if (!hasPrepayments) {
      setConfirmationError(
        "Konfirme göndermek için Fiyat sekmesinden en az bir ön ödeme kaydı ekleyin"
      );
      return;
    }

    setConfirmationError(null);
    setConfirmationSuccess(null);

    startConfirmTransition(async () => {
      const result = await sendBookingConfirmationAction({
        bookingId,
        sendWhatsApp,
        sendEmail,
        sendSms,
      });

      if (!result.success) {
        alertBookingClosedDatesError(result.error);
        setConfirmationError(result.error);
        return;
      }

      setConfirmationSuccess(buildSuccessMessage(result.channels));
      onConfirmationSent({
        confirmationSentAt: new Date(result.confirmationSentAt),
        confirmationSends: result.confirmationSends,
        activityLogs: result.activityLogs,
        salesRep: result.salesRep,
      });
    });
  }

  function handleStatusChange(
    status: BookingStatus,
    label: string
  ) {
    if (
      !window.confirm(
        `Rezervasyon durumu "${label}" olarak güncellensin mi?`
      )
    ) {
      return;
    }

    setStatusError(null);
    setStatusSuccess(null);

    startStatusTransition(async () => {
      const result = await changeBookingStatusAction(bookingId, status);
      if (!result.success) {
        setStatusError(result.error);
        return;
      }

      onStatusChanged(result.status, result.activityLogs);
      setStatusSuccess(
        `Durum "${getBookingStatusLabel(result.status)}" olarak güncellendi.`
      );
    });
  }

  return (
    <div className="space-y-5">
      <FormSection title="Konfirme Gönder">
        <div className="space-y-4">
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

          {confirmationError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {confirmationError}
            </p>
          ) : null}
          {confirmationSuccess ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {confirmationSuccess}
            </p>
          ) : null}

          {!hasPrepayments ? (
            <p className="text-sm text-amber-700">
              Konfirme göndermek için Fiyat sekmesinden en az bir ön ödeme kaydı
              ekleyin.
            </p>
          ) : null}

          {!hasSentConfirmation ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleSendConfirmation}
                disabled={!canSendConfirmation}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConfirmPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Konfirme Gönder
              </button>
            </div>
          ) : null}

          {hasSentConfirmation ? (
            <div className="space-y-3">
              <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/70 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Konfirme Gönderim Geçmişi
                </p>
                <ul className="space-y-2">
                  {historyItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(item.sentAt).toLocaleString("tr-TR")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.channels.length > 0
                            ? item.channels
                                .map((channel) =>
                                  getPrepaymentShareChannelLabel(channel)
                                )
                                .join(", ")
                            : "Kanal bilgisi yok"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                          item.status === "sent"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status === "sent" ? "Gönderildi" : "Başarısız"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleSendConfirmation}
                  disabled={!canSendConfirmation}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirmPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Yeniden Konfirme Gönder
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Rezervasyon Durumu">
        {statusError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {statusError}
          </p>
        ) : null}
        {statusSuccess ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {statusSuccess}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isStatusPending}
            onClick={() =>
              handleStatusChange(BookingStatus.CONFIRMED, "Açığa Al")
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Açığa Al
          </button>
          <button
            type="button"
            disabled={isStatusPending}
            onClick={() =>
              handleStatusChange(BookingStatus.COMPENSATION, "Tazminat")
            }
            className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-700 disabled:opacity-60"
          >
            Tazminat
          </button>
          <button
            type="button"
            disabled={isStatusPending}
            onClick={() => handleStatusChange(BookingStatus.CANCELLED, "İptal")}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:opacity-60"
          >
            İptal
          </button>
        </div>
      </FormSection>

      <FormSection title="Giriş Bilgilendirme">
        {!canNotifyCheckIn ? (
          <p className="mb-3 text-sm text-amber-700">
            Bu butonlar yalnızca rezervasyon durumu{" "}
            <strong>Onaylandı</strong> iken aktiftir.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canNotifyCheckIn}
            onClick={() => setCheckInShareAudience("guest")}
            title={
              canNotifyCheckIn
                ? guestPreviewPath
                : "Yalnızca onaylı rezervasyonlarda aktif"
            }
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Müşteri Bilgilendirme
          </button>
          <button
            type="button"
            disabled={!canNotifyCheckIn}
            onClick={() => setCheckInShareAudience("owner")}
            title={
              canNotifyCheckIn
                ? ownerPreviewPath
                : "Yalnızca onaylı rezervasyonlarda aktif"
            }
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Villa Yetkilisi Bilgilendir
          </button>
        </div>
      </FormSection>

      <CheckInInfoShareModal
        open={checkInShareAudience != null}
        onClose={() => setCheckInShareAudience(null)}
        bookingId={bookingId}
        audience={checkInShareAudience ?? "guest"}
        previewPath={
          checkInShareAudience === "owner"
            ? ownerPreviewPath
            : guestPreviewPath
        }
        onSuccess={({ activityLogs }) => {
          onActivityLogs?.(activityLogs);
        }}
      />
    </div>
  );
}
