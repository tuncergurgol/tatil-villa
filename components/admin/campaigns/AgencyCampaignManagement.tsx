"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import {
  deleteCampaign,
  toggleCampaignActive,
} from "@/app/actions/admin/campaigns";
import { CAMPAIGN_DISPLAY_TYPE_LABELS } from "@/lib/callback-request-labels";
import type { CampaignAdminItem } from "@/lib/queries/campaigns";
import { includesSearchText } from "@/lib/search-text";

type TypeFilter = "all" | "SLIDER" | "BOX";
type StatusFilter = "all" | "active" | "passive";

interface Props {
  items: CampaignAdminItem[];
  totalCount: number;
  activeCount: number;
  sliderCount: number;
  boxCount: number;
}

export default function AgencyCampaignManagement({
  items,
  totalCount,
  activeCount,
  sliderCount,
  boxCount,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        includesSearchText(item.title, search) ||
        includesSearchText(item.subtitle, search) ||
        includesSearchText(item.href, search);
      const matchesType =
        typeFilter === "all" || item.displayType === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.active) ||
        (statusFilter === "passive" && !item.active);
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

  function handleToggle(item: CampaignAdminItem) {
    setError(null);
    setBusyId(item.id);
    startTransition(async () => {
      const result = await toggleCampaignActive(item.id);
      setBusyId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(item: CampaignAdminItem) {
    if (!window.confirm(`"${item.title}" kampanyası silinsin mi?`)) return;
    setError(null);
    setBusyId(item.id);
    startTransition(async () => {
      await deleteCampaign(item.id);
      setBusyId(null);
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="shrink-0 space-y-4 border-b border-gray-100 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-[180px] items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Kampanyalar</h1>
                <p className="text-xs text-gray-500">
                  Toplam {totalCount} · Aktif {activeCount} · Slider{" "}
                  {sliderCount} · Kutu {boxCount}
                </p>
              </div>
            </div>

            <Link
              href="/admin/acente/kampanyalar/yeni"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Yeni Kampanya
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Başlık, alt başlık veya link ara…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">Tüm tipler</option>
              <option value="SLIDER">Slider</option>
              <option value="BOX">Kutu</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">Tüm durumlar</option>
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-16 px-4 py-3">Sıra</th>
                <th className="w-20 px-4 py-3">Görsel</th>
                <th className="min-w-[220px] px-4 py-3">Başlık</th>
                <th className="w-28 px-4 py-3">Tip</th>
                <th className="min-w-[160px] px-4 py-3">Link</th>
                <th className="w-24 px-4 py-3">Durum</th>
                <th className="w-48 px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-500">
                      {item.sortOrder}
                    </td>
                    <td className="px-4 py-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt=""
                        className="h-12 w-16 rounded-lg object-cover"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.title}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {item.subtitle}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {CAMPAIGN_DISPLAY_TYPE_LABELS[item.displayType]}
                    </td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-1 text-gray-600">
                        {item.href}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/acente/kampanyalar/${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Düzenle
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          disabled={isPending && busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {item.active ? "Pasif" : "Aktif"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={isPending && busyId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Kampanya bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
