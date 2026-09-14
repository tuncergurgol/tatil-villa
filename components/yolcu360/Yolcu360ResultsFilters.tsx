"use client";

import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CarSearchFacets, CarSearchFilterState } from "@/lib/yolcu360/search-filters";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";

type Yolcu360ResultsFiltersProps = {
  facets: CarSearchFacets;
  filters: CarSearchFilterState;
  onChange: (next: CarSearchFilterState) => void;
  onClear: () => void;
};

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-slate-200 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
    </section>
  );
}

function FilterCheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) {
    return <p className="text-xs text-slate-500">Seçenek yok</p>;
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option.value)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
            />
            <span className="flex-1 leading-5">
              {option.label}
              <span className="ml-1 text-xs text-slate-400">({option.count})</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function FilterPriceRange({
  facets,
  filters,
  onChange,
}: {
  facets: CarSearchFacets;
  filters: CarSearchFilterState;
  onChange: (next: CarSearchFilterState) => void;
}) {
  const { min, max } = facets.priceRange;
  const currentMin = filters.priceMin ?? min;
  const currentMax = filters.priceMax ?? max;

  if (min === max) {
    return (
      <p className="text-xs text-slate-500">
        Tüm araçlar {formatYolcu360Money(min, "TRY")} civarında
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{formatYolcu360Money(currentMin, "TRY")}</span>
        <span>{formatYolcu360Money(currentMax, "TRY")}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs text-slate-500">Min</span>
          <input
            type="range"
            min={min}
            max={max}
            step={100}
            value={currentMin}
            onChange={(event) =>
              onChange({
                ...filters,
                priceMin: Math.min(Number(event.target.value), currentMax),
              })
            }
            className="w-full accent-teal-700"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-slate-500">Max</span>
          <input
            type="range"
            min={min}
            max={max}
            step={100}
            value={currentMax}
            onChange={(event) =>
              onChange({
                ...filters,
                priceMax: Math.max(Number(event.target.value), currentMin),
              })
            }
            className="w-full accent-teal-700"
          />
        </label>
      </div>
    </div>
  );
}

function FiltersPanel({
  facets,
  filters,
  onChange,
  onClear,
}: Yolcu360ResultsFiltersProps) {
  const seatOptions = useMemo(
    () =>
      facets.seats.map((option) => ({
        ...option,
        label: `${option.label} koltuk`,
      })),
    [facets.seats]
  );

  function toggleStringArray(
    key: keyof Pick<
      CarSearchFilterState,
      | "transmission"
      | "fuel"
      | "carClass"
      | "brand"
      | "model"
      | "vendor"
      | "km"
      | "deposit"
      | "delivery"
    >,
    value: string
  ) {
    const selected = filters[key];
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];

    const patch: Partial<CarSearchFilterState> = { [key]: next };
    if (key === "brand") {
      patch.model = filters.model.filter((model) =>
        facets.model.some((option) => option.value === model)
      );
    }

    onChange({ ...filters, ...patch });
  }

  function toggleSeat(value: string) {
    const seat = Number(value);
    const next = filters.seats.includes(seat)
      ? filters.seats.filter((item) => item !== seat)
      : [...filters.seats, seat];
    onChange({ ...filters, seats: next });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900">Filtrele</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          Temizle
        </button>
      </div>

      <FilterSection title="Vites tipi">
        <FilterCheckboxGroup
          options={facets.transmission}
          selected={filters.transmission}
          onToggle={(value) => toggleStringArray("transmission", value)}
        />
      </FilterSection>

      <FilterSection title="Yakıt tipi">
        <FilterCheckboxGroup
          options={facets.fuel}
          selected={filters.fuel}
          onToggle={(value) => toggleStringArray("fuel", value)}
        />
      </FilterSection>

      <FilterSection title="Araç sınıfı">
        <FilterCheckboxGroup
          options={facets.carClass}
          selected={filters.carClass}
          onToggle={(value) => toggleStringArray("carClass", value)}
        />
      </FilterSection>

      <FilterSection title="Marka">
        <FilterCheckboxGroup
          options={facets.brand}
          selected={filters.brand}
          onToggle={(value) => toggleStringArray("brand", value)}
        />
      </FilterSection>

      <FilterSection title="Model" defaultOpen={filters.brand.length > 0}>
        <FilterCheckboxGroup
          options={facets.model}
          selected={filters.model}
          onToggle={(value) => toggleStringArray("model", value)}
        />
      </FilterSection>

      <FilterSection title="Kiralama şirketi">
        <FilterCheckboxGroup
          options={facets.vendor}
          selected={filters.vendor}
          onToggle={(value) => toggleStringArray("vendor", value)}
        />
      </FilterSection>

      <FilterSection title="Koltuk sayısı">
        <FilterCheckboxGroup
          options={seatOptions}
          selected={filters.seats.map(String)}
          onToggle={toggleSeat}
        />
      </FilterSection>

      <FilterSection title="Fiyat aralığı">
        <FilterPriceRange facets={facets} filters={filters} onChange={onChange} />
      </FilterSection>

      <FilterSection title="KM sınırı">
        <FilterCheckboxGroup
          options={facets.km}
          selected={filters.km}
          onToggle={(value) => toggleStringArray("km", value)}
        />
      </FilterSection>

      <FilterSection title="Depozito">
        <FilterCheckboxGroup
          options={facets.deposit}
          selected={filters.deposit}
          onToggle={(value) => toggleStringArray("deposit", value)}
        />
      </FilterSection>

      <FilterSection title="Teslim şekli">
        <FilterCheckboxGroup
          options={facets.delivery}
          selected={filters.delivery}
          onToggle={(value) => toggleStringArray("delivery", value)}
        />
      </FilterSection>
    </div>
  );
}

export default function Yolcu360ResultsFilters(props: Yolcu360ResultsFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrele
        </button>
      </div>

      <div className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
        <FiltersPanel {...props} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Filtreleri kapat"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-bold text-slate-900">Filtreler</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FiltersPanel
                {...props}
                onChange={(next) => {
                  props.onChange(next);
                }}
                onClear={() => {
                  props.onClear();
                  setMobileOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
