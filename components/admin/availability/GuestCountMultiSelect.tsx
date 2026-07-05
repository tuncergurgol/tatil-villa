"use client";

import { Users } from "lucide-react";

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
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Users className="h-3.5 w-3.5 text-indigo-500" />
          Kişi Sayısı
        </div>
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
      <div className="flex flex-wrap gap-1.5 p-2">
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
  );
}
