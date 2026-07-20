"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FileSpreadsheet, Filter, Info, Plus, X } from "lucide-react";
import BookingFilterModal, {
  countActiveBookingFilters,
  emptyBookingFilters,
  type BookingFilters,
} from "@/components/admin/bookings/BookingFilterModal";
import BookingOwnerPaymentsSection from "@/components/admin/bookings/BookingOwnerPaymentsSection";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import { filterBookings } from "@/lib/booking-filters";
import {
  formatBookingReservationNo,
  formatMoneyPlain,
  formatStaySummary,
} from "@/lib/booking-display";
import type { BookingOwnerPaymentRecord } from "@/lib/booking-form-details";
import type { OwnerPaymentReportListItem } from "@/lib/queries/owner-payment-report";

interface VillaOption {
  id: string;
  name: string;
}

interface OwnerPaymentReportPageProps {
  items: OwnerPaymentReportListItem[];
  villas: VillaOption[];
  warnings: string[];
}

async function downloadOwnerPaymentExcel(
  rows: (string | number)[][],
  fileName: string
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, fileName);
}

function formatOwnerPaymentDateLabel(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return ymd;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function resolveLatestPaymentAt(
  payments: BookingOwnerPaymentRecord[]
): Date | null {
  if (payments.length === 0) return null;
  const latest = payments[payments.length - 1]!.paidAt;
  return new Date(`${latest}T12:00:00`);
}

function refreshItemPayments(
  item: OwnerPaymentReportListItem,
  ownerPayments: BookingOwnerPaymentRecord[]
): OwnerPaymentReportListItem {
  const paidAmount = ownerPayments.reduce((sum, row) => sum + row.amount, 0);
  const remainingAmount = Math.max(0, item.ownerPayableAmount - paidAmount);
  const missing = item.missing.filter((field) => field !== "Ödenecek tutar");
  if (!(remainingAmount > 0) && !missing.includes("Ödenecek tutar")) {
    missing.push("Ödenecek tutar");
  }

  return {
    ...item,
    ownerPayments,
    paidAmount,
    remainingAmount,
    latestOwnerPaymentAt: resolveLatestPaymentAt(ownerPayments),
    missing,
    exportable: missing.length === 0 && remainingAmount > 0,
  };
}

export default function OwnerPaymentReportPage({
  items: initialItems,
  villas,
  warnings,
}: OwnerPaymentReportPageProps) {
  const [items, setItems] = useState(initialItems);
  const [filters, setFilters] = useState<BookingFilters>(emptyBookingFilters());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [paymentItem, setPaymentItem] =
    useState<OwnerPaymentReportListItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(10);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const activeFilterCount = countActiveBookingFilters(filters);

  const filteredItems = useMemo(() => {
    const filteredIds = new Set(
      filterBookings(items, filters).map((item) => item.id)
    );
    return items.filter((item) => filteredIds.has(item.id));
  }, [filters, items]);

  const exportableItems = useMemo(
    () => filteredItems.filter((item) => item.exportable),
    [filteredItems]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [page, filteredItems, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function handleExport() {
    if (filteredItems.length === 0) {
      window.alert("Filtreye uygun kayıt bulunamadı.");
      return;
    }

    if (exportableItems.length === 0) {
      window.alert(
        "Filtreye uygun ve ödemeye hazır kayıt bulunamadı. IBAN / alıcı / tutar alanlarını tamamlayın."
      );
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/owner-payment-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingIds: exportableItems.map((item) => item.id),
        }),
      });

      if (!response.ok) {
        window.alert("Excel oluşturulamadı.");
        return;
      }

      const data = (await response.json()) as {
        rows: (string | number)[][];
        filename: string;
        count: number;
        incompleteCount: number;
      };

      if (data.count === 0) {
        window.alert("Dışa aktarılacak ödeme satırı bulunamadı.");
        return;
      }

      await downloadOwnerPaymentExcel(data.rows, data.filename);

      if (data.incompleteCount > 0) {
        window.alert(
          `${data.count} ödeme satırı indirildi. ${data.incompleteCount} kayıt eksik bilgi nedeniyle dosyaya alınmadı.`
        );
      }
    });
  }

  function handlePaymentsChanged(ownerPayments: BookingOwnerPaymentRecord[]) {
    if (!paymentItem) return;
    const nextItem = refreshItemPayments(paymentItem, ownerPayments);
    setPaymentItem(nextItem);
    setItems((current) =>
      current.map((row) => (row.id === nextItem.id ? nextItem : row))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
            E
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ev Sahibi Ödemeleri
            </h1>
            <p className="text-sm text-gray-500">
              Toplu havale Excel şablonu (Alıcı / IBAN / Tutar / Açıklama)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            FİLTRE
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isPending ? "Aktarılıyor…" : "EXCEL'E AKTAR"}
          </button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}

      {activeFilterCount > 0 ? (
        <p className="text-sm text-gray-500">
          {filteredItems.length} kayıt listeleniyor ({activeFilterCount} aktif
          filtre)
          {exportableItems.length !== filteredItems.length
            ? ` — ${exportableItems.length} ödemeye hazır`
            : null}
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          {filteredItems.length} onaylı rezervasyon (ödenecek &gt; 0) —{" "}
          {exportableItems.length} ödemeye hazır
        </p>
      )}

      <BookingFilterModal
        open={filterModalOpen}
        villas={villas}
        filters={filters}
        onClose={() => setFilterModalOpen(false)}
        onApply={setFilters}
        onClear={() => setFilters(emptyBookingFilters())}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1380px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Rezervasyon No</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Villa</th>
                <th className="px-3 py-2">Alıcı / Ev Sahibi</th>
                <th className="px-3 py-2">IBAN</th>
                <th className="px-3 py-2">Konaklama</th>
                <th className="px-3 py-2">Ödeme Yapılacak Tarih</th>
                <th className="px-3 py-2">Ödenecek</th>
                <th className="px-3 py-2">Ödenen</th>
                <th className="px-3 py-2">Kalan</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">Eksik Alanlar</th>
                <th className="px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => {
                  const stay = formatStaySummary(item.checkIn, item.checkOut);

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-gray-100 hover:bg-gray-50/60"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {formatBookingReservationNo(item)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.guestName}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.villa.name}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div>{item.recipientName}</div>
                        {item.recipientName !== item.ownerName ? (
                          <div className="text-xs text-gray-400">
                            {item.ownerName}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">
                        {item.bankIban || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <div>{stay.range}</div>
                        <div className="text-xs text-gray-400">{stay.nights}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.ownerPayments.length > 0 ? (
                          <div>
                            <div>
                              {formatOwnerPaymentDateLabel(
                                item.ownerPayments[item.ownerPayments.length - 1]
                                  ?.paidAt
                              )}
                            </div>
                            {item.ownerPayments.length > 1 ? (
                              <div className="text-xs text-gray-400">
                                {item.ownerPayments.length} ödeme
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatMoneyPlain(item.ownerPayableAmount)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.paidAmount > 0
                          ? formatMoneyPlain(item.paidAmount)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {item.remainingAmount > 0
                          ? formatMoneyPlain(item.remainingAmount)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {item.exportable ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Hazır
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Eksik
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-amber-800">
                        {item.missing.length > 0
                          ? item.missing.join(" / ")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPaymentItem(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 hover:bg-violet-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ödeme Ekle
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Filtrelere uygun onaylı rezervasyon bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminTablePaginationBar
          page={page}
          totalItems={filteredItems.length}
          visibleCount={visibleItems.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {paymentItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Villa Sahibine Ödeme
                </h2>
                <p className="text-sm text-gray-500">
                  {formatBookingReservationNo(paymentItem)} ·{" "}
                  {paymentItem.villa.name} · {paymentItem.guestName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentItem(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <BookingOwnerPaymentsSection
              key={`${paymentItem.id}-${paymentItem.ownerPayments.length}`}
              bookingId={paymentItem.id}
              payments={paymentItem.ownerPayments}
              ownerPayableAmount={paymentItem.ownerPayableAmount}
              startWithDraft
              onChange={(ownerPayments) => {
                handlePaymentsChanged(ownerPayments);
              }}
            />

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPaymentItem(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
