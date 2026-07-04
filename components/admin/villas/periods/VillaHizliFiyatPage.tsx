"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  deleteVillaPricePeriod,
  updateVillaPricePeriod,
} from "@/app/actions/admin/villa-periods";
import VillaPeriodFormModal from "@/components/admin/villas/periods/VillaPeriodFormModal";
import type { VillaAdminRoute } from "@/lib/villa-admin-path";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import type { VillaPricePeriodItem } from "@/lib/villa-period-calendar";
import {
  dbDateToDateKey,
  startOfDay,
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
  nightlyPriceCurrency: VillaPeriodCurrency;
  discount1Rate: string;
  discount2Rate: string;
  extraDiscountAmount: string;
  dirty: boolean;
};

const cellInputClass =
  "w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100";

const readOnlyClass =
  "rounded-lg bg-gray-50 px-2 py-1.5 text-sm tabular-nums text-gray-700";

function periodDateKey(date: Date): string {
  return dbDateToDateKey(startOfDay(new Date(date)));
}

function periodToRow(period: VillaPricePeriodItem): PeriodRowState {
  return {
    id: period.id,
    startDate: periodDateKey(period.startDate),
    endDate: periodDateKey(period.endDate),
    prepaymentRate:
      period.prepaymentRate != null ? String(period.prepaymentRate) : "",
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
    nightlyPriceCurrency: period.nightlyPriceCurrency,
    discount1Rate:
      period.discount1Rate != null ? String(period.discount1Rate) : "",
    discount2Rate:
      period.discount2Rate != null ? String(period.discount2Rate) : "",
    extraDiscountAmount: formatAmountInput(period.extraDiscountAmount),
    dirty: false,
  };
}

