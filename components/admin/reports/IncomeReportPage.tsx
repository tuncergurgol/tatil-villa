"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  FileSpreadsheet,
  GripVertical,
  RotateCcw,
  X,
} from "lucide-react";
import { formatMoneyPlain } from "@/lib/booking-display";
import {
  DEFAULT_INCOME_CUBE_LAYOUT,
  INCOME_DIMENSION_FIELDS,
  INCOME_MEASURE_FIELDS,
  buildIncomePivot,
  buildIncomeReportFilename,
  buildMissingCommissionFilename,
  fieldZone,
  filterIncomeFacts,
  getIncomeFieldLabel,
  isIncomeDimensionId,
  isIncomeMeasureId,
  isMoneyMeasure,
  missingCommissionToExcelRows,
  moveIncomeField,
  normalizeIncomeCubeLayout,
  pivotToExcelRows,
  sortPivotRows,
  uniqueFilterValues,
  usedFieldIds,
  type IncomeCubeLayout,
  type IncomeCubeZone,
  type IncomeDimensionId,
  type IncomeFact,
  type IncomeFieldId,
  type IncomeMeasureId,
  type IncomeRowSort,
  type IncomeValueFilters,
  type MissingCommissionBooking,
} from "@/lib/income-report-cube";

const STORAGE_KEY = "tatil-villa:gelir-raporu-layout-v3";
const DND_MIME = "application/x-tatil-income-field";

type DragPayload = {
  fieldId: IncomeFieldId;
  from: IncomeCubeZone;
};

const ZONE_META: Record<
  Exclude<IncomeCubeZone, "palette" | "filters">,
  { title: string; hint: string }
> = {
  rows: {
    title: "Satırlar",
    hint: "Sıra gruplama hiyerarşisini belirler",
  },
  columns: {
    title: "Sütunlar",
    hint: "Sıra sütun kırılımını belirler",
  },
  values: {
    title: "Değerler",
    hint: "Rezervasyon sayısı ve gelir tutarını bırakın",
  },
};

