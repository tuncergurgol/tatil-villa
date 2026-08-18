"use client";

import { Minus, Plus } from "lucide-react";
import type { GuestCounts } from "@/lib/types";

const GUEST_LIMITS = {
  adults: { min: 1, max: 12 },
  children: { min: 0, max: 10 },
  babies: { min: 0, max: 10 },
  pets: { min: 0, max: 3 },
} as const;

interface GuestPickerProps {
  counts: GuestCounts;
  onChange: (counts: GuestCounts) => void;
  showPets?: boolean;
  maxGuests?: number;
  onConfirm?: () => void;
  confirmLabel?: string;
}

function CounterRow({
  label,
  sublabel,
  value,
  min,
  max,
  onDecrement,
  onIncrement,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sublabel && <p className="text-[11px] text-gray-500">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-rose-700/70 text-rose-700 transition hover:bg-rose-50 disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          <Minus className="h-3 w-3 stroke-[2.5]" />
        </button>
        <span className="w-5 text-center text-sm font-semibold text-gray-900">
          {value}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={value >= max}
          className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-rose-700/70 text-rose-700 transition hover:bg-rose-50 disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          <Plus className="h-3 w-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export default function GuestPicker({
  counts,
  onChange,
  showPets = true,
  maxGuests,
  onConfirm,
  confirmLabel = "Tamam",
}: GuestPickerProps) {
  /** Yetişkin + çocuk kapasitesi; bebek ve evcil hayvan dahil değil */
  const capacityTotal = maxGuests ?? GUEST_LIMITS.adults.max;
  const adultMax = Math.max(
    GUEST_LIMITS.adults.min,
    capacityTotal - counts.children
  );
  const childMax = Math.max(0, capacityTotal - counts.adults);

  const update = (
    key: keyof GuestCounts,
    delta: number,
    limits: { min: number; max: number }
  ) => {
    const next = Math.min(
      limits.max,
      Math.max(limits.min, counts[key] + delta)
    );
    onChange({ ...counts, [key]: next });
  };

  return (
    <div>
      <div className="divide-y divide-gray-100 px-4 py-1">
        <CounterRow
          label="Yetişkinler"
          value={counts.adults}
          min={GUEST_LIMITS.adults.min}
          max={adultMax}
          onDecrement={() =>
            update("adults", -1, {
              min: GUEST_LIMITS.adults.min,
              max: adultMax,
            })
          }
          onIncrement={() =>
            update("adults", 1, {
              min: GUEST_LIMITS.adults.min,
              max: adultMax,
            })
          }
        />
        <CounterRow
          label="Çocuklar"
          sublabel="3 - 12 yaş"
          value={counts.children}
          min={GUEST_LIMITS.children.min}
          max={childMax}
          onDecrement={() =>
            update("children", -1, {
              min: GUEST_LIMITS.children.min,
              max: childMax,
            })
          }
          onIncrement={() =>
            update("children", 1, {
              min: GUEST_LIMITS.children.min,
              max: childMax,
            })
          }
        />
        <CounterRow
          label="Bebekler"
          sublabel="0 - 2 yaş · kapasiteye dahil değil"
          value={counts.babies}
          min={GUEST_LIMITS.babies.min}
          max={GUEST_LIMITS.babies.max}
          onDecrement={() => update("babies", -1, GUEST_LIMITS.babies)}
          onIncrement={() => update("babies", 1, GUEST_LIMITS.babies)}
        />
        {showPets ? (
          <CounterRow
            label="Evcil Hayvanlar"
            sublabel="Kapasiteye dahil değil"
            value={counts.pets}
            min={GUEST_LIMITS.pets.min}
            max={GUEST_LIMITS.pets.max}
            onDecrement={() => update("pets", -1, GUEST_LIMITS.pets)}
            onIncrement={() => update("pets", 1, GUEST_LIMITS.pets)}
          />
        ) : null}
      </div>

      {onConfirm ? (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            {confirmLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
