"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { VillaPeriodCurrency, VillaPoolPeriod } from "@prisma/client";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createVillaPoolPeriod,
  deleteVillaPoolPeriod,
  updateVillaPoolPeriod,
} from "@/app/actions/admin/villa-pool-periods";

export type PoolPeriodItem = Pick<
  VillaPoolPeriod,
  | "id"
  | "name"
  | "startDate"
  | "endDate"
  | "heatingFee"
  | "heatingFeeCurrency"
  | "poolOpen"
>;

type VillaPoolPeriodsModalProps = {
  open: boolean;
  villaId: string;
  poolId: string;
  poolLabel: string;
  periods: PoolPeriodItem[];
  onClose: () => void;
};

type PeriodEditorState = {
  mode: "create" | "edit";
  periodId?: string;
  name: string;
  startDate: string;
  endDate: string;
  heatingFee: string;
  heatingFeeCurrency: VillaPeriodCurrency;
  poolOpen: boolean;
};

const CURRENCY_OPTIONS: VillaPeriodCurrency[] = ["TL", "EUR", "USD", "GBP"];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

const labelClass = "text-xs font-medium text-gray-500";

function toDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: Date | string) {
  const key = toDateInputValue(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-");
  return `${day}.${month}.${year}`;
}

function emptyEditor(): PeriodEditorState {
  const year = new Date().getFullYear();
  return {
    mode: "create",
    name: "",
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    heatingFee: "",
    heatingFeeCurrency: "TL",
    poolOpen: true,
  };
}

function editorFromPeriod(period: PoolPeriodItem): PeriodEditorState {
  return {
    mode: "edit",
    periodId: period.id,
    name: period.name || "",
    startDate: toDateInputValue(period.startDate),
    endDate: toDateInputValue(period.endDate),
    heatingFee: period.heatingFee == null ? "" : String(period.heatingFee),
    heatingFeeCurrency: period.heatingFeeCurrency,
    poolOpen: period.poolOpen,
  };
}

function formatHeatingFee(period: PoolPeriodItem) {
  if (period.heatingFee == null) return "—";
  const amount = period.heatingFee.toLocaleString("tr-TR");
  return `${amount} ${period.heatingFeeCurrency}`;
}

export default function VillaPoolPeriodsModal({
  open,
  villaId,
  poolId,
  poolLabel,
  periods,
  onClose,
}: VillaPoolPeriodsModalProps) {
  const [editor, setEditor] = useState<PeriodEditorState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedPeriods = useMemo(
    () =>
      [...periods].sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      ),
    [periods]
  );

  useEffect(() => {
    if (!open) {
      setEditor(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function openCreate() {
    setError(null);
    setEditor(emptyEditor());
  }

  function openEdit(period: PoolPeriodItem) {
    setError(null);
    setEditor(editorFromPeriod(period));
  }

  function closeEditor() {
    setEditor(null);
    setError(null);
  }

  function updateEditor<K extends keyof PeriodEditorState>(
    key: K,
    value: PeriodEditorState[K]
  ) {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  }

  function handleSave() {
    if (!editor) return;

    setError(null);
    const formData = new FormData();
    formData.set("villaId", villaId);
    formData.set("poolId", poolId);
    formData.set("name", editor.name);
    formData.set("startDate", editor.startDate);
    formData.set("endDate", editor.endDate);
    formData.set("heatingFee", editor.heatingFee);
    formData.set("heatingFeeCurrency", editor.heatingFeeCurrency);
    formData.set("poolOpen", editor.poolOpen ? "true" : "false");

    if (editor.mode === "edit" && editor.periodId) {
      formData.set("periodId", editor.periodId);
    }

    const mode = editor.mode;

    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateVillaPoolPeriod(formData)
          : await createVillaPoolPeriod(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      closeEditor();
    });
  }

  function handleDelete(periodId: string) {
    if (!window.confirm("Bu havuz periyodunu silmek istiyor musunuz?")) return;
    if (editor?.periodId === periodId) closeEditor();

    startTransition(async () => {
      const result = await deleteVillaPoolPeriod(periodId, poolId, villaId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pool-periods-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-1.5 py-1 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
            >
              ←
            </button>
            <h2
              id="pool-periods-title"
              className="truncate text-base font-semibold text-gray-900"
            >
              {poolLabel} - Fiyat Periyotları
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Yeni Periyot Ekle
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {error && !editor ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {editor ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-gray-800">
                {editor.mode === "edit" ? "Periyot Düzenle" : "Yeni Periyot"}
              </p>

              {error ? (
                <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <div className="space-y-4">
                <label className="block">
                  <span className={labelClass}>Periyot Adı</span>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(event) => updateEditor("name", event.target.value)}
                    className={`mt-1.5 ${inputClass}`}
                    placeholder="Örn. Yaz Sezonu"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Başlangıç Tarihi</span>
                    <input
                      type="date"
                      value={editor.startDate}
                      onChange={(event) =>
                        updateEditor("startDate", event.target.value)
                      }
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Bitiş Tarihi</span>
                    <input
                      type="date"
                      value={editor.endDate}
                      onChange={(event) =>
                        updateEditor("endDate", event.target.value)
                      }
                      className={`mt-1.5 ${inputClass}`}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>Isıtma Bedeli</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editor.heatingFee}
                      onChange={(event) =>
                        updateEditor("heatingFee", event.target.value)
                      }
                      className={`mt-1.5 ${inputClass}`}
                      placeholder="0"
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Para Birimi</span>
                    <select
                      value={editor.heatingFeeCurrency}
                      onChange={(event) =>
                        updateEditor(
                          "heatingFeeCurrency",
                          event.target.value as VillaPeriodCurrency
                        )
                      }
                      className={`mt-1.5 cursor-pointer ${inputClass}`}
                    >
                      {CURRENCY_OPTIONS.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">
                    Havuz Açık
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editor.poolOpen}
                    onClick={() => updateEditor("poolOpen", !editor.poolOpen)}
                    className={`relative h-7 w-12 cursor-pointer rounded-full transition ${
                      editor.poolOpen ? "bg-violet-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                        editor.poolOpen ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="cursor-pointer rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="cursor-pointer rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPending
                      ? editor.mode === "edit"
                        ? "Güncelleniyor..."
                        : "Ekleniyor..."
                      : editor.mode === "edit"
                        ? "Güncelle"
                        : "Ekle"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Periyot Adı</th>
                  <th className="px-4 py-3">Başlangıç</th>
                  <th className="px-4 py-3">Bitiş</th>
                  <th className="px-4 py-3">Isıtma Bedeli</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedPeriods.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      Henüz periyot eklenmemiş.
                    </td>
                  </tr>
                ) : (
                  sortedPeriods.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {period.name?.trim() ? period.name : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDisplayDate(period.startDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDisplayDate(period.endDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatHeatingFee(period)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            period.poolOpen
                              ? "bg-teal-50 text-teal-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {period.poolOpen ? "Açık" : "Kapalı"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(period)}
                            disabled={isPending}
                            aria-label="Periyodu düzenle"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(period.id)}
                            disabled={isPending}
                            aria-label="Periyodu sil"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
