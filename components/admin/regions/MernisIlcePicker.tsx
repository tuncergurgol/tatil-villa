"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Info, Save, Search } from "lucide-react";
import {
  filterMernisIlceCodes,
  getMernisIlceByCode,
} from "@/lib/mernis-ilce";

interface MernisIlcePickerProps {
  value: string;
  onChange: (code: string) => void;
}

export default function MernisIlcePicker({
  value,
  onChange,
}: MernisIlcePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"view" | "pick">(() =>
    value ? "view" : "pick"
  );
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(!value);
  const [draftCode, setDraftCode] = useState(value);

  const confirmed = useMemo(() => getMernisIlceByCode(value), [value]);
  const draft = useMemo(() => getMernisIlceByCode(draftCode), [draftCode]);

  const results = useMemo(() => filterMernisIlceCodes(query), [query]);

  useEffect(() => {
    if (value) {
      setMode("view");
      setDraftCode(value);
    } else {
      setMode("pick");
      setDraftCode("");
    }
  }, [value]);

  useEffect(() => {
    if (mode !== "pick") return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mode]);

  function enterPickMode() {
    setMode("pick");
    setDraftCode(value);
    setQuery("");
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleConfirm() {
    if (!draftCode) return;
    onChange(draftCode);
    setQuery("");
    setIsOpen(false);
    setMode("view");
  }

  function handleCancel() {
    setDraftCode(value);
    setQuery("");
    setIsOpen(false);
    if (value) {
      setMode("view");
    }
  }

  if (mode === "view" && confirmed) {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-500">
          MERNİS İl/İlçe Kodu
        </span>
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {confirmed.label}
            </p>
          </div>
          <button
            type="button"
            onClick={enterPickMode}
            className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Değiştir
          </button>
        </div>
        <HelperText />
        <input type="hidden" name="mernisIlceCode" value={confirmed.code} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-gray-500">
          MERNİS İl/İlçe Kodu
        </span>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="İlçe veya il adı yazın..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/80 py-3 pr-10 pl-10 text-sm font-medium text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </label>

      {isOpen && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {results.map((item) => {
                const isSelected = draftCode === item.code;
                return (
                  <li key={item.code}>
                    <button
                      type="button"
                      onClick={() => setDraftCode(item.code)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-900"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">
                        {item.ilceAdi}
                        <span
                          className={
                            isSelected
                              ? "font-normal text-indigo-700/80"
                              : "font-normal text-gray-500"
                          }
                        >
                          {" "}
                          — {item.ilAdi}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isSelected
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.code}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Sonuç bulunamadı.
            </p>
          )}
        </div>
      )}

      {draft && (
        <p className="text-xs text-gray-600">
          Seçilen: <span className="font-medium text-gray-900">{draft.label}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!draftCode}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Kaydet
        </button>
        {value && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            İptal
          </button>
        )}
      </div>

      <input type="hidden" name="mernisIlceCode" value={value} />
      <HelperText />
    </div>
  );
}

function HelperText() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      İlçe adıyla aratıp 4 haneli GİB MERNİS kodunu seçin (yalnızca ilçe
      seviyesindeki bölgeler için gereklidir).
    </p>
  );
}
