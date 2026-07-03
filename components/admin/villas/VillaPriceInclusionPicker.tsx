"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import type { PriceInclusionItem } from "@/lib/queries/price-inclusion";

interface VillaPriceInclusionPickerProps {
  items: PriceInclusionItem[];
  selectedIds: string[];
}

export interface VillaPriceInclusionPickerHandle {
  applyDefaults: () => void;
}

const VillaPriceInclusionPicker = forwardRef<
  VillaPriceInclusionPickerHandle,
  VillaPriceInclusionPickerProps
>(function VillaPriceInclusionPicker({ items, selectedIds }, ref) {
  const defaultIds = useMemo(
    () => items.filter((item) => item.isDefault).map((item) => item.id),
    [items]
  );

  const initial = useMemo(() => {
    if (selectedIds.length > 0) return new Set(selectedIds);
    return new Set(defaultIds);
  }, [defaultIds, selectedIds]);

  const [selected, setSelected] = useState(initial);

  useImperativeHandle(
    ref,
    () => ({
      applyDefaults: () => {
        setSelected(new Set(defaultIds));
      },
    }),
    [defaultIds]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeItems = items.filter((item) => item.active);

  return (
    <div className="space-y-2">
      {activeItems.map((item) => {
        const checked = selected.has(item.id);
        return (
          <label
            key={item.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
              checked
                ? "border-teal-300 bg-teal-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                checked
                  ? "border-teal-600 bg-teal-600"
                  : "border-gray-300 bg-white"
              }`}
            >
              {checked ? (
                <span className="h-2 w-2 rounded-full bg-white" />
              ) : null}
            </span>
            <input
              type="checkbox"
              name="priceInclusionIds"
              value={item.id}
              checked={checked}
              onChange={() => toggle(item.id)}
              className="sr-only"
            />
            <span className="text-sm text-gray-800">
              {item.isDefault ? (
                <span className="mr-1 text-sky-500">★</span>
              ) : null}
              {item.description}
            </span>
          </label>
        );
      })}
    </div>
  );
});

export default VillaPriceInclusionPicker;
