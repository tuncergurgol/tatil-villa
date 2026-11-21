"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createTransferTrip,
  deleteTransferTrip,
  updateTransferTrip,
} from "@/app/actions/admin/transfer-trips";
import type { TransferTripItem } from "@/lib/queries/transfer-trips";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

type StatusFilter = "all" | "NEW" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

type RouteOption = {
  id: string;
  title: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  vehiclePrices: { vehicleTypeId: string; price: number }[];
};

type VehicleOption = {
  id: string;
  name: string;
  currency: string;
};

interface Props {
  items: TransferTripItem[];
  routes: RouteOption[];
  vehicleTypes: VehicleOption[];
  totalCount: number;
  newCount: number;
  confirmedCount: number;
}

const statusLabels: Record<string, string> = {
  NEW: "Yeni",
  CONFIRMED: "Onaylı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

function TripFields({
  item,
  routes,
  vehicleTypes,
}: {
  item?: TransferTripItem | null;
  routes: RouteOption[];
  vehicleTypes: VehicleOption[];
}) {
  const [routeId, setRouteId] = useState(item?.routeId ?? "");
  const [vehicleTypeId, setVehicleTypeId] = useState(item?.vehicleTypeId ?? "");
  const [startPoint, setStartPoint] = useState(item?.startPoint ?? "");
  const [endPoint, setEndPoint] = useState(item?.endPoint ?? "");
  const [distanceKm, setDistanceKm] = useState(
    item?.distanceKm != null ? String(item.distanceKm) : ""
  );
  const [durationMinutes, setDurationMinutes] = useState(
    item?.durationMinutes != null ? String(item.durationMinutes) : ""
  );
  const [totalPrice, setTotalPrice] = useState(
    item?.totalPrice != null ? String(item.totalPrice) : ""
  );
  const [currency, setCurrency] = useState<"TL" | "EUR" | "USD" | "GBP">(
    (item?.currency as "TL" | "EUR" | "USD" | "GBP" | undefined) ?? "EUR"
  );

  function applyRoute(nextRouteId: string) {
    setRouteId(nextRouteId);
    const route = routes.find((r) => r.id === nextRouteId);
    if (!route) return;
    setStartPoint(route.startPoint);
    setEndPoint(route.endPoint);
    setDistanceKm(route.distanceKm != null ? String(route.distanceKm) : "");
    setDurationMinutes(
      route.durationMinutes != null ? String(route.durationMinutes) : ""
    );
    const priceRow = route.vehiclePrices.find(
      (p) => p.vehicleTypeId === vehicleTypeId
    );
    if (priceRow) setTotalPrice(String(priceRow.price));
  }

  function applyVehicle(nextVehicleTypeId: string) {
    setVehicleTypeId(nextVehicleTypeId);
    const vt = vehicleTypes.find((v) => v.id === nextVehicleTypeId);
    if (
      vt &&
      (vt.currency === "TL" ||
        vt.currency === "EUR" ||
        vt.currency === "USD" ||
        vt.currency === "GBP")
    ) {
      setCurrency(vt.currency);
    }
    const route = routes.find((r) => r.id === routeId);
    const priceRow = route?.vehiclePrices.find(
      (p) => p.vehicleTypeId === nextVehicleTypeId
    );
    if (priceRow) setTotalPrice(String(priceRow.price));
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">
          Sabit Rota (opsiyonel)
        </span>
        <select
          name="routeId"
          value={routeId}
          onChange={(e) => applyRoute(e.target.value)}
          className={inputClass}
        >
          <option value="">Serbest rota</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Araç Tipi</span>
        <select
          name="vehicleTypeId"
          required
          value={vehicleTypeId}
          onChange={(e) => applyVehicle(e.target.value)}
          className={inputClass}
        >
          <option value="">Seçiniz</option>
          {vehicleTypes.map((vt) => (
            <option key={vt.id} value={vt.id}>
              {vt.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Transfer Tipi</span>
        <select
          name="direction"
          defaultValue={item?.direction ?? "ONE_WAY"}
          className={inputClass}
        >
          <option value="ONE_WAY">Tek Yön</option>
          <option value="ROUND_TRIP">Gidiş-Dönüş</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Başlangıç</span>
        <input
          name="startPoint"
          required
          value={startPoint}
          onChange={(e) => setStartPoint(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Bitiş</span>
        <input
          name="endPoint"
          required
          value={endPoint}
          onChange={(e) => setEndPoint(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Mesafe (km)</span>
        <input
          name="distanceKm"
          type="number"
          step="0.1"
          min={0}
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Süre (dk)</span>
        <input
          name="durationMinutes"
          type="number"
          min={0}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Transfer Tarihi</span>
        <input
          name="tripDate"
          type="date"
          required
          defaultValue={item?.tripDate ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Transfer Saati</span>
        <input
          name="tripTime"
          type="time"
          defaultValue={item?.tripTime ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Dönüş Tarihi</span>
        <input
          name="returnDate"
          type="date"
          defaultValue={item?.returnDate ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Dönüş Saati</span>
        <input
          name="returnTime"
          type="time"
          defaultValue={item?.returnTime ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Yetişkin</span>
        <input
          name="adults"
          type="number"
          min={1}
          defaultValue={item?.adults ?? 1}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Çocuk</span>
        <input
          name="children"
          type="number"
          min={0}
          defaultValue={item?.children ?? 0}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Bebek</span>
        <input
          name="babies"
          type="number"
          min={0}
          defaultValue={item?.babies ?? 0}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Toplam Fiyat</span>
        <input
          name="totalPrice"
          type="number"
          step="0.01"
          min={0}
          value={totalPrice}
          onChange={(e) => setTotalPrice(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Para Birimi</span>
        <select
          name="currency"
          value={currency}
          onChange={(e) =>
            setCurrency(e.target.value as "TL" | "EUR" | "USD" | "GBP")
          }
          className={inputClass}
        >
          <option value="EUR">EUR</option>
          <option value="TL">TL</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Durum</span>
        <select
          name="status"
          defaultValue={item?.status ?? "NEW"}
          className={inputClass}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Hizmet Tipi</span>
        <input
          name="serviceType"
          defaultValue={item?.serviceType ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Ad</span>
        <input
          name="contactName"
          defaultValue={item?.contactName ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Soyad</span>
        <input
          name="contactSurname"
          defaultValue={item?.contactSurname ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Telefon</span>
        <input
          name="contactPhone"
          defaultValue={item?.contactPhone ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">E-posta</span>
        <input
          name="contactEmail"
          type="email"
          defaultValue={item?.contactEmail ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">TC / Pasaport</span>
        <input
          name="contactIdNumber"
          defaultValue={item?.contactIdNumber ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Uçuş No</span>
        <input
          name="flightNumber"
          defaultValue={item?.flightNumber ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-gray-500">Şoför Tabelası</span>
        <input
          name="driverSign"
          defaultValue={item?.driverSign ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2 xl:col-span-4">
        <span className="text-xs font-medium text-gray-500">Müşteri Notu</span>
        <textarea
          name="note"
          rows={2}
          defaultValue={item?.note ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">Admin Notu</span>
        <textarea
          name="adminNote"
          rows={2}
          defaultValue={item?.adminNote ?? ""}
          className={inputClass}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-xs font-medium text-gray-500">Özel İstekler</span>
        <textarea
          name="specialRequests"
          rows={2}
          defaultValue={item?.specialRequests ?? ""}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export default function TransferTripManagement({
  items,
  routes,
  vehicleTypes,
  totalCount,
  newCount,
  confirmedCount,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  function runCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createTransferTrip({}, formData);
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
      const result = await updateTransferTrip({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingId(null);
    });
  }

  function runDelete(id: string) {
    if (!window.confirm("Bu sefer silinsin mi?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTransferTrip(id);
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
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Seferler</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Transfer rezervasyonları / seferler. Rota ve araç tipine bağlı; fiyat,
            mesafe ve süre alanları CRM ile uyumlu.
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
          Yeni Sefer
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Toplam</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Yeni</p>
          <p className="text-2xl font-bold text-gray-900">{newCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Onaylı</p>
          <p className="text-2xl font-bold text-gray-900">{confirmedCount}</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Yeni Sefer</h2>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <TripFields routes={routes} vehicleTypes={vehicleTypes} />
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

      <div className="flex flex-wrap rounded-xl border border-gray-200 p-1 w-fit">
        {(
          [
            ["all", "Tümü"],
            ["NEW", "Yeni"],
            ["CONFIRMED", "Onaylı"],
            ["COMPLETED", "Tamamlandı"],
            ["CANCELLED", "İptal"],
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
              <th className="px-4 py-3">Sefer</th>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Araç / Fiyat</th>
              <th className="px-4 py-3">Durum</th>
              <th className="w-44 px-4 py-3 text-right">İşlemler</th>
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
                        <TripFields
                          item={item}
                          routes={routes}
                          vehicleTypes={vehicleTypes}
                        />
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
                        <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.startPoint} → {item.endPoint}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.routeTitle ?? "Serbest rota"}
                            {" · "}
                            {item.direction === "ROUND_TRIP"
                              ? "Gidiş-Dönüş"
                              : "Tek Yön"}
                            {item.distanceKm != null
                              ? ` · ${item.distanceKm} km`
                              : ""}
                          </p>
                          {(item.contactName || item.contactSurname) && (
                            <p className="text-xs text-gray-500">
                              {item.contactName} {item.contactSurname}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{item.tripDate}</div>
                      <div className="text-xs text-gray-500">
                        {item.tripTime || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{item.vehicleTypeName}</div>
                      <div className="text-xs text-gray-500">
                        {item.totalPrice != null
                          ? `${item.totalPrice} ${item.currency}`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        {statusLabels[item.status] ?? item.status}
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
                          onClick={() => runDelete(item.id)}
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
