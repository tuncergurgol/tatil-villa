"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bus, CheckCircle2, Phone } from "lucide-react";
import {
  submitPublicTransferRequestAction,
  type PublicTransferRequestState,
} from "@/app/actions/public-transfer-request";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import type { PublicTransferPageData } from "@/lib/queries/public-transfer";

const initialState: PublicTransferRequestState = {};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

function formatPrice(value: number) {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function VipTransferPublicPage({
  data,
}: {
  data: PublicTransferPageData;
}) {
  const [state, action, pending] = useActionState(
    submitPublicTransferRequestAction,
    initialState
  );
  const [routeId, setRouteId] = useState(data.routes[0]?.id ?? "");
  const [vehicleTypeId, setVehicleTypeId] = useState(
    data.routes[0]?.vehiclePrices[0]?.vehicleTypeId ??
      data.vehicleTypes[0]?.id ??
      ""
  );
  const [phone, setPhone] = useState("");

  const selectedRoute = useMemo(
    () => data.routes.find((route) => route.id === routeId) ?? null,
    [data.routes, routeId]
  );

  useEffect(() => {
    if (!selectedRoute) return;
    const stillValid = selectedRoute.vehiclePrices.some(
      (price) => price.vehicleTypeId === vehicleTypeId
    );
    if (!stillValid) {
      setVehicleTypeId(selectedRoute.vehiclePrices[0]?.vehicleTypeId ?? "");
    }
  }, [selectedRoute, vehicleTypeId]);

  const selectedPrice = selectedRoute?.vehiclePrices.find(
    (price) => price.vehicleTypeId === vehicleTypeId
  );

  if (state.success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-teal-600" />
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Talebiniz alındı</h1>
        <p className="mt-3 text-slate-600">{state.message}</p>
        <Link
          href="/villalar"
          className="mt-8 inline-flex rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Villaları incele
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
          VIP Transfer
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Havalimanı ve şehirler arası transfer
        </h1>
        <p className="mt-3 text-slate-600">
          Rotanızı seçin, tarih ve iletişim bilgilerinizi bırakın. Ekibimiz
          talebinizi onaylayıp size dönüş yapsın.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form action={action} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <input type="hidden" name="routeId" value={routeId} />
          <input type="hidden" name="vehicleTypeId" value={vehicleTypeId} />
          <input type="hidden" name="contactPhone" value={phone} />

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Rota</span>
            <select
              value={routeId}
              onChange={(event) => setRouteId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Özel / diğer rota</option>
              {data.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.title}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">
                Başlangıç
              </span>
              <input
                name="startPoint"
                required
                defaultValue={selectedRoute?.startPoint ?? ""}
                key={`start-${routeId}`}
                className={fieldClass}
                placeholder="Örn. Dalaman Havalimanı"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Bitiş</span>
              <input
                name="endPoint"
                required
                defaultValue={selectedRoute?.endPoint ?? ""}
                key={`end-${routeId}`}
                className={fieldClass}
                placeholder="Örn. Fethiye"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Tarih</span>
              <input name="tripDate" type="date" required className={fieldClass} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Saat</span>
              <input name="tripTime" type="time" className={fieldClass} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Yön</span>
              <select name="direction" defaultValue="ONE_WAY" className={fieldClass}>
                <option value="ONE_WAY">Tek yön</option>
                <option value="ROUND_TRIP">Gidiş-dönüş</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">
                Araç tipi
              </span>
              <select
                value={vehicleTypeId}
                onChange={(event) => setVehicleTypeId(event.target.value)}
                className={fieldClass}
                required
              >
                {(selectedRoute?.vehiclePrices.length
                  ? selectedRoute.vehiclePrices.map((price) => ({
                      id: price.vehicleTypeId,
                      name: `${price.vehicleTypeName} · €${formatPrice(price.price)}`,
                    }))
                  : data.vehicleTypes.map((item) => ({
                      id: item.id,
                      name: `${item.name} · ${item.capacity} kişi`,
                    }))
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Yetişkin</span>
              <input
                name="adults"
                type="number"
                min={1}
                max={20}
                defaultValue={1}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Çocuk</span>
              <input
                name="children"
                type="number"
                min={0}
                max={20}
                defaultValue={0}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Ad</span>
              <input name="contactName" required className={fieldClass} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Soyad</span>
              <input name="contactSurname" required className={fieldClass} />
            </label>
          </div>

          <TurkishPhoneField
            required
            value={phone}
            onChange={setPhone}
            label="Telefon"
            focusPalette="teal"
          />

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              E-posta (opsiyonel)
            </span>
            <input name="contactEmail" type="email" className={fieldClass} />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              Uçuş no (opsiyonel)
            </span>
            <input name="flightNumber" className={fieldClass} />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              Özel istekler
            </span>
            <textarea
              name="specialRequests"
              rows={3}
              className={fieldClass}
              placeholder="Bebek koltuğu, ek durak vb."
            />
          </label>

          {selectedPrice ? (
            <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
              Tahmini ücret: €{formatPrice(selectedPrice.price)}
            </p>
          ) : null}

          {state.error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-70"
          >
            <Bus className="h-4 w-4" />
            {pending ? "Gönderiliyor…" : "Transfer talebi gönder"}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-bold text-slate-900">Listelenen rotalar</h2>
            <ul className="mt-4 space-y-3">
              {data.routes.length === 0 ? (
                <li className="text-sm text-slate-500">
                  Henüz yayınlı rota yok. Formdan özel rota talebi
                  oluşturabilirsiniz.
                </li>
              ) : (
                data.routes.map((route) => (
                  <li
                    key={route.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <p className="font-semibold text-slate-900">{route.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {route.startPoint} → {route.endPoint}
                      {route.durationMinutes
                        ? ` · ~${route.durationMinutes} dk`
                        : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          {(data.phone || data.whatsapp) && (
            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm text-teal-950">
              <p className="font-semibold">Hızlı iletişim</p>
              {data.phone ? (
                <a
                  href={`tel:${data.phone}`}
                  className="mt-2 inline-flex items-center gap-2 font-medium hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {data.phone}
                </a>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
