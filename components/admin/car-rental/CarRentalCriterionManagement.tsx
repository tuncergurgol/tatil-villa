"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipboardList, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import {
  createCarRentalCriterion,
  deleteCarRentalCriterion,
  toggleCarRentalCriterionActive,
  updateCarRentalCriterion,
} from "@/app/actions/admin/car-rental";
import type { CarRentalDriverCriterionItem } from "@/lib/queries/car-rental";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type StatusFilter = "active" | "passive" | "all";

function CriterionFields({
  item,
}: {
  item?: CarRentalDriverCriterionItem | null;
}) {
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
        <span className="text-xs font-medium text-gray-500">İkon anahtarı</span>
        <input
          name="icon"
          defaultValue={item?.icon ?? ""}
          placeholder="user, id-card…"
          className={inputClass}
        />
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
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Açıklama</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={item?.description ?? ""}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export default function CarRentalCriterionManagement({
  items,
  totalCount,
  activeCount,
}: {
  items: CarRentalDriverCriterionItem[];
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Araç Kiralama
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Sürücü Kriterleri
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Yaş, ehliyet, kredi kartı vb. kriter satırlarını yönetin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd(true);
            setEditingId(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Kriter
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
          action={(fd) => {
            setError(null);
            startTransition(async () => {
              const r = await createCarRentalCriterion({}, fd);
              if (r.error) setError(r.error);
              else setShowAdd(false);
            });
          }}
          className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Yeni Kriter</h2>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <CriterionFields />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
              <th className="px-4 py-3">Kriter</th>
              <th className="px-4 py-3">Sıra</th>
              <th className="px-4 py-3">Durum</th>
              <th className="w-56 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="border-t border-gray-100 bg-violet-50/30">
                    <td colSpan={4} className="px-4 py-4">
                      <form
                        action={(fd) => {
                          setError(null);
                          startTransition(async () => {
                            const r = await updateCarRentalCriterion({}, fd);
                            if (r.error) setError(r.error);
                            else setEditingId(null);
                          });
                        }}
                        className="space-y-4"
                      >
                        <input type="hidden" name="id" value={item.id} />
                        <CriterionFields item={item} />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                          >
                            İptal
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-gray-500">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{item.sortOrder}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id);
                            setShowAdd(false);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await toggleCarRentalCriterionActive(
                                item.id
                              );
                              if (r.error) setError(r.error);
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {item.isActive ? "Pasif" : "Aktif"}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            if (!window.confirm(`"${item.title}" silinsin mi?`))
                              return;
                            startTransition(async () => {
                              const r = await deleteCarRentalCriterion(item.id);
                              if (r.error) setError(r.error);
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
