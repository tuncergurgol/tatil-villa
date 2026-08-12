"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Region } from "@/lib/types";
import { buildVillaSearchHref } from "@/lib/villa-search-params";

interface FilterAmenity {
  name: string;
  count: number;
}

interface FilterCategory {
  value: string;
  label: string;
  count: number;
}

interface FilterFacility {
  name: string;
  count: number;
}

interface VillaSearchSidebarProps {
  regions: Region[];
  categories: FilterCategory[];
  facilities: FilterFacility[];
  amenities: FilterAmenity[];
  currentParams: Record<string, string | undefined>;
  className?: string;
}

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 py-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-900"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function buildHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | null>
) {
  const shouldResetPage = Object.keys(patch).some((key) => key !== "page");
  return buildVillaSearchHref(current, {
    ...patch,
    ...(shouldResetPage && !("page" in patch) ? { page: null } : {}),
  });
}

function CheckboxRow({
  active,
  label,
  count,
}: {
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <span className="flex w-full items-center justify-between">
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border ${
            active
              ? "border-sky-500 bg-sky-500 text-[10px] text-white"
              : "border-gray-300"
          }`}
        >
          {active ? "✓" : ""}
        </span>
        {label}
      </span>
      <span className="text-xs text-gray-400">({count})</span>
    </span>
  );
}

export default function VillaSearchSidebar({
  regions,
  categories,
  facilities,
  amenities,
  currentParams,
  className = "",
}: VillaSearchSidebarProps) {
  const router = useRouter();
  const [minPrice, setMinPrice] = useState(currentParams.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(currentParams.maxPrice ?? "");

  const selectedAmenities = useMemo(
    () =>
      new Set(
        (currentParams.amenities ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    [currentParams.amenities]
  );

  const selectedFacilities = useMemo(
    () =>
      new Set(
        (currentParams.facilities ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      ),
    [currentParams.facilities]
  );

  const sortedRegions = useMemo(
    () =>
      [...regions]
        .filter((region) => region.villaCount > 0)
        .sort(
          (a, b) =>
            b.villaCount - a.villaCount ||
            a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
        ),
    [regions]
  );

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.count > 0),
    [categories]
  );

  const visibleFacilities = useMemo(
    () => facilities.filter((facility) => facility.count > 0),
    [facilities]
  );

  const visibleAmenities = useMemo(
    () => amenities.filter((amenity) => amenity.count > 0),
    [amenities]
  );

  function applyPrice() {
    router.push(
      buildHref(currentParams, {
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
      })
    );
  }

  function toggleAmenity(name: string) {
    const next = new Set(selectedAmenities);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    const value = Array.from(next).join(",");
    router.push(
      buildHref(currentParams, {
        amenities: value || null,
      })
    );
  }

  function toggleFacility(name: string) {
    const next = new Set(selectedFacilities);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    const value = Array.from(next).join(",");
    router.push(
      buildHref(currentParams, {
        facilities: value || null,
      })
    );
  }

  return (
    <aside className={`w-full shrink-0 lg:w-[280px] ${className}`}>
      <div className="rounded-2xl border border-gray-100 bg-white px-4 shadow-sm">
        <FilterSection title="Fiyat Aralığı">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min."
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-sky-400"
            />
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Maks."
              className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none focus:border-sky-400"
            />
            <button
              type="button"
              onClick={applyPrice}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white transition hover:bg-sky-600"
              aria-label="Fiyat uygula"
            >
              →
            </button>
          </div>
        </FilterSection>

        <FilterSection title="Bölge">
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {sortedRegions.map((region) => {
              const active = currentParams.region === region.slug;
              return (
                <li key={region.id}>
                  <Link
                    href={buildHref(currentParams, {
                      region: active ? null : region.slug,
                      sort: active ? null : "random",
                    })}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition ${
                      active
                        ? "bg-sky-50 font-medium text-sky-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CheckboxRow
                      active={active}
                      label={region.name}
                      count={region.villaCount}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterSection>

        <FilterSection title="Ev Tipi">
          <ul className="space-y-1.5">
            {visibleCategories.map((category) => {
              const active = currentParams.category === category.value;
              return (
                <li key={category.value}>
                  <Link
                    href={buildHref(currentParams, {
                      category: active ? null : category.value,
                    })}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition ${
                      active
                        ? "bg-sky-50 font-medium text-sky-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CheckboxRow
                      active={active}
                      label={category.label}
                      count={category.count}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </FilterSection>

        <FilterSection title="Villa Kategorileri">
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {visibleFacilities.map((facility) => {
              const active = selectedFacilities.has(facility.name);
              return (
                <li key={facility.name}>
                  <button
                    type="button"
                    onClick={() => toggleFacility(facility.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active
                        ? "bg-sky-50 font-medium text-sky-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CheckboxRow
                      active={active}
                      label={facility.name}
                      count={facility.count}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterSection>

        <FilterSection title="Olanaklar">
          <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {visibleAmenities.map((amenity) => {
              const active = selectedAmenities.has(amenity.name);
              return (
                <li key={amenity.name}>
                  <button
                    type="button"
                    onClick={() => toggleAmenity(amenity.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      active
                        ? "bg-sky-50 font-medium text-sky-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <CheckboxRow
                      active={active}
                      label={amenity.name}
                      count={amenity.count}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      </div>
    </aside>
  );
}
