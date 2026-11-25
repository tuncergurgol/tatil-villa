"use client";

import { useMemo, useState, useTransition } from "react";
import { Bus, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import {
  createTransferVehicleType,
  deleteTransferVehicleType,
  toggleTransferVehicleTypeActive,
  updateTransferVehicleType,
} from "@/app/actions/admin/transfer-vehicle-types";
import type { TransferVehicleTypeItem } from "@/lib/queries/transfer-vehicle-types";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const currencyOptions = ["EUR", "TL", "USD", "GBP"] as const;

type StatusFilter = "active" | "passive" | "all";

interface Props {
  items: TransferVehicleTypeItem[];
  totalCount: number;
  activeCount: number;
}

function VehicleTypeFields({
  item,
}: {
  item?: TransferVehicleTypeItem | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Kod</span>
        <input
          name="code"
          required
          defaultValue={item?.code ?? ""}
          placeholder="ekonomi, vip"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Ad (TR)</span>
        <input
          name="name"
          required
          defaultValue={item?.name ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Ad (EN)</span>
        <input
          name="nameEn"
          defaultValue={item?.nameEn ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Para Birimi</span>
        <select
          name="currency"
          defaultValue={item?.currency ?? "EUR"}
          className={inputClass}
        >
          {currencyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Yolcu Kapasitesi</span>
        <input
          name="passengerCapacity"
          type="number"
          min={1}
          defaultValue={item?.passengerCapacity ?? 4}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Bagaj Kapasitesi</span>
        <input
          name="luggageCapacity"
          type="number"
          min={0}
          defaultValue={item?.luggageCapacity ?? 2}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">KM Başı Fiyat</span>
        <input
          name="basePricePerKm"
          type="number"
          step="0.01"
          min={0}
          defaultValue={item?.basePricePerKm ?? 1.5}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Fiyat Çarpanı</span>
        <input
          name="priceMultiplier"
          type="number"
          step="0.01"
          min={0}
          defaultValue={item?.priceMultiplier ?? 1}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Minimum Ücret</span>
        <input
          name="minimumFare"
          type="number"
          step="0.01"
          min={0}
          defaultValue={item?.minimumFare ?? 15}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Dahil KM</span>
        <input
          name="includedKm"
          type="number"
          step="0.1"
          min={0}
          defaultValue={item?.includedKm ?? 10}
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
        <span className="text-xs font-medium text-gray-500">Görsel URL</span>
        <input
          name="image"
          defaultValue={item?.image ?? ""}
          placeholder="https://..."
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Açıklama</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={item?.description ?? ""}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export default function TransferVehicleTypeManagement({
  items,
  totalCount,
  activeCount,
}: Props) {
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
      const result = await createTransferVehicleType({}, formData);
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
      const result = await updateTransferVehicleType({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function runDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" araç tipi silinsin mi?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransferVehicleType(id);
      if (result.error) setError(result.error);
    });
  }

  function runToggle(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await toggleTransferVehicleTypeActive(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
            Transfer
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Araç Tipleri</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            KM bazlı fiyatlandırma parametreleri ve kapasite bilgileri. Sabit rota
            fiyatları Rotalar sayfasından yönetilir.
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
          Yeni Araç Tipi
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
          className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Yeni Araç Tipi</h2>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <VehicleTypeFields />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
            >
              İptal
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex rounded-xl border border-gray-200 p-1 w-fit">
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
              <th className="px-4 py-3">Araç Tipi</th>
              <th className="px-4 py-3">Kapasite</th>
              <th className="px-4 py-3">Fiyatlandırma</th>
              <th className="px-4 py-3">Durum</th>
              <th className="w-56 px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((item) =>
                editingId === item.id ? (
                  <tr key={item.id} className="border-t border-gray-100 bg-violet-50/30">
                    <td colSpan={5} className="px-4 py-4">
                      <form action={runUpdate} className="space-y-4">
                        <input type="hidden" name="id" value={item.id} />
                        <VehicleTypeFields item={item} />
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
                        <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                          <Bus className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.code}
                            {item.nameEn ? ` · ${item.nameEn}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.passengerCapacity} yolcu · {item.luggageCapacity} bagaj
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-xs leading-5">
                        <div>
                          {item.basePricePerKm} {item.currency}/km ×{" "}
                          {item.priceMultiplier}
                        </div>
                        <div>
                          min {item.minimumFare} · dahil {item.includedKm} km
                        </div>
                      </div>
                    </td>
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
                          onClick={() => runToggle(item.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {item.isActive ? "Pasif" : "Aktif"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runDelete(item.id, item.name)}
                          disabled={isPending}
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
