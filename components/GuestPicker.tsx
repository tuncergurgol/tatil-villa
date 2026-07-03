"use client";

import { Minus, Plus } from "lucide-react";
import type { GuestCounts } from "@/lib/types";

interface GuestPickerProps {
  counts: GuestCounts;
  onChange: (counts: GuestCounts) => void;
}

function CounterRow({
  label,
  sublabel,
  value,
  min,
  onDecrement,
  onIncrement,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-teal-500 hover:text-teal-600 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={onIncrement}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-teal-500 hover:text-teal-600"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function GuestPicker({ counts, onChange }: GuestPickerProps) {
  const update = (key: keyof GuestCounts, delta: number, min = 0) => {
    const next = Math.max(min, counts[key] + delta);
    onChange({ ...counts, [key]: next });
  };

  return (
    <div className="divide-y divide-gray-100 px-4">
      <CounterRow
        label="Yetişkinler"
        value={counts.adults}
        min={1}
        onDecrement={() => update("adults", -1, 1)}
        onIncrement={() => update("adults", 1)}
      />
      <CounterRow
        label="Çocuklar"
        sublabel="3 - 12 yaş"
        value={counts.children}
        min={0}
        onDecrement={() => update("children", -1)}
        onIncrement={() => update("children", 1)}
      />
      <CounterRow
        label="Bebekler"
        sublabel="0 - 2 yaş"
        value={counts.babies}
        min={0}
        onDecrement={() => update("babies", -1)}
        onIncrement={() => update("babies", 1)}
      />
      <CounterRow
        label="Evcil Hayvanlar"
        value={counts.pets}
        min={0}
        onDecrement={() => update("pets", -1)}
        onIncrement={() => update("pets", 1)}
      />
    </div>
  );
}
