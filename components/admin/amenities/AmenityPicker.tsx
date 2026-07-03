"use client";

import { useMemo, useState } from "react";
import type { AmenityCategoryItem } from "@/lib/queries/amenities";

interface AmenityPickerProps {
  categories: AmenityCategoryItem[];
  selectedNames?: string[];
  isNewVilla?: boolean;
}

function isLongTextAmenity(name: string) {
  return name.length > 48;
}

export default function AmenityPicker({
  categories,
  selectedNames = [],
  isNewVilla = false,
}: AmenityPickerProps) {
  const defaultNames = useMemo(
    () =>
      categories.flatMap((category) =>
        category.amenities
          .filter((amenity) => amenity.isDefault && amenity.active)
          .map((amenity) => amenity.name)
      ),
    [categories]
  );

  const initialSelected = useMemo(() => {
    if (isNewVilla && selectedNames.length === 0) {
      return new Set(defaultNames);
    }
    return new Set(selectedNames);
  }, [defaultNames, isNewVilla, selectedNames]);

  const [selected, setSelected] = useState(initialSelected);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {categories.map((category) => (
        <section key={category.id}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
            {category.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {category.amenities
              .filter((amenity) => amenity.active)
              .map((amenity) => {
                const checked = selected.has(amenity.name);
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
                        onChange={() => toggle(amenity.name)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className={longText ? "leading-relaxed" : ""}>
                        {amenity.isDefault && (
                          <span className="mr-1 text-sky-500">★</span>
                        )}
                        {amenity.name}
                      </span>
                    </span>
                  </label>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
