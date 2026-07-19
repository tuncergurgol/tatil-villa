"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "@/lib/villa-period-selection";

function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface StayDateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  className?: string;
}

export default function StayDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  className = "",
}: StayDateRangePickerProps) {
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

  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const previewEnd =
    pendingStart && hoverDate
      ? normalizeDateRange(pendingStart, hoverDate).end
      : checkOut;
  const previewStart = pendingStart ?? checkIn;

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
    if (compareDates(parseDateKey(dateKey), today) < 0) return;

    if (!pendingStart) {
      setPendingStart(dateKey);
      setHoverDate(dateKey);
      onChange(dateKey, dateKey);
      return;
    }

    const { start, end } = normalizeDateRange(pendingStart, dateKey);
    if (start === end) {
      onChange(start, end);
      setPendingStart(null);
      setHoverDate(null);
      return;
    }

    onChange(start, end);
    setPendingStart(null);
    setHoverDate(null);
    setOpen(false);
  }

  function renderMonth(year: number, month: number) {
    const cells = buildMonthGrid(year, month);

    return (
      <div className="min-w-[220px]">
        <p className="mb-2 text-center text-xs font-semibold text-gray-800">
          {getMonthLabel(year, month)}
        </p>
        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium text-gray-400"
            >
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            const dateKey = toDateKey(cell.date);
            const isPast = compareDates(cell.date, today) < 0;
            const inMonth = cell.inCurrentMonth;
            const inRange =
              previewStart &&
              previewEnd &&
              isDateKeyInRange(dateKey, previewStart, previewEnd);
            const isStart = dateKey === previewStart;
            const isEnd = dateKey === previewEnd && previewStart !== previewEnd;
            const nights =
              previewStart && previewEnd
                ? countNightsBetween(previewStart, previewEnd)
                : 0;

            return (
              <button
                key={`${year}-${month}-${index}`}
                type="button"
                disabled={isPast}
                onMouseEnter={() => {
                  if (pendingStart) setHoverDate(dateKey);
                }}
                onMouseLeave={() => {
                  if (pendingStart) setHoverDate(pendingStart);
                }}
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex h-8 items-center justify-center rounded-md text-xs font-medium transition ${
                  isPast
                    ? "cursor-not-allowed text-gray-300"
                    : inMonth
                      ? "text-gray-800 hover:bg-violet-50"
                      : "text-gray-400 hover:bg-gray-50"
                } ${
                  inRange ? "bg-violet-100 text-violet-900" : ""
                } ${isStart || isEnd ? "bg-violet-600 text-white hover:bg-violet-600" : ""}`}
              >
                {cell.date.getDate()}
                {isEnd && nights > 0 ? (
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-violet-600">
                    {nights} gece
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function openCalendar() {
    setOpen((value) => !value);
    setPendingStart(null);
    setHoverDate(null);
    if (checkIn) {
      const date = parseDateKey(checkIn);
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openCalendar}
        className={`mt-1 grid w-full grid-cols-2 overflow-hidden rounded-lg border bg-gray-50/80 text-left text-sm font-medium text-gray-900 outline-none transition hover:bg-white focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 ${
          open ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"
        }`}
      >
        <span className="flex items-center gap-2 border-r border-gray-200 px-3 py-2">
          <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Giriş
            </span>
            <span className="block truncate">
              {checkIn ? formatDisplayDate(checkIn) : "Tarih seçin"}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 px-3 py-2">
          <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Çıkış
            </span>
            <span className="block truncate">
              {checkOut && checkOut !== checkIn
                ? formatDisplayDate(checkOut)
                : "Tarih seçin"}
            </span>
          </span>
        </span>
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
