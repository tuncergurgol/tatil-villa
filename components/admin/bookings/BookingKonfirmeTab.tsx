"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Send } from "lucide-react";
import {
  createBookingPrepaymentAction,
  getBookingBankAccountsAction,
} from "@/app/actions/admin/booking-prepayments";
import { sendBookingConfirmationAction } from "@/app/actions/admin/booking-confirmation-send";
import { getPrepaymentShareChannelLabel } from "@/lib/booking-prepayment-share";
import type { BookingPrepaymentRecord } from "@/lib/booking-form-details";
import { formatMoneyPlain } from "@/lib/booking-display";
import {
  getCompanyPaymentTypeLabel,
  getSortedCompanyPaymentTypeOptions,
  normalizeCompanyPaymentType,
} from "@/lib/company-payment-types";
import {
  FormRow,
  FormSection,
  bookingInputClass,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";

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
  expectedPrepaymentAmount: number | null;
  prepayments: BookingPrepaymentRecord[];
  confirmationSentAt: Date | string | null;
  onPrepaymentSaved: (prepayment: BookingPrepaymentRecord) => void;
  onConfirmationSent: () => void;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
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
    amount: defaultAmount != null ? String(defaultAmount) : "",
  };
}

export default function BookingKonfirmeTab({
  bookingId,
  expectedPrepaymentAmount,
  prepayments,
  confirmationSentAt,
  onPrepaymentSaved,
  onConfirmationSent,
}: BookingKonfirmeTabProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [draftRows, setDraftRows] = useState<DraftPrepaymentRow[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [prepaymentError, setPrepaymentError] = useState<string | null>(null);

  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(
    null
  );
  const [isConfirmPending, startConfirmTransition] = useTransition();

  const paymentTypeOptions = getSortedCompanyPaymentTypeOptions();

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
      setPrepaymentError(result.error);
      return;
    }

    onPrepaymentSaved(result.prepayment);
    removeDraftRow(row.id);
  }

  function handleSendConfirmation() {
    setConfirmationError(null);
    setConfirmationSuccess(null);

    const popup = sendWhatsApp ? window.open("about:blank", "_blank") : null;

    startConfirmTransition(async () => {
      const result = await sendBookingConfirmationAction({
        bookingId,
        sendWhatsApp,
        sendEmail,
        sendSms,
      });

      if (!result.success) {
        popup?.close();
        setConfirmationError(result.error);
        return;
      }

      if (result.whatsappUrl) {
        if (popup) {
          popup.location.href = result.whatsappUrl;
        }
      } else if (popup) {
        popup.close();
      }

      const parts = result.channels.map((channel) => {
        if (channel === "whatsapp") {
          return result.whatsappUrl
            ? "WhatsApp penceresi açıldı"
            : "WhatsApp bağlantısı hazırlandı";
        }
        return `${getPrepaymentShareChannelLabel(channel)} üzerinden gönderildi`;
      });

      setConfirmationSuccess(parts.join(". ") + ".");
      onConfirmationSent();
    });
  }

  return (
    <div className="space-y-5">
      <FormSection title="Ön Ödeme">
        {prepayments.length > 0 ? (
          <div className="space-y-3">
            {prepayments.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3"
              >
                <div className="grid gap-2 text-sm sm:grid-cols-3">
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
                </div>
              </div>
            ))}
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
          const isBank =
            normalizeCompanyPaymentType(row.paymentChannel) === "bank_transfer";

          return (
            <div
              key={row.id}
              className="space-y-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-4 py-4"
            >
              <FormRow label="Ödeme Kanalı">
                <select
                  value={row.paymentChannel}
                  onChange={(event) =>
                    patchDraftRow(row.id, {
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
                      patchDraftRow(row.id, {
                        bankAccountId: event.target.value,
                      })
                    }
                    className={bookingInputClass}
                  >
                    <option value="">Banka / Kasa hesabı seçin</option>
                    {bankAccounts.map((account) => (
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
                  onChange={(event) =>
                    patchDraftRow(row.id, { amount: event.target.value })
                  }
                  className={bookingInputClass}
                  placeholder="0"
                />
              </FormRow>

              {rowRemaining != null && rowRemaining !== 0 ? (
                <p className="text-sm font-semibold text-amber-700">
                  ÖN ÖDEMEDEN KALAN: {formatMoneyPlain(Math.abs(rowRemaining))}
                  {rowRemaining < 0 ? " (fazla)" : ""}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => removeDraftRow(row.id)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRow(row)}
                  disabled={savingRowId === row.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingRowId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Kaydet
                </button>
              </div>
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
        {confirmationSentAt ? (
          <p className="text-sm text-emerald-700">
            Konfirme{" "}
            {new Date(confirmationSentAt).toLocaleString("tr-TR")} tarihinde
            gönderildi.
          </p>
        ) : (
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

            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleSendConfirmation}
                disabled={isConfirmPending}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {isConfirmPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Konfirme Gönder
              </button>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
}
