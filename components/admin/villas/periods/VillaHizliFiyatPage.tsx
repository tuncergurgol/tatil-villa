"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileSpreadsheet,
  Pencil,
  Percent,
  Save,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  deleteVillaPricePeriod,
  updateVillaPricePeriod,
} from "@/app/actions/admin/villa-periods";
import VillaPeriodFormModal from "@/components/admin/villas/periods/VillaPeriodFormModal";
import VillaPeriodExcelImportModal from "@/components/admin/villas/periods/VillaPeriodExcelImportModal";
import HizliFiyatDiscountListModal from "@/components/admin/villas/periods/HizliFiyatDiscountListModal";
import HizliFiyatSaveOverlay from "@/components/admin/villas/periods/HizliFiyatSaveOverlay";
import type { VillaAdminRoute } from "@/lib/villa-admin-path";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import type { VillaPriceDiscountItem } from "@/lib/villa-price-discount";
import {
  buildNewPeriodPrefill,
  dbDateToDateKey,
} from "@/lib/villa-period-calendar";
import {
  VILLA_PERIOD_CURRENCIES,
  formatAmountInput,
  formatMoneyAmount,
  parseAmountInput,
  resolveVillaPeriodPricing,
  sanitizeAmountInput,
  syncPeriodPrices,
  type VillaPeriodCurrency,
} from "@/lib/villa-period-pricing";

interface VillaHizliFiyatPageProps {
  villa: {
    id: string;
    slug: string;
    name: string;
    originalName: string;
    documentNo: string;
  };
  periods: VillaPricePeriodItem[];
  priceDiscounts: VillaPriceDiscountItem[];
  routeVilla: VillaAdminRoute;
}

type PeriodRowState = {
  id: string;
  startDate: string;
  endDate: string;
  prepaymentRate: string;
  commissionRate: string;
  nightlyPrice: string;
  nightlyPriceWithoutCommission: string;
  weeklyPrice: string;
  minStayNights: string;
  cleaningDayCount: string;
  cleaningFee: string;
  damageDeposit: string;
  extraBedFee: string;
  petDamageDeposit: string;
  petCleaningFee: string;
  underfloorHeatingFee: string;
  nightlyPriceCurrency: VillaPeriodCurrency;
  discount1Rate: string;
  discount2Rate: string;
  extraDiscountAmount: string;
  weekendPrice: string;
  weekendDays: string;
  weekendMinStayNights: string;
  dirty: boolean;
};

type BulkEditField =
  | "commissionRate"
  | "prepaymentRate"
  | "nightlyPrice"
  | "minStayNights"
  | "cleaningDayCount"
  | "cleaningFee"
  | "damageDeposit"
  | "extraBedFee"
  | "petDamageDeposit"
  | "petCleaningFee"
  | "underfloorHeatingFee";

const AMOUNT_BULK_FIELDS = new Set<BulkEditField>([
  "nightlyPrice",
  "cleaningFee",
  "damageDeposit",
  "extraBedFee",
  "petDamageDeposit",
  "petCleaningFee",
  "underfloorHeatingFee",
]);

const BULK_EDIT_OPTIONS: { value: BulkEditField; label: string }[] = [
  { value: "commissionRate", label: "Komisyon %" },
  { value: "prepaymentRate", label: "Ön Ödeme %" },
  { value: "nightlyPrice", label: "Gecelik Fiyat" },
  { value: "minStayNights", label: "Minimum Gece" },
  { value: "cleaningDayCount", label: "Temizlik Gün Sayısı" },
  { value: "cleaningFee", label: "Temizlik Bedeli" },
  { value: "damageDeposit", label: "Hasar Depozitosu" },
  { value: "extraBedFee", label: "Ek Yatak Bedeli" },
  { value: "petDamageDeposit", label: "Evcil Hayvan Hasar Depozitosu" },
  { value: "petCleaningFee", label: "Evcil Hayvan Temizlik Bedeli" },
  { value: "underfloorHeatingFee", label: "Yerden Isıtma" },
];

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

const dirtyCellInputClass =
  "w-full min-w-0 rounded-lg border border-violet-300 bg-violet-50/30 px-2 py-1.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

/** Masaüstü tabloda daraltmayı engeller; yatay scroll ile okunur kalır. */
const tableCellInputBase =
  "block shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm tabular-nums text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";
