"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import VillaPeriodFormModal from "@/components/admin/villas/periods/VillaPeriodFormModal";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
  type PeriodCalendarSelectionRange,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import { updateVillaPeriodDaysOccupancy } from "@/app/actions/admin/villa-periods";
import { VILLA_DAY_VISUAL_LEGEND } from "@/lib/villa-period-day-visual";
import VillaPeriodSidebar from "@/components/admin/villas/periods/VillaPeriodSidebar";
import { villaAdminHizliFiyatPath } from "@/lib/villa-admin-path";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPricePeriodDayItem } from "@/lib/villa-period-days";
import {
  buildBookedOccupancyForStay,
  buildEmptyOccupancyForRange,
  countNightsBetween,
  normalizeDateRange,
} from "@/lib/villa-period-selection";
import {
  formatPeriodDate,
  getMonthLabel,
  parseDateKey,
  startOfDay,
  toDateKey,
  todayDate,
} from "@/lib/villa-period-calendar";
import type { VillaDayOccupancy } from "@prisma/client";

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

function normalizePeriods(periods: VillaPricePeriodItem[]): VillaPricePeriodItem[] {
  return periods.map((period) => ({
    ...period,
    startDate: startOfDay(new Date(period.startDate)),
    endDate: startOfDay(new Date(period.endDate)),
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
  const [selectedRange, setSelectedRange] =
    useState<PeriodCalendarSelectionRange | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localOccupancyOverrides, setLocalOccupancyOverrides] = useState<
    Map<string, VillaDayOccupancy>
  >(new Map());
  const [occupancyUpdating, setOccupancyUpdating] = useState(false);
  const selectionCompletedRef = useRef(false);

  const dayDisplayByDate = useMemo(() => {
    const map = new Map<string, PeriodCalendarDayDisplay>();

    periodDays.forEach((day) => {
      map.set(toDateKey(startOfDay(new Date(day.date))), {
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
        const cursor = startOfDay(new Date(period.startDate));
        const end = startOfDay(new Date(period.endDate));

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

  useEffect(() => {
    setLocalOccupancyOverrides(new Map());
  }, [periodDays]);

  const mergedDayDisplayByDate = useMemo(() => {
    if (localOccupancyOverrides.size === 0) return dayDisplayByDate;

    const map = new Map(dayDisplayByDate);
    localOccupancyOverrides.forEach((occupancyStatus, dateKey) => {
      const existing = map.get(dateKey);
      if (existing) {
        map.set(dateKey, { ...existing, occupancyStatus });
      }
    });
    return map;
  }, [dayDisplayByDate, localOccupancyOverrides]);

  const activeDateKeys = useMemo(
    () => new Set(dayDisplayByDate.keys()),
    [dayDisplayByDate]
  );

  const normalizedSelection = useMemo(() => {
    if (!selectedRange) return null;
    return normalizeDateRange(selectedRange.start, selectedRange.end);
  }, [selectedRange]);

  const selectionNightCount = useMemo(() => {
    if (!normalizedSelection) return 0;
    return countNightsBetween(
      normalizedSelection.start,
      normalizedSelection.end
    );
  }, [normalizedSelection]);

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
    setModalDateRange(null);
    setContinueAfterSave(continueMode);
    setModalOpen(true);
  }

  function openEditModal(
    period: VillaPricePeriodItem,
    dateRange?: { startDate: string; endDate: string } | null
  ) {
    setEditingPeriod(period);
    setModalDateRange(dateRange ?? null);
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

  async function handleOccupancyUpdate(mode: "EMPTY" | "BOOKED") {
    if (!normalizedSelection) return;

    const { start, end } = normalizedSelection;
    const previousOverrides = new Map(localOccupancyOverrides);

    const occupancyMap =
      mode === "BOOKED"
        ? buildBookedOccupancyForStay(start, end)
        : buildEmptyOccupancyForRange(start, end);

    const nextOverrides = new Map(localOccupancyOverrides);
    occupancyMap.forEach((occupancyStatus, dateKey) => {
      nextOverrides.set(dateKey, occupancyStatus);
    });

    setLocalOccupancyOverrides(nextOverrides);
    setOccupancyUpdating(true);

    const result = await updateVillaPeriodDaysOccupancy(
      villa.id,
      start,
      end,
      mode
    );

    setOccupancyUpdating(false);

    if (result.error) {
      setLocalOccupancyOverrides(previousOverrides);
      return;
    }

    router.refresh();
  }

  const villaIdLabel =
    villa.villaId != null ? String(villa.villaId) : "—";
  const hizliFiyatPath = villaAdminHizliFiyatPath(villa);
  const documentNo = villa.documentNo || "—";
  const originalName = villa.originalName || "—";

  const selectionLabel =
    normalizedSelection != null
      ? `${formatPeriodDate(parseDateKey(normalizedSelection.start))} – ${formatPeriodDate(parseDateKey(normalizedSelection.end))}`
      : "";

  return (
    <div className={embedded ? "mt-4 flex min-h-0 flex-1 flex-col" : "flex h-[calc(100dvh-3rem)] flex-col"}>
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
        <div className="shrink-0 border-b border-gray-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </button>
              <button
                type="button"
                onClick={goToNextMonth}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="ml-2 text-xl font-bold text-gray-900">
                {getMonthLabel(viewYear, viewMonth)}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {VILLA_DAY_VISUAL_LEGEND.map((item) => (
                <span
                  key={item.kind}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    className="h-3 w-3 rounded-sm border border-gray-200"
                    style={item.swatchStyle}
                  />
                  {item.label}
                </span>
              ))}
            </div>

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

        {normalizedSelection ? (
          <div className="shrink-0 border-b border-blue-100 bg-blue-50 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Uygunluk Durumu
                </p>
                <p className="mt-0.5 text-sm text-blue-900">
                  {selectionLabel}
                  {selectionNightCount > 0 ? (
                    <span className="ml-2 font-semibold">
                      ({selectionNightCount} gece)
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={occupancyUpdating}
                  onClick={() => handleOccupancyUpdate("EMPTY")}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Uygun
                </button>
                <button
                  type="button"
                  disabled={occupancyUpdating}
                  onClick={() => handleOccupancyUpdate("BOOKED")}
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Dolu
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  aria-label="Seçimi temizle"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="min-h-0 overflow-y-auto border-b border-gray-200 p-4 xl:border-b-0 xl:border-r">
            <PeriodCalendarGrid
              year={viewYear}
              month={viewMonth}
              activeDateKeys={activeDateKeys}
              dayDisplayByDate={mergedDayDisplayByDate}
              today={today}
              selectedRange={selectedRange}
              isDragging={isDragging}
              selectableDateKeys={activeDateKeys}
              onSelectionStart={handleSelectionStart}
              onSelectionUpdate={handleSelectionUpdate}
              onSelectionComplete={handleSelectionComplete}
            />
          </div>

          <div className="min-h-0 p-4">
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
        prefillDateRange={modalDateRange}
        continueAfterSave={continueAfterSave}
        onClose={() => {
          setModalOpen(false);
          setModalDateRange(null);
          clearSelection();
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
