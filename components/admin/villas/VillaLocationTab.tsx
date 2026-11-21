"use client";

import { useMemo, useState, useTransition } from "react";
import { Crosshair, Route } from "lucide-react";
import type { Villa } from "@prisma/client";
import { calculateSurroundingDistances } from "@/app/actions/admin/surrounding-distances";
import { RegionLevel } from "@/lib/region-levels";
import type {
  RegionPickerOption,
  SurroundingLocationOption,
} from "@/lib/villa-location-helpers";
import {
  buildRegionSelectionLabel,
  resolveRegionHierarchy,
} from "@/lib/villa-location-helpers";
import {
  collectVillaRegionAncestorIds,
  parseLatLngPaste,
  surroundingLocationMatchesRegion,
} from "@/lib/surrounding-location-helpers";
import { compareSurroundingNames } from "@/lib/surrounding-utils";

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
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
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
  const [coordsPaste, setCoordsPaste] = useState("");
  const [distances, setDistances] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [id, km] of Object.entries(distanceByLocationId)) {
      initial[id] = String(km);
    }
    return initial;
  });
  const [calcMessage, setCalcMessage] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const villaAncestorIds = useMemo(() => {
    const selectedId = mahalleId || ilceId || ilId;
    return collectVillaRegionAncestorIds(regions, selectedId);
  }, [regions, ilId, ilceId, mahalleId]);

  const visibleSurroundingLocations = useMemo(
    () =>
      surroundingLocations.filter((item) =>
        surroundingLocationMatchesRegion(item.regionIds, villaAncestorIds)
      ),
    [surroundingLocations, villaAncestorIds]
  );

  const surroundingGroups = useMemo(() => {
    const groups = new Map<string, SurroundingLocationOption[]>();
    const order: string[] = [];

    for (const item of visibleSurroundingLocations) {
      if (!groups.has(item.categoryName)) {
        groups.set(item.categoryName, []);
        order.push(item.categoryName);
      }
      groups.get(item.categoryName)!.push(item);
    }

    return order.map((categoryName) => ({
      categoryName,
      locations: [...(groups.get(categoryName) ?? [])].sort((left, right) =>
        compareSurroundingNames(left.name, right.name)
      ),
    }));
  }, [visibleSurroundingLocations]);

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

  function applyCoordsPaste() {
    const parsed = parseLatLngPaste(coordsPaste);
    if (!parsed) {
      setCalcError("Koordinat formatı: 36.566131, 29.150035");
      return;
    }
    setCalcError(null);
    setLatitude(String(parsed.latitude));
    setLongitude(String(parsed.longitude));
  }

  function handleCalculateDistances() {
    setCalcError(null);
    setCalcMessage(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      setCalcError("Önce geçerli villa enlem/boylam girin.");
      return;
    }

    const targetIds = visibleSurroundingLocations
      .filter((item) => item.isDefault)
      .map((item) => item.id);

    if (targetIds.length === 0) {
      setCalcError(
        "Bu bölgede varsayılan (otomatik hesapla) çevre konum yok. Tanımlamalardan işaretleyin."
      );
      return;
    }

    startTransition(async () => {
      const result = await calculateSurroundingDistances({
        latitude: lat,
        longitude: lng,
        locationIds: targetIds,
        onlyDefaults: true,
      });

      if (!result.success) {
        setCalcError(result.error);
        return;
      }

      setDistances((prev) => {
        const next = { ...prev };
        for (const [id, km] of Object.entries(result.distances)) {
          next[id] = String(km);
        }
        return next;
      });

      const filled = Object.keys(result.distances).length;
      const skipNote =
        result.skipped.length > 0
          ? ` ${result.skipped.length} konum atlandı (${result.skipped
              .slice(0, 3)
              .map((item) => item.name)
              .join(", ")}${result.skipped.length > 3 ? "…" : ""}).`
          : "";
      setCalcMessage(
        `${filled} mesafe Google yol rotasıyla dolduruldu.${skipNote} Kaydetmeyi unutmayın.`
      );
    });
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
          <div className="mb-4">
            <span className={labelClass}>Koordinat yapıştır</span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={coordsPaste}
                onChange={(event) => setCoordsPaste(event.target.value)}
                placeholder="36.566131, 29.150035"
                className={inputClass}
              />
              <button
                type="button"
                onClick={applyCoordsPaste}
                className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Uygula
              </button>
            </div>
          </div>
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

      <SectionCard
        title="Çevre ve Konum Mesafeleri"
        action={
          surroundingGroups.length > 0 ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCalculateDistances}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              <Route className="h-4 w-4" />
              {isPending ? "Hesaplanıyor..." : "Mesafeleri hesapla (Google)"}
            </button>
          ) : null
        }
      >
        {calcError ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {calcError}
          </p>
        ) : null}
        {calcMessage ? (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {calcMessage}
          </p>
        ) : null}

        {surroundingGroups.length > 0 ? (
          <div className="space-y-6">
            {surroundingGroups.map((group) => (
              <div key={group.categoryName}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  {group.categoryName}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {group.locations.map((locationItem) => (
                    <label key={locationItem.id} className="block">
                      <span className={labelClass}>
                        {locationItem.name} (km)
                        {locationItem.isDefault ? (
                          <span className="ml-1 text-teal-600">•</span>
                        ) : null}
                      </span>
                      <input
                        name={`distance_${locationItem.id}`}
                        type="number"
                        min={0}
                        step="0.1"
                        value={distances[locationItem.id] ?? ""}
                        onChange={(event) =>
                          setDistances((prev) => ({
                            ...prev,
                            [locationItem.id]: event.target.value,
                          }))
                        }
                        placeholder="0"
                        className={`mt-1.5 ${inputClass}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Bu bölge için çevre konum tipi yok. Tanımlamalar → Çevre ve Konum
            bölümünden ekleyebilir veya bölge kapsamını güncelleyebilirsiniz.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
