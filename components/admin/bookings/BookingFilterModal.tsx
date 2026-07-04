"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";

export type BookingFilters = {
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

export const emptyBookingFilters = (): BookingFilters => ({
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
  "w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-gray-800";

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-gray-100 py-4 sm:grid-cols-[180px_1fr] sm:items-start">
      <p className={labelClass}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

function DateRangeRow({
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">Başlangıç tarihi</span>
        <input
          type="date"
          value={start}
          onChange={(event) => onStartChange(event.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-gray-500">Bitiş tarihi</span>
        <input
          type="date"
          value={end}
          onChange={(event) => onEndChange(event.target.value)}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export function countActiveBookingFilters(filters: BookingFilters): number {
  let count = 0;
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
    const query = draft.villaSearch.trim().toLocaleLowerCase("tr-TR");
    if (!query) return villas;
    return villas.filter((villa) =>
      villa.name.toLocaleLowerCase("tr-TR").includes(query)
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
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Filtreler</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <FilterRow label="Müşteri Adı">
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

          <FilterRow label="Mail Adresi">
            <input
              type="search"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
              placeholder="E-posta ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Telefon No">
            <input
              type="search"
              value={draft.phone}
              onChange={(event) => updateDraft({ phone: event.target.value })}
              placeholder="Telefon ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Villa Adı">
            <div className="space-y-3">
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
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200">
                  {matchedVillas.length > 0 ? (
                    matchedVillas.map((villa) => {
                      const checked = draft.selectedVillaIds.includes(villa.id);
                      return (
                        <label
                          key={villa.id}
                          className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50 ${
                            checked ? "bg-indigo-50/60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleVilla(villa.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-800">
                            {villa.name}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">
                      Eşleşen villa bulunamadı.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Villa adı yazdığınızda liste açılır; kutucuklardan seçim
                  yapabilirsiniz.
                </p>
              )}
              {draft.selectedVillaIds.length > 0 ? (
                <p className="text-xs font-medium text-indigo-700">
                  {draft.selectedVillaIds.length} villa seçili
                </p>
              ) : null}
            </div>
          </FilterRow>

          <FilterRow label="Rezervasyon No">
            <input
              type="search"
              value={draft.reservationNo}
              onChange={(event) =>
                updateDraft({ reservationNo: event.target.value })
              }
              placeholder="Rezervasyon no veya kod ara..."
              className={inputClass}
            />
          </FilterRow>

          <FilterRow label="Rezervasyon Tarihi">
            <DateRangeRow
              start={draft.reservationDateStart}
              end={draft.reservationDateEnd}
              onStartChange={(value) =>
                updateDraft({ reservationDateStart: value })
              }
              onEndChange={(value) =>
                updateDraft({ reservationDateEnd: value })
              }
            />
          </FilterRow>

          <FilterRow label="Giriş Tarihi">
            <DateRangeRow
              start={draft.checkInStart}
              end={draft.checkInEnd}
              onStartChange={(value) => updateDraft({ checkInStart: value })}
              onEndChange={(value) => updateDraft({ checkInEnd: value })}
            />
          </FilterRow>

          <FilterRow label="Çıkış Tarihi">
            <DateRangeRow
              start={draft.checkOutStart}
              end={draft.checkOutEnd}
              onStartChange={(value) => updateDraft({ checkOutStart: value })}
              onEndChange={(value) => updateDraft({ checkOutEnd: value })}
            />
          </FilterRow>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
