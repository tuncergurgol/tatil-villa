"use client";

import { useMemo, useState } from "react";
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
        className={
          className ||
          "text-sm font-semibold text-teal-700 transition hover:text-teal-900"
        }
      >
        Dönemlik Fiyatları Gör ({visiblePeriods.length} dönem)
      </button>
      <PeriodPricesModal
        periods={visiblePeriods}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
