"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildCheckInDateKeys,
  buildOccupancyMap,
} from "@/lib/booking-calendar-selection";
import {
  getVillaDayVisualStyle,
  resolveVillaDayVisualFromMap,
  type VillaDayVisualKind,
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
} from "@/lib/villa-period-selection";
import {
  HolidayCalendarLegend,
  HolidayMarker,
  holidayDayTitle,
} from "@/components/calendar/HolidayMarker";

function formatDisplayDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const COMPACT_OCCUPANCY_LEGEND: Array<{
  kind: VillaDayVisualKind;
  label: string;
}> = [
  { kind: "full", label: "Kapama" },
  { kind: "reserved_full", label: "Rezervasyon" },
  { kind: "option_full", label: "Opsiyon" },
  { kind: "check_in", label: "Giriş / Çıkış" },
];

const OCCUPANCY_KIND_TITLE: Partial<Record<VillaDayVisualKind, string>> = {
  full: "Kapama (Dolu)",
  check_in: "Kapama giriş",
  check_out: "Kapama çıkış",
  turnover_booked: "Kapama giriş+çıkış",
  reserved_full: "Bizim rezervasyon",
  reserved_check_in: "Rezervasyon giriş",
  reserved_check_out: "Rezervasyon çıkış",
  turnover_reserved: "Rezervasyon giriş+çıkış",
  option_full: "Opsiyon",
  option_check_in: "Opsiyon giriş",
  option_check_out: "Opsiyon çıkış",
  turnover_option: "Opsiyon giriş+çıkış",
  option_out_booked_in: "Giriş+çıkış",
  booked_out_option_in: "Giriş+çıkış",
  booked_out_reserved_in: "Giriş+çıkış",
  reserved_out_booked_in: "Giriş+çıkış",
  reserved_out_option_in: "Giriş+çıkış",
  option_out_reserved_in: "Giriş+çıkış",
};

export type StayPickerCalendarDay = {
  date: string;
  occupancyStatus: string;
  occupancyCheckIn?: boolean | null;
};

interface StayDateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  className?: string;
  /** Villa doluluk günleri — gösterilir, seçimi engellemez */
  calendarDays?: StayPickerCalendarDay[];
}

function dayTitle(dateKey: string, kind: VillaDayVisualKind): string | undefined {
  const holiday = holidayDayTitle(dateKey);
  const occupancy = kind === "empty" ? undefined : OCCUPANCY_KIND_TITLE[kind];
  const parts = [holiday, occupancy].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export default function StayDateRangePicker({
  checkIn,
  checkOut,
  onChange,
  className = "",
  calendarDays = [],
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
  const occupancyMap = useMemo(
    () => buildOccupancyMap(calendarDays),
    [calendarDays]
  );
  const checkInDateKeys = useMemo(
    () => buildCheckInDateKeys(calendarDays),
    [calendarDays]
  );
  const showOccupancy = calendarDays.length > 0;

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
            const kind = resolveVillaDayVisualFromMap(
              dateKey,
              occupancyMap,
              checkInDateKeys
            );
            const visual = getVillaDayVisualStyle(kind);
            const current = occupancyMap.get(dateKey) ?? "EMPTY";
            const showOccupancyBg =
              showOccupancy &&
              !isPast &&
              (current !== "EMPTY" || kind !== "empty");

            return (
              <button
                key={`${year}-${month}-${index}`}
                type="button"
                disabled={isPast}
                title={dayTitle(dateKey, kind)}
                onMouseEnter={() => {
                  if (pendingStart) setHoverDate(dateKey);
                }}
                onMouseLeave={() => {
                  if (pendingStart) setHoverDate(pendingStart);
                }}
                onClick={() => handleDayClick(dateKey)}
                className={`relative flex items-center justify-center rounded-md text-xs font-medium transition ${
                  showOccupancy ? "h-9 border border-slate-100/80" : "h-8"
                } ${
                  isPast
                    ? "cursor-not-allowed text-gray-300"
                    : inMonth
                      ? showOccupancy
                        ? visual.useLightText && showOccupancyBg
                          ? "text-white hover:brightness-[0.98]"
                          : "text-gray-800 hover:brightness-[0.98]"
                        : "text-gray-800 hover:bg-violet-50"
                      : "text-gray-400 hover:bg-gray-50"
                } ${
                  showOccupancy
                    ? isStart || isEnd
                      ? "z-[1] ring-2 ring-violet-600 ring-offset-0"
                      : inRange
                        ? "ring-1 ring-violet-300"
                        : ""
                    : `${inRange ? "bg-violet-100 text-violet-900" : ""} ${
                        isStart || isEnd
                          ? "bg-violet-600 text-white hover:bg-violet-600"
                          : ""
                      }`
                }`}
                style={
                  isPast
                    ? undefined
                    : showOccupancyBg
                      ? { background: visual.background }
                      : undefined
                }
              >
                {cell.date.getDate()}
                <HolidayMarker
                  dateKey={dateKey}
                  tone={
                    !showOccupancy && (isStart || isEnd) ? "onDark" : "default"
                  }
                />
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
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={openCalendar}
        className={`mt-1 flex w-full flex-col overflow-hidden rounded-lg border bg-gray-50/80 text-left text-sm font-medium text-gray-900 outline-none transition hover:bg-white focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100 sm:grid sm:grid-cols-2 ${
          open ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"
        }`}
      >
        <span className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 sm:border-b-0 sm:border-r sm:py-2">
          <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Giriş
            </span>
            <span className="block truncate">
              {checkIn ? formatDisplayDate(checkIn) : "Tarih seçin"}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 px-3 py-2.5 sm:py-2">
          <Calendar className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="min-w-0 flex-1">
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
        <>
          <button
            type="button"
            aria-label="Takvimi kapat"
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => {
              setOpen(false);
              setPendingStart(null);
              setHoverDate(null);
            }}
          />
          <div className="fixed inset-x-3 top-[12%] z-50 max-h-[76vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-1 sm:max-h-none sm:w-max">
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
            <div className="hidden sm:block">
              {renderMonth(rightYear, rightMonth)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
            {showOccupancy
              ? COMPACT_OCCUPANCY_LEGEND.map((item) => (
                  <span
                    key={item.kind}
                    className="inline-flex items-center gap-1"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-gray-200"
                      style={{
                        background: getVillaDayVisualStyle(item.kind).background,
                      }}
                    />
                    {item.label}
                  </span>
                ))
              : null}
            <HolidayCalendarLegend />
          </div>
          {showOccupancy ? (
            <p className="mt-1 text-center text-[10px] text-gray-400">
              Kapalı günler işaretlidir; yine de seçilebilir.
            </p>
          ) : null}
          {pendingStart ? (
            <p className="mt-3 text-center text-[11px] text-gray-500">
              Çıkış tarihini seçin
            </p>
          ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
