"use client";

import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";
import type { Villa } from "@prisma/client";
import { RegionLevel } from "@/lib/region-levels";
import type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/villa-location-helpers";
import {
  buildRegionSelectionLabel,
  resolveRegionHierarchy,
} from "@/lib/villa-location-helpers";

interface VillaLocationTabProps {
  villa: Villa;
  regions: RegionPickerOption[];
  surroundingLocations: SurroundingLocationOption[];
  distanceByLocationId: Record<string, number>;
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-100";

const labelClass = "text-xs font-medium text-gray-500";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </section>
  );
}

export default function VillaLocationTab({
  villa,
  regions,
  surroundingLocations,
  distanceByLocationId,
}: VillaLocationTabProps) {
  const initialHierarchy = useMemo(
    () => resolveRegionHierarchy(regions, villa.regionId),
    [regions, villa.regionId]
  );

  const [ilId, setIlId] = useState(initialHierarchy.ilId);
  const [ilceId, setIlceId] = useState(initialHierarchy.ilceId);
  const [mahalleId, setMahalleId] = useState(initialHierarchy.mahalleId);
  const [location, setLocation] = useState(villa.location);
  const [latitude, setLatitude] = useState(String(villa.latitude || 0));
  const [longitude, setLongitude] = useState(String(villa.longitude || 0));

  const ilOptions = useMemo(
    () => regions.filter((region) => region.level === RegionLevel.IL),
    [regions]
  );

  const ilceOptions = useMemo(
    () =>
      regions.filter(
        (region) =>
          region.level === RegionLevel.ILCE && region.parentId === ilId
      ),
    [regions, ilId]
  );

  const mahalleOptions = useMemo(
    () =>
      regions.filter(
        (region) =>
          region.level === RegionLevel.MAHALLE && region.parentId === ilceId
      ),
    [regions, ilceId]
  );

  const selectionLabel = buildRegionSelectionLabel(
    regions,
    ilId,
    ilceId,
    mahalleId,
    location
  );

  function openMap() {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    window.open(
      `https://www.google.com/maps?q=${lat},${lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Bölge Seçimi">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className={labelClass}>Şehir / Bölge</span>
            <select
              value={ilId}
              onChange={(event) => {
                setIlId(event.target.value);
                setIlceId("");
                setMahalleId("");
              }}
              className={`mt-1.5 ${inputClass}`}
            >
              <option value="">Seçiniz</option>
              {ilOptions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>İlçe / Semt</span>
            <select
              value={ilceId}
              disabled={!ilId}
              onChange={(event) => {
                setIlceId(event.target.value);
                setMahalleId("");
              }}
              className={`mt-1.5 ${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Seçiniz</option>
              {ilceOptions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Mahalle / Mevki</span>
            <select
              value={mahalleId}
              disabled={!ilceId}
              required
              onChange={(event) => {
                const nextId = event.target.value;
                setMahalleId(nextId);
                const selected = mahalleOptions.find(
                  (region) => region.id === nextId
                );
                setLocation(selected?.name ?? "");
              }}
              className={`mt-1.5 ${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">Seçiniz</option>
              {mahalleOptions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input type="hidden" name="regionId" value={mahalleId} />
        <input type="hidden" name="location" value={location} />

        {selectionLabel ? (
          <p className="mt-4 text-sm font-medium text-emerald-600">
            Seçim: {selectionLabel}
          </p>
        ) : null}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Konum">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className={labelClass}>Enlem</span>
              <input
                name="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                className={`mt-1.5 ${inputClass}`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Boylam</span>
              <input
                name="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                className={`mt-1.5 ${inputClass}`}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={openMap}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Crosshair className="h-4 w-4" />
                Harita
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Video">
          <label className="block">
            <span className={labelClass}>Video Link</span>
            <input
              name="videoUrl"
              type="url"
              defaultValue={villa.videoUrl}
              placeholder="https://"
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
        </SectionCard>
      </div>

      <SectionCard title="Çevre ve Konum Mesafeleri">
        {surroundingLocations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {surroundingLocations.map((locationItem) => (
              <label key={locationItem.id} className="block">
                <span className={labelClass}>{locationItem.name} (km)</span>
                <input
                  name={`distance_${locationItem.id}`}
                  type="number"
                  min={0}
                  step="0.1"
                  defaultValue={distanceByLocationId[locationItem.id] ?? ""}
                  placeholder="0"
                  className={`mt-1.5 ${inputClass}`}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Henüz çevre konum tipi tanımlanmamış. Tanımlamalar → Çevre ve Konum
            bölümünden ekleyebilirsiniz.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