const tableDirtyCellInputBase =
  "block shrink-0 rounded-lg border border-violet-300 bg-violet-50/30 px-2.5 py-1.5 text-sm tabular-nums text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

function rowInputClass(dirty: boolean) {
  return dirty ? dirtyCellInputClass : cellInputClass;
}

function tableInputClass(
  dirty: boolean,
  size: "date" | "pct" | "price" | "fee" | "currency"
) {
  const sizeClass =
    size === "date"
      ? "w-[10.5rem] min-w-[10.5rem]"
      : size === "pct"
        ? "w-[4.5rem] min-w-[4.5rem]"
        : size === "price"
          ? "w-[7.5rem] min-w-[7.5rem]"
          : size === "fee"
            ? "w-[6.5rem] min-w-[6.5rem]"
            : "w-[5.5rem] min-w-[5.5rem]";
  return `${dirty ? tableDirtyCellInputBase : tableCellInputBase} ${sizeClass}`;
}

function dirtyRowClass(dirty: boolean) {
  return dirty
    ? "border-l-4 border-l-violet-500 bg-violet-50 ring-1 ring-inset ring-violet-100"
    : "hover:bg-gray-50/60";
}

const readOnlyClass =
  "rounded-lg bg-gray-50 px-2 py-1.5 text-sm tabular-nums text-gray-700";

const tableReadOnlyClass =
  "block w-[7.5rem] min-w-[7.5rem] rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm tabular-nums text-gray-700";

const tableHeadClass =
  "whitespace-nowrap bg-gray-50 px-2.5 py-3 text-left text-[11px] font-semibold tracking-wide text-gray-500 uppercase";

function periodDateKey(date: Date): string {
  return dbDateToDateKey(new Date(date));
}

function periodToRow(period: VillaPricePeriodItem): PeriodRowState {
  return {
    id: period.id,
    startDate: periodDateKey(period.startDate),
    endDate: periodDateKey(period.endDate),
    prepaymentRate:
      period.prepaymentRate != null
        ? String(period.prepaymentRate)
        : period.commissionRate != null
          ? String(period.commissionRate)
          : "20",
    commissionRate:
      period.commissionRate != null ? String(period.commissionRate) : "20",
    nightlyPrice: formatAmountInput(period.nightlyPrice),
    nightlyPriceWithoutCommission: formatAmountInput(
      period.nightlyPriceWithoutCommission
    ),
    weeklyPrice: formatAmountInput(period.weeklyPrice),
    minStayNights:
      period.minStayNights != null ? String(period.minStayNights) : "",
    cleaningDayCount:
      period.cleaningDayCount != null ? String(period.cleaningDayCount) : "",
    cleaningFee: formatAmountInput(period.cleaningFee),
    damageDeposit: formatAmountInput(period.damageDeposit),
    extraBedFee: formatAmountInput(period.extraBedFee),
    petDamageDeposit: formatAmountInput(period.petDamageDeposit),
    petCleaningFee: formatAmountInput(period.petCleaningFee),
    underfloorHeatingFee: formatAmountInput(period.underfloorHeatingFee),
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    discount1Rate:
      period.discount1Rate != null ? String(period.discount1Rate) : "",
    discount2Rate:
      period.discount2Rate != null ? String(period.discount2Rate) : "",
    extraDiscountAmount: formatAmountInput(period.extraDiscountAmount),
    weekendPrice: formatAmountInput(period.weekendPrice),
    weekendDays: period.weekendDays.join(","),
    weekendMinStayNights:
      period.weekendMinStayNights != null
        ? String(period.weekendMinStayNights)
        : "",
    dirty: false,
  };
}

function setOptionalAmount(formData: FormData, key: string, value: string) {
  const parsed = parseAmountInput(value);
  formData.set(key, parsed != null ? String(parsed) : "");
}

