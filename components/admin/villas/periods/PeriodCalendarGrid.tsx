"use client";

import { useEffect, useMemo } from "react";
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
  countNightsBetween,
  isDateKeyInRange,
  normalizeDateRange,
} from "@/lib/villa-period-selection";
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

export type PeriodCalendarSelectionRange = {
  start: string;
  end: string;
};

export function countSelectionNights(
  startKey: string,
  endKey: string
): number {
  return countNightsBetween(startKey, endKey);
}

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
  selectedRange?: PeriodCalendarSelectionRange | null;
  isDragging?: boolean;
  selectableDateKeys?: ReadonlySet<string>;
  onSelectionStart?: (dateKey: string) => void;
  onSelectionUpdate?: (dateKey: string) => void;
  onSelectionComplete?: () => void;
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
  selectableDateKeys: ReadonlySet<string>;
  dayDisplayByDate: ReadonlyMap<string, PeriodCalendarDayDisplay>;
  today?: Date;
  minCellHeight: string;
  emphasizeCurrentMonth: boolean;
  selectedRange?: PeriodCalendarSelectionRange | null;
  isDragging?: boolean;
  onSelectionStart?: (dateKey: string) => void;
  onSelectionUpdate?: (dateKey: string) => void;
};

function CalendarDayCell({
  cell,
  activeDateKeys,
  selectableDateKeys,
  dayDisplayByDate,
  today,
  minCellHeight,
  emphasizeCurrentMonth,
  selectedRange,
  isDragging,
  onSelectionStart,
  onSelectionUpdate,
}: DayCellProps) {
  if (!cell) {
    return (
      <div className={`${minCellHeight} rounded-lg bg-gray-50`} />
    );
  }

  const dateKey = toDateKey(cell.date);
  const isActive = activeDateKeys.has(dateKey);
  const isSelectable = selectableDateKeys.has(dateKey);
  const display = dayDisplayByDate.get(dateKey);
  const isToday = today != null && dateKey === toDateKey(today);
  const isPeriodDay = isActive && display != null;
  const isCurrentMonthDay = emphasizeCurrentMonth && cell.inCurrentMonth;

  const isInSelection =
    selectedRange != null &&
    isDateKeyInRange(dateKey, selectedRange.start, selectedRange.end);

  const normalizedSelection =
    selectedRange != null
      ? normalizeDateRange(selectedRange.start, selectedRange.end)
      : null;

  const isSelectionEnd =
    normalizedSelection != null && dateKey === normalizedSelection.end;

  const selectionNightCount =
    normalizedSelection != null
      ? countSelectionNights(
          normalizedSelection.start,
          normalizedSelection.end
        )
      : 0;

  const visualKind = isPeriodDay
    ? resolveVillaDayVisual(
        display.occupancyStatus,
        getNeighborOccupancy(dateKey, -1, dayDisplayByDate),
        getNeighborOccupancy(dateKey, 1, dayDisplayByDate)
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
      : "text-blue-600"
    : visualStyle.useLightText
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

  function handleMouseDown(event: React.MouseEvent) {
    if (event.button !== 0 || !isSelectable) return;
    event.preventDefault();
    onSelectionStart?.(dateKey);
  }

  function handleMouseEnter() {
    if (!isDragging || !isSelectable) return;
    onSelectionUpdate?.(dateKey);
  }

  return (
    <div
      className={`${minCellHeight} relative flex flex-col overflow-hidden rounded-lg p-2 ${
        isToday ? "ring-2 ring-inset ring-indigo-400" : ""
      } ${isInSelection ? "ring-2 ring-inset ring-blue-500 z-[1]" : ""} ${
        isSelectable ? "cursor-pointer select-none" : ""
      }`}
      style={{ background }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      <div className="self-end text-right">
        <div className={`font-semibold ${daySizeClass} ${dateClass}`}>
          {cell.date.getDate()}
        </div>

        {isSelectionEnd && selectionNightCount > 0 ? (
          <div className="mt-0.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            {selectionNightCount} GECE
          </div>
        ) : null}
      </div>

      {isPeriodDay ? (
        <div
          className={`mt-auto self-start pb-0.5 text-left leading-tight ${priceClass}`}
        >
          {hasDiscount(display) ? (
            <div
              className={`flex flex-wrap items-baseline gap-x-1.5 leading-tight ${priceSizeClass}`}
            >
              <span
                className={`font-medium line-through opacity-70 ${strikePriceSizeClass}`}
              >
                {formatPlainPrice(
                  display.nightlyPrice,
                  display.nightlyPriceCurrency
                )}
              </span>
              <span className="font-semibold">
                {formatPlainPrice(
                  getDisplayPrice(display),
                  display.nightlyPriceCurrency
                )}
              </span>
            </div>
          ) : (
            <div className={`font-semibold ${priceSizeClass}`}>
              {formatPlainPrice(
                getDisplayPrice(display),
                display.nightlyPriceCurrency
              )}
            </div>
          )}
        </div>
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
  selectedRange = null,
  isDragging = false,
  selectableDateKeys,
  onSelectionStart,
  onSelectionUpdate,
  onSelectionComplete,
}: PeriodCalendarGridProps) {
  const effectiveSelectableDateKeys = selectableDateKeys ?? activeDateKeys;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseUp = () => {
      onSelectionComplete?.();
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging, onSelectionComplete]);

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

  const sharedCellProps = {
    activeDateKeys,
    selectableDateKeys: effectiveSelectableDateKeys,
    dayDisplayByDate,
    today,
    minCellHeight,
    selectedRange,
    isDragging,
    onSelectionStart,
    onSelectionUpdate,
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${
        isDragging ? "select-none" : ""
      }`}
    >
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

      <div className="flex flex-col gap-1 bg-white p-1">
        {weeks.map((week, weekIndex) => (
          <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <CalendarDayCell
                key={toDateKey(cell.date)}
                cell={cell}
                emphasizeCurrentMonth={showAdjacentMonths}
                {...sharedCellProps}
              />
            ))}
          </div>
        ))}
      </div>

      {showNextMonthWeekRow ? (
        <div className="border-t border-gray-200 bg-white p-1 pt-0">
          <div className="grid grid-cols-7 gap-1">
            {nextMonthWeekRow.map((cell, index) => (
              <CalendarDayCell
                key={cell ? toDateKey(cell.date) : `next-week-pad-${index}`}
                cell={cell}
                emphasizeCurrentMonth={false}
                {...sharedCellProps}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
