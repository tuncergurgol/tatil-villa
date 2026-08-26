"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { Copy, ExternalLink, FileText, Filter, Plus } from "lucide-react";
import BookingFilterModal, {
  BOOKING_QUICK_FILTER_OPTIONS,
  countActiveBookingFilters,
  emptyBookingFilters,
  type BookingFilters,
} from "@/components/admin/bookings/BookingFilterModal";
import BookingFormModal from "@/components/admin/bookings/BookingFormModal";
import BookingDetailModal from "@/components/admin/bookings/BookingDetailModal";
import {
  AdminTablePaginationBar,
  type AdminPageSize,
} from "@/components/admin/AdminTablePagination";
import { expirePrepaymentOptionsAction } from "@/app/actions/admin/bookings";
import { filterBookings } from "@/lib/booking-filters";
import { buildBookingExcelWorksheet } from "@/lib/booking-excel-sheet";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { villaAdminEditPath } from "@/lib/villa-admin-path";
import { BOOKING_STATUS_META } from "@/lib/booking-status";
import { formatStoredTurkishPhoneDisplay } from "@/lib/phone-utils";
import {
  formatBookingReservationNo,
  formatFacilityCode,
  formatGuestCounts,
  formatMoneyPlain,
  formatStaySummary,
  formatBookingDateTime,
  resolveBookingPrepaymentAmount,
  resolvePaymentMethodLabel,
} from "@/lib/booking-display";
import OptionCountdown from "@/components/admin/bookings/OptionCountdown";

interface VillaOption {
  id: string;
  name: string;
}

interface BookingManagementProps {
  bookings: AdminBookingListItem[];
  villas: VillaOption[];
  siteDomain: string;
  initialFilters?: BookingFilters;
  filtersKey?: string;
}

