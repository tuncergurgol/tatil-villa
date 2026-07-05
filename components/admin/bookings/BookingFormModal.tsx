"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { BookingStatus } from "@prisma/client";
import {
  createAdminBookingAction,
  updateAdminBookingAction,
  type AdminBookingActionState,
} from "@/app/actions/admin/bookings";
import type { AdminBookingListItem } from "@/lib/booking-display";
import { BOOKING_STATUS_OPTIONS } from "@/lib/booking-status";

interface VillaOption {
  id: string;
  name: string;
}

interface BookingFormModalProps {
  open: boolean;
  villas: VillaOption[];
  booking?: AdminBookingListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100";

const labelClass = "text-sm font-semibold text-gray-800";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const initialState: AdminBookingActionState = {};

export default function BookingFormModal({
  open,
  villas,
  booking,
  onClose,
  onSuccess,
}: BookingFormModalProps) {
  const isEdit = Boolean(booking);
  const action = isEdit ? updateAdminBookingAction : createAdminBookingAction;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess();
      onClose();
    }
  }, [state.success, onClose, onSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Rezervasyonu Düzenle" : "Yeni Rezervasyon"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={formAction} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {booking ? <input type="hidden" name="id" value={booking.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Durum</label>
              <select
                name="status"
                defaultValue={booking?.status ?? BookingStatus.NEW}
                className={`${inputClass} mt-1`}
              >
                {BOOKING_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Villa</label>
              <select
                name="villaId"
                defaultValue={booking?.villa.id ?? ""}
                required
                className={`${inputClass} mt-1`}
              >
                <option value="">Villa seçin...</option>
                {villas.map((villa) => (
                  <option key={villa.id} value={villa.id}>
                    {villa.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Misafir Adı Soyadı</label>
              <input
                name="guestName"
                defaultValue={booking?.guestName ?? ""}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>E-posta</label>
              <input
                name="guestEmail"
                type="email"
                defaultValue={booking?.guestEmail ?? ""}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Telefon</label>
              <input
                name="guestPhone"
                defaultValue={booking?.guestPhone ?? ""}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Giriş Tarihi</label>
              <input
                name="checkIn"
                type="date"
                defaultValue={booking ? toDateInputValue(booking.checkIn) : ""}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Çıkış Tarihi</label>
              <input
                name="checkOut"
                type="date"
                defaultValue={booking ? toDateInputValue(booking.checkOut) : ""}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Yetişkin</label>
              <input
                name="adults"
                type="number"
                min={1}
                defaultValue={booking?.adults ?? 2}
                required
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Çocuk</label>
              <input
                name="children"
                type="number"
                min={0}
                defaultValue={booking?.children ?? 0}
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Bebek</label>
              <input
                name="babies"
                type="number"
                min={0}
                defaultValue={booking?.babies ?? 0}
                className={`${inputClass} mt-1`}
              />
            </div>

            <div>
              <label className={labelClass}>Evcil Hayvan</label>
              <input
                name="pets"
                type="number"
                min={0}
                defaultValue={booking?.pets ?? 0}
                className={`${inputClass} mt-1`}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Toplam Tutar (TL)</label>
              <input
                name="totalPrice"
                type="number"
                min={0}
                step={1}
                defaultValue={booking?.totalPrice ?? ""}
                placeholder="Örn. 32000"
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          {state.error ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
