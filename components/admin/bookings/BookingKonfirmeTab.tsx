"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarOff, Download, Loader2, Send } from "lucide-react";
import { sendBookingConfirmationAction } from "@/app/actions/admin/booking-confirmation-send";
import { sendCalendarCloseMessageAction } from "@/app/actions/admin/booking-calendar-close-message";
import { changeBookingStatusAction } from "@/app/actions/admin/bookings";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log-core";
import { alertBookingClosedDatesError } from "@/lib/booking-closed-dates";
import { getPrepaymentShareChannelLabel } from "@/lib/booking-prepayment-share";
import type {
  BookingConfirmationSendRecord,
  BookingDetails,
  BookingPrepaymentRecord,
} from "@/lib/booking-form-details";
import { getBookingStatusLabel } from "@/lib/booking-status";
import { BookingStatus } from "@prisma/client";
import {
  FormSection,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";
import CheckInInfoShareModal from "@/components/admin/bookings/CheckInInfoShareModal";
import CancellationModal from "@/components/admin/bookings/CancellationModal";
import CompensationModal from "@/components/admin/bookings/CompensationModal";
import type { CheckInInfoShareAudience } from "@/app/actions/admin/booking-check-in-info-share";
import { sendGuestReviewInviteAction } from "@/app/actions/admin/guest-review";
import { buildCheckInInfoSharePath } from "@/lib/agency-message-render";

interface BookingKonfirmeTabProps {
  bookingId: string;
  bookingStatus: BookingStatus;
  externalCode: number | null;
  guestEmail: string;
  checkOut: Date | string;
  reservationTotal: number | null;
  prepaymentTotal: number;
  compensationAmount?: number | null;
  guestRefundAmount?: number | null;
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
  onCompensationApplied: (payload: {
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
  onCancellationCompleted?: (payload: {
    status: BookingStatus;
    activityLogs: BookingActivityLogEntry[];
    details: Partial<BookingDetails>;
  }) => void;
  onActivityLogs?: (activityLogs: BookingActivityLogEntry[]) => void;
}

function buildSuccessMessage(
  channels: Array<"whatsapp" | "email" | "sms">
): string {
  const parts = channels.map((channel) => {
    if (channel === "whatsapp") {
      return "Bildirim WhatsApp üzerinden gönderildi";
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
  externalCode: _externalCode,
  guestEmail: _guestEmail,
  checkOut,
  reservationTotal,
  prepaymentTotal,
  compensationAmount,
  guestRefundAmount,
  prepayments,
  confirmationSentAt,
  confirmationSends,
  onConfirmationSent,
  onStatusChanged,
  onCompensationApplied,
  onCancellationCompleted,
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
  const [isCalendarClosePending, startCalendarCloseTransition] = useTransition();
  const [calendarCloseError, setCalendarCloseError] = useState<string | null>(
    null
  );
  const [calendarCloseSuccess, setCalendarCloseSuccess] = useState<
    string | null
  >(null);
  const [checkInShareAudience, setCheckInShareAudience] =
    useState<CheckInInfoShareAudience | null>(null);
  const [reviewInviteError, setReviewInviteError] = useState<string | null>(null);
  const [reviewInviteSuccess, setReviewInviteSuccess] = useState<string | null>(
    null
  );
  const [isReviewInvitePending, startReviewInviteTransition] = useTransition();
  const [compensationOpen, setCompensationOpen] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);

  const hasPrepayments = prepayments.length > 0;
  const realizedPrepaymentTotal = useMemo(
    () => prepayments.reduce((sum, item) => sum + item.amount, 0),
    [prepayments]
  );
  const canSendConfirmation = hasPrepayments && !isConfirmPending;
  const canNotifyCheckIn = bookingStatus === BookingStatus.CONFIRMED;
  const guestPreviewPath = buildCheckInInfoSharePath(bookingId, "guest");
  const ownerPreviewPath = buildCheckInInfoSharePath(bookingId, "owner");
  const historyItems = useMemo(
    () => resolveHistoryItems(confirmationSends, confirmationSentAt),
    [confirmationSends, confirmationSentAt]
  );
  const hasSentConfirmation = historyItems.length > 0;
  const checkOutDate = new Date(checkOut);
  const canSendReviewInvite =
    (
      [
        BookingStatus.CONFIRMED,
        BookingStatus.CONFIRMATION_SENT,
        BookingStatus.COMPENSATION,
      ] as BookingStatus[]
    ).includes(bookingStatus) && checkOutDate < new Date();

  function handleSendReviewInvite(forceResend = false) {
    setReviewInviteError(null);
    setReviewInviteSuccess(null);
    startReviewInviteTransition(async () => {
      const result = await sendGuestReviewInviteAction(bookingId, {
        forceResend,
      });
      if (result.error) {
        setReviewInviteError(result.error);
        return;
      }
      setReviewInviteSuccess(result.message ?? "Yorum daveti gönderildi");
    });
  }

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

  function handleSendCalendarCloseMessage() {
    if (
      !window.confirm(
        "Takvim yönetene (Mesaj İçeriği 30.3) kapatma mesajı gönderilsin mi?"
      )
    ) {
      return;
    }

    setCalendarCloseError(null);
    setCalendarCloseSuccess(null);

    startCalendarCloseTransition(async () => {
      const result = await sendCalendarCloseMessageAction({ bookingId });
      if (!result.success) {
        setCalendarCloseError(result.error);
        return;
      }
      setCalendarCloseSuccess(result.message);
      onActivityLogs?.(result.activityLogs);
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
                WhatsApp seçildiğinde mesaj Bildirim WhatsApp (WAHA) üzerinden
                otomatik gönderilir.
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
          {calendarCloseError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {calendarCloseError}
            </p>
          ) : null}
          {calendarCloseSuccess ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {calendarCloseSuccess}
            </p>
          ) : null}

          {!hasPrepayments ? (
            <p className="text-sm text-amber-700">
              Konfirme göndermek için Fiyat sekmesinden en az bir ön ödeme kaydı
              ekleyin.
            </p>
          ) : null}

          {!hasSentConfirmation ? (
            <div className="flex flex-wrap justify-start gap-2">
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
              <button
                type="button"
                disabled
                title="Takvim kapatma mesajı, Konfirme Gönder’den sonra aktif olur"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white opacity-60"
              >
                <CalendarOff className="h-4 w-4" />
                Takvim Kapatma Mesajı
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

              <div className="flex flex-wrap justify-start gap-2">
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
                <button
                  type="button"
                  onClick={handleSendCalendarCloseMessage}
                  disabled={isCalendarClosePending}
                  title="Mesaj İçeriği 30.3 — takvim yönetene"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCalendarClosePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarOff className="h-4 w-4" />
                  )}
                  Takvim Kapatma Mesajı
                </button>
                <a
                  href={`/api/admin/bookings/${bookingId}/confirmation-pdf`}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                  title="Konfirme belgesini PDF olarak indir"
                >
                  <Download className="h-4 w-4" />
                  Konfirme İndir
                </a>
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
            onClick={() => {
              setStatusError(null);
              setStatusSuccess(null);
              setCompensationOpen(true);
            }}
            className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-700 disabled:opacity-60"
          >
            Tazminat
          </button>
          <button
            type="button"
            disabled={isStatusPending}
            onClick={() => {
              setStatusError(null);
              setStatusSuccess(null);
              setCancellationOpen(true);
            }}
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

      <FormSection title="Misafir Yorum Daveti">
        <p className="mb-3 text-sm text-gray-600">
          Çıkış:{" "}
          <strong>{checkOutDate.toLocaleDateString("tr-TR")}</strong> — Misafire
          özel yorum linki WhatsApp ve e-posta ile gönderilir.
        </p>
        {!canSendReviewInvite ? (
          <p className="mb-3 text-sm text-amber-700">
            Yorum daveti, onaylı rezervasyonlarda çıkış tarihi geçtikten sonra
            gönderilebilir.
          </p>
        ) : null}
        {reviewInviteError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {reviewInviteError}
          </p>
        ) : null}
        {reviewInviteSuccess ? (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {reviewInviteSuccess}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canSendReviewInvite || isReviewInvitePending}
            onClick={() => handleSendReviewInvite(false)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isReviewInvitePending ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              "Yorum Daveti Gönder"
            )}
          </button>
          <button
            type="button"
            disabled={!canSendReviewInvite || isReviewInvitePending}
            onClick={() => handleSendReviewInvite(true)}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeniden Gönder
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

      <CompensationModal
        open={compensationOpen}
        onClose={() => setCompensationOpen(false)}
        bookingId={bookingId}
        reservationTotal={reservationTotal}
        prepaymentTotal={
          realizedPrepaymentTotal > 0
            ? realizedPrepaymentTotal
            : prepaymentTotal
        }
        initialCompensationAmount={compensationAmount}
        initialGuestRefundAmount={guestRefundAmount}
        onSuccess={(payload) => {
          onCompensationApplied(payload);
          setStatusSuccess(
            `Durum "${getBookingStatusLabel(payload.status)}" olarak güncellendi.`
          );
        }}
      />

      <CancellationModal
        open={cancellationOpen}
        onClose={() => setCancellationOpen(false)}
        bookingId={bookingId}
        reservationTotal={reservationTotal}
        realizedPrepaymentTotal={realizedPrepaymentTotal}
        onCompleted={(payload) => {
          if (onCancellationCompleted) {
            onCancellationCompleted(payload);
            return;
          }
          onStatusChanged(payload.status, payload.activityLogs);
          setStatusSuccess(
            `Durum "${getBookingStatusLabel(payload.status)}" olarak güncellendi.`
          );
        }}
      />
    </div>
  );
}
