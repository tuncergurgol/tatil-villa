"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

export type FacilityCategoryOption = {
  id: string;
  name: string;
  slug: string;
  tag: string;
};

interface FacilityCategoryMultiSelectProps {
  options: FacilityCategoryOption[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
}

export default function FacilityCategoryMultiSelect({
  options,
  selectedSlugs,
  onChange,
}: FacilityCategoryMultiSelectProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (selectedSlugs.length === 0) return "Özellik";
    if (selectedSlugs.length === 1) return "1 özellik";
    return `${selectedSlugs.length} özellik`;
  }, [selectedSlugs.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function toggleSelect(slug: string, checked: boolean) {
    if (checked) {
      onChange([...selectedSlugs, slug]);
      return;
    }
    onChange(selectedSlugs.filter((item) => item !== slug));
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex min-w-[120px] items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-violet-100 ${
          selectedSlugs.length > 0
            ? "border-violet-300 bg-violet-50 text-violet-800"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" />
          {label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Özellik Seç
            </p>
            {selectedSlugs.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {options.length > 0 ? (
              options.map((option) => {
                const checked = selectedSlugs.includes(option.slug);
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        toggleSelect(option.slug, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-800">{option.name}</span>
                  </label>
                );
              })
            ) : (
              <p className="px-2 py-6 text-center text-sm text-gray-400">
                Özellik bulunamadı.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
