"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type AgencySiteOption = {
  id: string;
  name: string;
  domain: string;
};

interface AgencySiteMultiSelectProps {
  options: AgencySiteOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function AgencySiteMultiSelect({
  options,
  selectedIds,
  onChange,
}: AgencySiteMultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggleSelect(id: string, checked: boolean) {
    if (checked) onChange([...selectedIds, id]);
    else onChange(selectedIds.filter((item) => item !== id));
  }

  const selectedLabels = options
    .filter((option) => selectedIds.includes(option.id))
    .map((option) => option.name);

  return (
    <details
      className="group relative min-w-[220px]"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex h-[42px] cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition hover:border-gray-300 focus:ring-2 focus:ring-violet-100">
        <span
          className={
            selectedIds.length > 0 ? "font-semibold text-violet-700" : "text-gray-500"
          }
        >
          {selectedIds.length > 0
            ? selectedLabels.join(", ")
            : "Site adı seçin..."}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="max-h-64 overflow-y-auto p-2">
          {options.length > 0 ? (
            options.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-violet-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleSelect(option.id, event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-violet-600"
                  />
                  <span>
                    <span className="block font-medium text-gray-900">
                      {option.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {option.domain}
                    </span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-gray-500">
              Tanımlı aktif site bulunamadı.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 px-2 py-2">
          {selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex-1 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              Seçimi temizle
            </button>
          ) : (
            <span className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            KAPAT
          </button>
        </div>
      </div>
    </details>
  );
}
