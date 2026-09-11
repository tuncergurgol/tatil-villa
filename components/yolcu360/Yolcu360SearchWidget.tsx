"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, Clock, MapPin, User } from "lucide-react";
import FloatingPanel from "@/components/FloatingPanel";
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
  className = "",
}: {
  label: string;
  value: LocationSuggestion | null;
  onChange: (next: LocationSuggestion | null) => void;
  className?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.description ?? "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/yolcu360/locations?query=${encodeURIComponent(query)}`
        );
        const data = (await res.json()) as
          | LocationSuggestion[]
          | { error?: string };
        if (!res.ok) {
          setSuggestions([]);
          setSearchError(
            typeof data === "object" &&
              data &&
              !Array.isArray(data) &&
              data.error
              ? data.error
              : "Konum araması başarısız"
          );
          setOpen(true);
          return;
        }
        setSuggestions(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setSearchError("Konum araması başarısız");
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const showPanel =
    open &&
    (loading || !!searchError || suggestions.length > 0 || query.trim().length >= 2);

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div
        ref={anchorRef}
        className="relative flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100"
      >
        <MapPin className="h-5 w-5 shrink-0 text-sky-500" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Havalimanı veya şehir ara…"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
      </div>

      <FloatingPanel open={showPanel} anchorRef={anchorRef} panelRef={panelRef}>
        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 shadow-lg">
            Konumlar aranıyor…
          </p>
        ) : null}
        {!loading && searchError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 shadow-lg">
            {searchError}
          </p>
        ) : null}
        {!loading && !searchError && suggestions.length > 0 ? (
          <ul className="max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {suggestions.map((item) => (
              <li key={item.placeId}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm transition hover:bg-sky-50"
                  onClick={() => {
                    onChange(item);
                    setQuery(item.description);
                    setOpen(false);
                  }}
                >
                  <div className="font-medium text-slate-900">{item.mainText}</div>
                  {item.secondaryText ? (
                    <div className="text-xs text-slate-500">{item.secondaryText}</div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {!loading &&
        !searchError &&
        query.trim().length >= 2 &&
        suggestions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 shadow-lg">
            Sonuç bulunamadı
          </p>
        ) : null}
      </FloatingPanel>
    </div>
  );
}

function DateTimeField({
  label,
  dateValue,
  timeValue,
  minDate,
  onDateChange,
  onTimeChange,
}: {
  label: string;
  dateValue: string;
  timeValue: string;
  minDate: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="shrink-0">
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{label}</p>
      <div className="flex gap-2">
        <label className="flex min-w-[7.5rem] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2.5 sm:min-w-[8.5rem]">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="date"
            value={dateValue}
            min={minDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none [color-scheme:light]"
          />
        </label>
        <label className="flex w-[5.25rem] items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-2.5 sm:w-[5.5rem]">
          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <select
            value={timeValue}
            onChange={(e) => onTimeChange(e.target.value)}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
    <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-2xl shadow-blue-900/10 ring-1 ring-slate-200/80 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <LocationAutocomplete
          label={settings.pickupLabel}
          value={pickup}
          onChange={setPickup}
          className="min-w-0 flex-1"
        />

        {!sameLocation ? (
          <LocationAutocomplete
            label={settings.returnLabel}
            value={dropoff}
            onChange={setDropoff}
            className="min-w-0 flex-1"
          />
        ) : null}

        <DateTimeField
          label={settings.pickupDateLabel}
          dateValue={checkInDate}
          timeValue={checkInTime}
          minDate={today}
          onDateChange={setCheckInDate}
          onTimeChange={setCheckInTime}
        />

        <DateTimeField
          label={settings.returnDateLabel}
          dateValue={checkOutDate}
          timeValue={checkOutTime}
          minDate={checkInDate || today}
          onDateChange={setCheckOutDate}
          onTimeChange={setCheckOutTime}
        />

        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex h-[52px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold tracking-wide text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 xl:w-auto xl:min-w-[9.5rem]"
        >
          <Car className="h-4 w-4" />
          {settings.ctaText.toUpperCase()}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {settings.showSameLocationToggle ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => setSameLocation(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            {settings.sameLocationLabel}
          </label>
        ) : (
          <span />
        )}

        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-medium">{settings.driverAgeLabel}:</span>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            {driverAgeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