function StatusButton({
  booking,
  onOpenForm,
  onOptionExpired,
}: {
  booking: AdminBookingListItem;
  onOpenForm: (booking: AdminBookingListItem) => void;
  onOptionExpired?: (bookingId: string) => void;
}) {
  const meta = BOOKING_STATUS_META[booking.status];
  const showCountdown =
    booking.status === BookingStatus.PREPAYMENT &&
    Boolean(booking.optionExpiresAt);
  const createdAtLabel = formatBookingDateTime(booking.createdAt);
  const confirmedAtLabel =
    booking.status === BookingStatus.CONFIRMED
      ? formatBookingDateTime(booking.confirmedAt)
      : null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onOpenForm(booking);
        }}
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 ${meta.className}`}
        title="Rezervasyon formunu aç"
      >
        {meta.label}
      </button>
      {createdAtLabel ? (
        <p className="text-[11px] leading-tight text-gray-500">
          <span className="font-medium text-gray-600">Oluşturma</span>
          <br />
          {createdAtLabel}
        </p>
      ) : null}
      {confirmedAtLabel ? (
        <p className="text-[11px] leading-tight text-gray-500">
          <span className="font-medium text-gray-600">Onay</span>
          <br />
          {confirmedAtLabel}
        </p>
      ) : null}
      {showCountdown ? (
        <OptionCountdown
          expiresAt={booking.optionExpiresAt}
          onExpired={
            onOptionExpired ? () => onOptionExpired(booking.id) : undefined
          }
        />
      ) : null}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("Kopyalanamadı");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Kopyalandı" : "Kopyala"}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

export default function BookingManagement({
  bookings,
  villas,
  siteDomain,
  initialFilters,
  filtersKey = "",
}: BookingManagementProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filters, setFilters] = useState<BookingFilters>(
    initialFilters ?? emptyBookingFilters()
  );
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [viewBookingId, setViewBookingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(10);
  const [isExporting, startExport] = useTransition();

  const activeFilterCount = countActiveBookingFilters(filters);

  const filteredBookings = useMemo(
    () => filterBookings(bookings, filters),
    [bookings, filters]
  );

  useEffect(() => {
    setFilters(initialFilters ?? emptyBookingFilters());
    setPage(1);
  }, [filtersKey, initialFilters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [currentPage, filteredBookings, pageSize]);

  function openCreateModal() {
    setFormModalOpen(true);
  }

  function openReservationForm(booking: AdminBookingListItem) {
    setViewBookingId(booking.id);
  }

  function handleFormSuccess() {
    router.refresh();
  }

  function handleOptionExpired(bookingId: string) {
    startTransition(async () => {
      await expirePrepaymentOptionsAction(bookingId);
      router.refresh();
    });
  }

  const isListInteractive =
    !filterModalOpen && !formModalOpen && !viewBookingId;

  function refreshList() {
    setFilters(emptyBookingFilters());
    router.push("/admin/rezervasyonlar");
    router.refresh();
  }

  async function downloadBookingReportExcel(
    rows: (string | number)[][],
    fileName: string
  ) {
    const XLSX = await import("xlsx");
    const worksheet = buildBookingExcelWorksheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rezervasyon");
    XLSX.writeFile(workbook, fileName);
  }

  function handleExportReport() {
    if (filteredBookings.length === 0) {
      window.alert("Filtreye uygun kayıt bulunamadı.");
      return;
    }

    startExport(async () => {
      try {
        const response = await fetch("/api/admin/booking-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingIds: filteredBookings.map((booking) => booking.id),
          }),
        });

        if (!response.ok) {
          window.alert("Rezervasyon raporu oluşturulamadı.");
          return;
        }

        const data = (await response.json()) as {
          rows: (string | number)[][];
          filename: string;
          count: number;
        };

        if (data.count === 0) {
          window.alert("Dışa aktarılacak kayıt bulunamadı.");
          return;
        }

        await downloadBookingReportExcel(data.rows, data.filename);
      } catch {
        window.alert("Rezervasyon raporu indirilemedi.");
      }
    });
  }

  useEffect(() => {
    if (!isListInteractive) return;

    const IDLE_MS = 60_000;
    let timerId: number | null = null;

    function scheduleRefresh() {
      if (timerId != null) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        router.refresh();
        scheduleRefresh();
      }, IDLE_MS);
    }

    function onActivity() {
      scheduleRefresh();
    }

    scheduleRefresh();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true });

    return () => {
      if (timerId != null) window.clearTimeout(timerId);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
    };
  }, [isListInteractive, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            R
          </div>
          <button
            type="button"
            onClick={refreshList}
            className="text-left text-xl font-bold text-gray-900 transition hover:text-indigo-700 sm:text-2xl"
            title="Listeyi yenile"
          >
            Rezervasyonlar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:px-4"
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
            onClick={handleExportReport}
            disabled={isExporting}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 sm:px-4"
          >
            <FileText className="h-4 w-4" />
            {isExporting ? "Hazırlanıyor..." : "Rezervasyon Raporu"}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 sm:col-span-1 sm:px-4"
          >
            <Plus className="h-4 w-4" />
            Yeni Kayıt
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        {BOOKING_QUICK_FILTER_OPTIONS.map((option) => {
          const active = filters.quickFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  quickFilter: active ? null : option.value,
                  status: active
                    ? current.status
                    : current.status ?? BookingStatus.CONFIRMED,
                }))
              }
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {activeFilterCount > 0 ? (
        <p className="text-sm text-gray-500">
          {filteredBookings.length} kayıt listeleniyor ({activeFilterCount} aktif
          filtre)
        </p>
      ) : null}

      <BookingFilterModal
        open={filterModalOpen}
        villas={villas}
        filters={filters}
        onClose={() => setFilterModalOpen(false)}
        onApply={setFilters}
        onClear={() => setFilters(emptyBookingFilters())}
      />

      <BookingDetailModal
        bookingId={viewBookingId}
        onClose={() => setViewBookingId(null)}
        onSaved={handleFormSuccess}
      />

      <BookingFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Rezervasyon No</th>
                <th className="px-3 py-2">Ev</th>
                <th className="px-3 py-2">Konaklama</th>
                <th className="px-3 py-2">Misafir</th>
                <th className="px-3 py-2">Fiyat</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.length > 0 ? (
                visibleBookings.map((booking) => {
                  const stay = formatStaySummary(booking.checkIn, booking.checkOut);
                  const guests = formatGuestCounts(booking);
                  const prepayment = resolveBookingPrepaymentAmount(booking);
                  const reservationNo = formatBookingReservationNo(booking);
                  const isSelected = selectedId === booking.id;
                  const facilitySubtext =
                    booking.villa.originalName.trim() || booking.villa.slug;

                  return (
                    <tr
                      key={booking.id}
                      onClick={() => setSelectedId(booking.id)}
                      className={`border-b border-gray-100 transition ${
                        isSelected ? "bg-sky-50/80" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/rezervasyonlar/${booking.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                            title="Rezervasyon formunu yeni sekmede aç"
                          >
                            {reservationNo}
                          </Link>
                          {booking.externalCode != null ? (
                            <CopyButton value={String(booking.externalCode)} />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {booking.siteDomain || siteDomain}
                        </p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex items-start gap-1.5">
                          <Link
                            href={villaAdminEditPath(booking.villa)}
                            className="font-semibold text-gray-900 hover:text-indigo-600"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {booking.villa.name}
                          </Link>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        </div>
                        <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-500">
                          {facilitySubtext}
                        </p>
                        <p className="text-xs font-medium text-gray-400">
                          {formatFacilityCode(booking.villa)}
                        </p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <p className="font-semibold text-gray-900">{stay.range}</p>
                        <p className="text-xs text-gray-500">{stay.weekdays}</p>
                        <p className="text-xs text-gray-500">{stay.nights}</p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <p className="font-semibold text-gray-900">
                          {guests.summary}
                        </p>
                        <p className="text-xs text-gray-500">{guests.pets}</p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        {prepayment != null ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900">
                              {formatMoneyPlain(prepayment)}
                            </span>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              Ön Ödeme
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">Teklif</span>
                        )}
                        {booking.totalPrice != null ? (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Toplam: {formatMoneyPlain(booking.totalPrice)}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500">
                          {resolvePaymentMethodLabel(booking.paymentMethod)}
                        </p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <p className="font-semibold text-gray-900">
                          {booking.guestName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {booking.guestEmail}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatStoredTurkishPhoneDisplay(booking.guestPhone)}
                        </p>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <StatusButton
                          booking={booking}
                          onOpenForm={openReservationForm}
                          onOptionExpired={handleOptionExpired}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Filtrelere uygun rezervasyon bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {visibleBookings.length > 0 ? (
            visibleBookings.map((booking) => {
              const stay = formatStaySummary(booking.checkIn, booking.checkOut);
              const guests = formatGuestCounts(booking);
              const prepayment = resolveBookingPrepaymentAmount(booking);
              const reservationNo = formatBookingReservationNo(booking);
              const meta = BOOKING_STATUS_META[booking.status];

              return (
                <div
                  key={booking.id}
                  className="space-y-3 p-4"
                  onClick={() => setSelectedId(booking.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openReservationForm(booking);
                        }}
                        className="text-left text-base font-bold text-blue-600"
                      >
                        {reservationNo}
                      </button>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {booking.siteDomain || siteDomain}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-gray-900">{booking.villa.name}</p>
                    <p className="text-gray-600">{stay.range}</p>
                    <p className="text-xs text-gray-500">
                      {stay.nights} · {guests.summary}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {prepayment != null
                          ? formatMoneyPlain(prepayment)
                          : "Teklif"}
                      </p>
                      <p className="text-xs text-gray-500">{booking.guestName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openReservationForm(booking);
                      }}
                      className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Formu Aç
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-16 text-center text-sm text-gray-500">
              Filtrelere uygun rezervasyon bulunamadı.
            </div>
          )}
        </div>

        <AdminTablePaginationBar
          page={page}
          totalItems={filteredBookings.length}
          visibleCount={visibleBookings.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
