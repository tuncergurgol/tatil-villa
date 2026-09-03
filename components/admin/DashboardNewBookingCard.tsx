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
        className="group block w-full rounded-xl border border-violet-100 bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Yeni Kayıt
          </p>
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-700">
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
        <p className="mt-1 text-xl font-bold tabular-nums leading-none text-gray-900">+</p>
        <p className="mt-0.5 text-[10px] font-medium text-violet-700">
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
