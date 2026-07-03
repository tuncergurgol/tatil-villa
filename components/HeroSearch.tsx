"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, Search, Users } from "lucide-react";
import GuestPicker from "./GuestPicker";
import { guestSummary } from "@/lib/utils";
import type { GuestCounts } from "@/lib/types";

export default function HeroSearch() {
  const router = useRouter();
  const guestRef = useRef<HTMLDivElement>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    babies: 0,
    pets: 0,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setGuestOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    router.push(`/villalar?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-2 shadow-2xl shadow-black/20 sm:p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <label className="relative flex flex-1 items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <Calendar className="h-5 w-5 shrink-0 text-teal-600" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-medium text-gray-500">Giriş</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            </div>
          </label>

          <label className="relative flex flex-1 items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <Calendar className="h-5 w-5 shrink-0 text-teal-600" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-medium text-gray-500">Çıkış</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none"
              />
            </div>
          </label>

          <div ref={guestRef} className="relative flex-1">
            <button
              type="button"
              onClick={() => setGuestOpen(!guestOpen)}
              className="flex h-full w-full items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left transition hover:border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <Users className="h-5 w-5 shrink-0 text-teal-600" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500">Misafirler</span>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {guestSummary(guests)}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition ${guestOpen ? "rotate-180" : ""}`}
              />
            </button>

            {guestOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
                <GuestPicker counts={guests} onChange={setGuests} />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-teal-700 sm:min-w-[140px]"
        >
          <Search className="h-5 w-5" />
          Ara
        </button>
      </div>
    </form>
  );
}
