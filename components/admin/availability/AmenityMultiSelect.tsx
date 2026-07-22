"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

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
  const [open, setOpen] = useState(false);
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
    <details
      className="group relative"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex h-9 cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none transition hover:border-gray-300 focus:ring-2 focus:ring-violet-100">
        <span className={selectedNames.length > 0 ? "font-semibold text-violet-700" : ""}>
          {selectedNames.length > 0
            ? `${selectedNames.length} özellik seçili`
            : "Özellik seçin..."}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:min-w-80">
        <div className="flex items-center gap-1.5 border-b border-gray-100 p-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50/80 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Özellik ara..."
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          {selectedNames.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="shrink-0 px-1 text-[11px] font-medium text-violet-600 hover:text-violet-700"
            >
              Temizle
            </button>
          ) : null}
        </div>
        <div className="grid max-h-64 grid-cols-1 gap-0.5 overflow-y-auto p-2 sm:grid-cols-2">
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
        <div className="flex items-center justify-end border-t border-gray-100 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
          >
            Kapat
          </button>
        </div>
      </div>
    </details>
  );
}
