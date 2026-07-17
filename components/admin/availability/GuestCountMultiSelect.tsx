"use client";

import { ChevronDown } from "lucide-react";

const GUEST_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20] as const;

interface GuestCountMultiSelectProps {
  selectedCounts: number[];
  onChange: (counts: number[]) => void;
}

export default function GuestCountMultiSelect({
  selectedCounts,
  onChange,
}: GuestCountMultiSelectProps) {
  function toggleCount(value: number, checked: boolean) {
    if (checked) onChange([...selectedCounts, value].sort((a, b) => a - b));
    else onChange(selectedCounts.filter((item) => item !== value));
  }

  return (
    <details className="group relative">
      <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:ring-2 focus:ring-indigo-100">
        <span className={selectedCounts.length > 0 ? "font-semibold text-indigo-700" : ""}>
          {selectedCounts.length > 0
            ? `${selectedCounts.join(", ")} kişi`
            : "Kişi seçin..."}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-gray-800">Kişi kapasitesi</span>
          {selectedCounts.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              Temizle
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GUEST_COUNT_OPTIONS.map((value) => {
            const checked = selectedCounts.includes(value);
            return (
              <label
                key={value}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition ${
                  checked
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => toggleCount(value, event.target.checked)}
                  className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {value}
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}
