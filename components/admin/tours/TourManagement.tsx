"use client";

import { useMemo, useState, useTransition } from "react";
import { Compass, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import {
  createTour,
  deleteTour,
  toggleTourActive,
  updateTour,
} from "@/app/actions/admin/tours";
import type { TourItem } from "@/lib/queries/tours";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type StatusFilter = "active" | "passive" | "all";

function linesFromJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return "";
    return parsed
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join("\n");
  } catch {
    return "";
  }
}

function TourFields({ item }: { item?: TourItem | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">Başlık</span>
        <input
          name="title"
          required
          defaultValue={item?.title ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Slug</span>
        <input
          name="slug"
          defaultValue={item?.slug ?? ""}
          placeholder="dalyan-iztuzu-plaji-turu"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Etiket</span>
        <input
          name="tag"
          defaultValue={item?.tag ?? ""}
          placeholder="best seller"
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">Lokasyon</span>
        <input
          name="location"
          defaultValue={item?.location ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Süre</span>
        <input
          name="durationHours"
          defaultValue={item?.durationHours ?? ""}
          placeholder="8 Saat"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Grup boyutu</span>
        <input
          name="groupSize"
          defaultValue={item?.groupSize ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Fiyat (başlangıç)</span>
        <input
          name="priceFrom"
          type="number"
          min={0}
          step="1"
          defaultValue={item?.priceFrom ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Para birimi</span>
        <select
          name="currency"
          defaultValue={item?.currency ?? "TL"}
          className={inputClass}
        >
          {["TL", "EUR", "USD", "GBP"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Sıra</span>
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={item?.sortOrder ?? 0}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Durum</span>
        <select
          name="isActive"
          defaultValue={item?.isActive === false ? "false" : "true"}
          className={inputClass}
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Listede göster</span>
        <select
          name="onList"
          defaultValue={item?.onList === false ? "false" : "true"}
          className={inputClass}
        >
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Transfer var</span>
        <select
          name="hasTransfer"
          defaultValue={item?.hasTransfer ? "true" : "false"}
          className={inputClass}
        >
          <option value="true">Evet</option>
          <option value="false">Hayır</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">
          Ücretsiz iptal (saat)
        </span>
        <input
          name="freeCancelationHours"
          defaultValue={item?.freeCancelationHours ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Kapak görsel URL</span>
        <input
          name="coverImage"
          defaultValue={item?.coverImage ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Kısa açıklama</span>
        <textarea
          name="shortDesc"
          rows={2}
          defaultValue={item?.shortDesc ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Özet (overview)</span>
        <textarea
          name="overview"
          rows={2}
          defaultValue={item?.overview ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">
          Detay (HTML)
        </span>
        <textarea
          name="descriptionHtml"
          rows={4}
          defaultValue={item?.descriptionHtml ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">
          Dahil olanlar (satır satır)
        </span>
        <textarea
          name="includesText"
          rows={3}
          defaultValue={item ? linesFromJson(item.includesJson) : ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">
          Öne çıkanlar (satır satır)
        </span>
        <textarea
          name="highlightsText"
          rows={3}
          defaultValue={item ? linesFromJson(item.highlightsJson) : ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">
          Hariç olanlar (satır satır)
        </span>
        <textarea
          name="excludesText"
          rows={3}
          defaultValue={item ? linesFromJson(item.excludesJson) : ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">SEO Title</span>
        <input
          name="seoTitle"
          defaultValue={item?.seoTitle ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">Canonical path</span>
        <input
          name="canonicalPath"
          defaultValue={item?.canonicalPath ?? ""}
          placeholder="/tur/slug"
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">SEO Description</span>
        <textarea
          name="seoDescription"
          rows={2}
          defaultValue={item?.seoDescription ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">SEO Keywords</span>
        <input
          name="seoKeywords"
          defaultValue={item?.seoKeywords ?? ""}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export default function TourManagement({
  items,
  totalCount,
  activeCount,
}: {
  items: TourItem[];
  totalCount: number;
  activeCount: number;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return item.isActive;
      return !item.isActive;
    });
  }, [items, statusFilter]);

  function runCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTour({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowAdd(false);
    });
  }

  function runUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateTour({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Tur & Aktiviteler
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Turlar</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Günübirlik tur ve aktivite ilanlarını yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Tur
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Toplam</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Aktif</p>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pasif</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalCount - activeCount}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showAdd ? (
        <form
          action={runCreate}
          className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Yeni Tur</h2>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <TourFields />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Kaydet
          </button>
        </form>
      ) : null}

      <div className="flex w-fit rounded-xl border border-gray-200 p-1">
        {(
          [
            ["active", "Aktif"],
            ["passive", "Pasif"],
            ["all", "Tümü"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === value
                ? "bg-teal-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Tur</th>
              <th className="px-4 py-3">Lokasyon</th>
              <th className="px-4 py-3">Fiyat</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-4" colSpan={editingId === item.id ? 5 : 1}>
                  {editingId === item.id ? (
                    <form action={runUpdate} className="space-y-4">
                      <input type="hidden" name="id" value={item.id} />
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Turu düzenle
                        </h3>
                        <button type="button" onClick={() => setEditingId(null)}>
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                      <TourFields item={item} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Güncelle
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-50 text-teal-700">
                        {item.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.coverImage}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Compass className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500">/{item.slug}</p>
                        {item.tag ? (
                          <p className="mt-1 text-xs font-medium text-teal-600">
                            {item.tag}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </td>
                {editingId === item.id ? null : (
                  <>
                    <td className="px-4 py-4 text-gray-600">{item.location || "—"}</td>
                    <td className="px-4 py-4 text-gray-600">
                      {item.priceFrom != null
                        ? `${item.priceFrom.toLocaleString("tr-TR")} ${item.currency}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setShowAdd(false);
                          }}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-teal-700"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await toggleTourActive(item.id);
                            })
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-amber-600"
                          title="Aktif/Pasif"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              if (!confirm("Bu tur silinsin mi?")) return;
                              await deleteTour(item.id);
                            })
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
