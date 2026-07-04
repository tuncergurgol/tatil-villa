"use client";

import { useMemo, useState, Fragment } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  MoreVertical,
  Plus,
} from "lucide-react";
import BookingFilterModal, {
  countActiveBookingFilters,
  emptyBookingFilters,
  type BookingFilters,
} from "@/components/admin/bookings/BookingFilterModal";
import { filterBookings } from "@/lib/booking-filters";
import type { AdminBookingListItem } from "@/lib/booking-display";
import {
  BOOKING_STATUS_META,
  estimatePrepaymentAmount,
  formatBookingDisplayNumber,
  formatBookingShortCode,
  formatFacilityCode,
  formatGuestCounts,
  formatMoneyPlain,
  formatStaySummary,
  resolveBookingDisplayStatus,
  resolvePaymentMethod,
} from "@/lib/booking-display";

interface VillaOption {
  id: string;
  name: string;
}

interface BookingManagementProps {
  bookings: AdminBookingListItem[];
  villas: VillaOption[];
  siteDomain: string;
}

function StatusBadge({ booking }: { booking: AdminBookingListItem }) {
  const key = resolveBookingDisplayStatus(booking);
  const meta = BOOKING_STATUS_META[key];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
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

function RowActionsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Düzenle
            </button>
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => setOpen(false)}
            >
              İptal Et
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function BookingManagement({
  bookings,
  villas,
  siteDomain,
}: BookingManagementProps) {
  const [filters, setFilters] = useState<BookingFilters>(emptyBookingFilters());
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeFilterCount = countActiveBookingFilters(filters);

  const filteredBookings = useMemo(
    () => filterBookings(bookings, filters),
    [bookings, filters]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            R
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
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
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FileText className="h-4 w-4" />
            Rezervasyon Raporu
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Kayıt
          </button>
        </div>
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2">Rezervasyon</th>
                <th className="px-3 py-2">Tesis</th>
                <th className="px-3 py-2">Konaklama</th>
                <th className="px-3 py-2">Misafir</th>
                <th className="px-3 py-2">Fiyat</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
                  const stay = formatStaySummary(booking.checkIn, booking.checkOut);
                  const guests = formatGuestCounts(booking);
                  const prepayment = estimatePrepaymentAmount(booking.totalPrice);
                  const shortCode = formatBookingShortCode(booking.id);
                  const isExpanded = expandedId === booking.id;
                  const isSelected = selectedId === booking.id;
                  const facilitySubtext =
                    booking.villa.originalName.trim() || booking.villa.slug;

                  return (
                    <Fragment key={booking.id}>
                      <tr
                        onClick={() => setSelectedId(booking.id)}
                        className={`border-b border-gray-100 transition ${
                          isSelected ? "bg-sky-50/80" : "hover:bg-gray-50/60"
                        }`}
                      >
                        <td className="px-3 py-2 align-top">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedId((prev) =>
                                prev === booking.id ? null : booking.id
                              );
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <Link
                            href={`/admin/rezervasyonlar/${booking.id}`}
                            className="font-semibold text-blue-600 hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {formatBookingDisplayNumber(booking.id)}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="font-medium text-gray-800">
                              {shortCode}
                            </span>
                            <CopyButton value={shortCode} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{siteDomain}</p>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex items-start gap-1.5">
                            <Link
                              href={`/admin/villalar/${booking.villa.id}/duzenle`}
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
                          <p className="text-xs text-gray-500">
                            {stay.weekdays}
                          </p>
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
                            {resolvePaymentMethod(booking.id)}
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
                            {booking.guestPhone}
                          </p>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <StatusBadge booking={booking} />
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Görüntüle
                            </button>
                            <RowActionsMenu />
                          </div>
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="border-b border-gray-100 bg-gray-50/70">
                          <td />
                          <td colSpan={8} className="px-3 py-2">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Rezervasyon Detayı
                                </p>
                                <p className="mt-2 text-sm text-gray-700">
                                  Kayıt:{" "}
                                  {booking.createdAt.toLocaleString("tr-TR")}
                                </p>
                                <p className="text-sm text-gray-700">
                                  Kod: {shortCode}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Konaklama
                                </p>
                                <p className="mt-2 text-sm text-gray-700">
                                  {stay.range} ({stay.nights})
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Ödeme
                                </p>
                                <p className="mt-2 text-sm text-gray-700">
                                  {resolvePaymentMethod(booking.id)}
                                </p>
                                {booking.totalPrice != null ? (
                                  <p className="text-sm text-gray-700">
                                    Toplam {formatMoneyPlain(booking.totalPrice)}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-16 text-center text-sm text-gray-500"
                  >
                    Filtrelere uygun rezervasyon bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
