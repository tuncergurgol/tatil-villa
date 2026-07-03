"use client";

import { useActionState } from "react";
import { submitBooking, type BookingActionState } from "@/app/actions/booking";
import { siteConfig } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { Phone } from "lucide-react";

interface BookingFormProps {
  villaId: string;
  villaName: string;
  maxGuests: number;
  pricePerNight: number | null;
}

const initialState: BookingActionState = {};

export default function BookingForm({
  villaId,
  villaName,
  maxGuests,
  pricePerNight,
}: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBooking, initialState);

  return (
    <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
      {pricePerNight ? (
        <div>
          <p className="text-sm text-gray-500">Gecelik fiyat</p>
          <p className="text-3xl font-bold text-teal-700">
            {formatPrice(pricePerNight)}
          </p>
        </div>
      ) : (
        <p className="text-xl font-bold text-amber-600">Teklif Alınız</p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="villaId" value={villaId} />

        {state.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Giriş Tarihi</span>
          <input
            type="date"
            name="checkIn"
            required
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Çıkış Tarihi</span>
          <input
            type="date"
            name="checkOut"
            required
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Yetişkin</span>
            <select
              name="adults"
              defaultValue={1}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Çocuk</span>
            <select
              name="children"
              defaultValue={0}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              {Array.from({ length: maxGuests }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input type="hidden" name="babies" value={0} />
        <input type="hidden" name="pets" value={0} />

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Ad Soyad</span>
          <input
            type="text"
            name="guestName"
            required
            placeholder="Adınız Soyadınız"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">E-posta</span>
          <input
            type="email"
            name="guestEmail"
            required
            placeholder="ornek@email.com"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Telefon</span>
          <input
            type="tel"
            name="guestPhone"
            required
            placeholder="05XX XXX XX XX"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {pending
            ? "Gönderiliyor..."
            : pricePerNight
              ? "Rezervasyon Yap"
              : "Teklif İste"}
        </button>
      </form>

      <a
        href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
      >
        <Phone className="h-4 w-4" />
        {siteConfig.phone}
      </a>

      <p className="mt-4 text-center text-xs text-gray-500">
        {villaName} · TÜRSAB No: {siteConfig.tursabNo}
      </p>
    </div>
  );
}
