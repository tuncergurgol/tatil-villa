"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { deleteCallbackRequest } from "@/app/actions/admin/callback-requests";
import {
  CALLBACK_DAY_LABELS,
  CALLBACK_STATUS_LABELS,
  CALLBACK_TIME_LABELS,
} from "@/lib/callback-request-labels";
import type { CallbackRequestItem } from "@/lib/queries/callback-requests";
import type { CallbackListFilter } from "@/lib/booking-filter-url";
import { includesSearchText } from "@/lib/search-text";

type StatusFilter =
  | "all"
  | "VERIFIED"
  | "NEW"
  | "CONTACTED"
  | "CLOSED"
  | "CANCELLED";

interface Props {
  items: CallbackRequestItem[];
  counts: {
    total: number;
    verified: number;
    neu: number;
    contacted: number;
    closed: number;
  };
  initialListFilter?: CallbackListFilter;
  listFilterKey?: string;
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSiteLabel(item: CallbackRequestItem): string {
  const site = item.sourceSite?.trim() ?? "";
  const domain = item.sourceDomain?.trim() ?? "";
  if (site) return site;
  return domain || "—";
}

function formatSiteHint(item: CallbackRequestItem): string | null {
  const domain = item.sourceDomain?.trim() ?? "";
  return domain || null;
}

export default function CallbackRequestManagement({
  items,
  counts,
  initialListFilter = "all",
  listFilterKey = "",
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    initialListFilter === "unanswered" ? "VERIFIED" : "all"
  );
  const [onlyUnanswered, setOnlyUnanswered] = useState(
    initialListFilter === "unanswered"
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const unanswered = initialListFilter === "unanswered";
    setOnlyUnanswered(unanswered);
    setStatusFilter(unanswered ? "VERIFIED" : "all");
  }, [listFilterKey, initialListFilter]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery =
        includesSearchText(item.name, search) ||
        includesSearchText(item.phone, search) ||
        includesSearchText(item.note, search) ||
        includesSearchText(item.sourceSite, search) ||
        includesSearchText(item.sourceDomain, search);
      const matchesStatus = onlyUnanswered
        ? item.status === "VERIFIED" || item.status === "NEW"
        : statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, search, statusFilter, onlyUnanswered]);

  function handleDelete(item: CallbackRequestItem) {
    if (!window.confirm(`"${item.name}" talebi silinsin mi?`)) return;
    setError(null);
    setBusyId(item.id);
    startTransition(async () => {
      await deleteCallbackRequest(item.id);
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Sizi Arayalım</h1>
                <p className="text-xs text-gray-500">
                  Toplam {counts.total} · Doğrulandı {counts.verified} · Yeni{" "}
                  {counts.neu} · Arandı {counts.contacted} · Kapalı{" "}
                  {counts.closed}
                </p>
              </div>
            </div>

            <Link
              href="/admin/acente/sizi-arayalim/yeni"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Manuel Kayıt
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, telefon veya not ara…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <select
              value={onlyUnanswered ? "unanswered" : statusFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "unanswered") {
                  setOnlyUnanswered(true);
                  setStatusFilter("all");
                  return;
                }
                setOnlyUnanswered(false);
                setStatusFilter(value as StatusFilter);
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">Tüm durumlar</option>
              <option value="unanswered">Yanıtlanmayan (Yeni + Doğrulandı)</option>
              <option value="VERIFIED">Doğrulandı</option>
              <option value="NEW">Yeni</option>
              <option value="CONTACTED">Arandı</option>
              <option value="CLOSED">Kapatıldı</option>
              <option value="CANCELLED">İptal</option>
            </select>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-40 px-4 py-3">Tarih</th>
                <th className="min-w-[120px] px-4 py-3">Site</th>
                <th className="min-w-[140px] px-4 py-3">Ad</th>
                <th className="w-40 px-4 py-3">Telefon</th>
                <th className="w-32 px-4 py-3">Gün</th>
                <th className="w-36 px-4 py-3">Saat</th>
                <th className="min-w-[180px] px-4 py-3">Plan</th>
                <th className="w-28 px-4 py-3">Durum</th>
                <th className="w-40 px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium text-gray-900">
                        {formatSiteLabel(item)}
                      </div>
                      {formatSiteHint(item) ? (
                        <div className="text-xs text-gray-500">
                          {formatSiteHint(item)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.phone}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {CALLBACK_DAY_LABELS[item.preferredDay]}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {CALLBACK_TIME_LABELS[item.preferredTime]}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="line-clamp-2">
                        {item.note || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.status === "VERIFIED" || item.status === "NEW"
                            ? "bg-amber-100 text-amber-800"
                            : item.status === "CONTACTED"
                              ? "bg-sky-100 text-sky-800"
                              : item.status === "CLOSED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {CALLBACK_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/acente/sizi-arayalim/${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Detay
                        </Link>
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
                    colSpan={9}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Henüz geri arama talebi yok.
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
