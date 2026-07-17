"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Moon } from "lucide-react";
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
import FloatingPanel from "./FloatingPanel";

function formatHeroDate(dateKey: string) {
  const date = parseDateKey(dateKey);
  const formattedDate = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const weekday = date.toLocaleDateString("tr-TR", { weekday: "long" });
  const capitalizedWeekday =
    weekday.charAt(0).toLocaleUpperCase("tr-TR") + weekday.slice(1);

  return `${formattedDate} - ${capitalizedWeekday}`;
}

interface HeroDateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  onComplete?: (checkIn: string, checkOut: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function HeroDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  onComplete,
  open: controlledOpen,
  onOpenChange,
}: HeroDateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

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
  const minViewYear = today.getFullYear();
  const minViewMonth = today.getMonth();
  const weekdayLabels = getWeekdayLabels();

  const canGoPrevious =
    viewYear > minViewYear ||
    (viewYear === minViewYear && viewMonth > minViewMonth);

  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const previewEnd =
    pendingStart && hoverDate
      ? normalizeDateRange(pendingStart, hoverDate).end
      : checkOut;
  const previewStart = pendingStart ?? checkIn;

  const nights =
    previewStart && previewEnd
      ? countNightsBetween(previewStart, previewEnd)
      : 0;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setPendingStart(null);
      setHoverDate(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, setOpen]);

  function shiftMonth(offset: number) {
    if (offset < 0 && !canGoPrevious) return;
    const date = new Date(viewYear, viewMonth + offset, 1);
    const nextYear = date.getFullYear();
    const nextMonth = date.getMonth();
    if (
      nextYear < minViewYear ||
      (nextYear === minViewYear && nextMonth < minViewMonth)
    ) {
      return;
    }
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  }

  function handleDayClick(dateKey: string) {
    if (compareDates(parseDateKey(dateKey), today) < 0) return;
    if (
      pendingStart &&
      compareDates(parseDateKey(dateKey), parseDateKey(pendingStart)) < 0
    ) {
      return;
    }

    if (!pendingStart) {
      setPendingStart(dateKey);
      setHoverDate(dateKey);
      onChange(dateKey, "");
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
    onComplete?.(start, end);
  }

  function renderMonth(year: number, month: number) {
    const cells = buildMonthGrid(year, month);

    return (
      <div className="w-[228px] shrink-0">
        <p className="mb-3 text-center text-sm font-semibold text-gray-800">
          {getMonthLabel(year, month)}
        </p>
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-medium text-gray-400"
            >
              {label}
            </div>
          ))}
          {cells.map((cell, index) => {
            const dateKey = toDateKey(cell.date);
            const isPast = compareDates(cell.date, today) < 0;
            const isBeforeStart =
              !!pendingStart &&
              compareDates(parseDateKey(dateKey), parseDateKey(pendingStart)) < 0;
            const isDisabled = isPast || isBeforeStart;
            const inMonth = cell.inCurrentMonth;
            const inRange =
              previewStart &&
              previewEnd &&
              isDateKeyInRange(dateKey, previewStart, previewEnd);
            const isStart = dateKey === previewStart;
            const isEnd =
              dateKey === previewEnd && previewStart !== previewEnd;
            const showNightHint =
              hoverDate === dateKey &&
              previewStart &&
              previewEnd &&
              previewStart !== previewEnd &&
              nights > 0 &&
              (dateKey === previewStart || dateKey === previewEnd);

            return (
              <button
                key={`${year}-${month}-${index}`}
                type="button"
                disabled={isDisabled}
                onMouseEnter={() => {
                  if (pendingStart) {
                    setHoverDate(dateKey);
                  } else if (
                    previewStart &&
                    previewEnd &&
                    previewStart !== previewEnd &&
                    (dateKey === previewStart || dateKey === previewEnd)
                  ) {
                    setHoverDate(dateKey);
                  }
                }}
                onMouseLeave={() => {
                  if (pendingStart) {
                    setHoverDate(pendingStart);
                  } else {
                    setHoverDate(null);
                  }
                }}
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                  isDisabled
                    ? "cursor-not-allowed text-gray-300 opacity-40 blur-[0.3px]"
                    : inMonth
                      ? "cursor-pointer text-gray-800 hover:bg-sky-50"
                      : "cursor-pointer text-gray-400 hover:bg-gray-50"
                } ${inRange && !isStart && !isEnd ? "bg-sky-100 text-sky-900" : ""} ${
                  isStart || isEnd
                    ? "bg-sky-500 text-white hover:bg-sky-500"
                    : ""
                }`}
              >
                {cell.date.getDate()}
                {showNightHint ? (
                  <span className="pointer-events-none absolute -bottom-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-md">
                    {nights} Gece
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const checkInFmt = checkIn ? formatHeroDate(checkIn) : null;
  const checkOutFmt = checkOut ? formatHeroDate(checkOut) : null;
  const displayNights =
    checkIn && checkOut && checkIn !== checkOut
      ? countNightsBetween(checkIn, checkOut)
      : 0;

  return (
    <div ref={rootRef} className="relative h-full flex-1">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          setPendingStart(null);
          setHoverDate(null);

          if (nextOpen) {
            if (checkIn) {
              const date = parseDateKey(checkIn);
              let year = date.getFullYear();
              let month = date.getMonth();
              if (
                year < minViewYear ||
                (year === minViewYear && month < minViewMonth)
              ) {
                year = minViewYear;
                month = minViewMonth;
              }
              setViewYear(year);
              setViewMonth(month);
            } else {
              setViewYear(minViewYear);
              setViewMonth(minViewMonth);
            }
          }
        }}
        className="flex h-14 w-full cursor-pointer items-stretch rounded-xl bg-white text-left outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-200 lg:h-full"
      >
        <div className="flex flex-1 flex-col justify-center px-3 py-2">
          <span className="text-[11px] font-normal leading-none text-gray-500">
            Giriş
          </span>
          {checkInFmt ? (
            <span className="mt-1 inline-block truncate rounded-md bg-sky-50 px-1 text-sm font-semibold leading-tight text-gray-900">
              {checkInFmt}
            </span>
          ) : (
            <span className="mt-1 text-sm leading-tight text-gray-400">
              Tarih seçin
            </span>
          )}
        </div>

        <div
          className="flex min-w-9 flex-col items-center justify-center px-2 text-sky-500"
          aria-label={displayNights > 0 ? `${displayNights} Gece` : undefined}
        >
          <Moon className="h-5 w-5" />
          {displayNights > 0 ? (
            <span className="mt-1 text-sm font-extrabold leading-none">
              {displayNights}
            </span>
          ) : (
            <span className="mt-1 text-sm leading-none text-gray-300">—</span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center border-l border-gray-100 px-3 py-2">
          <span className="text-[11px] font-normal leading-none text-gray-500">
            Çıkış
          </span>
          {checkOutFmt ? (
            <span className="mt-1 inline-block truncate rounded-md bg-sky-50 px-1 text-sm font-semibold leading-tight text-gray-900">
              {checkOutFmt}
            </span>
          ) : (
            <span className="mt-1 text-sm leading-tight text-gray-400">
              Tarih seçin
            </span>
          )}
        </div>
      </button>

      <FloatingPanel
        open={open}
        anchorRef={anchorRef}
        panelRef={panelRef}
        align="center"
        fitContent
        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={!canGoPrevious}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setViewYear(minViewYear);
              setViewMonth(minViewMonth);
            }}
            className="rounded-lg px-3 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
          {renderMonth(viewYear, viewMonth)}
          {renderMonth(rightYear, rightMonth)}
        </div>
        {pendingStart ? (
          <p className="mt-4 text-center text-xs text-gray-500">
            Çıkış tarihini seçin — fare ile aralığı önizleyebilirsiniz
          </p>
        ) : null}
        {displayNights > 0 && !pendingStart ? (
          <p className="mt-3 text-center text-xs font-medium text-sky-600">
            {displayNights} gece konaklama
          </p>
        ) : null}
      </FloatingPanel>
    </div>
  );
}