function chipClass(fieldId: IncomeFieldId, muted = false) {
  const base =
    "inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold shadow-sm";
  const dim = muted ? " opacity-50" : "";
  if (fieldId === "reservationCount") {
    return `${base} border-cyan-200 bg-cyan-50 text-cyan-800${dim}`;
  }
  if (isIncomeMeasureId(fieldId)) {
    return `${base} border-teal-200 bg-teal-50 text-teal-800${dim}`;
  }
  if (fieldId === "incomeType") {
    return `${base} border-amber-200 bg-amber-50 text-amber-900${dim}`;
  }
  if (fieldId === "villaName") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-800${dim}`;
  }
  if (
    fieldId === "province" ||
    fieldId === "district" ||
    fieldId === "neighborhood"
  ) {
    return `${base} border-violet-200 bg-violet-50 text-violet-800${dim}`;
  }
  if (fieldId.startsWith("stay")) {
    return `${base} border-indigo-200 bg-indigo-50 text-indigo-800${dim}`;
  }
  return `${base} border-sky-200 bg-sky-50 text-sky-800${dim}`;
}

function readDragPayload(event: DragEvent): DragPayload | null {
  const raw =
    event.dataTransfer.getData(DND_MIME) ||
    event.dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DragPayload;
    if (!parsed?.fieldId || !parsed?.from) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatPivotCell(measureId: IncomeMeasureId, value: number) {
  if (isMoneyMeasure(measureId)) {
    return value ? formatMoneyPlain(value) : "—";
  }
  return value.toLocaleString("tr-TR");
}

async function downloadExcel(rows: (string | number)[][], fileName: string) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sayfa1");
  XLSX.writeFile(workbook, fileName);
}

function FieldChip({
  fieldId,
  from,
  onRemove,
  trailing,
}: {
  fieldId: IncomeFieldId;
  from: IncomeCubeZone;
  onRemove?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <span
      draggable
      onDragStart={(event) => {
        const payload: DragPayload = { fieldId, from };
        event.dataTransfer.setData(DND_MIME, JSON.stringify(payload));
        event.dataTransfer.setData("text/plain", JSON.stringify(payload));
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`${chipClass(fieldId)} cursor-grab active:cursor-grabbing`}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="truncate">{getIncomeFieldLabel(fieldId)}</span>
      {trailing}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded p-0.5 hover:bg-black/10"
          aria-label={`${getIncomeFieldLabel(fieldId)} alanını kaldır`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

function DropZone({
  zone,
  fieldIds,
  children,
  onDropField,
}: {
  zone: Exclude<IncomeCubeZone, "palette" | "filters">;
  fieldIds: string[];
  children: ReactNode;
  onDropField: (fieldId: IncomeFieldId, zone: IncomeCubeZone, index: number) => void;
}) {
  const [active, setActive] = useState(false);
  const meta = ZONE_META[zone];

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        const payload = readDragPayload(event);
        if (!payload) return;
        const target = event.target as HTMLElement;
        const indexAttr = target.closest("[data-drop-index]")?.getAttribute(
          "data-drop-index"
        );
        const index =
          indexAttr != null ? Number(indexAttr) : fieldIds.length;
        onDropField(payload.fieldId, zone, Number.isFinite(index) ? index : fieldIds.length);
      }}
      className={`min-h-[4.5rem] rounded-xl border-2 border-dashed p-3 transition ${
        active
          ? "border-teal-400 bg-teal-50"
          : "border-gray-200 bg-gray-50/80"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
          {meta.title}
        </p>
        <p className="text-[11px] text-gray-400">{meta.hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        {fieldIds.length === 0 ? (
          <span className="text-xs text-gray-400">Alan sürükleyin</span>
        ) : null}
      </div>
    </div>
  );
}

function DimensionHeaderMenu({
  menuKey,
  fieldId,
  facts,
  selected,
  sort,
  anchorRect,
  onClose,
  onChangeFilter,
  onChangeSort,
}: {
  menuKey: string;
  fieldId: IncomeDimensionId;
  facts: IncomeFact[];
  selected: string[] | undefined;
  sort: IncomeRowSort | null;
  anchorRect: DOMRect;
  onClose: () => void;
  onChangeFilter: (values: string[] | undefined) => void;
  onChangeSort: (direction: "asc" | "desc" | null) => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const options = useMemo(
    () => uniqueFilterValues(facts, fieldId),
    [facts, fieldId]
  );
  const selectedSet = new Set(selected ?? options.map((item) => item.key));
  const allSelected = options.every((item) => selectedSet.has(item.key));
  const activeSort = sort?.fieldId === fieldId ? sort.direction : null;

  const style = useMemo(() => {
    const width = 240;
    const left = Math.min(
      Math.max(8, anchorRect.left),
      window.innerWidth - width - 8
    );
    const top = Math.min(anchorRect.bottom + 4, window.innerHeight - 16);
    const maxHeight = Math.max(160, window.innerHeight - top - 16);
    return {
      position: "fixed" as const,
      top,
      left,
      width,
      maxHeight,
      zIndex: 80,
    };
  }, [anchorRect]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (target.closest(`[data-income-dim-filter="${menuKey}"]`)) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuKey, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl ring-1 ring-black/5"
    >
      <div className="mb-2 border-b border-gray-100 pb-2">
        <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Sıralama
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onChangeSort("asc")}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              activeSort === "asc"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <ArrowUp className="h-3 w-3" />
            Küçükten büyüğe
          </button>
          <button
            type="button"
            onClick={() => onChangeSort("desc")}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
              activeSort === "desc"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <ArrowDown className="h-3 w-3" />
            Büyükten küçüğe
          </button>
          {activeSort ? (
            <button
              type="button"
              onClick={() => onChangeSort(null)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
            >
              Sıfırla
            </button>
          ) : null}
        </div>
      </div>
      <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Filtre
      </p>
      <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChangeFilter(undefined)}
          className="h-3.5 w-3.5 shrink-0 rounded border-gray-300"
        />
        Tümü
      </label>
      {options.map((option) => (
        <label
          key={option.key}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={selectedSet.has(option.key)}
            onChange={() => {
              const next = options
                .map((item) => item.key)
                .filter((key) =>
                  key === option.key ? !selectedSet.has(key) : selectedSet.has(key)
                );
              onChangeFilter(next.length === options.length ? undefined : next);
            }}
            className="h-3.5 w-3.5 shrink-0 rounded border-gray-300"
          />
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
        </label>
      ))}
    </div>,
    document.body
  );
}

function HeaderFilterButton({
  menuKey,
  label,
  align = "left",
  facts,
  fieldId,
  selected,
  sort,
  menuOpen,
  renderMenu = true,
  onToggleMenu,
  onCloseMenu,
  onChangeFilter,
  onChangeSort,
}: {
  menuKey: string;
  label: string;
  align?: "left" | "right" | "center";
  facts: IncomeFact[];
  fieldId: IncomeDimensionId;
  selected: string[] | undefined;
  sort: IncomeRowSort | null;
  menuOpen: boolean;
  renderMenu?: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onChangeFilter: (values: string[] | undefined) => void;
  onChangeSort: (direction: "asc" | "desc" | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!menuOpen || !renderMenu || !buttonRef.current) {
      if (!renderMenu) return;
      setAnchorRect(null);
      return;
    }
    const update = () => {
      if (buttonRef.current) setAnchorRect(buttonRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen, renderMenu]);

  const justify =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-between";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-income-dim-filter={menuKey}
        onClick={onToggleMenu}
        className={`flex w-full items-center gap-1 text-left ${justify}`}
      >
        <span className="truncate">{label}</span>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          {selected != null ? (
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          ) : null}
          {sort?.fieldId === fieldId ? (
            sort.direction === "asc" ? (
              <ArrowUp className="h-3 w-3 text-indigo-600" />
            ) : (
              <ArrowDown className="h-3 w-3 text-indigo-600" />
            )
          ) : null}
          <ChevronDown
            className={`h-3 w-3 text-gray-400 transition ${
              menuOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      {renderMenu && menuOpen && anchorRect ? (
        <DimensionHeaderMenu
          menuKey={menuKey}
          fieldId={fieldId}
          facts={facts}
          selected={selected}
          sort={sort}
          anchorRect={anchorRect}
          onClose={onCloseMenu}
          onChangeFilter={onChangeFilter}
          onChangeSort={onChangeSort}
        />
      ) : null}
    </>
  );
}

function RowDimensionHeader({
  fieldId,
  rowIndex,
  facts,
  selected,
  sort,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onChangeFilter,
  onChangeSort,
}: {
  fieldId: IncomeDimensionId;
  rowIndex: number;
  facts: IncomeFact[];
  selected: string[] | undefined;
  sort: IncomeRowSort | null;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onChangeFilter: (values: string[] | undefined) => void;
  onChangeSort: (direction: "asc" | "desc" | null) => void;
}) {
  return (
    <th
      className={`sticky border-b border-r border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500 ${
        menuOpen ? "z-20" : "z-10"
      }`}
      style={{ left: rowIndex * 140, minWidth: 140 }}
    >
      <HeaderFilterButton
        menuKey={`row:${fieldId}`}
        label={getIncomeFieldLabel(fieldId)}
        facts={facts}
        fieldId={fieldId}
        selected={selected}
        sort={sort}
        menuOpen={menuOpen}
        onToggleMenu={onToggleMenu}
        onCloseMenu={onCloseMenu}
        onChangeFilter={onChangeFilter}
        onChangeSort={onChangeSort}
      />
    </th>
  );
}

export default function IncomeReportPage({
  facts,
  missingCommission,
}: {
  facts: IncomeFact[];
  missingCommission: MissingCommissionBooking[];
}) {
  const [layout, setLayout] = useState<IncomeCubeLayout>(DEFAULT_INCOME_CUBE_LAYOUT);
  const [layoutReady, setLayoutReady] = useState(false);
  const [valueFilters, setValueFilters] = useState<IncomeValueFilters>({});
  const [rowSort, setRowSort] = useState<IncomeRowSort | null>(null);
  const [columnSort, setColumnSort] = useState<IncomeRowSort | null>(null);
  const [openHeaderMenu, setOpenHeaderMenu] = useState<{
    menuKey: string;
    anchorKey: string;
  } | null>(null);
  const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(missingCommission.length > 0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLayout(normalizeIncomeCubeLayout(JSON.parse(raw)));
      }
    } catch {
      setLayout(DEFAULT_INCOME_CUBE_LAYOUT);
    }
    setLayoutReady(true);
  }, []);

  useEffect(() => {
    if (!layoutReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout, layoutReady]);

  const filteredFacts = useMemo(
    () =>
      filterIncomeFacts(facts, {
        reservationFrom: "",
        reservationTo: "",
        stayFrom: "",
        stayTo: "",
      }, valueFilters),
    [facts, valueFilters]
  );

  const columnValueFilters = useMemo(() => {
    const next: IncomeValueFilters = {};
    for (const fieldId of layout.columns) {
      if (fieldId in valueFilters) {
        next[fieldId] = valueFilters[fieldId];
      }
    }
    return next;
  }, [layout.columns, valueFilters]);

  const pivot = useMemo(
    () =>
      buildIncomePivot(filteredFacts, layout, {
        columnValueFilters,
        columnSort,
      }),
    [filteredFacts, layout, columnValueFilters, columnSort]
  );

  const displayRows = useMemo(
    () => sortPivotRows(pivot.rows, layout.rows, rowSort),
    [pivot.rows, layout.rows, rowSort]
  );

  const used = usedFieldIds(layout);
  const hasMeasure = layout.values.length > 0;
  const measures = pivot.measures;
  const countMeasureIndex = measures.indexOf("reservationCount");
  const reservationTotal =
    countMeasureIndex >= 0 ? pivot.grandTotals[countMeasureIndex] ?? 0 : pivot.factCount;

  function handleDropField(
    fieldId: IncomeFieldId,
    zone: IncomeCubeZone,
    index: number
  ) {
    setLayout((current) => moveIncomeField(current, fieldId, zone, index));
    if (isIncomeDimensionId(fieldId) && zone !== "filters") {
      setValueFilters((current) => {
        if (!(fieldId in current)) return current;
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
    }
  }

  function handleReset() {
    setLayout(DEFAULT_INCOME_CUBE_LAYOUT);
    setValueFilters({});
    setRowSort(null);
    setColumnSort(null);
    setOpenHeaderMenu(null);
  }

  function handleExport() {
    startTransition(async () => {
      await downloadExcel(
        pivotToExcelRows(pivot, layout),
        buildIncomeReportFilename()
      );
    });
  }

  function handleMissingExport() {
    startTransition(async () => {
      await downloadExcel(
        missingCommissionToExcelRows(missingCommission),
        buildMissingCommissionFilename()
      );
    });
  }

  function columnLeafMeasureLabel(
    columnLabels: string[],
    measureId: IncomeMeasureId
  ) {
    const dimensionLabel = columnLabels.filter(Boolean).join(" ").trim();
    const measureLabel = getIncomeFieldLabel(measureId);
    return dimensionLabel ? `${dimensionLabel} ${measureLabel}` : measureLabel;
  }

  function totalMeasureLabel(measureId: IncomeMeasureId) {
    if (measures.length <= 1) return "Toplam";
    return `Toplam ${getIncomeFieldLabel(measureId)}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gelir Raporu</h1>
            <p className="text-sm text-gray-500">
              Küp rapor: alanları sürükleyerek satır, sütun ve değer sırasını
              değiştirin. Tablo başlıklarından filtre ve sıralama yapabilirsiniz.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending || !hasMeasure}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isPending ? "Aktarılıyor…" : "Excel'e Aktar"}
          </button>
        </div>
      </div>


      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setFieldsPanelOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="text-sm font-bold text-gray-900">Rapor Alanları</span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition ${
              fieldsPanelOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {fieldsPanelOpen ? (
          <div className="grid gap-4 border-t border-gray-100 p-4 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <p className="text-xs text-gray-500">
                Alanı tutup satır / sütun / değer bölgelerine bırakın.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {[...INCOME_DIMENSION_FIELDS, ...INCOME_MEASURE_FIELDS].map(
                  (field) => {
                    const placed = used.has(field.id);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          const payload: DragPayload = {
                            fieldId: field.id,
                            from: fieldZone(layout, field.id),
                          };
                          event.dataTransfer.setData(
                            DND_MIME,
                            JSON.stringify(payload)
                          );
                          event.dataTransfer.setData(
                            "text/plain",
                            JSON.stringify(payload)
                          );
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => {
                          if (placed) return;
                          if (isIncomeMeasureId(field.id)) {
                            handleDropField(field.id, "values", layout.values.length);
                            return;
                          }
                          handleDropField(field.id, "rows", layout.rows.length);
                        }}
                        className={`${chipClass(field.id, placed)} w-full cursor-grab justify-start text-left active:cursor-grabbing`}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{field.label}</span>
                        {placed ? (
                          <span className="ml-auto text-[10px] font-bold uppercase text-gray-400">
                            {fieldZone(layout, field.id) === "rows"
                              ? "Satır"
                              : fieldZone(layout, field.id) === "columns"
                                ? "Sütun"
                                : "Değer"}
                          </span>
                        ) : null}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <DropZone
                  zone="rows"
                  fieldIds={layout.rows}
                  onDropField={handleDropField}
                >
                  {layout.rows.map((fieldId, index) => (
                    <span key={fieldId} data-drop-index={index}>
                      <FieldChip
                        fieldId={fieldId}
                        from="rows"
                        onRemove={() => handleDropField(fieldId, "palette", 0)}
                      />
                    </span>
                  ))}
                </DropZone>
                <DropZone
                  zone="columns"
                  fieldIds={layout.columns}
                  onDropField={handleDropField}
                >
                  {layout.columns.map((fieldId, index) => (
                    <span key={fieldId} data-drop-index={index}>
                      <FieldChip
                        fieldId={fieldId}
                        from="columns"
                        onRemove={() => handleDropField(fieldId, "palette", 0)}
                      />
                    </span>
                  ))}
                </DropZone>
              </div>
              <DropZone
                zone="values"
                fieldIds={layout.values}
                onDropField={handleDropField}
              >
                {layout.values.map((fieldId, index) => (
                  <span key={fieldId} data-drop-index={index}>
                    <FieldChip
                      fieldId={fieldId}
                      from="values"
                      onRemove={() => handleDropField(fieldId, "palette", 0)}
                    />
                  </span>
                ))}
              </DropZone>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
          <p>
            {pivot.factCount.toLocaleString("tr-TR")} kayıt · Rezervasyon:{" "}
            <span className="font-bold text-gray-900">
              {reservationTotal.toLocaleString("tr-TR")}
            </span>
            {" · "}
            Toplam komisyon:{" "}
            <span className="font-bold text-gray-900">
              {formatMoneyPlain(pivot.grandTotal)}
            </span>
          </p>
          <p className="text-xs text-gray-400">
            Satır sırası gruplamayı, sütun sırası kırılımı değiştirir.
          </p>
        </div>

        {!hasMeasure ? (
          <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Raporu görmek için Rezervasyon Sayısı veya Gelir Tutarı alanını
            Değerler bölgesine sürükleyin.
          </p>
        ) : pivot.factCount === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            Seçilen alanlar ve filtrelere uygun gelir kaydı bulunamadı.
          </p>
        ) : (
          <div className="overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {layout.rows.length === 0 ? (
                    <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                      Toplam
                    </th>
                  ) : (
                    layout.rows.map((fieldId, rowIndex) => (
                      <RowDimensionHeader
                        key={fieldId}
                        fieldId={fieldId}
                        rowIndex={rowIndex}
                        facts={facts}
                        selected={valueFilters[fieldId]}
                        sort={rowSort}
                        menuOpen={
                          openHeaderMenu?.menuKey === `row:${fieldId}`
                        }
                        onToggleMenu={() =>
                          setOpenHeaderMenu((current) =>
                            current?.menuKey === `row:${fieldId}`
                              ? null
                              : {
                                  menuKey: `row:${fieldId}`,
                                  anchorKey: fieldId,
                                }
                          )
                        }
                        onCloseMenu={() => setOpenHeaderMenu(null)}
                        onChangeFilter={(values) =>
                          setValueFilters((current) => ({
                            ...current,
                            [fieldId]: values,
                          }))
                        }
                        onChangeSort={(direction) => {
                          if (direction == null) {
                            setRowSort((current) =>
                              current?.fieldId === fieldId ? null : current
                            );
                            return;
                          }
                          setRowSort({ fieldId, direction });
                        }}
                      />
                    ))
                  )}
                  {pivot.columnLeaves.flatMap((column, columnIndex) =>
                    measures.map((measureId) => {
                      const label = columnLeafMeasureLabel(
                        column.labels,
                        measureId
                      );
                      const anchorKey = `${column.keys.join("|")}-${measureId}`;
                      const columnFieldId =
                        layout.columns[layout.columns.length - 1];

                      if (!columnFieldId) {
                        return (
                          <th
                            key={`${anchorKey}-${columnIndex}`}
                            className="border-b border-gray-200 px-3 py-2 text-right text-xs font-bold text-gray-600"
                            style={{ minWidth: 140 }}
                          >
                            {label}
                          </th>
                        );
                      }

                      const menuKey = `col:${columnFieldId}`;
                      const isOpen =
                        openHeaderMenu?.menuKey === menuKey &&
                        openHeaderMenu.anchorKey === anchorKey;
                      return (
                        <th
                          key={`${anchorKey}-${columnIndex}`}
                          className="border-b border-gray-200 px-3 py-2 text-right text-xs font-bold text-gray-700"
                          style={{ minWidth: 140 }}
                        >
                          <HeaderFilterButton
                            menuKey={menuKey}
                            label={label}
                            align="right"
                            facts={facts}
                            fieldId={columnFieldId}
                            selected={valueFilters[columnFieldId]}
                            sort={columnSort}
                            menuOpen={isOpen}
                            renderMenu={isOpen}
                            onToggleMenu={() =>
                              setOpenHeaderMenu((current) =>
                                current?.menuKey === menuKey &&
                                current.anchorKey === anchorKey
                                  ? null
                                  : { menuKey, anchorKey }
                              )
                            }
                            onCloseMenu={() => setOpenHeaderMenu(null)}
                            onChangeFilter={(values) =>
                              setValueFilters((current) => ({
                                ...current,
                                [columnFieldId]: values,
                              }))
                            }
                            onChangeSort={(direction) => {
                              if (direction == null) {
                                setColumnSort((current) =>
                                  current?.fieldId === columnFieldId
                                    ? null
                                    : current
                                );
                                return;
                              }
                              setColumnSort({
                                fieldId: columnFieldId,
                                direction,
                              });
                            }}
                          />
                        </th>
                      );
                    })
                  )}
                  {measures.map((measureId) => (
                    <th
                      key={`tm-${measureId}`}
                      className="border-b border-gray-200 px-3 py-2 text-right text-xs font-bold text-gray-900"
                      style={{ minWidth: 130 }}
                    >
                      {layout.columns.length === 0
                        ? getIncomeFieldLabel(measureId)
                        : totalMeasureLabel(measureId)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIndex) => {
                  const isGroup = row.isSubtotal;
                  const rowBg = isGroup
                    ? row.depth === 0
                      ? "bg-slate-100 font-semibold"
                      : "bg-slate-50 font-medium"
                    : "bg-white";
                  const labelCount = Math.max(layout.rows.length, 1);
                  return (
                    <tr key={`${row.keys.join("|")}-${rowIndex}`} className={rowBg}>
                      {Array.from({ length: labelCount }).map((_, labelIndex) => (
                        <td
                          key={`l-${labelIndex}`}
                          className={`sticky z-10 border-b border-r border-gray-100 px-3 py-2 text-gray-800 ${rowBg}`}
                          style={{ left: labelIndex * 140, minWidth: 140 }}
                        >
                          {row.labels[labelIndex] ?? ""}
                        </td>
                      ))}
                      {row.cells.flatMap((column, columnIndex) =>
                        column.map((value, measureIndex) => (
                          <td
                            key={`v-${columnIndex}-${measureIndex}`}
                            className="border-b border-gray-100 px-3 py-2 text-right tabular-nums text-gray-800"
                          >
                            {formatPivotCell(
                              measures[measureIndex] ?? "commissionAmount",
                              value
                            )}
                          </td>
                        ))
                      )}
                      {row.totals.map((value, measureIndex) => (
                        <td
                          key={`rt-${measureIndex}`}
                          className="border-b border-gray-100 px-3 py-2 text-right tabular-nums font-semibold text-gray-900"
                        >
                          {formatPivotCell(
                            measures[measureIndex] ?? "commissionAmount",
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 font-bold">
                  {Array.from({
                    length: Math.max(layout.rows.length, 1),
                  }).map((_, index) => (
                    <td
                      key={`t-${index}`}
                      className="sticky z-10 border-t border-r border-teal-100 bg-teal-50 px-3 py-2 text-teal-900"
                      style={{ left: index * 140 }}
                    >
                      {index === 0 ? "Genel Toplam" : ""}
                    </td>
                  ))}
                  {pivot.columnTotals.flatMap((column, columnIndex) =>
                    column.map((value, measureIndex) => (
                      <td
                        key={`tv-${columnIndex}-${measureIndex}`}
                        className="border-t border-teal-100 px-3 py-2 text-right tabular-nums text-teal-900"
                      >
                        {formatPivotCell(
                          measures[measureIndex] ?? "commissionAmount",
                          value
                        )}
                      </td>
                    ))
                  )}
                  {pivot.grandTotals.map((value, measureIndex) => (
                    <td
                      key={`gt-${measureIndex}`}
                      className="border-t border-teal-100 px-3 py-2 text-right tabular-nums text-teal-950"
                    >
                      {formatPivotCell(
                        measures[measureIndex] ?? "commissionAmount",
                        value
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {missingCommission.length > 0 ? (
      <section className="rounded-2xl border border-amber-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setMissingOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Komisyonu boş onaylı rezervasyonlar
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs">
              {missingCommission.length}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-amber-700 transition ${
              missingOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {missingOpen ? (
          <div className="space-y-3 border-t border-amber-100 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-amber-900">
                Onaylandı durumunda olup rezervasyon formundaki komisyon tutarı
                boş veya 0 olan kayıtlar.
              </p>
              <button
                type="button"
                onClick={handleMissingExport}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
            </div>
            <div className="max-h-[420px] overflow-auto rounded-xl border border-amber-100">
              <table className="min-w-full text-sm">
                <thead className="bg-amber-50 text-left text-xs font-bold uppercase tracking-wide text-amber-900">
                  <tr>
                    <th className="px-3 py-2">Rezervasyon</th>
                    <th className="px-3 py-2">Villa Adı</th>
                    <th className="px-3 py-2">Misafir</th>
                    <th className="px-3 py-2">Rezervasyon</th>
                    <th className="px-3 py-2">Konaklama</th>
                    <th className="px-3 py-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {missingCommission.map((row) => (
                    <tr key={row.id} className="border-t border-amber-50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/rezervasyonlar/${row.id}`}
                          className="font-semibold text-teal-700 hover:underline"
                        >
                          {row.reservationNo}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-800">{row.villaName}</td>
                      <td className="px-3 py-2 text-gray-800">{row.guestName}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.reservationDate}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.checkIn} — {row.checkOut}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                        {row.totalPrice != null
                          ? formatMoneyPlain(row.totalPrice)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}
