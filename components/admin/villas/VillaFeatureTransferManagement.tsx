"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { applyDefaultVillaFeaturesAction } from "@/app/actions/admin/villa-feature-transfer";
import {
  applyVillaFeatureTransferColumnFilters,
  countActiveVillaFeatureTransferFilters,
  emptyVillaFeatureTransferColumnFilters,
  type RoomInfoFilter,
  type StatusFilter,
  type VillaFeatureTransferColumnFilters,
} from "@/lib/villa-feature-transfer-filters";
import type { VillaFeatureTransferRow } from "@/lib/queries/villa-feature-transfer";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { formatVillaRoomInfoStatus } from "@/lib/villa-room-info-status";

type Notice = { type: "success" | "error"; message: string };

const filterInputClass =
  "w-full min-w-[84px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-gray-700 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100";

function ColumnFilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={filterInputClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RoomInfoStatus({ row }: { row: VillaFeatureTransferRow }) {
  const text = formatVillaRoomInfoStatus(row.bedrooms, row.rooms);
  if (text === "—") {
    return <span className="text-xs text-slate-400">—</span>;
  }
  if (text === "Tamam") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
        Tamam
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {text.split(" · ").map((label) => (
        <span
          key={label}
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
            label === "Foto Eksik"
              ? "bg-amber-50 text-amber-800 ring-amber-100"
              : "bg-red-50 text-red-700 ring-red-100"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default function VillaFeatureTransferManagement({
  rows,
}: {
  rows: VillaFeatureTransferRow[];
}) {
  const router = useRouter();
  const [columnFilters, setColumnFilters] =
    useState<VillaFeatureTransferColumnFilters>(
      emptyVillaFeatureTransferColumnFilters
    );
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingVillaId, setPendingVillaId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredRows = useMemo(
    () => applyVillaFeatureTransferColumnFilters(rows, columnFilters),
    [columnFilters, rows]
  );

  const activeFilterCount = useMemo(
    () => countActiveVillaFeatureTransferFilters(columnFilters),
    [columnFilters]
  );

  function updateColumnFilter<K extends keyof VillaFeatureTransferColumnFilters>(
    key: K,
    value: VillaFeatureTransferColumnFilters[K]
  ) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyDefaults(row: VillaFeatureTransferRow) {
    const confirmed = window.confirm(
      `${row.name} için mevcut özellikler varsayılanlarla değiştirilecek. Devam edilsin mi?`
    );
    if (!confirmed) return;

    setNotice(null);
    setPendingVillaId(row.id);
    startTransition(async () => {
      const result = await applyDefaultVillaFeaturesAction(row.id);
      setPendingVillaId(null);
      if (result.error) {
        setNotice({ type: "error", message: result.error });
        return;
      }
      setNotice({
        type: "success",
        message: result.message ?? "Varsayılan özellikler uygulandı.",
      });
      router.refresh();
    });
  }

  function renderColumnFilterRow() {
    return (
      <tr className="border-t border-gray-200 bg-white">
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
          <input
            type="text"
            value={columnFilters.originalNameSearch}
            onChange={(event) =>
              updateColumnFilter("originalNameSearch", event.target.value)
            }
            placeholder="Orijinal ad ara"
            className={filterInputClass}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect<StatusFilter>
            value={columnFilters.status}
            onChange={(value) => updateColumnFilter("status", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "active", label: "Aktif" },
              { value: "passive", label: "Pasif" },
            ]}
          />
        </th>
        <th className="px-3 py-2">
          <input
            type="text"
            value={columnFilters.featureSearch}
            onChange={(event) =>
              updateColumnFilter("featureSearch", event.target.value)
            }
            placeholder="Örn. 12 özellik"
            className={filterInputClass}
          />
        </th>
        <th className="px-3 py-2">
          <ColumnFilterSelect<RoomInfoFilter>
            value={columnFilters.roomInfo}
            onChange={(value) => updateColumnFilter("roomInfo", value)}
            options={[
              { value: "all", label: "Tümü" },
              { value: "complete", label: "Tamam" },
              { value: "missing_features", label: "Oda Bilgileri Eksik" },
              { value: "missing_photo", label: "Foto Eksik" },
            ]}
          />
        </th>
        <th className="px-3 py-2" />
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Özellikleri Aktar</h1>
        <p className="mt-2 text-sm text-slate-500">
          Villaların özellik ve oda bilgisi durumunu görüntüleyin; tek tıkla
          varsayılan özellikleri uygulayın.
        </p>
      </header>

      {notice ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Villa Listesi</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700">
                {activeFilterCount} filtre aktif
              </span>
            ) : null}
            <span>
              {filteredRows.length} / {rows.length} villa
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Villa</th>
                <th className="px-4 py-3">Orijinal ad</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Mevcut özellik</th>
                <th className="px-4 py-3">Oda bilgileri</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
              {renderColumnFilterRow()}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => {
                  const isRowPending = isPending && pendingVillaId === row.id;
                  const editPath = villaAdminEditPath(row);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {row.villaId != null ? (
                            <span className="mr-2 text-slate-500">
                              #{row.villaId}
                            </span>
                          ) : null}
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {row.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.originalName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.active
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          }`}
                        >
                          {row.active ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.amenities.length} özellik
                      </td>
                      <td className="px-4 py-3">
                        <RoomInfoStatus row={row} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isRowPending}
                            onClick={() => handleApplyDefaults(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isRowPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Default Özellik
                          </button>
                          <a
                            href={editPath}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Villa Git
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    Filtrelere uygun villa bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
