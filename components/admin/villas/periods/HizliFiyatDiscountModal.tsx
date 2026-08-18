"use client";

import { useMemo, useState, useTransition } from "react";
import { Percent, Save, X } from "lucide-react";
import { updateVillaPricePeriodDaysDiscounts } from "@/app/actions/admin/villa-periods";
import {
  calculateDiscountAmounts,
  formatMoneyAmount,
  parseAmountInput,
  sanitizeAmountInput,
} from "@/lib/villa-period-pricing";

type HizliFiyatDiscountModalProps = {
  open: boolean;
  villaId: string;
  previewNightlyPrice: number | null;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100";

const readOnlyClass =
  "mt-1.5 w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-900";

function parseRate(value: string): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(100, Math.round(parsed));
}

export default function HizliFiyatDiscountModal({
  open,
  villaId,
  previewNightlyPrice,
  onClose,
  onSaved,
}: HizliFiyatDiscountModalProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discount1Rate, setDiscount1Rate] = useState("");
  const [discount2Rate, setDiscount2Rate] = useState("");
  const [extraDiscountAmount, setExtraDiscountAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(
    () =>
      calculateDiscountAmounts(
        previewNightlyPrice ?? 0,
        parseRate(discount1Rate),
        parseRate(discount2Rate),
        parseAmountInput(extraDiscountAmount) ?? 0
      ),
    [previewNightlyPrice, discount1Rate, discount2Rate, extraDiscountAmount]
  );

  if (!open) return null;

  function resetAndClose() {
    setError(null);
    setStartDate("");
    setEndDate("");
    setDiscount1Rate("");
    setDiscount2Rate("");
    setExtraDiscountAmount("");
    onClose();
  }

  function handleSave() {
    if (!startDate || !endDate) {
      setError("İndirim başlangıç ve bitiş tarihi gerekli.");
      return;
    }
    if (startDate > endDate) {
      setError("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("startDate", startDate);
    formData.set("endDate", endDate);
    formData.set("discount1Rate", discount1Rate);
    formData.set("discount2Rate", discount2Rate);
    const extra = parseAmountInput(extraDiscountAmount);
    formData.set("extraDiscountAmount", extra != null ? String(extra) : "");

    startTransition(async () => {
      const result = await updateVillaPricePeriodDaysDiscounts(villaId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStartDate("");
      setEndDate("");
      setDiscount1Rate("");
      setDiscount2Rate("");
      setExtraDiscountAmount("");
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onClick={() => {
        if (isPending) return;
        resetAndClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hizli-fiyat-indirim-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Percent className="h-4 w-4" />
            </span>
            <div>
              <h2
                id="hizli-fiyat-indirim-title"
                className="text-lg font-bold text-gray-900"
              >
                İndirim
              </h2>
              <p className="text-xs text-gray-500">
                Seçilen tarihlerdeki günlere yazılır; periyot fiyatı korunur.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                İndirim Başlangıç
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                İndirim Bitiş
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                1. İndirim Oranı (%)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={discount1Rate}
                onChange={(event) => setDiscount1Rate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                1. İndirim Tutarı
              </span>
              <input
                type="text"
                readOnly
                value={formatMoneyAmount(preview.discount1Amount)}
                className={readOnlyClass}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                2. İndirim Oranı (%)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={discount2Rate}
                onChange={(event) => setDiscount2Rate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                2. İndirim Tutarı
              </span>
              <input
                type="text"
                readOnly
                value={formatMoneyAmount(preview.discount2Amount)}
                className={readOnlyClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Extra İndirim Tutarı
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={extraDiscountAmount}
              onChange={(event) =>
                setExtraDiscountAmount(sanitizeAmountInput(event.target.value))
              }
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isPending}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isPending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
