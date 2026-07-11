"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import FloatingPanel from "./FloatingPanel";
import type { HeroSearchRegionOption } from "@/lib/types";

function normalizeQuery(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function filterRegions(query: string, regions: HeroSearchRegionOption[]) {
  const normalized = normalizeQuery(query.trim());
  if (!normalized) return regions.slice(0, 14);

  return regions
    .filter((region) => {
      const name = normalizeQuery(region.name);
      const label = normalizeQuery(region.label);
      return name.includes(normalized) || label.includes(normalized);
    })
    .slice(0, 14);
}

interface HeroDestinationSearchProps {
  regions: HeroSearchRegionOption[];
  value: HeroSearchRegionOption | null;
  onChange: (region: HeroSearchRegionOption | null) => void;
  onSelectComplete?: (region: HeroSearchRegionOption) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function HeroDestinationSearch({
  regions,
  value,
  onChange,
  onSelectComplete,
  open: controlledOpen,
  onOpenChange,
}: HeroDestinationSearchProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value?.label ?? "");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const suggestions = useMemo(
    () => filterRegions(query, regions),
    [query, regions]
  );

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function selectRegion(region: HeroSearchRegionOption) {
    onChange(region);
    setQuery(region.label);
    setOpen(false);
    onSelectComplete?.(region);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    setOpen(true);
    if (!next.trim()) {
      onChange(null);
    }
  }

  return (
    <div ref={rootRef} className="relative h-full w-full">
      <div
        ref={anchorRef}
        className="flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3 py-2 outline-none transition hover:shadow-sm focus-within:ring-2 focus-within:ring-sky-200 lg:h-full"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <MapPin className="h-4 w-4 shrink-0 text-sky-500" />
        <div className="min-w-0 flex-1">
          <label
            className="block text-[11px] font-normal leading-none text-gray-500"
            htmlFor="hero-destination-input"
          >
            Nereye gitmek istersin?
          </label>
          <input
            ref={inputRef}
            id="hero-destination-input"
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Bölge veya ilçe ara..."
            className="mt-1 w-full bg-transparent text-sm font-semibold leading-tight text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
            autoComplete="off"
          />
        </div>
      </div>

      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        panelRef={panelRef}
        className="rounded-2xl border border-gray-100 bg-white py-1 shadow-2xl"
      >
        {suggestions.length > 0 ? (
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((region) => (
              <li key={region.slug}>
                <button
                  type="button"
                  onClick={() => selectRegion(region)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 transition hover:bg-sky-50"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-sky-500" />
                  <span>{region.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-sm text-gray-500">
            Eşleşen bölge bulunamadı
          </p>
        )}
      </FloatingPanel>
    </div>
  );
}
