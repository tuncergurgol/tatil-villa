"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

export type AmenityGroup = {
  category: string;
  items: string[];
};

type VillaAmenitiesSectionProps = {
  groups: AmenityGroup[];
};

function isGeneralCategory(category: string) {
  return category.localeCompare("Genel", "tr", { sensitivity: "base" }) === 0;
}

function AmenityList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-slate-700"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function AllAmenitiesModal({
  groups,
  open,
  onClose,
}: {
  groups: AmenityGroup[];
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-amenities-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="all-amenities-title"
              className="text-lg font-bold text-slate-900"
            >
              Tüm Olanaklar
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {groups.reduce((sum, group) => sum + group.items.length, 0)} olanak
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
          {groups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                {group.category}
              </h3>
              <AmenityList items={group.items} />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VillaAmenitiesSection({
  groups,
}: VillaAmenitiesSectionProps) {
  const [open, setOpen] = useState(false);

  const generalGroup = groups.find((group) =>
    isGeneralCategory(group.category)
  );
  const generalItems = generalGroup?.items ?? [];
  const hasAnyAmenities = groups.some((group) => group.items.length > 0);

  if (!hasAnyAmenities) return null;

  return (
    <div>
      <h2 className="border-l-4 border-teal-700 pl-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Villa Olanakları
      </h2>

      <div className="mt-5">
        {generalItems.length > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-slate-800">Genel</h3>
            <div className="mt-2">
              <AmenityList items={generalItems} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Genel olanak listesi boş. Tüm olanakları görüntülemek için butona
            tıklayın.
          </p>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-full bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100 hover:ring-sky-300"
        >
          Tüm Olanaklar
        </button>
      </div>

      <AllAmenitiesModal
        groups={groups}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
