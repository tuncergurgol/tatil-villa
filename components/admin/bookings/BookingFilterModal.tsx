"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_OPTIONS } from "@/lib/booking-status";
import { includesSearchText } from "@/lib/search-text";

export type BookingQuickFilter =
  | "check_in_today"
  | "check_in_1_day"
  | "check_in_2_days"
  | "check_out_today"
  | "check_out_1_day"
  | "check_out_2_days";

export type BookingFilters = {
  status: BookingStatus | null;
  quickFilter: BookingQuickFilter | null;
  customerName: string;
  email: string;
  phone: string;
  villaSearch: string;
  selectedVillaIds: string[];
  reservationNo: string;
  reservationDateStart: string;
  reservationDateEnd: string;
  checkInStart: string;
  checkInEnd: string;
  checkOutStart: string;
  checkOutEnd: string;
};

export const BOOKING_QUICK_FILTER_OPTIONS: {
  value: BookingQuickFilter;
  label: string;
}[] = [
  { value: "check_in_today", label: "Bugün Girişli Rezervasyonlar" },
  { value: "check_in_1_day", label: "Tatile 1 gün kalanlar" },
  { value: "check_in_2_days", label: "Tatile 2 gün kalanlar" },
  { value: "check_out_today", label: "Bugün çıkanlar" },
  { value: "check_out_1_day", label: "Çıkışa 1 gün kalanlar" },
  { value: "check_out_2_days", label: "Çıkışa 2 gün kalanlar" },
];

export const emptyBookingFilters = (): BookingFilters => ({
  status: null,
  quickFilter: null,
  customerName: "",
  email: "",
  phone: "",
  villaSearch: "",
  selectedVillaIds: [],
  reservationNo: "",
  reservationDateStart: "",
  reservationDateEnd: "",
  checkInStart: "",
  checkInEnd: "",
  checkOutStart: "",
  checkOutEnd: "",
});

interface VillaOption {
  id: string;
  name: string;
}

