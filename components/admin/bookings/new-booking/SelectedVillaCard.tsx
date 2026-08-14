"use client";

import Image from "next/image";
import { Bath, BedDouble, ChevronRight, Pencil, Users } from "lucide-react";
import type { AdminBookingWizardVilla } from "@/lib/queries/admin-booking-wizard";

interface SelectedVillaCardProps {
  villa: AdminBookingWizardVilla;
  onChange?: () => void;
  selectable?: boolean;
  onSelect?: () => void;
}

export default function SelectedVillaCard({
  villa,
  onChange,
  selectable = false,
  onSelect,
}: SelectedVillaCardProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 ${
        selectable ? "cursor-pointer transition hover:border-blue-200 hover:bg-blue-50/30" : ""
      }`}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onSelect?.();
            }
          : undefined
      }
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {villa.image ? (
          <Image
            src={villa.image}
            alt={villa.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
            IMG
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-gray-900">{villa.name}</p>
        <p className="truncate text-xs text-gray-500">
          {villa.regionName || villa.location}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {villa.guests}
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {villa.bedrooms}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {villa.bathrooms}
          </span>
        </div>
      </div>
      {onChange ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange();
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Değiştir
        </button>
      ) : selectable ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      ) : null}
    </div>
  );
}