function buildPeriodFormData(
  row: PeriodRowState,
  sourcePeriod?: VillaPricePeriodItem
): FormData {
  const commissionRate = Number(row.commissionRate) || 0;
  const synced = syncPeriodPrices({
    source: "commissioned",
    commissioned: parseAmountInput(row.nightlyPrice),
    commissionRate,
  });

  const formData = new FormData();
  formData.set("startDate", row.startDate);
  formData.set("endDate", row.endDate);
  formData.set("availability", "available");
  formData.set("nightlyPrice", String(parseAmountInput(row.nightlyPrice) ?? 0));
  formData.set("nightlyPriceCurrency", row.nightlyPriceCurrency);
  formData.set(
    "weeklyPrice",
    synced
      ? String(parseAmountInput(synced.weeklyPrice) ?? "")
      : String(parseAmountInput(row.weeklyPrice) ?? "")
  );
  formData.set("prepaymentRate", row.prepaymentRate || row.commissionRate || "20");
  formData.set("commissionRate", row.commissionRate || "20");
  formData.set(
    "nightlyPriceWithoutCommission",
    synced
      ? String(parseAmountInput(synced.nightlyPriceWithoutCommission) ?? "")
      : String(parseAmountInput(row.nightlyPriceWithoutCommission) ?? "")
  );
  formData.set("minStayNights", row.minStayNights || "");
  formData.set("cleaningDayCount", row.cleaningDayCount || "");
  setOptionalAmount(formData, "cleaningFee", row.cleaningFee);
  formData.set("cleaningFeeCurrency", row.nightlyPriceCurrency);
  setOptionalAmount(formData, "damageDeposit", row.damageDeposit);
  formData.set("damageDepositCurrency", row.nightlyPriceCurrency);
  setOptionalAmount(formData, "petCleaningFee", row.petCleaningFee);
  formData.set("petCleaningFeeCurrency", row.nightlyPriceCurrency);
  setOptionalAmount(formData, "petDamageDeposit", row.petDamageDeposit);
  formData.set("petDamageDepositCurrency", row.nightlyPriceCurrency);
  setOptionalAmount(formData, "underfloorHeatingFee", row.underfloorHeatingFee);
  formData.set("underfloorHeatingFeeCurrency", row.nightlyPriceCurrency);
  setOptionalAmount(formData, "extraBedFee", row.extraBedFee);
  formData.set("extraBedFeeCurrency", row.nightlyPriceCurrency);
  formData.set(
    "poolHeatingPrivateFee",
    String(sourcePeriod?.poolHeatingPrivateFee ?? "")
  );
  formData.set(
    "poolHeatingPrivateFeeCurrency",
    sourcePeriod?.poolHeatingPrivateFeeCurrency ?? row.nightlyPriceCurrency
  );
  formData.set(
    "poolHeatingIndoorFee",
    String(sourcePeriod?.poolHeatingIndoorFee ?? "")
  );
  formData.set(
    "poolHeatingIndoorFeeCurrency",
    sourcePeriod?.poolHeatingIndoorFeeCurrency ?? row.nightlyPriceCurrency
  );
  formData.set(
    "poolHeatingKidsFee",
    String(sourcePeriod?.poolHeatingKidsFee ?? "")
  );
  formData.set(
    "poolHeatingKidsFeeCurrency",
    sourcePeriod?.poolHeatingKidsFeeCurrency ?? row.nightlyPriceCurrency
  );
  formData.set("discount1Rate", row.discount1Rate || "");
  formData.set("discount2Rate", row.discount2Rate || "");
  setOptionalAmount(formData, "extraDiscountAmount", row.extraDiscountAmount);
  setOptionalAmount(formData, "weekendPrice", row.weekendPrice);
  formData.set("weekendDays", row.weekendDays || "");
  formData.set("weekendMinStayNights", row.weekendMinStayNights || "");
  formData.set("childFee02", String(sourcePeriod?.childFee02 ?? ""));
  formData.set(
    "childFee02Currency",
    sourcePeriod?.childFee02Currency ?? row.nightlyPriceCurrency
  );
  formData.set("childFee03_09", String(sourcePeriod?.childFee03_09 ?? ""));
  formData.set(
    "childFee03_09Currency",
    sourcePeriod?.childFee03_09Currency ?? row.nightlyPriceCurrency
  );
  return formData;
}

function recalcRowPrices(row: PeriodRowState): PeriodRowState {
  const commissionRate = Number(row.commissionRate) || 0;
  const synced = syncPeriodPrices({
    source: "commissioned",
    commissioned: parseAmountInput(row.nightlyPrice),
    commissionRate,
  });

  if (!synced) return row;

  return {
    ...row,
    nightlyPrice: synced.nightlyPrice,
    nightlyPriceWithoutCommission: synced.nightlyPriceWithoutCommission,
    weeklyPrice: synced.weeklyPrice,
  };
}

