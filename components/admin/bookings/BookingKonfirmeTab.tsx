"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  createBookingPrepaymentAction,
  deleteBookingPrepaymentAction,
  getBookingBankAccountsAction,
  updateBookingPrepaymentAction,
} from "@/app/actions/admin/booking-prepayments";
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
import {
  formatMoneyInputValue,
  formatMoneyPlain,
} from "@/lib/booking-display";
import { getBookingStatusLabel } from "@/lib/booking-status";
import {
  getCompanyPaymentTypeLabel,
  getSortedCompanyPaymentTypeOptions,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import { BookingStatus } from "@prisma/client";
import {
  FormRow,
  FormSection,
  bookingInputClass,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";
import CheckInInfoShareModal from "@/components/admin/bookings/CheckInInfoShareModal";
import type { CheckInInfoShareAudience } from "@/app/actions/admin/booking-check-in-info-share";

type BankAccountOption = {
  id: string;
  paymentType: string;
  bankName: string;
  accountHolder: string;
  iban: string;
};

interface DraftPrepaymentRow {
  id: string;
  paymentChannel: string;
  bankAccountId: string;
  amount: string;
}

interface BookingKonfirmeTabProps {
  bookingId: string;
  bookingStatus: BookingStatus;
  externalCode: number | null;
  guestEmail: string;
  expectedPrepaymentAmount: number | null;
  prepayments: BookingPrepaymentRecord[];
  confirmationSentAt: Date | string | null;
  confirmationSends: BookingConfirmationSendRecord[];
  onPrepaymentSaved: (
    prepayment: BookingPrepaymentRecord,
    activityLogs: BookingActivityLogEntry[]
  ) => void;
  onPrepaymentUpdated: (
    prepayment: BookingPrepaymentRecord,
    activityLogs: BookingActivityLogEntry[]
  ) => void;
  onPrepaymentDeleted: (
    prepaymentId: string,
    activityLogs: BookingActivityLogEntry[]
  ) => void;
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

function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(/\s*TL\s*$/i, "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function formatBankAccountLabel(account: BankAccountOption): string {
  const parts = [account.bankName, account.accountHolder].filter(Boolean);
  if (account.iban) parts.push(account.iban);
  return parts.join(" — ") || account.id;
}

function buildDraftRow(defaultAmount: number | null): DraftPrepaymentRow {
  return {
    id: crypto.randomUUID(),
    paymentChannel: "",
    bankAccountId: "",
    amount:
      defaultAmount != null ? formatMoneyInputValue(defaultAmount) : "",
  };
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
  expectedPrepaymentAmount,
  prepayments,
  confirmationSentAt,
  confirmationSends,
  onPrepaymentSaved,
  onPrepaymentUpdated,
  onPrepaymentDeleted,
  onConfirmationSent,
  onStatusChanged,
  onActivityLogs,
}: BookingKonfirmeTabProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [draftRows, setDraftRows] = useState<DraftPrepaymentRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<DraftPrepaymentRow | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [prepaymentError, setPrepaymentError] = useState<string | null>(null);

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
  const guestPreviewPath = `/giris-bilgilendirme/${resolvedCode}`;
  const ownerPreviewPath = `/giris-bilgilendirme/${resolvedCode}/evsahibi`;
  const paymentTypeOptions = getSortedCompanyPaymentTypeOptions();
  const historyItems = useMemo(
    () => resolveHistoryItems(confirmationSends, confirmationSentAt),
    [confirmationSends, confirmationSentAt]
  );
  const hasSentConfirmation = historyItems.length > 0;

  const bankTransferAccounts = useMemo(
    () =>
      bankAccounts.filter(
        (account) =>
          normalizeCompanyPaymentType(account.paymentType) === "bank_transfer"
      ),
    [bankAccounts]
  );

  const savedTotal = useMemo(
    () => prepayments.reduce((sum, item) => sum + item.amount, 0),
    [prepayments]
  );

  const remainingExpected = useMemo(() => {
    if (expectedPrepaymentAmount == null) return null;
    return Math.max(0, expectedPrepaymentAmount - savedTotal);
  }, [expectedPrepaymentAmount, savedTotal]);

  useEffect(() => {
    getBookingBankAccountsAction()
      .then(setBankAccounts)
      .catch(() => setBankAccounts([]));
  }, []);

  function handleAddRow() {
    const defaultAmount =
      remainingExpected != null && remainingExpected > 0
        ? remainingExpected
        : expectedPrepaymentAmount;
    setDraftRows((current) => [...current, buildDraftRow(defaultAmount)]);
  }

  function patchDraftRow(id: string, patch: Partial<DraftPrepaymentRow>) {
    setDraftRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeDraftRow(id: string) {
    setDraftRows((current) => current.filter((row) => row.id !== id));
  }

  function startEdit(item: BookingPrepaymentRecord) {
    setEditingId(item.id);
    setEditRow({
      id: item.id,
      paymentChannel: item.paymentChannel,
      bankAccountId: item.bankAccountId ?? "",
      amount: formatMoneyInputValue(item.amount),
    });
    setPrepaymentError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRow(null);
  }

  async function handleSaveRow(row: DraftPrepaymentRow) {
    const amount = parseAmount(row.amount);
    if (amount == null || amount <= 0) {
      setPrepaymentError("Ön ödeme tutarı girilmelidir");
      return;
    }

    if (!row.paymentChannel.trim()) {
      setPrepaymentError("Ödeme kanalı seçilmelidir");
      return;
    }

    const normalized = normalizeCompanyPaymentType(row.paymentChannel);
    if (normalized === "bank_transfer" && !row.bankAccountId.trim()) {
      setPrepaymentError("Banka ödemeleri için ödeme yeri seçilmelidir");
      return;
    }

    setPrepaymentError(null);
    setSavingRowId(row.id);

    const result = await createBookingPrepaymentAction({
      bookingId,
      paymentChannel: row.paymentChannel,
      bankAccountId: row.bankAccountId || null,
      amount,
    });

    setSavingRowId(null);

    if (!result.success) {
      alertBookingClosedDatesError(result.error);
      setPrepaymentError(result.error);
      return;
    }

    onPrepaymentSaved(result.prepayment, result.activityLogs);
    removeDraftRow(row.id);
  }

  async function handleUpdateRow() {
    if (!editRow || !editingId) return;

    const amount = parseAmount(editRow.amount);
    if (amount == null || amount <= 0) {
      setPrepaymentError("Ön ödeme tutarı girilmelidir");
      return;
    }

    if (!editRow.paymentChannel.trim()) {
      setPrepaymentError("Ödeme kanalı seçilmelidir");
      return;
    }

    const normalized = normalizeCompanyPaymentType(editRow.paymentChannel);
    if (normalized === "bank_transfer" && !editRow.bankAccountId.trim()) {
      setPrepaymentError("Banka ödemeleri için ödeme yeri seçilmelidir");
      return;
    }

    setPrepaymentError(null);
    setSavingRowId(editingId);

    const result = await updateBookingPrepaymentAction({
      id: editingId,
      bookingId,
      paymentChannel: editRow.paymentChannel,
      bankAccountId: editRow.bankAccountId || null,
      amount,
    });

    setSavingRowId(null);

    if (!result.success) {
      setPrepaymentError(result.error);
      return;
    }

    onPrepaymentUpdated(result.prepayment, result.activityLogs);
    cancelEdit();
  }

  async function handleDelete(item: BookingPrepaymentRecord) {
    if (
      !window.confirm(
        `${formatMoneyPlain(item.amount)} tutarındaki ön ödeme kaydı silinsin mi?`
      )
    ) {
      return;
    }

    setPrepaymentError(null);
    setDeletingId(item.id);

    const result = await deleteBookingPrepaymentAction({
      id: item.id,
      bookingId,
    });

    setDeletingId(null);

    if (!result.success) {
      setPrepaymentError(result.error);
      return;
    }

    if (editingId === item.id) cancelEdit();
    onPrepaymentDeleted(item.id, result.activityLogs);
  }

  function handleSendConfirmation() {
    if (!hasPrepayments) {
      setConfirmationError(
        "Konfirme göndermek için en az bir ön ödeme kaydı gerekli"
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

  function renderPrepaymentForm(
    row: DraftPrepaymentRow,
    options: {
      onPatch: (patch: Partial<DraftPrepaymentRow>) => void;
      onCancel: () => void;
      onSave: () => void;
      remainingHint: number | null;
      isSaving: boolean;
      saveLabel: string;
    }
  ) {
    const isBank =
      normalizeCompanyPaymentType(row.paymentChannel) === "bank_transfer";

    return (
      <div className="space-y-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-4 py-4">
        <FormRow label="Ödeme Kanalı">
          <select
            value={row.paymentChannel}
            onChange={(event) =>
              options.onPatch({
                paymentChannel: event.target.value,
                bankAccountId: "",
              })
            }
            className={bookingInputClass}
          >
            <option value="">Seçiniz</option>
            {paymentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormRow>

        {isBank ? (
          <FormRow label="Ödeme Yeri">
            <select
              value={row.bankAccountId}
              onChange={(event) =>
                options.onPatch({
                  bankAccountId: event.target.value,
                })
              }
              className={bookingInputClass}
            >
              <option value="">Banka / Kasa hesabı seçin</option>
              {bankTransferAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatBankAccountLabel(account)}
                </option>
              ))}
            </select>
          </FormRow>
        ) : null}

        <FormRow label="Ön Ödeme Tutarı">
          <input
            value={row.amount}
            onChange={(event) => options.onPatch({ amount: event.target.value })}
            className={bookingInputClass}
            placeholder="0"
          />
        </FormRow>

        {options.remainingHint != null && options.remainingHint !== 0 ? (
          <p className="text-sm font-semibold text-amber-700">
            ÖN ÖDEMEDEN KALAN:{" "}
            {formatMoneyPlain(Math.abs(options.remainingHint))}
            {options.remainingHint < 0 ? " (fazla)" : ""}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={options.onCancel}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={options.onSave}
            disabled={options.isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {options.isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {options.saveLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormSection title="Ön Ödeme">
        {prepayments.length > 0 ? (
          <div className="space-y-3">
            {prepayments.map((item) => {
              if (editingId === item.id && editRow) {
                const amount = parseAmount(editRow.amount);
                const othersTotal = prepayments
                  .filter((row) => row.id !== item.id)
                  .reduce((sum, row) => sum + row.amount, 0);
                const remainingHint =
                  expectedPrepaymentAmount != null && amount != null
                    ? expectedPrepaymentAmount - othersTotal - amount
                    : null;

                return (
                  <div key={item.id}>
                    {renderPrepaymentForm(editRow, {
                      onPatch: (patch) =>
                        setEditRow((current) =>
                          current ? { ...current, ...patch } : current
                        ),
                      onCancel: cancelEdit,
                      onSave: () => {
                        void handleUpdateRow();
                      },
                      remainingHint,
                      isSaving: savingRowId === item.id,
                      saveLabel: "Güncelle",
                    })}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid min-w-0 flex-1 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Ödeme Kanalı
                        </p>
                        <p className="font-medium text-gray-900">
                          {getCompanyPaymentTypeLabel(item.paymentChannel)}
                        </p>
                      </div>
                      {item.bankAccount ? (
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Ödeme Yeri
                          </p>
                          <p className="font-medium text-gray-900">
                            {item.bankAccount.bankName}
                          </p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Ön Ödeme Tutarı
                        </p>
                        <p className="font-medium text-gray-900">
                          {formatMoneyPlain(item.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Kayıt Tarihi
                        </p>
                        <p className="font-medium text-gray-900">
                          {new Date(item.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Düzelt"
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Düzelt
                      </button>
                      <button
                        type="button"
                        title="Sil"
                        onClick={() => {
                          void handleDelete(item);
                        }}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Kayıtlı ön ödeme bulunmuyor.</p>
        )}

        {draftRows.map((row) => {
          const amount = parseAmount(row.amount);
          const rowRemaining =
            expectedPrepaymentAmount != null && amount != null
              ? expectedPrepaymentAmount - savedTotal - amount
              : null;

          return (
            <div key={row.id}>
              {renderPrepaymentForm(row, {
                onPatch: (patch) => patchDraftRow(row.id, patch),
                onCancel: () => removeDraftRow(row.id),
                onSave: () => {
                  void handleSaveRow(row);
                },
                remainingHint: rowRemaining,
                isSaving: savingRowId === row.id,
                saveLabel: "Kaydet",
              })}
            </div>
          );
        })}

        {prepaymentError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {prepaymentError}
          </p>
        ) : null}

        <div className="flex justify-start pt-1">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100"
          >
            <Plus className="h-4 w-4" />
            Ön Ödeme Ekle
          </button>
        </div>
      </FormSection>

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
              Konfirme göndermek için en az bir ön ödeme kaydı ekleyin.
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
