"use client";

import { useMemo } from "react";
import {
  buildMonthGrid,
  formatPlainPrice,
  getMonthLabel,
  getWeekdayLabels,
  parseDateKey,
  toDateKey,
} from "@/lib/villa-period-calendar";
import {
  getVillaDayVisualStyle,
  resolveVillaDayVisual,
} from "@/lib/villa-period-day-visual";
import type { VillaPeriodAvailability } from "@/lib/villa-period-pricing";
import type { VillaPeriodCurrency } from "@/lib/villa-period-pricing";
import type { VillaDayOccupancy } from "@prisma/client";

export type PeriodCalendarDayDisplay = {
  periodId: string;
  nightlyPrice: number;
  discountedNightlyPrice?: number | null;
  nightlyPriceCurrency: VillaPeriodCurrency;
  availability: VillaPeriodAvailability;
  occupancyStatus?: VillaDayOccupancy;
};

interface PeriodCalendarGridProps {
  year: number;
  month: number;
  activeDateKeys: ReadonlySet<string>;
  dayDisplayByDate: ReadonlyMap<string, PeriodCalendarDayDisplay>;
  today?: Date;
  compact?: boolean;
  showMonthHeader?: boolean;
}

function getDisplayPrice(display: PeriodCalendarDayDisplay): number {
  return display.discountedNightlyPrice ?? display.nightlyPrice;
}

function hasDiscount(display: PeriodCalendarDayDisplay): boolean {
  return (
    display.discountedNightlyPrice != null &&
    display.discountedNightlyPrice !== display.nightlyPrice
  );
}

function getNeighborOccupancy(
  dateKey: string,
  offset: -1 | 1,
  dayDisplayByDate: ReadonlyMap<string, PeriodCalendarDayDisplay>
): VillaDayOccupancy | undefined {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return dayDisplayByDate.get(toDateKey(date))?.occupancyStatus;
}

export default function PeriodCalendarGrid({
  year,
  month,
  activeDateKeys,
  dayDisplayByDate,
  today,
  compact = false,
  showMonthHeader = false,
}: PeriodCalendarGridProps) {
  const monthCells = useMemo(
    () => buildMonthGrid(year, month),
    [year, month]
  );

  const weeks = useMemo(() => {
    const rows: (typeof monthCells)[] = [];
    for (let index = 0; index < monthCells.length; index += 7) {
      rows.push(monthCells.slice(index, index + 7));
    }
    return rows;
  }, [monthCells]);

  const minCellHeight = compact ? "min-h-[72px]" : "min-h-[96px]";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {showMonthHeader ? (
        <div className="border-b border-gray-100 bg-white px-3 py-2">
          <p className="text-sm font-semibold text-gray-800">
            {getMonthLabel(year, month)}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
        {getWeekdayLabels().map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-gray-200 bg-white">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7">
            {week.map((cell) => {
              const dateKey = toDateKey(cell.date);
              const isActive = activeDateKeys.has(dateKey);
              const display = dayDisplayByDate.get(dateKey);
              const isToday =
                today != null && dateKey === toDateKey(today);
              const isPeriodDay = isActive && display && cell.inCurrentMonth;
              const isClosed =
                isPeriodDay && display.availability === "closed";

              const visualKind = isPeriodDay
                ? resolveVillaDayVisual(
                    display.occupancyStatus,
                    getNeighborOccupancy(dateKey, -1, dayDisplayByDate),
                    getNeighborOccupancy(dateKey, 1, dayDisplayByDate),
                    display.availability
                  )
                : "empty";

              const visualStyle = getVillaDayVisualStyle(
                cell.inCurrentMonth ? visualKind : "empty"
              );

              const dateClass = !cell.inCurrentMonth
                ? "text-gray-300"
                : visualStyle.useLightText
                  ? "text-white"
                  : "text-gray-800";

              const priceClass = !cell.inCurrentMonth
                ? "text-gray-300"
                : visualStyle.useLightText
                  ? "text-white"
                  : isClosed
                    ? "text-white"
                    : "text-blue-600";

              return (
                <div
                  key={dateKey}
                  className={`${minCellHeight} relative flex flex-col border-r border-gray-100 p-2 last:border-r-0 ${
                    isToday ? "ring-2 ring-inset ring-indigo-400" : ""
                  }`}
                  style={{
                    background: cell.inCurrentMonth
                      ? visualStyle.background
                      : "#f9fafb",
                  }}
                >
                  <div className={`text-sm font-semibold ${dateClass}`}>
                    {cell.date.getDate()}
                  </div>

                  {isPeriodDay ? (
                    isClosed ? (
                      <div className="mt-auto self-end pb-0.5 text-right text-[10px] font-bold uppercase tracking-wide text-white">
                        Kapalı
                      </div>
                    ) : (
                      <div
                        className={`mt-auto self-end pb-0.5 text-right leading-tight ${priceClass}`}
                      >
                        {hasDiscount(display) ? (
                          <>
                            <div className="text-[9px] font-medium line-through opacity-70">
                              {formatPlainPrice(
                                display.nightlyPrice,
                                display.nightlyPriceCurrency
                              )}
                            </div>
                            <div className="text-[11px] font-semibold">
                              {formatPlainPrice(
                                getDisplayPrice(display),
                                display.nightlyPriceCurrency
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] font-semibold">
                            {formatPlainPrice(
                              getDisplayPrice(display),
                              display.nightlyPriceCurrency
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