function buildPeriodFormData(row: PeriodRowState): FormData {
  const formData = new FormData();
  formData.set("startDate", row.startDate);
  formData.set("endDate", row.endDate);
  formData.set("availability", "available");
  formData.set("nightlyPrice", String(parseAmountInput(row.nightlyPrice) ?? 0));
  formData.set("nightlyPriceCurrency", row.nightlyPriceCurrency);
  formData.set("weeklyPrice", row.weeklyPrice || "");
  formData.set("prepaymentRate", row.prepaymentRate || "");
  formData.set("commissionRate", row.commissionRate || "");
  formData.set(
    "nightlyPriceWithoutCommission",
    row.nightlyPriceWithoutCommission || ""
  );
  formData.set("minStayNights", row.minStayNights || "");
  formData.set("cleaningDayCount", row.cleaningDayCount || "");
  formData.set("cleaningFee", row.cleaningFee || "");
  formData.set("cleaningFeeCurrency", row.nightlyPriceCurrency);
  formData.set("damageDeposit", row.damageDeposit || "");
  formData.set("damageDepositCurrency", row.nightlyPriceCurrency);
  formData.set("petCleaningFee", "");
  formData.set("petCleaningFeeCurrency", row.nightlyPriceCurrency);
  formData.set("petDamageDeposit", "");
  formData.set("petDamageDepositCurrency", row.nightlyPriceCurrency);
  formData.set("underfloorHeatingFee", "");
  formData.set("underfloorHeatingFeeCurrency", row.nightlyPriceCurrency);
  formData.set("extraBedFee", "");
  formData.set("extraBedFeeCurrency", row.nightlyPriceCurrency);
  formData.set("discount1Rate", row.discount1Rate || "");
  formData.set("discount2Rate", row.discount2Rate || "");
  formData.set("extraDiscountAmount", row.extraDiscountAmount || "");
  formData.set("weekendPrice", "");
  formData.set("weekendDays", "");
  formData.set("weekendMinStayNights", "");
  formData.set("childFee02", "");
  formData.set("childFee02Currency", row.nightlyPriceCurrency);
  formData.set("childFee03_09", "");
  formData.set("childFee03_09Currency", row.nightlyPriceCurrency);
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

export default function VillaHizliFiyatPage({
  villa,
  periods,
  routeVilla,
}: VillaHizliFiyatPageProps) {
  const router = useRouter();
  const [rows, setRows] = useState<PeriodRowState[]>(() =>
    periods.map(periodToRow)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<VillaPricePeriodItem | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
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
      for (const row of dirtyRows) {
        const result = await updateVillaPricePeriod(
          villa.id,
          row.id,
          buildPeriodFormData(row)
        );
        if (result.error) {
          setError(result.error);
          return;
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

  function openAdvancedModal(period?: VillaPricePeriodItem) {
    if (period) {
      setEditingPeriod(period);
    } else {
      setEditingPeriod(null);
    }
    setModalOpen(true);
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col gap-4">
      <div className="shrink-0 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/villalar"
              className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
                Hızlı Fiyat
              </p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                {villa.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {rows.length} periyot
                {routeVilla.villaId != null ? (
                  <span className="ml-2 text-gray-400">
                    · Villa ID {routeVilla.villaId}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openAdvancedModal()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Yeni Periyot
            </button>
            <Link
              href={villaTakvimPath(villa.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Takvim
            </Link>
            <Link
              href={villaAdminEditPath(routeVilla)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Düzenle
            </Link>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isPending || dirtyCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Tümünü Kaydet ({dirtyCount})
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Fiyat girdiğinizde komisyonsuz fiyat otomatik hesaplanır. Tümünü
          Kaydet ile toplu kayıt yapın.
        </div>
      </div>

      {error ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isPending || selectedIds.size === 0}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              Seçilenleri Sil ({selectedIds.size})
            </button>
          </div>
          <button
            type="button"
            onClick={() => openAdvancedModal()}
            className="text-sm font-semibold text-violet-700 hover:text-violet-800"
          >
            + Yeni Periyot Ekle
          </button>
        </div>

        <div className="h-[calc(100%-3.25rem)] overflow-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 text-[11px] font-semibold tracking-wide text-gray-500 uppercase backdrop-blur">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-2 py-3">#</th>
                <th className="px-2 py-3">Başlangıç</th>
                <th className="px-2 py-3">Bitiş</th>
                <th className="px-2 py-3">Ön Öd. %</th>
                <th className="px-2 py-3">Kom. %</th>
                <th className="px-2 py-3">Fiyat</th>
                <th className="px-2 py-3">İndirim</th>
                <th className="px-2 py-3">Komsz.</th>
                <th className="px-2 py-3">Haftalık</th>
                <th className="px-2 py-3">Min Gece</th>
                <th className="px-2 py-3">Temiz. Gün</th>
                <th className="px-2 py-3">Temiz. Bedel</th>
                <th className="px-2 py-3">Hasar Dep.</th>
                <th className="px-2 py-3">Para Bir.</th>
                <th className="px-2 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={16}
                    className="px-5 py-16 text-center text-sm text-gray-500"
                  >
                    Henüz periyot yok. Yeni periyot ekleyerek başlayın.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const pricing = resolveVillaPeriodPricing({
                    nightlyPrice: parseAmountInput(row.nightlyPrice) ?? 0,
                    nightlyPriceWithoutCommission: parseAmountInput(
                      row.nightlyPriceWithoutCommission
                    ),
                    weeklyPrice: parseAmountInput(row.weeklyPrice),
                    commissionRate: Number(row.commissionRate) || 0,
                    discount1Rate: Number(row.discount1Rate) || 0,
                    discount2Rate: Number(row.discount2Rate) || 0,
                    extraDiscountAmount:
                      parseAmountInput(row.extraDiscountAmount) ?? 0,
                  });

                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-gray-100 ${
                        row.dirty ? "bg-violet-50/40" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-2 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(event) =>
                            updateRow(row.id, { startDate: event.target.value })
                          }
                          className={cellInputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={row.endDate}
                          onChange={(event) =>
                            updateRow(row.id, { endDate: event.target.value })
                          }
                          className={cellInputClass}
                        />
                      </td>
                      <td className="px-2 py-2">
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
                          className={`${cellInputClass} w-16`}
                        />
                      </td>
                      <td className="px-2 py-2">
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
                          className={`${cellInputClass} w-16`}
                        />
                      </td>
                      <td className="px-2 py-2">
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
                          className={`${cellInputClass} w-24`}
                        />
                      </td>
                      <td className="px-2 py-2 text-gray-600">
                        {formatDiscountLabel(row)}
                      </td>
                      <td className="px-2 py-2">
                        <div className={readOnlyClass}>
                          {formatMoneyAmount(
                            pricing.nightlyPriceWithoutCommission
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className={readOnlyClass}>
                          {formatMoneyAmount(pricing.weeklyPrice)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          value={row.minStayNights}
                          onChange={(event) =>
                            updateRow(row.id, {
                              minStayNights: event.target.value,
                            })
                          }
                          className={`${cellInputClass} w-16`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          value={row.cleaningDayCount}
                          onChange={(event) =>
                            updateRow(row.id, {
                              cleaningDayCount: event.target.value,
                            })
                          }
                          className={`${cellInputClass} w-16`}
                        />
                      </td>
                      <td className="px-2 py-2">
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
                          className={`${cellInputClass} w-20`}
                        />
                      </td>
                      <td className="px-2 py-2">
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
                          className={`${cellInputClass} w-20`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={row.nightlyPriceCurrency}
                          onChange={(event) =>
                            updateRow(row.id, {
                              nightlyPriceCurrency: event.target
                                .value as VillaPeriodCurrency,
                            })
                          }
                          className={cellInputClass}
                        >
                          {VILLA_PERIOD_CURRENCIES.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const period = periods.find((p) => p.id === row.id);
                              if (period) openAdvancedModal(period);
                            }}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            title="Gelişmiş düzenle"
                          >
                            +
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
        continueAfterSave={false}
        onClose={() => {
          setModalOpen(false);
          setEditingPeriod(null);
        }}
        onSaved={() => {
          setModalOpen(false);
          setEditingPeriod(null);
          router.refresh();
        }}
      />
    </div>
  );
}
