"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";
import type { FacilityCategoryOption } from "@/lib/queries/facility-categories";

interface VillaFeaturesPickerProps {
  amenityCategories: AmenityCategoryItem[];
  facilityCategories: FacilityCategoryOption[];
  selectedAmenityNames?: string[];
  selectedFacilityCategoryNames?: string[];
  isNewVilla?: boolean;
  showFacilityCategories?: boolean;
}

export interface VillaFeaturesPickerHandle {
  applyDefaults: () => void;
}

function isLongTextAmenity(name: string) {
  return name.length > 48;
}

function buildAmenityFacilityMap(categories: AmenityCategoryItem[]) {
  const map = new Map<string, string>();

  for (const category of categories) {
    for (const amenity of category.amenities) {
      if (amenity.facilityCategory?.name) {
        map.set(amenity.name, amenity.facilityCategory.name);
      }
    }
  }

  return map;
}

function resolveLinkedFacilityCategories(
  selectedAmenityNames: Set<string>,
  amenityFacilityMap: Map<string, string>
) {
  const linked = new Set<string>();

  for (const amenityName of selectedAmenityNames) {
    const facilityCategoryName = amenityFacilityMap.get(amenityName);
    if (facilityCategoryName) linked.add(facilityCategoryName);
  }

  return linked;
}

const VillaFeaturesPicker = forwardRef<
  VillaFeaturesPickerHandle,
  VillaFeaturesPickerProps
>(function VillaFeaturesPicker(
  {
    amenityCategories,
    facilityCategories,
    selectedAmenityNames = [],
    selectedFacilityCategoryNames = [],
    isNewVilla = false,
    showFacilityCategories = true,
  },
  ref
) {
  const amenityFacilityMap = useMemo(
    () => buildAmenityFacilityMap(amenityCategories),
    [amenityCategories]
  );

  const defaultAmenityNames = useMemo(
    () =>
      amenityCategories.flatMap((category) =>
        category.amenities
          .filter((amenity) => amenity.isDefault && amenity.active)
          .map((amenity) => amenity.name)
      ),
    [amenityCategories]
  );

  const initialAmenities = useMemo(() => {
    if (isNewVilla && selectedAmenityNames.length === 0) {
      return new Set(defaultAmenityNames);
    }
    return new Set(selectedAmenityNames);
  }, [defaultAmenityNames, isNewVilla, selectedAmenityNames]);

  const initialFacilityCategories = useMemo(() => {
    const linked = resolveLinkedFacilityCategories(
      initialAmenities,
      amenityFacilityMap
    );
    const manual = new Set(selectedFacilityCategoryNames);
    return new Set([...manual, ...linked]);
  }, [
    amenityFacilityMap,
    initialAmenities,
    selectedFacilityCategoryNames,
  ]);

  const [selectedAmenities, setSelectedAmenities] = useState(initialAmenities);
  const [selectedFacilityCategories, setSelectedFacilityCategories] = useState(
    initialFacilityCategories
  );

  useImperativeHandle(
    ref,
    () => ({
      applyDefaults: () => {
        const defaults = new Set(defaultAmenityNames);
        setSelectedAmenities(defaults);
        setSelectedFacilityCategories(
          resolveLinkedFacilityCategories(defaults, amenityFacilityMap)
        );
      },
    }),
    [amenityFacilityMap, defaultAmenityNames]
  );

  const lockedFacilityCategories = useMemo(
    () => resolveLinkedFacilityCategories(selectedAmenities, amenityFacilityMap),
    [amenityFacilityMap, selectedAmenities]
  );

  function toggleAmenity(name: string) {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      const linkedCategory = amenityFacilityMap.get(name);

      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }

      setSelectedFacilityCategories((current) => {
        const categories = new Set(current);

        if (linkedCategory) {
          if (next.has(name)) {
            categories.add(linkedCategory);
          } else {
            const stillLinked = [...next].some(
              (amenityName) => amenityFacilityMap.get(amenityName) === linkedCategory
            );
            if (!stillLinked) categories.delete(linkedCategory);
          }
        }

        return categories;
      });

      return next;
    });
  }

  function toggleFacilityCategory(name: string) {
    if (lockedFacilityCategories.has(name)) return;

    setSelectedFacilityCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {amenityCategories.map((category) => (
          <section key={category.id}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              {category.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.amenities
                .filter((amenity) => amenity.active)
                .map((amenity) => {
                  const checked = selectedAmenities.has(amenity.name);
                  const longText = isLongTextAmenity(amenity.name);

                  return (
                    <label
                      key={amenity.id}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-sm transition ${
                        longText ? "w-full max-w-2xl" : ""
                      } ${
                        checked
                          ? amenity.isDefault
                            ? "border-sky-400 bg-sky-50 font-semibold text-sky-800 ring-1 ring-sky-200"
                            : "border-indigo-300 bg-indigo-50 font-medium text-indigo-800"
                          : amenity.isDefault
                            ? "border-sky-200 bg-white text-gray-700 hover:border-sky-300"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          name="amenities"
                          value={amenity.name}
                          checked={checked}
                          onChange={() => toggleAmenity(amenity.name)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className={longText ? "leading-relaxed" : ""}>
                          {amenity.isDefault && (
                            <span className="mr-1 text-sky-500">★</span>
                          )}
                          {amenity.name}
                          {amenity.facilityCategory?.name && (
                            <span className="mt-1 block text-xs font-normal text-violet-600">
                              → {amenity.facilityCategory.name}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      {showFacilityCategories ? (
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
          Tesis Kategorileri
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Olanak seçildiğinde bağlı tesis kategorisi otomatik işaretlenir.
        </p>
        <div className="flex flex-wrap gap-2">
          {facilityCategories.map((category) => {
            const checked = selectedFacilityCategories.has(category.name);
            const locked = lockedFacilityCategories.has(category.name);

            return (
              <label
                key={category.id}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  checked
                    ? locked
                      ? "border-violet-400 bg-violet-50 font-semibold text-violet-800 ring-1 ring-violet-200"
                      : "border-emerald-300 bg-emerald-50 font-medium text-emerald-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                } ${locked ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="facilityCategories"
                    value={category.name}
                    checked={checked}
                    onChange={() => toggleFacilityCategory(category.name)}
                    className={`h-4 w-4 rounded border-gray-300 focus:ring-violet-500 ${
                      locked
                        ? "cursor-not-allowed text-violet-600 opacity-70"
                        : "cursor-pointer text-emerald-600"
                    }`}
                  />
                  <span>
                    {category.name}
                    {locked && (
                      <span className="ml-1 text-xs font-normal text-violet-600">
                        (olanak ile bağlı)
                      </span>
                    )}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
      ) : (
        <>
          {[...selectedFacilityCategories].map((name) => (
            <input key={name} type="hidden" name="facilityCategories" value={name} />
          ))}
        </>
      )}
    </div>
  );
});

export default VillaFeaturesPicker;
