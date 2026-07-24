"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, MapPin, User } from "lucide-react";
import type { CarRentalPageSettingsData } from "@/lib/queries/car-rental";
import { buildYolcu360SearchQuery } from "@/lib/yolcu360/session";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

type LocationSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type Props = {
  settings: CarRentalPageSettingsData;
  driverAgeOptions: string[];
};

function LocationAutocomplete({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocationSuggestion | null;
  onChange: (next: LocationSuggestion | null) => void;
}) {
  const [query, setQuery] = useState(value?.description ?? "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const res = await fetch(
        `/api/yolcu360/locations?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as LocationSuggestion[];
      setSuggestions(data);
      setOpen(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <label className="relative block lg:col-span-2">
      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
        <MapPin className="h-3.5 w-3.5" />
        {label}
      </span>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Havalimanı veya şehir ara…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((item) => (
            <li key={item.placeId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50"
                onClick={() => {
                  onChange(item);
                  setQuery(item.description);
                  setOpen(false);
                }}
              >
                <div className="font-medium text-slate-900">{item.mainText}</div>
                <div className="text-xs text-slate-500">{item.secondaryText}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}

export default function Yolcu360SearchWidget({ settings, driverAgeOptions }: Props) {
  const router = useRouter();
  const [sameLocation, setSameLocation] = useState(settings.sameLocationDefault);
  const [pickup, setPickup] = useState<LocationSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<LocationSuggestion | null>(null);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("10:00");
  const [checkOutTime, setCheckOutTime] = useState("10:00");
  const [age, setAge] = useState(settings.defaultDriverAge);
  const [error, setError] = useState<string | null>(null);

  const effectiveDropoff = useMemo(
    () => (sameLocation ? pickup : dropoff),
    [sameLocation, pickup, dropoff]
  );

  function handleSearch() {
    setError(null);
    if (!pickup?.placeId || !effectiveDropoff?.placeId) {
      setError("Lütfen alış ve iade konumlarını seçin.");
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setError("Lütfen alış ve iade tarihlerini seçin.");
      return;
    }

    const qs = buildYolcu360SearchQuery({
      pickupPlaceId: pickup.placeId,
      returnPlaceId: effectiveDropoff.placeId,
      checkInDate,
      checkInTime,
      checkOutDate,
      checkOutTime,
      age,
      sameLocation: sameLocation ? "1" : "0",
    });
    router.push(`/arac-kiralama/sonuclar?${qs}`);
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-900 shadow-xl sm:p-6">
      {settings.showSameLocationToggle ? (
        <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={sameLocation}
            onChange={(e) => setSameLocation(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
          />
          {settings.sameLocationLabel}
        </label>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-6">
        <LocationAutocomplete
          label={settings.pickupLabel}
          value={pickup}
          onChange={setPickup}
        />
        {!sameLocation ? (
          <LocationAutocomplete
            label={settings.returnLabel}
            value={dropoff}
            onChange={setDropoff}
          />
        ) : null}

        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {settings.pickupDateLabel}
          </span>
          <div className="flex gap-1">
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <select
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-2.5 text-sm"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {settings.returnDateLabel}
          </span>
          <div className="flex gap-1">
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            <select
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-2.5 text-sm"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <User className="h-3.5 w-3.5" />
            {settings.driverAgeLabel}
          </span>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            {driverAgeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end lg:col-span-6 xl:col-span-1">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <Car className="h-4 w-4" />
            {settings.ctaText}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
