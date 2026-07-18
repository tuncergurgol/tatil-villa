"use client";

import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import PeriodPricesModal, {
  filterCurrentAndFuturePeriods,
  type PeriodPriceItem,
} from "@/components/villa-detail/PeriodPricesModal";

type PeriodPricesTriggerProps = {
  periods: PeriodPriceItem[];
  className?: string;
};

export default function PeriodPricesTrigger({
  periods,
  className = "",
}: PeriodPricesTriggerProps) {
  const [open, setOpen] = useState(false);
  const visiblePeriods = useMemo(
    () => filterCurrentAndFuturePeriods(periods),
    [periods]
  );

  if (visiblePeriods.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50 to-teal-100/80 px-3.5 py-2.5 text-sm font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:from-teal-100 hover:to-teal-50 hover:text-teal-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${className}`}
      >
        <CalendarRange className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
        Dönemlik Fiyatları Gör
      </button>
      <PeriodPricesModal
        periods={visiblePeriods}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
