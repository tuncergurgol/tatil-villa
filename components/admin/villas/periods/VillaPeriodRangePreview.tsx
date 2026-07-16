"use client";

import { useMemo } from "react";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import {
  getMonthsBetweenDates,
  parseDateKey,
  startOfDay,
  enumerateDateKeys,
} from "@/lib/villa-period-calendar";
import { parseAmountInput } from "@/lib/villa-period-pricing";
import type { VillaPeriodAvailability } from "@/lib/villa-period-pricing";
import type { VillaPeriodCurrency } from "@/lib/villa-period-pricing";

interface VillaPeriodRangePreviewProps {
  startDate: string;
  endDate: string;
  nightlyPrice: string;
  nightlyPriceCurrency: VillaPeriodCurrency;
  availability: VillaPeriodAvailability;
}

export default function VillaPeriodRangePreview({
  startDate,
  endDate,
  nightlyPrice,
  nightlyPriceCurrency,
  availability,
}: VillaPeriodRangePreviewProps) {
  const activeDateKeys = useMemo(() => {
    if (!startDate || !endDate) return new Set<string>();
    try {
      const start = startOfDay(parseDateKey(startDate));
      const end = startOfDay(parseDateKey(endDate));
      if (start.getTime() > end.getTime()) return new Set<string>();
      return new Set(enumerateDateKeys(startDate, endDate));
    } catch {
      return new Set<string>();
    }
  }, [startDate, endDate]);

  const parsedPrice = parseAmountInput(nightlyPrice);

  const dayDisplayByDate = useMemo(() => {
    const map = new Map<string, PeriodCalendarDayDisplay>();
    if (!parsedPrice) return map;

    activeDateKeys.forEach((dateKey) => {
      map.set(dateKey, {
        periodId: "preview",
        nightlyPrice: parsedPrice,
        nightlyPriceCurrency,
        availability,
      });
    });

    return map;
  }, [activeDateKeys, parsedPrice, nightlyPriceCurrency, availability]);

  const months = useMemo(() => {
    if (!startDate || !endDate || activeDateKeys.size === 0) return [];
    try {
      const start = startOfDay(parseDateKey(startDate));
      const end = startOfDay(parseDateKey(endDate));
      return getMonthsBetweenDates(start, end);
    } catch {
      return [];
    }
  }, [startDate, endDate, activeDateKeys.size]);

  if (activeDateKeys.size === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        Periyot önizlemesi için başlangıç ve bitiş tarihlerini girin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Periyot Gün Tablosu</p>
        <p className="mt-1 text-xs text-gray-500">
          Seçilen tarih aralığındaki günlerde gecelik komisyonlu tutar ve para
          birimi gösterilir. Kayıt sonrası bu bilgiler gün tablosuna yazılır.
        </p>
      </div>

      {months.map(({ year, month }) => (
        <PeriodCalendarGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          activeDateKeys={activeDateKeys}
          dayDisplayByDate={dayDisplayByDate}
          compact
          showMonthHeader
        />
      ))}
    </div>
  );
}
