"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import type { Villa } from "@prisma/client";

interface VillaShowcaseManagementProps {
  villa: Villa;
}

export interface VillaShowcaseManagementHandle {
  applyDefaults: () => void;
}

function ShowcaseRow({
  label,
  toggleName,
  sortName,
  checked,
  onChange,
  defaultSort,
}: {
  label: string;
  toggleName: string;
  sortName: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  defaultSort: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            checked ? "bg-emerald-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <input type="hidden" name={toggleName} value={checked ? "true" : "false"} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Sıra:</span>
        <input
          name={sortName}
          type="number"
          min={0}
          defaultValue={defaultSort}
          className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-center text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>
    </div>
  );
}

const VillaShowcaseManagement = forwardRef<
  VillaShowcaseManagementHandle,
  VillaShowcaseManagementProps
>(function VillaShowcaseManagement({ villa }, ref) {
  const [deal, setDeal] = useState(villa.deal);
  const [popular, setPopular] = useState(villa.popular);
  const [recommended, setRecommended] = useState(true);

  useImperativeHandle(
    ref,
    () => ({
      applyDefaults: () => {
        setRecommended(true);
      },
    }),
    []
  );

  return (
    <div className="space-y-3">
      <ShowcaseRow
        label="Fırsatlar"
        toggleName="deal"
        sortName="dealSortOrder"
        checked={deal}
        onChange={setDeal}
        defaultSort={villa.dealSortOrder ?? 99}
      />
      <ShowcaseRow
        label="Popüler"
        toggleName="popular"
        sortName="popularSortOrder"
        checked={popular}
        onChange={setPopular}
        defaultSort={villa.popularSortOrder ?? 99}
      />
      <ShowcaseRow
        label="Önerilerimiz"
        toggleName="recommended"
        sortName="recommendedSortOrder"
        checked={recommended}
        onChange={setRecommended}
        defaultSort={villa.recommendedSortOrder ?? 99}
      />
    </div>
  );
});

export default VillaShowcaseManagement;
