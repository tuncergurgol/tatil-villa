"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildOccupancyMap,
  canSelectStayDay,
  rangeHasBlockedNight,
  type AllowStayRange,
} from "@/lib/booking-calendar-selection";
import {
  getPublicVillaDayVisualStyle,
  resolveVillaDayVisual,
} from "@/lib/villa-period-day-visual";
import {
  buildMonthGrid,
  compareDates,
  getMonthLabel,
  getWeekdayLabels,
  parseDateKey,
  todayDate,
  toDateKey,
} from "@/lib/villa-period-calendar";
import {
  countNightsBetween,
  isDateKeyInRange,
  normalizeDateRange,
  offsetDateKey,
} from "@/lib/villa-period-selection";

function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export type OccupancyCalendarDay = {
  date: string;
  occupancyStatus: string;
};

interface OccupancyStayDateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  /** Villa Detay ile aynı doluluk kaynağı */
  calendarDays: OccupancyCalendarDay[];
  /**
   * Düzenlenen rezervasyonun kayıtlı [checkIn, checkOut) aralığı —
   * bu geceler BOOKED görünür ama seçilebilir.
   */
  allowStayRange?: AllowStayRange | null;
  className?: string;
  disabled?: boolean;
}

/**
 * Admin rezervasyon tarih seçici — Villa Detay occupancy calendar
 * ile aynı görsel kurallar (resolveVillaDayVisual + soft public stil).
 */
export default function OccupancyStayDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  calendarDays,
  allowStayRange = null,
  className = "",
  disabled = false,
}: OccupancyStayDateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => {
    const base = checkIn ? parseDateKey(checkIn) : todayDate();
    return base.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const base = checkIn ? parseDateKey(checkIn) : todayDate();
    return base.getMonth();
  });

  const today = useMemo(() => todayDate(), []);
  const weekdayLabels = getWeekdayLabels();
  const occupancyMap = useMemo(
    () => buildOccupancyMap(calendarDays),
    [calendarDays]
  );

  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const previewEnd =
    pendingStart && hoverDate
      ? normalizeDateRange(pendingStart, hoverDate).end
      : checkOut;
  const previewStart = pendingStart ?? checkIn;
  const previewNights =
    previewStart && previewEnd && previewStart !== previewEnd
      ? countNightsBetween(previewStart, previewEnd)
      : 0;
  const previewRangeBlocked = Boolean(
    previewStart &&
      previewEnd &&
      previewStart !== previewEnd &&
      rangeHasBlockedNight(
        previewStart,
        previewEnd,
        occupancyMap,
        allowStayRange
      )
  );

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setPendingStart(null);
        setHoverDate(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function shiftMonth(offset: number) {
    const date = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  function handleDayClick(dateKey: string) {
    if (
      !canSelectStayDay({
        dateKey,
        today,
        pendingStart,
        occupancyMap,
        allowStay: allowStayRange,
      })
    ) {
      return;
    }

    if (!pendingStart) {
      setPendingStart(dateKey);
      setHoverDate(dateKey);
      onChange(dateKey, "");
      return;
    }

    if (compareDates(parseDateKey(dateKey), parseDateKey(pendingStart)) <= 0) {
      setPendingStart(dateKey);
      setHoverDate(dateKey);
      onChange(dateKey, "");
      return;
    }

    const { start, end } = normalizeDateRange(pendingStart, dateKey);
    if (start === end) return;
    if (rangeHasBlockedNight(start, end, occupancyMap, allowStayRange)) return;

    onChange(start, end);
    setPendingStart(null);
    setHoverDate(null);
    setOpen(false);
  }

  function renderMonth(year: number, month: number) {
    const cells = buildMonthGrid(year, month);

    return (
      <div className="min-w-[220px]">
        <p className="mb-2 text-center text-xs font-semibold text-slate-800">
          {getMonthLabel(year, month)}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium text-slate-400"
            >
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            const dateKey = toDateKey(cell.date);
            const isPast = compareDates(cell.date, today) < 0;
            const current = occupancyMap.get(dateKey) ?? "EMPTY";
            const prev = occupancyMap.get(offsetDateKey(dateKey, -1));
            const next = occupancyMap.get(offsetDateKey(dateKey, 1));
            const kind = resolveVillaDayVisual(current, prev, next);
            const visual = getPublicVillaDayVisualStyle(kind);
            const canClick = canSelectStayDay({
              dateKey,
              today,
              pendingStart,
              occupancyMap,
              allowStay: allowStayRange,
            });

            const inRange =
              previewStart &&
              previewEnd &&
              isDateKeyInRange(dateKey, previewStart, previewEnd);
            const isStart = dateKey === previewStart;
            const isEnd =
              dateKey === previewEnd && previewStart !== previewEnd;

            const showOccupancyBg =
              !isPast && (current !== "EMPTY" || kind !== "empty");

            const showNightHint =
              Boolean(pendingStart) &&
              hoverDate === dateKey &&
              previewStart &&
              previewEnd &&
              previewStart !== previewEnd &&
              previewNights > 0 &&
              !previewRangeBlocked &&
              (dateKey === previewStart || dateKey === previewEnd);

            return (
              <button
                key={`${year}-${month}-${index}`}
                type="button"
                disabled={!canClick}
                onMouseEnter={() => {
                  if (pendingStart) setHoverDate(dateKey);
                }}
                onMouseLeave={() => {
                  if (pendingStart) setHoverDate(pendingStart);
                }}
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex h-9 items-start justify-start overflow-visible rounded-md border p-0.5 text-left transition ${
                  !cell.inCurrentMonth ? "opacity-45" : ""
                } ${
                  isPast
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                    : canClick
                      ? "cursor-pointer border-slate-100/80 hover:brightness-[0.98]"
                      : "cursor-not-allowed border-slate-100/80 opacity-80"
                } ${
                  isStart || isEnd
                    ? "z-[1] ring-2 ring-sky-500 ring-offset-0"
                    : inRange && !previewRangeBlocked
                      ? "ring-1 ring-sky-300"
                      : ""
                } ${
                  inRange && previewRangeBlocked && !isStart
                    ? "ring-1 ring-red-300"
                    : ""
                }`}
                style={{
                  background: isPast
                    ? "#f8fafc"
                    : showOccupancyBg
                      ? visual.background
                      : "#ffffff",
                }}
              >
                <span
                  className={`text-[11px] font-semibold leading-none ${
                    isPast ? "text-slate-300" : "text-slate-800"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {showNightHint ? (
                  <span className="pointer-events-none absolute -bottom-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-md">
                    {previewNights} Gece
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const label =
    checkIn && checkOut
      ? `${formatDisplayDate(checkIn)} – ${formatDisplayDate(checkOut)}`
      : checkIn
        ? `${formatDisplayDate(checkIn)} – Çıkış seçin`
        : "Giriş – Çıkış tarihi seçin";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((value) => !value);
          setPendingStart(null);
          setHoverDate(null);
          if (checkIn) {
            const date = parseDateKey(checkIn);
            setViewYear(date.getFullYear());
            setViewMonth(date.getMonth());
          }
        }}
        className="mt-1 flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-left text-sm font-medium text-gray-900 outline-none transition hover:bg-white focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="truncate">{label}</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Önceki ay"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = todayDate();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
              }}
              className="text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Sonraki ay"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
            {renderMonth(viewYear, viewMonth)}
            {renderMonth(rightYear, rightMonth)}
          </div>
          {pendingStart ? (
            <p className="mt-3 text-center text-[11px] text-gray-500">
              Çıkış tarihini seçin
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
