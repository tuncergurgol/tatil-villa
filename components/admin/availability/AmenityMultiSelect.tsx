"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";

export type AmenityOption = {
  id: string;
  name: string;
};

interface AmenityMultiSelectProps {
  options: AmenityOption[];
  selectedNames: string[];
  onChange: (names: string[]) => void;
}

export default function AmenityMultiSelect({
  options,
  selectedNames,
  onChange,
}: AmenityMultiSelectProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
    const query = search.trim().toLocaleLowerCase("tr-TR");
    if (!query) return sorted;
    return sorted.filter((option) =>
      option.name.toLocaleLowerCase("tr-TR").includes(query)
    );
  }, [options, search]);

  function toggleSelect(name: string, checked: boolean) {
    if (checked) onChange([...selectedNames, name]);
    else onChange(selectedNames.filter((item) => item !== name));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Özellikler
        </div>
        {selectedNames.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] font-medium text-violet-600 hover:text-violet-700"
          >
            Temizle ({selectedNames.length})
          </button>
        ) : null}
      </div>
      <div className="border-b border-gray-100 px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Özellik ara..."
            className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>
      <div className="grid max-h-36 grid-cols-1 gap-0.5 overflow-y-auto p-2 sm:grid-cols-2">
        {filtered.length > 0 ? (
          filtered.map((option) => {
            const checked = selectedNames.includes(option.name);
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    toggleSelect(option.name, event.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="truncate text-xs text-gray-800">
                  {option.name}
                </span>
              </label>
            );
          })
        ) : (
          <p className="col-span-full px-2 py-4 text-center text-xs text-gray-400">
            {search.trim() ? "Eşleşen özellik yok." : "Olanak bulunamadı."}
          </p>
        )}
      </div>
    </div>
  );
}
