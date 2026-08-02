"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Filter,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  regenerateSelectedVillaContentAiAction,
  regenerateVillaContentAiAction,
} from "@/app/actions/admin/villa-content-ai-bulk";
import type { VillaContentAiBulkRow } from "@/lib/queries/villa-content-ai-bulk";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import {
  applyVillaContentAiColumnFilters,
  countActiveVillaContentAiFilters,
  emptyVillaContentAiColumnFilters,
  filtersForEmptyContentFields,
  type TriStateFilter,
  type VillaContentAiColumnFilters,
} from "@/lib/villa-content-ai-bulk-filters";

type Props = {
  rows: VillaContentAiBulkRow[];
};

const filterInputClass =
  "w-full min-w-[84px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-gray-700 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-100";

function ColumnFilterSelect({
  value,
  onChange,
}: {
  value: TriStateFilter;
  onChange: (value: TriStateFilter) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TriStateFilter)}
      className={filterInputClass}
    >
      <option value="all">Tümü</option>
      <option value="yes">Dolu</option>
      <option value="no">Boş</option>
    </select>
  );
}

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function FieldStatus({ filled }: { filled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        filled
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {filled ? "Dolu" : "Boş"}
    </span>
  );
}

export default function VillaContentAiBulkManagement({ rows }: Props) {
  const router = useRouter();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const [columnFilters, setColumnFilters] =
    useState<VillaContentAiColumnFilters>(emptyVillaContentAiColumnFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyVillaId, setBusyVillaId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "ok" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(
    () => applyVillaContentAiColumnFilters(rows, columnFilters),
    [columnFilters, rows]
  );

  const activeColumnFilterCount =
    countActiveVillaContentAiFilters(columnFilters);

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedIds.has(row.id));

  function updateColumnFilter<K extends keyof VillaContentAiColumnFilters>(
    key: K,
    value: VillaContentAiColumnFilters[K]
  ) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const row of filteredRows) next.delete(row.id);
      } else {
        for (const row of filteredRows) next.add(row.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    router.refresh();
  }

  function handleRegenerateOne(villaId: string) {
    setNotice(null);
    setBusyVillaId(villaId);
    startTransition(async () => {
      const result = await regenerateVillaContentAiAction(villaId, "all");
      setBusyVillaId(null);
      refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message || result.error || "İşlem tamamlandı",
      });
    });
  }

  function handleRegenerateSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setNotice({ type: "error", message: "Önce villa seçin" });
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await regenerateSelectedVillaContentAiAction(ids, "all");
      refresh();
      setNotice({
        type: result.success ? "ok" : "error",
        message: result.message || result.error || "İşlem tamamlandı",
      });
    });
  }

  function syncHorizontalScroll(source: "header" | "body") {
    const header = headerScrollRef.current;
    const body = bodyScrollRef.current;
    if (!header || !body) return;
    if (source === "header") body.scrollLeft = header.scrollLeft;
    else header.scrollLeft = body.scrollLeft;
  }

  return (
    <div className="space-y-0">
      <div className="sticky top-0 z-30 -mx-6 space-y-5 bg-[#eef0f3] px-6 pb-3 pt-0 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Genel Ayarlar</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Villa açıklamalarını ve SEO alanlarını toplu veya tek tek yapay
              zeka ile yeniden oluşturun. Öne çıkan özellikler, mesafeler ve
              kapasite bilgileri otomatik kullanılır.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending || selectedIds.size === 0}
              onClick={handleRegenerateSelected}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {isPending && !busyVillaId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Seçilenleri Yeniden Oluştur ({selectedIds.size})
            </button>
          </div>
        </div>

        {notice ? (
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
              notice.type === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-violet-600"
            />
            Tümünü Seç
          </label>
          <button
            type="button"
            onClick={() => setColumnFilters(filtersForEmptyContentFields())}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            <Filter className="h-4 w-4" />
            Boş Alanları Listele
          </button>
          {activeColumnFilterCount > 0 ? (
            <button
              type="button"
              onClick={() =>
                setColumnFilters(emptyVillaContentAiColumnFilters)
              }
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Filtreleri Temizle ({activeColumnFilterCount})
            </button>
          ) : null}
          <span className="text-sm text-gray-500">
            {filteredRows.length} / {rows.length} villa
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          ref={headerScrollRef}
          onScroll={() => syncHorizontalScroll("header")}
          className="overflow-x-auto border-b border-gray-200"
        >
          <table className="min-w-[1400px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Villa ID</th>
                <th className="min-w-[180px] px-3 py-3">Villa Adı</th>
                <th className="min-w-[220px] px-3 py-3">Açıklama</th>
                <th className="min-w-[160px] px-3 py-3">Meta Başlık</th>
                <th className="min-w-[160px] px-3 py-3">Anahtar Kelimeler</th>
                <th className="min-w-[200px] px-3 py-3">Meta Açıklama</th>
                <th className="min-w-[180px] px-3 py-3">Site Adları</th>
                <th className="min-w-[220px] px-3 py-3 text-right">
                  Güncelle / Rapor
                </th>
              </tr>
              <tr className="border-t border-gray-200 bg-white">
                <th className="px-3 py-2" />
                <th className="px-3 py-2" />
                <th className="px-3 py-2">
                  <input
                    type="text"
                    value={columnFilters.villaSearch}
                    onChange={(event) =>
                      updateColumnFilter("villaSearch", event.target.value)
                    }
                    placeholder="ID / ad ara"
                    className={filterInputClass}
                  />
                </th>
                <th className="px-3 py-2">
                  <ColumnFilterSelect
                    value={columnFilters.description}
                    onChange={(value) =>
                      updateColumnFilter("description", value)
                    }
                  />
                </th>
                <th className="px-3 py-2">
                  <ColumnFilterSelect
                    value={columnFilters.seoTitle}
                    onChange={(value) => updateColumnFilter("seoTitle", value)}
                  />
                </th>
                <th className="px-3 py-2">
                  <ColumnFilterSelect
                    value={columnFilters.seoKeywords}
                    onChange={(value) =>
                      updateColumnFilter("seoKeywords", value)
                    }
                  />
                </th>
                <th className="px-3 py-2">
                  <ColumnFilterSelect
                    value={columnFilters.seoDescription}
                    onChange={(value) =>
                      updateColumnFilter("seoDescription", value)
                    }
                  />
                </th>
                <th className="px-3 py-2" />
                <th className="px-3 py-2">
                  <ColumnFilterSelect
                    value={columnFilters.report}
                    onChange={(value) => updateColumnFilter("report", value)}
                  />
                </th>
              </tr>
            </thead>
          </table>
        </div>

        <div
          ref={bodyScrollRef}
          onScroll={() => syncHorizontalScroll("body")}
          className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto"
        >
          <table className="min-w-[1400px] w-full text-left text-sm">
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Filtrelere uygun villa bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isBusy = busyVillaId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 align-top hover:bg-gray-50/70"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-gray-300 text-violet-600"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600">
                        {row.villaId ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={villaAdminEditPath(row)}
                          className="font-semibold text-gray-900 hover:text-violet-700"
                        >
                          {row.name}
                        </Link>
                        {!row.active ? (
                          <span className="mt-1 block text-[11px] text-amber-700">
                            Pasif
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="mb-1">
                          <FieldStatus filled={row.hasDescription} />
                        </div>
                        <p className="line-clamp-3 text-xs text-gray-600">
                          {row.descriptionPreview}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="mb-1">
                          <FieldStatus filled={row.hasSeoTitle} />
                        </div>
                        <p className="line-clamp-3 text-xs text-gray-600">
                          {row.seoTitle || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="mb-1">
                          <FieldStatus filled={row.hasSeoKeywords} />
                        </div>
                        <p className="line-clamp-3 text-xs text-gray-600">
                          {row.seoKeywords || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="mb-1">
                          <FieldStatus filled={row.hasSeoDescription} />
                        </div>
                        <p className="line-clamp-3 text-xs text-gray-600">
                          {row.seoDescription || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.siteLabels.length > 0 ? (
                            row.siteLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                              >
                                {label}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRegenerateOne(row.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          Güncelle
                        </button>
                        <div className="mt-2 space-y-1 text-left text-[11px] text-gray-500">
                          <p>
                            <span className="font-semibold text-gray-600">
                              Açıklama:
                            </span>{" "}
                            {formatDateTime(row.descriptionAiUpdatedAt)}
                          </p>
                          {row.descriptionAiReport ? (
                            <p className="text-gray-400">
                              {row.descriptionAiReport}
                            </p>
                          ) : null}
                          <p>
                            <span className="font-semibold text-gray-600">
                              SEO:
                            </span>{" "}
                            {formatDateTime(row.seoAiUpdatedAt)}
                          </p>
                          {row.seoAiReport ? (
                            <p className="text-gray-400">{row.seoAiReport}</p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
