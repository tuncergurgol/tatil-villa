"use client";

import { useMemo } from "react";
import {
  buildMonthGrid,
  buildNextMonthFirstWeekRow,
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
  showAdjacentMonths?: boolean;
  showNextMonthWeekRow?: boolean;
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

type DayCellProps = {
  cell: { date: Date; inCurrentMonth: boolean } | null;
  activeDateKeys: ReadonlySet<string>;
  dayDisplayByDate: ReadonlyMap<string, PeriodCalendarDayDisplay>;
  today?: Date;
  minCellHeight: string;
  emphasizeCurrentMonth: boolean;
};

function CalendarDayCell({
  cell,
  activeDateKeys,
  dayDisplayByDate,
  today,
  minCellHeight,
  emphasizeCurrentMonth,
}: DayCellProps) {
  if (!cell) {
    return (
      <div
        className={`${minCellHeight} border-r border-gray-100 bg-gray-50 last:border-r-0`}
      />
    );
  }

  const dateKey = toDateKey(cell.date);
  const isActive = activeDateKeys.has(dateKey);
  const display = dayDisplayByDate.get(dateKey);
  const isToday = today != null && dateKey === toDateKey(today);
  const isPeriodDay = isActive && display != null;
  const isClosed = isPeriodDay && display.availability === "closed";
  const isCurrentMonthDay = emphasizeCurrentMonth && cell.inCurrentMonth;

  const visualKind = isPeriodDay
    ? resolveVillaDayVisual(
        display.occupancyStatus,
        getNeighborOccupancy(dateKey, -1, dayDisplayByDate),
        getNeighborOccupancy(dateKey, 1, dayDisplayByDate),
        display.availability
      )
    : "empty";

  const visualStyle = getVillaDayVisualStyle(visualKind);

  const dateClass = isCurrentMonthDay
    ? visualStyle.useLightText
      ? "text-white"
      : "text-gray-900"
    : visualStyle.useLightText
      ? "text-white/90"
      : "text-gray-500";

  const priceClass = isCurrentMonthDay
    ? visualStyle.useLightText
      ? "text-white"
      : isClosed
        ? "text-white"
        : "text-blue-600"
    : visualStyle.useLightText
      ? "text-white/90"
      : isClosed
        ? "text-white/90"
        : "text-blue-500";

  const daySizeClass = isCurrentMonthDay ? "text-lg" : "text-xs";
  const priceSizeClass = isCurrentMonthDay ? "text-base" : "text-[10px]";
  const strikePriceSizeClass = isCurrentMonthDay ? "text-xs" : "text-[9px]";

  const background = isPeriodDay
    ? visualStyle.background
    : cell.inCurrentMonth
      ? "#ffffff"
      : "#f9fafb";

  return (
    <div
      className={`${minCellHeight} relative flex flex-col border-r border-gray-100 p-2 last:border-r-0 ${
        isToday ? "ring-2 ring-inset ring-indigo-400" : ""
      }`}
      style={{ background }}
    >
      <div className={`font-semibold ${daySizeClass} ${dateClass}`}>
        {cell.date.getDate()}
      </div>

      {isPeriodDay ? (
        isClosed ? (
          <div
            className={`mt-auto self-end pb-0.5 text-right font-bold uppercase tracking-wide ${priceClass} ${
              isCurrentMonthDay ? "text-xs" : "text-[9px]"
            }`}
          >
            Kapalı
          </div>
        ) : (
          <div
            className={`mt-auto self-end pb-0.5 text-right leading-tight ${priceClass}`}
          >
            {hasDiscount(display) ? (
              <>
                <div
                  className={`font-medium line-through opacity-70 ${strikePriceSizeClass}`}
                >
                  {formatPlainPrice(
                    display.nightlyPrice,
                    display.nightlyPriceCurrency
                  )}
                </div>
                <div className={`font-semibold ${priceSizeClass}`}>
                  {formatPlainPrice(
                    getDisplayPrice(display),
                    display.nightlyPriceCurrency
                  )}
                </div>
              </>
            ) : (
              <div className={`font-semibold ${priceSizeClass}`}>
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
}

export default function PeriodCalendarGrid({
  year,
  month,
  activeDateKeys,
  dayDisplayByDate,
  today,
  compact = false,
  showMonthHeader = false,
  showAdjacentMonths = true,
  showNextMonthWeekRow = true,
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

  const nextMonthWeekRow = useMemo(
    () => buildNextMonthFirstWeekRow(year, month),
    [year, month]
  );

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
            {week.map((cell) => (
              <CalendarDayCell
                key={toDateKey(cell.date)}
                cell={cell}
                activeDateKeys={activeDateKeys}
                dayDisplayByDate={dayDisplayByDate}
                today={today}
                minCellHeight={minCellHeight}
                emphasizeCurrentMonth={showAdjacentMonths}
              />
            ))}
          </div>
        ))}
      </div>

      {showNextMonthWeekRow ? (
        <div className="border-t border-gray-200 bg-white">
          <div className="grid grid-cols-7">
            {nextMonthWeekRow.map((cell, index) => (
              <CalendarDayCell
                key={cell ? toDateKey(cell.date) : `next-week-pad-${index}`}
                cell={cell}
                activeDateKeys={activeDateKeys}
                dayDisplayByDate={dayDisplayByDate}
                today={today}
                minCellHeight={minCellHeight}
                emphasizeCurrentMonth={false}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
