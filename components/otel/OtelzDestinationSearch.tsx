"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Hotel, Loader2, MapPin } from "lucide-react";
import type { OtelzPlaceSuggestion } from "@/lib/otelz-places";

function normalizeQuery(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

type OtelzDestinationSearchProps = {
  value: OtelzPlaceSuggestion | null;
  onChange: (place: OtelzPlaceSuggestion | null) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
};

export default function OtelzDestinationSearch({
  value,
  onChange,
  onQueryChange,
  placeholder = "Şehir, ilçe veya otel adı",
}: OtelzDestinationSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<OtelzPlaceSuggestion[]>([]);

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    const normalized = normalizeQuery(query.trim());
    if (normalized.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/otelz/suggestions?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Öneriler alınamadı");
        }
        const payload = (await response.json()) as OtelzPlaceSuggestion[];
        setSuggestions(Array.isArray(payload) ? payload : []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Öneriler alınamadı"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const showPanel = open && (loading || error != null || suggestions.length > 0);

  const emptyHint = useMemo(() => {
    if (query.trim().length < 2) {
      return "En az 2 karakter yazın";
    }
    return null;
  }, [query]);

  function handleSelect(place: OtelzPlaceSuggestion) {
    onChange(place);
    setQuery(place.label);
    onQueryChange?.(place.label);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-sky-600" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            onQueryChange?.(next);
            if (value && normalizeQuery(next) !== normalizeQuery(value.label)) {
              onChange(null);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
        />
        {loading ? (
          <Loader2 className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-sky-500" />
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-sky-100 bg-white p-2 shadow-xl shadow-sky-100/70">
          {loading ? (
            <p className="px-3 py-2 text-sm text-slate-500">Otelz önerileri yükleniyor…</p>
          ) : null}
          {error ? (
            <p className="px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}
          {!loading && !error
            ? suggestions.map((place) => {
                const Icon = place.isHotel ? Hotel : Building2;
                return (
                  <button
                    key={`${place.id}-${place.code}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(place)}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-sky-50"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {place.name}
                      </span>
                      {place.subtitle ? (
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {place.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            : null}
        </div>
      ) : null}

      {open && emptyHint && !loading ? (
        <p className="mt-1.5 text-xs text-slate-500">{emptyHint}</p>
      ) : null}
    </div>
  );
}