interface BookingFilterModalProps {
  open: boolean;
  villas: VillaOption[];
  filters: BookingFilters;
  onClose: () => void;
  onApply: (filters: BookingFilters) => void;
  onClear: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

const labelClass = "text-sm font-semibold text-gray-800";

function FilterRow({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2 border-b border-gray-100 sm:grid-cols-[160px_1fr] sm:items-start ${
        compact ? "py-2.5" : "py-3"
      }`}
    >
      <p className={labelClass}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function DateFiltersGrid({
  draft,
  updateDraft,
}: {
  draft: BookingFilters;
  updateDraft: (patch: Partial<BookingFilters>) => void;
}) {
  const rows = [
    {
      label: "Rezervasyon",
      start: draft.reservationDateStart,
      end: draft.reservationDateEnd,
      onStart: (value: string) => updateDraft({ reservationDateStart: value }),
      onEnd: (value: string) => updateDraft({ reservationDateEnd: value }),
    },
    {
      label: "Giriş",
      start: draft.checkInStart,
      end: draft.checkInEnd,
      onStart: (value: string) => updateDraft({ checkInStart: value }),
      onEnd: (value: string) => updateDraft({ checkInEnd: value }),
    },
    {
      label: "Çıkış",
      start: draft.checkOutStart,
      end: draft.checkOutEnd,
      onStart: (value: string) => updateDraft({ checkOutStart: value }),
      onEnd: (value: string) => updateDraft({ checkOutEnd: value }),
    },
  ] as const;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-gray-500">
        <span />
        <span>Başlangıç</span>
        <span>Bitiş</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[100px_1fr_1fr] items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0"
        >
          <span className="text-sm font-medium text-gray-700">{row.label}</span>
          <input
            type="date"
            value={row.start}
            onChange={(event) => row.onStart(event.target.value)}
            className={inputClass}
          />
          <input
            type="date"
            value={row.end}
            onChange={(event) => row.onEnd(event.target.value)}
            className={inputClass}
          />
        </div>
      ))}
    </div>
  );
}

export function countActiveBookingFilters(filters: BookingFilters): number {
  let count = 0;
  if (filters.status) count += 1;
  if (filters.quickFilter) count += 1;
  if (filters.customerName.trim()) count += 1;
  if (filters.email.trim()) count += 1;
  if (filters.phone.trim()) count += 1;
  if (filters.villaSearch.trim()) count += 1;
  if (filters.selectedVillaIds.length > 0) count += 1;
  if (filters.reservationNo.trim()) count += 1;
  if (filters.reservationDateStart || filters.reservationDateEnd) count += 1;
  if (filters.checkInStart || filters.checkInEnd) count += 1;
  if (filters.checkOutStart || filters.checkOutEnd) count += 1;
  return count;
}

export default function BookingFilterModal({
  open,
  villas,
  filters,
  onClose,
  onApply,
  onClear,
}: BookingFilterModalProps) {
  const [draft, setDraft] = useState<BookingFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const matchedVillas = useMemo(() => {
    if (!draft.villaSearch.trim()) return villas;
    return villas.filter((villa) =>
      includesSearchText(villa.name, draft.villaSearch)
    );
  }, [draft.villaSearch, villas]);

  function updateDraft(patch: Partial<BookingFilters>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function toggleVilla(villaId: string) {
    setDraft((prev) => {
      const selected = new Set(prev.selectedVillaIds);
      if (selected.has(villaId)) selected.delete(villaId);
      else selected.add(villaId);
      return { ...prev, selectedVillaIds: Array.from(selected) };
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Filtreler</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <FilterRow label="Rezervasyon Durumu" compact>
            <select
              value={draft.status ?? ""}
              onChange={(event) =>
                updateDraft({
                  status: event.target.value
                    ? (event.target.value as BookingStatus)
                    : null,
                })
              }
              className={inputClass}
            >
              <option value="">Seçiniz...</option>
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Giriş - Çıkış Raporları" compact>
            <select
              value={draft.quickFilter ?? ""}
              onChange={(event) =>
                updateDraft({
                  quickFilter: event.target.value
                    ? (event.target.value as BookingQuickFilter)
                    : null,
                })
              }
              className={inputClass}
            >
              <option value="">Seçiniz...</option>
              {BOOKING_QUICK_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterRow>

          <FilterRow label="Müşteri Adı" compact>
            <input
              type="search"
              value={draft.customerName}
              onChange={(event) =>
                updateDraft({ customerName: event.target.value })
              }
              placeholder="Müşteri adı ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Mail Adresi" compact>
            <input
              type="search"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
              placeholder="E-posta ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Telefon No" compact>
            <input
              type="search"
              value={draft.phone}
              onChange={(event) => updateDraft({ phone: event.target.value })}
              placeholder="Telefon ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Villa Adı" compact>
            <div className="space-y-2">
              <input
                type="search"
                value={draft.villaSearch}
                onChange={(event) =>
                  updateDraft({ villaSearch: event.target.value })
                }
                placeholder="Villa adı ara..."
                className={inputClass}
              />
              {draft.villaSearch.trim() ? (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200">
                  {matchedVillas.length > 0 ? (
                    matchedVillas.map((villa) => {
                      const checked = draft.selectedVillaIds.includes(villa.id);
                      return (
                        <label
                          key={villa.id}
                          className={`flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50 ${
                            checked ? "bg-indigo-50/60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVilla(villa.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-800">
                            {villa.name}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-gray-500">
                      Eşleşen villa bulunamadı.
                    </p>
                  )}
                </div>
              ) : null}
              {draft.selectedVillaIds.length > 0 ? (
                <p className="text-xs font-medium text-indigo-700">
                  {draft.selectedVillaIds.length} villa seçili
                </p>
              ) : null}
            </div>
          </FilterRow>

          <FilterRow label="Rezervasyon No" compact>
            <input
              type="search"
              value={draft.reservationNo}
              onChange={(event) =>
                updateDraft({ reservationNo: event.target.value })
              }
              placeholder="Rezervasyon no ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Tarihler" compact>
            <DateFiltersGrid draft={draft} updateDraft={updateDraft} />
          </FilterRow>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
