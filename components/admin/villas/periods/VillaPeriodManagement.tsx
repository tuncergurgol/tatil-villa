"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
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
import { importVillaPeriodsFromTatildeyizAction } from "@/app/actions/admin/villa-period-import";

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
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();

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

  function handleImportFromTatildeyiz() {
    const confirmMessage =
      normalizedPeriods.length > 0
        ? "Mevcut fiyat periyotları ve müsaitlik silinip Tatildeyiz'den yeniden aktarılacak. Devam edilsin mi?"
        : "Tatildeyiz'den fiyat periyotları ve müsaitlik takvimi aktarılsın mı?";
    if (!confirm(confirmMessage)) return;

    setImportMessage(null);
    setImportError(null);
    startImport(async () => {
      const result = await importVillaPeriodsFromTatildeyizAction(villa.id);
      if (!result.success) {
        setImportError(result.message);
        return;
      }
      setImportMessage(result.message);
      router.refresh();
    });
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleImportFromTatildeyiz}
                disabled={isImporting}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isImporting ? "animate-spin" : ""}`}
                />
                {isImporting ? "Güncelleniyor..." : "TATİLDEYİZDEN GÜNCELLE"}
              </button>
              <button
                type="button"
                onClick={() => openCreateModal(true)}
                disabled={isImporting}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Periyot Ekle Devam Et
              </button>
            </div>
          </div>
        </div>

        {importMessage ? (
          <div className="shrink-0 border-b border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800">
            {importMessage}
          </div>
        ) : null}
        {importError ? (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
            {importError}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_320px]">
          <div className="min-h-0 overflow-y-auto border-b border-gray-200 p-4 xl:border-b-0 xl:border-r">
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
