"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { VillaDayOccupancy } from "@prisma/client";
import { offsetDateKey } from "@/lib/villa-period-selection";
import {
  getPublicVillaDayVisualStyle,
  PUBLIC_VILLA_DAY_VISUAL_LEGEND,
  resolveVillaDayVisual,
} from "@/lib/villa-period-day-visual";

type CalendarDay = {
  date: string;
  occupancyStatus: "EMPTY" | "BOOKED" | "OPTION" | string;
  price: number;
  currency: string;
};

type VillaAvailabilityCalendarProps = {
  days: CalendarDay[];
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
const MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDayPrice(price: number) {
  return price.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function toOccupancy(value?: string | null): VillaDayOccupancy {
  if (value === "BOOKED" || value === "OPTION") return value;
  return "EMPTY";
}

function buildMonthCells(
  year: number,
  month: number,
  dayMap: Map<string, CalendarDay>
) {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startPad = (first.getUTCDay() + 6) % 7;
  const result: Array<{
    day: number | null;
    dateKey: string | null;
    data: CalendarDay | null;
  }> = [];

  for (let i = 0; i < startPad; i += 1) {
    result.push({ day: null, dateKey: null, data: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result.push({
      day,
      dateKey,
      data: dayMap.get(dateKey) ?? null,
    });
  }
  return result;
}

function MonthGrid({
  year,
  month,
  dayMap,
  occupancyMap,
}: {
  year: number;
  month: number;
  dayMap: Map<string, CalendarDay>;
  occupancyMap: Map<string, VillaDayOccupancy>;
}) {
  const cells = useMemo(
    () => buildMonthCells(year, month, dayMap),
    [year, month, dayMap]
  );

  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-center text-base font-semibold text-slate-900">
        {MONTHS[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1.5">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, index) => {
          if (!cell.day || !cell.dateKey) {
            return (
              <div key={`empty-${index}`} className="min-h-[52px] sm:min-h-[58px]" />
            );
          }

          const current = occupancyMap.get(cell.dateKey) ?? "EMPTY";
          const prev = occupancyMap.get(offsetDateKey(cell.dateKey, -1));
          const next = occupancyMap.get(offsetDateKey(cell.dateKey, 1));
          const kind = resolveVillaDayVisual(current, prev, next);
          const visual = getPublicVillaDayVisualStyle(kind);
          const price = cell.data?.price;
          const hasDayData = Boolean(cell.data);

          return (
            <div
              key={cell.dateKey}
              className="relative min-h-[52px] overflow-hidden rounded-md border border-slate-100/80 p-1 text-left sm:min-h-[58px]"
              style={{
                background: hasDayData || kind !== "empty" ? visual.background : "#f8fafc",
              }}
            >
              <p className="text-[11px] font-semibold text-slate-800 sm:text-xs">
                {cell.day}
              </p>
              {visual.showPrice && price != null && hasDayData ? (
                <p className="mt-0.5 text-[9px] leading-tight text-slate-600 sm:text-[10px]">
                  {formatDayPrice(price)}
                  <span className="text-slate-400">₺</span>
                </p>
              ) : null}
              {visual.statusLabel ? (
                <p className="mt-0.5 text-[8px] font-semibold leading-tight text-slate-700 sm:text-[9px]">
                  {visual.statusLabel}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VillaAvailabilityCalendar({
  days,
}: VillaAvailabilityCalendarProps) {
  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of days) map.set(day.date, day);
    return map;
  }, [days]);

  const occupancyMap = useMemo(() => {
    const map = new Map<string, VillaDayOccupancy>();
    for (const day of days) {
      map.set(day.date, toOccupancy(day.occupancyStatus));
    }
    return map;
  }, [days]);

  const months = useMemo(() => {
    const keys = new Set<string>();
    for (const day of days) {
      keys.add(day.date.slice(0, 7));
    }
    if (keys.size === 0) {
      const now = new Date();
      keys.add(monthKey(now.getFullYear(), now.getMonth()));
      keys.add(monthKey(now.getFullYear(), now.getMonth() + 1));
    }
    return Array.from(keys).sort();
  }, [days]);

  const initialMonthIndex = useMemo(() => {
    const now = new Date();
    const current = monthKey(now.getFullYear(), now.getMonth());
    const idx = months.indexOf(current);
    if (idx >= 0) return Math.min(idx, Math.max(0, months.length - 2));
    return 0;
  }, [months]);

  const [monthIndex, setMonthIndex] = useState(initialMonthIndex);
  const firstKey = months[Math.min(monthIndex, months.length - 1)] ?? months[0];
  const secondKey =
    months[Math.min(monthIndex + 1, months.length - 1)] ?? firstKey;

  const [y1, m1] = firstKey.split("-");
  const [y2, m2] = secondKey.split("-");
  const year1 = Number(y1);
  const month1 = Number(m1) - 1;
  const year2 = Number(y2);
  const month2 = Number(m2) - 1;
  const showTwo = firstKey !== secondKey;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
          disabled={monthIndex <= 0}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-slate-600">
          {showTwo
            ? `${MONTHS[month1]} – ${MONTHS[month2]} ${year2}`
            : `${MONTHS[month1]} ${year1}`}
        </p>
        <button
          type="button"
          onClick={() =>
            setMonthIndex((i) => Math.min(Math.max(0, months.length - 2), i + 1))
          }
          disabled={monthIndex >= months.length - 2 && months.length > 1}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`grid gap-6 ${showTwo ? "lg:grid-cols-2" : "grid-cols-1"}`}
      >
        <MonthGrid
          year={year1}
          month={month1}
          dayMap={dayMap}
          occupancyMap={occupancyMap}
        />
        {showTwo ? (
          <MonthGrid
            year={year2}
            month={month2}
            dayMap={dayMap}
            occupancyMap={occupancyMap}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        {PUBLIC_VILLA_DAY_VISUAL_LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-3.5 w-3.5 rounded border border-slate-200"
              style={item.swatchStyle}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
