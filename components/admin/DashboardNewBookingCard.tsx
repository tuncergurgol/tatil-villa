"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import BookingFormModal from "@/components/admin/bookings/BookingFormModal";

export default function DashboardNewBookingCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Yeni Kayıt
          </p>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Plus className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none text-gray-900">+</p>
        <p className="mt-1 text-[11px] font-medium text-violet-700">
          Yeni rezervasyon →
        </p>
      </button>

      <BookingFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
          router.push("/admin/rezervasyonlar");
        }}
      />
    </>
  );
}
