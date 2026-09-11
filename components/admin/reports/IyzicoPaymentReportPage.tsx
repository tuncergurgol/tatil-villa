"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { FileSpreadsheet, Filter, Info, X } from "lucide-react";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import {
  formatIyzicoDateKey,
  formatIyzicoMoney,
  IYZICO_PAYMENT_STATUS_LABEL,
  type IyzicoPayoutStatus,
} from "@/lib/iyzico-payout";
import type { IyzicoPaymentReportRow } from "@/lib/queries/iyzico-payment-report";

type Filters = {
  reservationNo: string;
  transactionFrom: string;
  transactionTo: string;
  payoutFrom: string;
  payoutTo: string;
  status: "" | IyzicoPayoutStatus;
};

const emptyFilters = (): Filters => ({
  reservationNo: "",
  transactionFrom: "",
  transactionTo: "",
  payoutFrom: "",
  payoutTo: "",
  status: "",
});

function countActiveFilters(filters: Filters) {
  return Object.values(filters).filter((value) => value.trim() !== "").length;
}

function inDateRange(dateKey: string, from: string, to: string) {
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  return true;
}

async function downloadExcel(rows: (string | number)[][], fileName: string) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Iyzico Odemeler");
  XLSX.writeFile(workbook, fileName);
}

export default function IyzicoPaymentReportPage({
  items,
}: {
  items: IyzicoPaymentReportRow[];
}) {
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [draft, setDraft] = useState<Filters>(emptyFilters());
  const [filterOpen, setFilterOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(25);
  const [isPending, startTransition] = useTransition();

  const activeFilterCount = countActiveFilters(filters);

  const filteredItems = useMemo(() => {
    const reservation = filters.reservationNo.trim();
    return items.filter((item) => {
      if (
        reservation &&
        !item.reservationNo.toLowerCase().includes(reservation.toLowerCase())
      ) {
        return false;
      }
      if (
        !inDateRange(
          item.transactionDateKey,
          filters.transactionFrom,
          filters.transactionTo
        )
      ) {
        return false;
      }
      if (!inDateRange(item.payoutDateKey, filters.payoutFrom, filters.payoutTo)) {
        return false;
      }
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  }, [filters, items]);

  const totals = useMemo(
    () =>
      filteredItems.reduce(
        (acc, item) => {
          if (item.status === "cancelled") {
            acc.cancelledCount += 1;
            return acc;
          }
          acc.paid += item.paidAmount;
          acc.commission += item.commissionTotal;
          acc.bank += item.bankAmount;
          if (item.status === "paid") acc.paidCount += 1;
          else acc.pendingCount += 1;
          return acc;
        },
        {
          paid: 0,
          commission: 0,
          bank: 0,
          paidCount: 0,
          pendingCount: 0,
          cancelledCount: 0,
        }
      ),
    [filteredItems]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function applyFilters() {
    setFilters(draft);
  }

  function clearFilters() {
    const next = emptyFilters();
    setDraft(next);
    setFilters(next);
  }

  function handleExport() {
    if (filteredItems.length === 0) {
      window.alert("Filtreye uygun kayıt bulunamadı.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/iyzico-payment-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionIds: filteredItems.map((item) => item.id),
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
      };

      if (!data.count) {
        window.alert("Dışa aktarılacak kayıt bulunamadı.");
        return;
      }

      await downloadExcel(data.rows, data.filename);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            İ
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">İyzico Ödemeler</h1>
            <p className="text-sm text-gray-500">
              Kredi kartı tahsilatları, komisyon kesintisi ve bankaya yatış
              tarihi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
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

      <div className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Bankaya yatış, işlem tarihinden 28 gün sonraki ilk Çarşamba olarak
          hesaplanır. İptal edilen rezervasyonların kart tahsilatı listede{" "}
          <strong>İptal</strong> görünür ve bankaya yatmaz. Tek çekimde kesinti
          yüzde 4,29 + 0,25 TL sabittir.
        </span>
      </div>

      {filterOpen ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Filtreler</h2>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              <X className="h-3.5 w-3.5" />
              Temizle
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Rezervasyon no
              </span>
              <input
                value={draft.reservationNo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    reservationNo: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                placeholder="Örn. 116031"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Ödeme durumu
              </span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as Filters["status"],
                  }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Tümü</option>
                <option value="pending">Beklemede</option>
                <option value="paid">Ödendi</option>
                <option value="cancelled">İptal</option>
              </select>
            </label>
            <div className="hidden lg:block" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                İşlem tarihi (ilk gün)
              </span>
              <input
                type="date"
                value={draft.transactionFrom}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    transactionFrom: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                İşlem tarihi (son gün)
              </span>
              <input
                type="date"
                value={draft.transactionTo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    transactionTo: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <div className="hidden lg:block" />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Ödeme tarihi (ilk gün)
              </span>
              <input
                type="date"
                value={draft.payoutFrom}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    payoutFrom: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Ödeme tarihi (son gün)
              </span>
              <input
                type="date"
                value={draft.payoutTo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    payoutTo: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Uygula
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Tahsilat
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatIyzicoMoney(totals.paid)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Komisyon + kesinti
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatIyzicoMoney(totals.commission)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Bankaya yatacak
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {formatIyzicoMoney(totals.bank)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {totals.pendingCount} beklemede · {totals.paidCount} ödendi
            {totals.cancelledCount > 0
              ? ` · ${totals.cancelledCount} iptal`
              : null}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {filteredItems.length} kayıt listeleniyor
        {activeFilterCount > 0 ? ` (${activeFilterCount} aktif filtre)` : null}
      </p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Rezervasyon No</th>
                <th className="px-3 py-2">Müşteri adı</th>
                <th className="px-3 py-2">Ödeme Tarihi</th>
                <th className="px-3 py-2 text-right">Ödeme Tutarı</th>
                <th className="px-3 py-2 text-right">Komisyon + Kesinti</th>
                <th className="px-3 py-2 text-right">Bankaya Yatacak Tutar</th>
                <th className="px-3 py-2">Bankaya Yatacak Tarih</th>
                <th className="px-3 py-2">Ödeme Durumu</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 hover:bg-gray-50/60"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">
                      <Link
                        href={`/admin/rezervasyonlar/${item.bookingId}`}
                        className="hover:text-indigo-700 hover:underline"
                      >
                        {item.reservationNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.guestName}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {formatIyzicoDateKey(item.transactionDateKey)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {formatIyzicoMoney(item.paidAmount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {formatIyzicoMoney(item.commissionTotal)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                      {formatIyzicoMoney(item.bankAmount)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {item.status === "cancelled"
                        ? "—"
                        : formatIyzicoDateKey(item.payoutDateKey)}
                    </td>
                    <td className="px-3 py-2">
                      {item.status === "paid" ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {IYZICO_PAYMENT_STATUS_LABEL.paid}
                        </span>
                      ) : item.status === "cancelled" ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          {IYZICO_PAYMENT_STATUS_LABEL.cancelled}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {IYZICO_PAYMENT_STATUS_LABEL.pending}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Filtrelere uygun iyzico ödemesi bulunamadı.
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
    </div>
  );
}
