"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Zap } from "lucide-react";
import VillaPeriodFormModal from "@/components/admin/villas/periods/VillaPeriodFormModal";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
  type PeriodCalendarSelectionRange,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import { VILLA_DAY_VISUAL_LEGEND } from "@/lib/villa-period-day-visual";
import VillaPeriodSidebar from "@/components/admin/villas/periods/VillaPeriodSidebar";
import { villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import {
  getMonthLabel,
  dbDateToDateKey,
  buildNewPeriodPrefill,
  parseDateKey,
  startOfDay,
  toDateKey,
  todayDate,
} from "@/lib/villa-period-calendar";
import { normalizeDateRange } from "@/lib/villa-period-selection";

interface VillaPeriodManagementProps {
  villa: {
    id: string;
    villaId: number | null;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
  };
  periods: VillaPricePeriodItem[];
  periodDays?: VillaPricePeriodDayItem[];
  embedded?: boolean;
}

function toLocalDate(value: Date | string): Date {
  return parseDateKey(dbDateToDateKey(new Date(value)));
}

function normalizePeriods(periods: VillaPricePeriodItem[]): VillaPricePeriodItem[] {
  return periods.map((period) => ({
    ...period,
    startDate: toLocalDate(period.startDate),
    endDate: toLocalDate(period.endDate),
  }));
}

export default function VillaPeriodManagement({
  villa,
  periods,
  periodDays = [],
  embedded = false,
}: VillaPeriodManagementProps) {
  const router = useRouter();
  const today = todayDate();
  const normalizedPeriods = useMemo(() => normalizePeriods(periods), [periods]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [continueAfterSave, setContinueAfterSave] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<VillaPricePeriodItem | null>(
    null
  );
  const [modalDateRange, setModalDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [modalTemplatePeriod, setModalTemplatePeriod] =
    useState<VillaPricePeriodItem | null>(null);
  const [selectedRange, setSelectedRange] =
    useState<PeriodCalendarSelectionRange | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectionCompletedRef = useRef(false);

  const dayDisplayByDate = useMemo(() => {
    const map = new Map<string, PeriodCalendarDayDisplay>();

    periodDays.forEach((day) => {
      map.set(dbDateToDateKey(new Date(day.date)), {
        periodId: day.periodId,
        nightlyPrice: day.nightlyPrice,
        discountedNightlyPrice: day.discountedNightlyPrice,
        nightlyPriceCurrency: day.nightlyPriceCurrency,
        availability: day.availability,
        occupancyStatus: day.occupancyStatus,
      });
    });

    if (map.size === 0) {
      normalizedPeriods.forEach((period) => {
        const cursor = toLocalDate(period.startDate);
        const end = toLocalDate(period.endDate);

        while (cursor <= end) {
          const dateKey = toDateKey(cursor);
          map.set(dateKey, {
            periodId: period.id,
            nightlyPrice: period.nightlyPrice,
            discountedNightlyPrice: period.discountedNightlyPrice,
            nightlyPriceCurrency: period.nightlyPriceCurrency,
            availability: period.availability,
            occupancyStatus: "EMPTY",
          });
          cursor.setDate(cursor.getDate() + 1);
        }
      });
    }

    return map;
  }, [normalizedPeriods, periodDays]);

  const activeDateKeys = useMemo(
    () => new Set(dayDisplayByDate.keys()),
    [dayDisplayByDate]
  );

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function goToPreviousMonth() {
    const date = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  function goToNextMonth() {
    const date = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }

  function openCreateModal(continueMode: boolean) {
    setEditingPeriod(null);
    setContinueAfterSave(continueMode);
    const prefill = buildNewPeriodPrefill(normalizedPeriods);
    setModalTemplatePeriod(prefill.templatePeriod);
    setModalDateRange(prefill.dateRange);
    setModalOpen(true);
  }

  function openEditModal(
    period: VillaPricePeriodItem,
    dateRange?: { startDate: string; endDate: string } | null
  ) {
    setEditingPeriod(period);
    setModalDateRange(dateRange ?? null);
    setModalTemplatePeriod(null);
    setContinueAfterSave(false);
    setModalOpen(true);
  }

  function handleSaved() {
    router.refresh();
  }

  function clearSelection() {
    setSelectedRange(null);
    setIsDragging(false);
  }

  const handleSelectionStart = useCallback((dateKey: string) => {
    setIsDragging(true);
    setSelectedRange({ start: dateKey, end: dateKey });
  }, []);

  const handleSelectionUpdate = useCallback((dateKey: string) => {
    setSelectedRange((current) =>
      current ? { start: current.start, end: dateKey } : { start: dateKey, end: dateKey }
    );
  }, []);

  const handleSelectionComplete = useCallback(() => {
    selectionCompletedRef.current = true;
    setIsDragging(false);
    setSelectedRange((current) => {
      if (!current) return null;
      return normalizeDateRange(current.start, current.end);
    });
  }, []);

  useEffect(() => {
    if (!selectionCompletedRef.current || !selectedRange) return;
    selectionCompletedRef.current = false;

    const display = dayDisplayByDate.get(selectedRange.start);
    if (!display?.periodId) return;

    const period = normalizedPeriods.find((item) => item.id === display.periodId);
    if (period) {
      openEditModal(period, {
        startDate: selectedRange.start,
        endDate: selectedRange.end,
      });
    }
  }, [selectedRange, dayDisplayByDate, normalizedPeriods]);

  const villaIdLabel =
    villa.villaId != null ? String(villa.villaId) : "—";
  const hizliFiyatPath = villaAdminHizliFiyatPath(villa);
  const documentNo = villa.documentNo || "—";
  const originalName = villa.originalName || "—";

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 flex-1 flex-col"
          : "flex h-[calc(100dvh-3rem)] flex-col"
      }
    >
      {!embedded ? (
        <div className="shrink-0 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="font-semibold text-gray-900">Villa Adı:</span>{" "}
              <span className="text-gray-700">{villa.name}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">Villa Orijinal Adı:</span>{" "}
              <span className="text-gray-700">{originalName}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">VillaID:</span>{" "}
              <span className="text-gray-700">{villaIdLabel}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-900">Belge No:</span>{" "}
              <span className="text-gray-700">{documentNo}</span>
            </p>
            <p className="text-gray-500">
              {normalizedPeriods.length} periyot tanımlı
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${
          embedded ? "" : "mt-4"
        }`}
      >
        <div className="shrink-0 border-b border-gray-200 px-3 py-3 md:px-5 md:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 md:px-4 md:text-sm"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 md:px-3 md:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Önceki
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 md:px-3 md:text-sm"
            >
              Sonraki
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="text-base font-bold text-gray-900 md:ml-2 md:text-xl">
              {getMonthLabel(viewYear, viewMonth)}
            </h2>
          </div>

          <div className="mt-2 flex gap-2 md:hidden">
            <Link
              href={hizliFiyatPath}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Zap className="h-4 w-4" />
              Hızlı Fiyat
            </Link>
            <button
              type="button"
              onClick={() => openCreateModal(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Periyot Ekle
            </button>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto pb-1 text-[11px] text-gray-600 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:text-xs [&::-webkit-scrollbar]:hidden">
            {VILLA_DAY_VISUAL_LEGEND.map((item) => (
              <span
                key={item.kind}
                className="inline-flex shrink-0 items-center gap-1.5"
              >
                <span
                  className="h-3 w-3 rounded-sm border border-gray-200"
                  style={item.swatchStyle}
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-3 hidden flex-wrap items-center justify-end gap-2 md:flex">
            <button
              type="button"
              onClick={() => openCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Periyot Ekle Devam Et
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="min-h-[min(520px,58dvh)] overflow-y-auto border-b border-gray-200 p-3 xl:min-h-0 xl:border-b-0 xl:border-r xl:p-4">
            <PeriodCalendarGrid
              year={viewYear}
              month={viewMonth}
              activeDateKeys={activeDateKeys}
              dayDisplayByDate={dayDisplayByDate}
              today={today}
              selectedRange={selectedRange}
              isDragging={isDragging}
              selectableDateKeys={activeDateKeys}
              onSelectionStart={handleSelectionStart}
              onSelectionUpdate={handleSelectionUpdate}
              onSelectionComplete={handleSelectionComplete}
            />
          </div>

          <div className="max-h-[40dvh] min-h-0 overflow-y-auto p-3 xl:max-h-none xl:p-4">
            <VillaPeriodSidebar
              villaId={villa.id}
              hizliFiyatPath={hizliFiyatPath}
              periods={normalizedPeriods}
              onEdit={openEditModal}
            />
          </div>
        </div>
      </div>

      {!embedded ? (
        <div className="mt-3 shrink-0">
          <Link
            href="/admin/villalar"
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            ← Ev listesine dön
          </Link>
        </div>
      ) : null}

      <VillaPeriodFormModal
        open={modalOpen}
        villaId={villa.id}
        period={editingPeriod}
        templatePeriod={modalTemplatePeriod}
        prefillDateRange={modalDateRange}
        continueAfterSave={continueAfterSave}
        onClose={() => {
          setModalOpen(false);
          setModalDateRange(null);
          setModalTemplatePeriod(null);
          clearSelection();
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
