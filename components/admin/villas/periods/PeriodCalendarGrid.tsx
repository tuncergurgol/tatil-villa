"use client";

import { useMemo } from "react";
import {
  buildMonthGrid,
  formatPlainPrice,
  getMonthLabel,
  getWeekdayLabels,
  toDateKey,
} from "@/lib/villa-period-calendar";
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
  periodColorIndex?: ReadonlyMap<string, number>;
  today?: Date;
  compact?: boolean;
  showMonthHeader?: boolean;
}

const PERIOD_PALETTE = [
  {
    band: "bg-rose-500",
    cell: "bg-rose-500",
    prev: "from-rose-400",
    next: "to-rose-500",
  },
  {
    band: "bg-red-400",
    cell: "bg-red-400",
    prev: "from-rose-500",
    next: "to-red-400",
  },
  {
    band: "bg-pink-500",
    cell: "bg-pink-500",
    prev: "from-red-400",
    next: "to-pink-500",
  },
  {
    band: "bg-rose-400",
    cell: "bg-rose-400",
    prev: "from-pink-500",
    next: "to-rose-400",
  },
] as const;

const OCCUPANCY_STYLES = {
  BOOKED: {
    cell: "bg-red-700",
    band: "bg-red-700",
    label: "Dolu",
  },
  OPTION: {
    cell: "bg-amber-500",
    band: "bg-amber-500",
    label: "Opsiyon",
  },
  EMPTY: null,
} as const;

function getDisplayPrice(display: PeriodCalendarDayDisplay): number {
  return display.discountedNightlyPrice ?? display.nightlyPrice;
}

function hasDiscount(display: PeriodCalendarDayDisplay): boolean {
  return (
    display.discountedNightlyPrice != null &&
    display.discountedNightlyPrice !== display.nightlyPrice
  );
}

function getOccupancyStyle(occupancy?: VillaDayOccupancy) {
  if (!occupancy || occupancy === "EMPTY") return null;
  return OCCUPANCY_STYLES[occupancy];
}

function getPaletteIndex(
  periodId: string,
  periodColorIndex?: ReadonlyMap<string, number>
) {
  if (periodColorIndex?.has(periodId)) {
    return periodColorIndex.get(periodId)! % PERIOD_PALETTE.length;
  }
  return 0;
}

type WeekSegment = {
  periodId: string;
  startIndex: number;
  endIndex: number;
  display: PeriodCalendarDayDisplay;
};

function buildWeekSegments(
  week: ReturnType<typeof buildMonthGrid>,
  dayDisplayByDate: ReadonlyMap<string, PeriodCalendarDayDisplay>
) {
  const segments: WeekSegment[] = [];

  week.forEach((cell, index) => {
    if (!cell.inCurrentMonth) return;

    const display = dayDisplayByDate.get(toDateKey(cell.date));
    if (!display || display.availability === "closed") return;

    const last = segments[segments.length - 1];
    if (last && last.periodId === display.periodId) {
      last.endIndex = index;
      return;
    }

    segments.push({
      periodId: display.periodId,
      startIndex: index,
      endIndex: index,
      display,
    });
  });

  return segments;
}

export default function PeriodCalendarGrid({
  year,
  month,
  activeDateKeys,
  dayDisplayByDate,
  periodColorIndex,
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

  const minCellHeight = compact ? "min-h-[68px]" : "min-h-[96px]";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {showMonthHeader ? (
        <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-sm font-semibold text-gray-800">
            {getMonthLabel(year, month)}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {getWeekdayLabels().map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-gray-200">
        {weeks.map((week, weekIndex) => {
          const segments = buildWeekSegments(week, dayDisplayByDate);

          return (
            <div key={`week-${weekIndex}`}>
              {segments.length > 0 ? (
                <div className="grid grid-cols-7 gap-px bg-white px-px pt-px">
                  {segments.map((segment) => {
                    const palette =
                      PERIOD_PALETTE[
                        getPaletteIndex(segment.periodId, periodColorIndex)
                      ];

                    return (
                      <div
                        key={`${segment.periodId}-${segment.startIndex}-${weekIndex}`}
                        className={`${palette.band} py-1 text-center text-[11px] font-semibold text-white`}
                        style={{
                          gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
                        }}
                      >
                        {formatPlainPrice(
                          getDisplayPrice(segment.display),
                          segment.display.nightlyPriceCurrency
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="grid grid-cols-7">
                {week.map((cell, index) => {
                  const dateKey = toDateKey(cell.date);
                  const isActive = activeDateKeys.has(dateKey);
                  const display = dayDisplayByDate.get(dateKey);
                  const isToday =
                    today != null && dateKey === toDateKey(today);

                  const prevDisplay =
                    index > 0
                      ? dayDisplayByDate.get(toDateKey(week[index - 1].date))
                      : null;

                  const paletteIndex =
                    display != null
                      ? getPaletteIndex(display.periodId, periodColorIndex)
                      : 0;
                  const palette = PERIOD_PALETTE[paletteIndex];
                  const prevPaletteIndex =
                    prevDisplay != null
                      ? getPaletteIndex(prevDisplay.periodId, periodColorIndex)
                      : null;

                  const isTransition =
                    display != null &&
                    prevDisplay != null &&
                    prevDisplay.periodId !== display.periodId &&
                    cell.inCurrentMonth &&
                    week[index - 1]?.inCurrentMonth;

                  const occupancyStyle = getOccupancyStyle(display?.occupancyStatus);

                  const isPeriodDay =
                    isActive && display && cell.inCurrentMonth;
                  const isClosed =
                    isPeriodDay && display.availability === "closed";

                  let cellClass = !cell.inCurrentMonth
                    ? "bg-gray-50/80 text-gray-400"
                    : "bg-white";

                  if (isPeriodDay && !isClosed) {
                    if (occupancyStyle) {
                      cellClass = `${occupancyStyle.cell} text-white`;
                    } else {
                      cellClass = isTransition
                        ? `bg-gradient-to-br ${PERIOD_PALETTE[prevPaletteIndex ?? 0].prev} ${palette.next} text-white`
                        : `${palette.cell} text-white`;
                    }
                  } else if (isClosed) {
                    cellClass = "bg-slate-400 text-white";
                  }

                  return (
                    <div
                      key={dateKey}
                      className={`${minCellHeight} relative flex flex-col border-r border-gray-100 p-2 last:border-r-0 ${cellClass} ${
                        isToday ? "ring-2 ring-inset ring-indigo-300" : ""
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          isPeriodDay
                            ? "text-white"
                            : cell.inCurrentMonth
                              ? "text-gray-800"
                              : "text-gray-400"
                        }`}
                      >
                        {cell.date.getDate()}
                      </div>

                      {isPeriodDay ? (
                        isClosed ? (
                          <div className="mt-auto self-end pb-0.5 text-right text-[10px] font-bold uppercase tracking-wide text-white/95">
                            Kapalı
                          </div>
                        ) : (
                          <div className="mt-auto self-end pb-0.5 text-right leading-tight text-white">
                            {hasDiscount(display) ? (
                              <>
                                <div className="text-[9px] font-medium line-through opacity-75">
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
                            {occupancyStyle ? (
                              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide opacity-95">
                                {occupancyStyle.label}
                              </div>
                            ) : null}
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
