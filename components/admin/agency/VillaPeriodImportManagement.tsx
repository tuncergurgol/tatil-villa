"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, UploadCloud } from "lucide-react";
import {
  retryFailedVillaPeriodImportsAction,
  retryVillaPeriodImportByVillaIdAction,
  runVillaPeriodImportBatchAction,
} from "@/app/actions/admin/villa-period-import";
import type { VillaPeriodImportRow } from "@/lib/queries/villa-period-import";

type FilterType = "all" | "imported" | "not_imported";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseRangeInput(
  fromValue: string,
  toValue: string
): { from: number; to: number } | { error: string } {
  const from = Number.parseInt(fromValue, 10);
  const to = Number.parseInt(toValue, 10);

  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1) {
    return { error: "VillaID değerleri 1 veya daha büyük olmalıdır" };
  }
  if (from > to) {
    return { error: "İlk VillaID, son VillaID'den büyük olamaz" };
  }

  return { from, to };
}

export default function VillaPeriodImportManagement({
  rows,
  initialFrom,
  initialTo,
}: {
  rows: VillaPeriodImportRow[];
  initialFrom: number;
  initialTo: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [fromVillaId, setFromVillaId] = useState(String(initialFrom));
  const [toVillaId, setToVillaId] = useState(String(initialTo));
  const [notice, setNotice] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const importedCount = rows.filter((row) => row.status === "IMPORTED").length;
  const notImportedCount = rows.length - importedCount;

  const filteredRows = useMemo(() => {
    if (filter === "imported") return rows.filter((row) => row.status === "IMPORTED");
    if (filter === "not_imported") {
      return rows.filter((row) => row.status === "NOT_IMPORTED");
    }
    return rows;
  }, [filter, rows]);

  function updateRangeInUrl(from: number, to: number) {
    router.push(`/admin/acente/takvim-import?from=${from}&to=${to}`);
  }

  function handleListRange() {
    setNotice(null);
    const range = parseRangeInput(fromVillaId, toVillaId);
    if ("error" in range) {
      setNotice({ type: "error", message: range.error });
      return;
    }
    updateRangeInUrl(range.from, range.to);
  }

  function handleBatchImport() {
    setNotice(null);
    const range = parseRangeInput(fromVillaId, toVillaId);
    if ("error" in range) {
      setNotice({ type: "error", message: range.error });
      return;
    }

    startTransition(async () => {
      const result = await runVillaPeriodImportBatchAction(range.from, range.to);
      updateRangeInUrl(range.from, range.to);
      router.refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message,
      });
    });
  }

  function handleRetryFailed() {
    setNotice(null);
    const range = parseRangeInput(fromVillaId, toVillaId);
    if ("error" in range) {
      setNotice({ type: "error", message: range.error });
      return;
    }

    startTransition(async () => {
      const result = await retryFailedVillaPeriodImportsAction(range.from, range.to);
      router.refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message,
      });
    });
  }

  function handleRetrySingle(villaId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await retryVillaPeriodImportByVillaIdAction(villaId);
      router.refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message,
      });
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Takvim/Fiyat Aktarım Yönetimi</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">
          Tatildeyiz kaynağından villa takvim ve fiyat importunu VillaID aralığı seçerek
          başlatabilir, aktarılan/aktarılmayan kayıtları izleyebilirsiniz.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[140px] flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              VillaID İlk Değer
            </span>
            <input
              type="number"
              min={1}
              value={fromVillaId}
              onChange={(event) => setFromVillaId(event.target.value)}
              className={inputClass}
              placeholder="Örn. 1"
            />
          </label>
          <label className="min-w-[140px] flex-1">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              VillaID Son Değer
            </span>
            <input
              type="number"
              min={1}
              value={toVillaId}
              onChange={(event) => setToVillaId(event.target.value)}
              className={inputClass}
              placeholder="Örn. 100"
            />
          </label>
          <button
            type="button"
            onClick={handleListRange}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            Listele
          </button>
          <button
            type="button"
            onClick={handleBatchImport}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            Aktar
          </button>
          <button
            type="button"
            onClick={handleRetryFailed}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Aktarılmayanları Yeniden Dene
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Şu an VillaID {initialFrom} - {initialTo} aralığı listeleniyor.
        </p>
      </div>

      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Aktarılan</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{importedCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Aktarılmayanlar</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">{notImportedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-gray-200 p-1">
          {(
            [
              ["all", "Tümü"],
              ["imported", "Aktarılan"],
              ["not_imported", "Aktarılmayanlar"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === value ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">{filteredRows.length} kayıt listeleniyor</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Villa</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Detay</th>
              <th className="px-4 py-3">Son Deneme</th>
              <th className="w-44 px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      #{row.villaId} - {row.villaName}
                    </p>
                    <p className="text-xs text-gray-500">{row.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "IMPORTED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aktarıldı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Aktarılamadı
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {row.status === "IMPORTED" ? (
                      <span>
                        {row.periodCount} periyot, {row.dayCount} gün
                      </span>
                    ) : (
                      row.lastMessage || "Henüz aktarım yapılmadı"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>Deneme: {formatDate(row.attemptedAt)}</p>
                    <p>Başarılı: {formatDate(row.succeededAt)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status === "NOT_IMPORTED" ? (
                      <button
                        type="button"
                        onClick={() => handleRetrySingle(row.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        YENİDEN DENE
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  Bu filtre için kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