function formatDiscountLabel(row: PeriodRowState): string {
  const parts: string[] = [];
  if (row.discount1Rate) parts.push(`%${row.discount1Rate}`);
  if (row.discount2Rate) parts.push(`%${row.discount2Rate}`);
  if (row.extraDiscountAmount) parts.push(row.extraDiscountAmount);
  return parts.length > 0 ? parts.join(" + ") : "—";
}

function formatPeriodDateLabel(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

type PeriodCardProps = {
  row: PeriodRowState;
  index: number;
  pricing: ReturnType<typeof resolveRowDisplayPricing>;
  selected: boolean;
  isPending: boolean;
  onToggleSelect: () => void;
  onUpdate: (
    patch: Partial<PeriodRowState>,
    recalc?: boolean
  ) => void;
  onAdvancedEdit: () => void;
  onDelete: () => void;
};

function HizliFiyatPeriodMobileCard({
  row,
  index,
  pricing,
  selected,
  isPending,
  onToggleSelect,
  onUpdate,
  onAdvancedEdit,
  onDelete,
}: PeriodCardProps) {
  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${dirtyRowClass(row.dirty)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex min-w-0 flex-1 items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 rounded border-gray-300"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {row.dirty ? (
                <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-violet-500" />
              ) : null}
              <p className="text-sm font-bold text-gray-900">
                Periyot {index + 1}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatPeriodDateLabel(row.startDate)} –{" "}
              {formatPeriodDateLabel(row.endDate)}
            </p>
          </div>
        </label>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAdvancedEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
            aria-label="Gelişmiş düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 disabled:opacity-50"
            aria-label="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-[11px] font-medium text-gray-500">
          Başlangıç
          <input
            type="date"
            value={row.startDate}
            onChange={(event) => onUpdate({ startDate: event.target.value })}
            className={`${rowInputClass(row.dirty)} mt-1`}
          />
        </label>
        <label className="block text-[11px] font-medium text-gray-500">
          Bitiş
          <input
            type="date"
            value={row.endDate}
            onChange={(event) => onUpdate({ endDate: event.target.value })}
            className={`${rowInputClass(row.dirty)} mt-1`}
          />
        </label>
        <label className="block text-[11px] font-medium text-gray-500">
          Komisyon %
          <input
            type="number"
            min={0}
            max={100}
            value={row.commissionRate}
            onChange={(event) =>
              onUpdate({ commissionRate: event.target.value }, true)
            }
            className={`${rowInputClass(row.dirty)} mt-1`}
          />
        </label>
        <label className="block text-[11px] font-medium text-gray-500">
          Ön Ödeme %
          <input
            type="number"
            min={0}
            max={100}
            value={row.prepaymentRate}
            onChange={(event) =>
              onUpdate({ prepaymentRate: event.target.value })
            }
            className={`${rowInputClass(row.dirty)} mt-1`}
          />
        </label>
        <label className="col-span-2 block text-[11px] font-medium text-gray-500">
          Gecelik Fiyat
          <input
            type="text"
            inputMode="numeric"
            value={row.nightlyPrice}
            onChange={(event) =>
              onUpdate(
                { nightlyPrice: sanitizeAmountInput(event.target.value) },
                true
              )
            }
            className={`${rowInputClass(row.dirty)} mt-1 text-base font-semibold`}
          />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-gray-500">Komsz.</p>
          <p className="font-semibold text-gray-800">
            {formatMoneyAmount(pricing.nightlyPriceWithoutCommission)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-gray-500">Haftalık</p>
          <p className="font-semibold text-gray-800">
            {formatMoneyAmount(pricing.weeklyPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-gray-500">İndirim</p>
          <p className="font-medium text-gray-700">{formatDiscountLabel(row)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-gray-500">Para Birimi</p>
          <select
            value={row.nightlyPriceCurrency}
            onChange={(event) =>
              onUpdate({
                nightlyPriceCurrency: event.target.value as VillaPeriodCurrency,
              })
            }
            className={`${rowInputClass(row.dirty)} mt-0.5 py-1 text-xs`}
          >
            {VILLA_PERIOD_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-violet-600">
          Diğer alanlar
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-[11px] font-medium text-gray-500">
            Min Gece
            <input
              type="number"
              min={1}
              value={row.minStayNights}
              onChange={(event) =>
                onUpdate({ minStayNights: event.target.value })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Temiz. Gün
            <input
              type="number"
              min={0}
              value={row.cleaningDayCount}
              onChange={(event) =>
                onUpdate({ cleaningDayCount: event.target.value })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Temiz. Bedel
            <input
              type="text"
              inputMode="numeric"
              value={row.cleaningFee}
              onChange={(event) =>
                onUpdate({
                  cleaningFee: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Hasar Dep.
            <input
              type="text"
              inputMode="numeric"
              value={row.damageDeposit}
              onChange={(event) =>
                onUpdate({
                  damageDeposit: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Ek Yatak Bedeli
            <input
              type="text"
              inputMode="numeric"
              value={row.extraBedFee}
              onChange={(event) =>
                onUpdate({
                  extraBedFee: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Evcil Hayvan Hasar Dep.
            <input
              type="text"
              inputMode="numeric"
              value={row.petDamageDeposit}
              onChange={(event) =>
                onUpdate({
                  petDamageDeposit: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Evcil Hayvan Temizlik
            <input
              type="text"
              inputMode="numeric"
              value={row.petCleaningFee}
              onChange={(event) =>
                onUpdate({
                  petCleaningFee: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
          <label className="block text-[11px] font-medium text-gray-500">
            Yerden Isıtma
            <input
              type="text"
              inputMode="numeric"
              value={row.underfloorHeatingFee}
              onChange={(event) =>
                onUpdate({
                  underfloorHeatingFee: sanitizeAmountInput(event.target.value),
                })
              }
              className={`${rowInputClass(row.dirty)} mt-1`}
            />
          </label>
        </div>
      </details>
    </article>
  );
}

/** KOMSZ. ve haftalık fiyatı her zaman güncel FİYAT alanından türetir. */
function resolveRowDisplayPricing(row: PeriodRowState) {
  return resolveVillaPeriodPricing({
    nightlyPrice: parseAmountInput(row.nightlyPrice) ?? 0,
    nightlyPriceWithoutCommission: null,
    weeklyPrice: null,
    commissionRate: Number(row.commissionRate) || 0,
    discount1Rate: Number(row.discount1Rate) || 0,
    discount2Rate: Number(row.discount2Rate) || 0,
    extraDiscountAmount: parseAmountInput(row.extraDiscountAmount) ?? 0,
  });
}

export default function VillaHizliFiyatPage({
  villa,
  periods,
  priceDiscounts,
  routeVilla,
}: VillaHizliFiyatPageProps) {
  const router = useRouter();
  const [rows, setRows] = useState<PeriodRowState[]>(() =>
    periods.map(periodToRow)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [bulkField, setBulkField] =
    useState<BulkEditField>("commissionRate");
  const [bulkValue, setBulkValue] = useState("");
  const [editingPeriod, setEditingPeriod] = useState<VillaPricePeriodItem | null>(
    null
  );
  const [modalDateRange, setModalDateRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [modalTemplatePeriod, setModalTemplatePeriod] =
    useState<VillaPricePeriodItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Sunucudan yenilenen veriyi yerel toplu düzenleme tablosuna aktar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(periods.map(periodToRow));
    setSelectedIds(new Set());
  }, [periods]);

  const dirtyCount = useMemo(
    () => rows.filter((row) => row.dirty).length,
    [rows]
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<PeriodRowState>, recalc = false) => {
      setRows((current) =>
        current.map((row) => {
          if (row.id !== id) return row;
          let next = { ...row, ...patch, dirty: true };
          if (
            recalc &&
            (patch.nightlyPrice != null || patch.commissionRate != null)
          ) {
            next = recalcRowPrices(next);
          }
          return next;
        })
      );
    },
    []
  );

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((row) => row.id)));
    }
  }

  function handleSaveAll() {
    const dirtyRows = rows.filter((row) => row.dirty);
    if (dirtyRows.length === 0) return;

    setError(null);
    startTransition(async () => {
      const removedIds = new Set<string>();
      for (const row of dirtyRows) {
        if (removedIds.has(row.id)) continue;
        const result = await updateVillaPricePeriod(
          villa.id,
          row.id,
          buildPeriodFormData(
            row,
            periods.find((period) => period.id === row.id)
          )
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        for (const id of result.removedPeriodIds ?? []) {
          removedIds.add(id);
        }
      }
      router.refresh();
      setRows((current) => current.map((row) => ({ ...row, dirty: false })));
    });
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} periyot silinsin mi?`)) return;

    setError(null);
    startTransition(async () => {
      for (const id of selectedIds) {
        const result = await deleteVillaPricePeriod(villa.id, id);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function handleApplyBulkEdit() {
    if (selectedIds.size === 0) {
      setError("Hızlı düzenleme için en az bir periyot seçin.");
      return;
    }
    if (!bulkValue.trim()) {
      setError("Uygulanacak değeri girin.");
      return;
    }

    const sanitizedValue = AMOUNT_BULK_FIELDS.has(bulkField)
      ? sanitizeAmountInput(bulkValue)
      : String(Math.max(0, Math.round(Number(bulkValue))));

    if (
      !sanitizedValue ||
      !Number.isFinite(
        AMOUNT_BULK_FIELDS.has(bulkField)
          ? parseAmountInput(sanitizedValue)
          : Number(sanitizedValue)
      )
    ) {
      setError("Geçerli bir değer girin.");
      return;
    }

    setRows((current) =>
      current.map((row) => {
        if (!selectedIds.has(row.id)) return row;
        const next = {
          ...row,
          [bulkField]: sanitizedValue,
          dirty: true,
        };
        return bulkField === "commissionRate" || bulkField === "nightlyPrice"
          ? recalcRowPrices(next)
          : next;
      })
    );
    setBulkValue("");
    setError(null);
  }

  function handleApplyWeekendPrice() {
    if (selectedIds.size === 0) {
      setError("Haftasonu fiyatı için en az bir periyot seçin.");
      return;
    }
    const rawPrice = window.prompt(
      `${selectedIds.size} periyoda uygulanacak haftasonu gecelik fiyatını girin:`
    );
    if (rawPrice == null) return;
    const weekendPrice = sanitizeAmountInput(rawPrice);
    if (!weekendPrice || parseAmountInput(weekendPrice) == null) {
      setError("Geçerli bir haftasonu fiyatı girin.");
      return;
    }

    setRows((current) =>
      current.map((row) =>
        selectedIds.has(row.id)
          ? {
              ...row,
              weekendPrice,
              weekendDays: row.weekendDays || "5,6",
              dirty: true,
            }
          : row
      )
    );
    setError(null);
  }

  function handleDeleteRow(id: string) {
    if (!window.confirm("Bu periyot silinsin mi?")) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteVillaPricePeriod(villa.id, id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function openDiscountModal() {
    if (dirtyCount > 0) {
      setError("İndirim uygulamadan önce tablodaki değişiklikleri kaydedin.");
      return;
    }
    setError(null);
    setDiscountModalOpen(true);
  }

  function openAdvancedModal(period?: VillaPricePeriodItem) {
    if (period) {
      setEditingPeriod(period);
      setModalDateRange(null);
      setModalTemplatePeriod(null);
    } else {
      const prefill = buildNewPeriodPrefill(periods);
      setEditingPeriod(null);
      setModalTemplatePeriod(prefill.templatePeriod);
      setModalDateRange(prefill.dateRange);
    }
    setModalOpen(true);
  }

  return (
    <div className="-mx-3 -mt-3 flex min-h-[calc(100dvh-4.5rem)] flex-col gap-3 bg-[#f4f6fb] px-3 pb-3 md:mx-0 md:mt-0 md:h-[calc(100dvh-3rem)] md:gap-4 md:bg-transparent md:px-0 md:pb-0">
      <div className="shrink-0 rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm md:px-5 md:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div className="flex items-start gap-2 md:gap-3">
            <Link
              href="/admin/villalar"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 md:mt-0.5 md:px-3 md:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase md:text-xs">
                Hızlı Fiyat
              </p>
              <h1 className="mt-0.5 text-lg font-bold text-gray-900 md:mt-1 md:text-2xl">
                {villa.name}
              </h1>
              <p className="mt-0.5 text-xs text-gray-500 md:mt-1 md:text-sm">
                {rows.length} periyot
                {routeVilla.villaId != null ? (
                  <span className="ml-1 text-gray-400 md:ml-2">
                    · Villa ID {routeVilla.villaId}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
            <button
              type="button"
              onClick={() => setExcelImportOpen(true)}
              className="hidden items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 md:inline-flex"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel&apos;den İçeri Al
            </button>
            <Link
              href={villaTakvimPath(routeVilla)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Takvim
            </Link>
            <Link
              href={villaAdminEditPath(routeVilla)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Villa Düzenleme
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 md:flex">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isPending || selectedIds.size === 0}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              Seçilenleri Sil ({selectedIds.size})
            </button>

            <div className="h-6 w-px bg-gray-200" />

            <select
              value={bulkField}
              onChange={(event) =>
                setBulkField(event.target.value as BulkEditField)
              }
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 outline-none focus:border-violet-300"
              aria-label="Hızlı düzenleme alanı"
            >
              {BULK_EDIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleApplyBulkEdit();
              }}
              placeholder="Değer"
              className="h-8 w-24 rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="button"
              onClick={handleApplyBulkEdit}
              disabled={selectedIds.size === 0}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              Seçilene Uygula ({selectedIds.size})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyWeekendPrice}
              disabled={selectedIds.size === 0}
              className="h-8 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
            >
              Haftasonu Fiyatı Gir ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => openAdvancedModal()}
              className="h-8 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700"
            >
              + Yeni Periyot Ekle
            </button>
            <button
              type="button"
              onClick={openDiscountModal}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white transition hover:bg-teal-700"
            >
              <Percent className="h-3.5 w-3.5" />
              İndirim
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isPending || dirtyCount === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {isPending ? "Kaydediliyor..." : `Tümünü Kaydet (${dirtyCount})`}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 md:hidden">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={rows.length > 0 && selectedIds.size === rows.length}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            Tümünü seç
          </label>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={isPending || selectedIds.size === 0}
            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Sil ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isPending || dirtyCount === 0}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Kaydediliyor..." : `Kaydet (${dirtyCount})`}
          </button>
          <button
            type="button"
            onClick={openDiscountModal}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <Percent className="h-3.5 w-3.5" />
            İndirim
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 md:hidden">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
              Henüz periyot yok. Yeni periyot ekleyerek başlayın.
            </div>
          ) : (
            rows.map((row, index) => {
              const pricing = resolveRowDisplayPricing(row);
              return (
                <HizliFiyatPeriodMobileCard
                  key={row.id}
                  row={row}
                  index={index}
                  pricing={pricing}
                  selected={selectedIds.has(row.id)}
                  isPending={isPending}
                  onToggleSelect={() => toggleSelect(row.id)}
                  onUpdate={(patch, recalc) => updateRow(row.id, patch, recalc)}
                  onAdvancedEdit={() => {
                    const period = periods.find((p) => p.id === row.id);
                    if (period) openAdvancedModal(period);
                  }}
                  onDelete={() => handleDeleteRow(row.id)}
                />
              );
            })
          )}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto md:block">
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
              <tr>
                <th className={`${tableHeadClass} px-3`}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className={tableHeadClass}>#</th>
                <th className={tableHeadClass}>Başlangıç</th>
                <th className={tableHeadClass}>Bitiş</th>
                <th className={tableHeadClass}>Ön Öd. %</th>
                <th className={tableHeadClass}>Kom. %</th>
                <th className={tableHeadClass}>Fiyat</th>
                <th className={tableHeadClass}>İndirim</th>
                <th className={tableHeadClass}>Komsz.</th>
                <th className={tableHeadClass}>Haftalık</th>
                <th className={tableHeadClass}>Min Gece</th>
                <th className={tableHeadClass}>Temiz. Gün</th>
                <th className={tableHeadClass}>Temiz. Bedel</th>
                <th className={tableHeadClass}>Hasar Dep.</th>
                <th className={tableHeadClass}>Ek Yatak</th>
                <th className={tableHeadClass}>Evcil Hasar</th>
                <th className={tableHeadClass}>Evcil Temizlik</th>
                <th className={tableHeadClass}>Yerden Isıtma</th>
                <th className={tableHeadClass}>Para Bir.</th>
                <th className={tableHeadClass}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={20}
                    className="px-5 py-16 text-center text-sm text-gray-500"
                  >
                    Henüz periyot yok. Yeni periyot ekleyerek başlayın.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const pricing = resolveRowDisplayPricing(row);

                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-100 ${dirtyRowClass(row.dirty)}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          {row.dirty ? (
                            <span
                              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-violet-500"
                              title="Kaydedilmemiş değişiklik"
                            />
                          ) : null}
                          <span className="text-gray-500">{index + 1}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(event) =>
                            updateRow(row.id, { startDate: event.target.value })
                          }
                          className={tableInputClass(row.dirty, "date")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="date"
                          value={row.endDate}
                          onChange={(event) =>
                            updateRow(row.id, { endDate: event.target.value })
                          }
                          className={tableInputClass(row.dirty, "date")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.prepaymentRate}
                          onChange={(event) =>
                            updateRow(row.id, {
                              prepaymentRate: event.target.value,
                            })
                          }
                          className={tableInputClass(row.dirty, "pct")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.commissionRate}
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              { commissionRate: event.target.value },
                              true
                            )
                          }
                          className={tableInputClass(row.dirty, "pct")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.nightlyPrice}
                          onChange={(event) =>
                            updateRow(
                              row.id,
                              {
                                nightlyPrice: sanitizeAmountInput(
                                  event.target.value
                                ),
                              },
                              true
                            )
                          }
                          className={tableInputClass(row.dirty, "price")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-gray-600">
                        {formatDiscountLabel(row)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <div className={tableReadOnlyClass}>
                          {formatMoneyAmount(
                            pricing.nightlyPriceWithoutCommission
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <div className={tableReadOnlyClass}>
                          {formatMoneyAmount(pricing.weeklyPrice)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="number"
                          min={1}
                          value={row.minStayNights}
                          onChange={(event) =>
                            updateRow(row.id, {
                              minStayNights: event.target.value,
                            })
                          }
                          className={tableInputClass(row.dirty, "pct")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.cleaningDayCount}
                          onChange={(event) =>
                            updateRow(row.id, {
                              cleaningDayCount: event.target.value,
                            })
                          }
                          className={tableInputClass(row.dirty, "pct")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.cleaningFee}
                          onChange={(event) =>
                            updateRow(row.id, {
                              cleaningFee: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.damageDeposit}
                          onChange={(event) =>
                            updateRow(row.id, {
                              damageDeposit: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.extraBedFee}
                          onChange={(event) =>
                            updateRow(row.id, {
                              extraBedFee: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.petDamageDeposit}
                          onChange={(event) =>
                            updateRow(row.id, {
                              petDamageDeposit: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.petCleaningFee}
                          onChange={(event) =>
                            updateRow(row.id, {
                              petCleaningFee: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.underfloorHeatingFee}
                          onChange={(event) =>
                            updateRow(row.id, {
                              underfloorHeatingFee: sanitizeAmountInput(
                                event.target.value
                              ),
                            })
                          }
                          className={tableInputClass(row.dirty, "fee")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <select
                          value={row.nightlyPriceCurrency}
                          onChange={(event) =>
                            updateRow(row.id, {
                              nightlyPriceCurrency: event.target
                                .value as VillaPeriodCurrency,
                            })
                          }
                          className={tableInputClass(row.dirty, "currency")}
                        >
                          {VILLA_PERIOD_CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const period = periods.find((p) => p.id === row.id);
                              if (period) openAdvancedModal(period);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            title="Gelişmiş düzenle"
                            aria-label="Gelişmiş düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            disabled={isPending}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VillaPeriodFormModal
        open={modalOpen}
        villaId={villa.id}
        period={editingPeriod}
        templatePeriod={modalTemplatePeriod}
        prefillDateRange={modalDateRange}
        continueAfterSave={false}
        onClose={() => {
          setModalOpen(false);
          setEditingPeriod(null);
          setModalDateRange(null);
          setModalTemplatePeriod(null);
        }}
        onSaved={() => {
          setModalOpen(false);
          setEditingPeriod(null);
          setModalDateRange(null);
          setModalTemplatePeriod(null);
          router.refresh();
        }}
      />

      <VillaPeriodExcelImportModal
        open={excelImportOpen}
        villaId={villa.id}
        onClose={() => setExcelImportOpen(false)}
        onImported={(count) => {
          setExcelImportOpen(false);
          setError(null);
          window.alert(`${count} periyot Excel'den içeri aktarıldı.`);
          router.refresh();
        }}
      />

      <HizliFiyatDiscountListModal
        open={discountModalOpen}
        villaId={villa.id}
        discounts={priceDiscounts}
        onClose={() => setDiscountModalOpen(false)}
        onChanged={() => {
          setError(null);
          router.refresh();
        }}
      />

      <HizliFiyatSaveOverlay open={isPending} dirtyCount={Math.max(1, dirtyCount)} />
    </div>
  );
}
