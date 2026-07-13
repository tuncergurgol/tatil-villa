"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createBookingOwnerPaymentAction,
  deleteBookingOwnerPaymentAction,
  updateBookingOwnerPaymentAction,
} from "@/app/actions/admin/booking-owner-payments";
import type { BookingActivityLogEntry } from "@/lib/booking-activity-log";
import type { BookingOwnerPaymentRecord } from "@/lib/booking-form-details";
import { formatMoneyPlain } from "@/lib/booking-display";
import {
  bookingInputClass,
  bookingLabelClass,
} from "@/components/admin/bookings/booking-form-ui";

type DraftRow = {
  id: string;
  paidAt: string;
  amount: string;
  editingId: string | null;
};

type BookingOwnerPaymentsSectionProps = {
  bookingId: string;
  payments: BookingOwnerPaymentRecord[];
  ownerPayableAmount: number;
  onChange: (
    payments: BookingOwnerPaymentRecord[],
    activityLogs: BookingActivityLogEntry[]
  ) => void;
};

function formatDateTr(ymd: string): string {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return ymd;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export default function BookingOwnerPaymentsSection({
  bookingId,
  payments,
  ownerPayableAmount,
  onChange,
}: BookingOwnerPaymentsSectionProps) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const paidTotal = payments.reduce((sum, row) => sum + row.amount, 0);
  const remainingPayable = Math.max(0, ownerPayableAmount - paidTotal);

  function addDraft(editing: BookingOwnerPaymentRecord | null = null) {
    setError(null);
    setDrafts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        paidAt: editing?.paidAt ?? "",
        amount: editing ? String(editing.amount) : "",
        editingId: editing?.id ?? null,
      },
    ]);
  }

  function patchDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((row) => row.id !== id));
  }

  function handleSave(row: DraftRow) {
    const amount = parseAmount(row.amount);
    if (!row.paidAt) {
      setError("Ödeme yapılan tarih zorunludur");
      return;
    }
    if (amount == null) {
      setError("Ödenen tutar zorunludur");
      return;
    }

    const otherTotal = payments
      .filter((item) => item.id !== row.editingId)
      .reduce((sum, item) => sum + item.amount, 0);
    if (otherTotal + amount > ownerPayableAmount) {
      setError(
        `Villa sahibine ödenecek tutardan (${formatMoneyPlain(ownerPayableAmount)}) fazla ödeme yapılamaz. Kalan: ${formatMoneyPlain(Math.max(0, ownerPayableAmount - otherTotal))}.`
      );
      return;
    }

    setError(null);
    setSavingId(row.id);
    startTransition(async () => {
      const result = row.editingId
        ? await updateBookingOwnerPaymentAction({
            bookingId,
            paymentId: row.editingId,
            paidAt: row.paidAt,
            amount,
          })
        : await createBookingOwnerPaymentAction({
            bookingId,
            paidAt: row.paidAt,
            amount,
          });

      setSavingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onChange(result.ownerPayments, result.activityLogs);
      removeDraft(row.id);
    });
  }

  function handleDelete(item: BookingOwnerPaymentRecord) {
    if (!window.confirm("Bu ödeme kaydı silinsin mi?")) return;
    setError(null);
    setDeletingId(item.id);
    startTransition(async () => {
      const result = await deleteBookingOwnerPaymentAction({
        bookingId,
        paymentId: item.id,
      });
      setDeletingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onChange(result.ownerPayments, result.activityLogs);
      setDrafts((current) =>
        current.filter((row) => row.editingId !== item.id)
      );
    });
  }

  return (
    <fieldset className="rounded-xl border border-gray-200 px-4 pb-4 pt-2">
      <legend className="px-1 text-sm font-bold text-gray-800">
        Villa Sahibine Yapılan Ödemeler
      </legend>
      <p className="mb-2 text-xs text-gray-500">
        Ödenebilir üst sınır: {formatMoneyPlain(ownerPayableAmount)} · Kalan:{" "}
        {formatMoneyPlain(remainingPayable)}
      </p>

      <div className="mt-2 space-y-3">
        {payments.length > 0 ? (
          payments.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Ödeme Yapılan Tarih
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatDateTr(item.paidAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Ödenen Para
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
                    onClick={() => addDraft(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Düzelt
                  </button>
                  <button
                    type="button"
                    title="Sil"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id || isPending}
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
          ))
        ) : (
          <p className="text-sm text-gray-500">
            Kayıtlı villa sahibi ödemesi bulunmuyor.
          </p>
        )}

        {drafts.map((row) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={bookingLabelClass}>
                  Villa Sahibine Ödeme Yapılan Tarih
                </label>
                <input
                  type="date"
                  value={row.paidAt}
                  onChange={(event) =>
                    patchDraft(row.id, { paidAt: event.target.value })
                  }
                  className={bookingInputClass}
                />
              </div>
              <div>
                <label className={bookingLabelClass}>
                  Villa Sahibine Ödenen Para
                </label>
                <div className="relative">
                  <input
                    value={row.amount}
                    onChange={(event) =>
                      patchDraft(row.id, { amount: event.target.value })
                    }
                    className={`${bookingInputClass} pr-10`}
                    placeholder="10.500"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                    TL
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => removeDraft(row.id)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-white"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleSave(row)}
                disabled={savingId === row.id || isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {savingId === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Kaydet
              </button>
            </div>
          </div>
        ))}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={() => addDraft(null)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
        >
          <Plus className="h-4 w-4" />
          Ödeme Ekle
        </button>
      </div>
    </fieldset>
  );
}
