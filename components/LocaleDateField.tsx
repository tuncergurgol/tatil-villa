"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FloatingPanel from "@/components/FloatingPanel";
import {
  localeToBcp47,
  monthLabelForLocale,
  weekdayLabelsForLocale,
} from "@/lib/i18n/locale-display";
import {
  buildMonthGrid,
  compareDates,
  parseDateKey,
  todayDate,
  toDateKey,
} from "@/lib/villa-period-calendar";

type LocaleDateFieldProps = {
  value: string;
  minDate?: string;
  onChange: (value: string) => void;
  className?: string;
};

function formatDisplayDate(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat(localeToBcp47(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default function LocaleDateField({
  value,
  minDate,
  onChange,
  className = "",
}: LocaleDateFieldProps) {
  const locale = useLocale();
  const tSearch = useTranslations("search");
  const tCommon = useTranslations("common");
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = useMemo(() => todayDate(), []);
  const min = useMemo(
    () => (minDate ? parseDateKey(minDate) : today),
    [minDate, today]
  );
  const selected = value ? parseDateKey(value) : null;
  const initial = selected ?? (compareDates(today, min) < 0 ? min : today);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const weekdayLabels = useMemo(
    () => weekdayLabelsForLocale(locale),
    [locale]
  );
  const emptyPlaceholder = locale === "tr" ? "gg.aa.yyyy" : "dd.mm.yyyy";
  const clearLabel = locale === "tr" ? "Temizle" : "Clear";

  useEffect(() => {
    if (!open) return;
    const base = selected ?? (compareDates(today, min) < 0 ? min : today);
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [open, selected, today, min]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function shiftMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const cells = buildMonthGrid(viewYear, viewMonth);
  const todayKey = toDateKey(today);
  const canGoToday = compareDates(today, min) >= 0;

  return (
    <div className={className}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-w-[7.5rem] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2.5 text-left sm:min-w-[8.5rem]"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            value ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {value ? formatDisplayDate(value, locale) : emptyPlaceholder}
        </span>
      </button>

      <FloatingPanel open={open} anchorRef={anchorRef} panelRef={panelRef}>
        <div className="w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={tSearch("previousMonth")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-slate-800">
              {monthLabelForLocale(viewYear, viewMonth, locale)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label={tSearch("nextMonth")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekdayLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className="py-1 text-center text-[11px] font-medium text-slate-400"
              >
                {label}
              </div>
            ))}
            {cells.map((cell, index) => {
              const dateKey = toDateKey(cell.date);
              const isPast = compareDates(cell.date, min) < 0;
              const isSelected = value === dateKey;
              return (
                <button
                  key={`${dateKey}-${index}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onChange(dateKey);
                    setOpen(false);
                  }}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                    isPast
                      ? "cursor-not-allowed text-slate-300"
                      : cell.inCurrentMonth
                        ? "cursor-pointer text-slate-800 hover:bg-sky-50"
                        : "cursor-pointer text-slate-400 hover:bg-slate-50"
                  } ${
                    isSelected
                      ? "bg-sky-700 text-white hover:bg-sky-700"
                      : dateKey === todayKey
                        ? "ring-1 ring-sky-300"
                        : ""
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800"
            >
              {clearLabel}
            </button>
            <button
              type="button"
              disabled={!canGoToday}
              onClick={() => {
                if (!canGoToday) return;
                onChange(todayKey);
                setOpen(false);
              }}
              className="text-sm font-semibold text-sky-700 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {tSearch("today")}
            </button>
          </div>
          <p className="sr-only">{tCommon("close")}</p>
        </div>
      </FloatingPanel>
    </div>
  );
}
