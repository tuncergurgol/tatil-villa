"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Users } from "lucide-react";
import GuestPicker from "@/components/GuestPicker";
import HeroDateRangePicker from "@/components/HeroDateRangePicker";
import HeroDestinationSearch from "@/components/HeroDestinationSearch";
import FloatingPanel from "@/components/FloatingPanel";
import { totalGuests } from "@/lib/utils";
import type { GuestCounts, HeroSearchRegionOption } from "@/lib/types";

export default function Theme2SearchBar({
  regions,
}: {
  regions: HeroSearchRegionOption[];
}) {
  const router = useRouter();
  const guestRef = useRef<HTMLDivElement>(null);
  const guestAnchorRef = useRef<HTMLButtonElement>(null);
  const guestPanelRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState<HeroSearchRegionOption | null>(
    null
  );
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 2,
    children: 0,
    babies: 0,
    pets: 0,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        guestRef.current?.contains(target) ||
        guestPanelRef.current?.contains(target)
      ) {
        return;
      }
      setGuestOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeOthers(except: "destination" | "date" | "guest") {
    if (except !== "destination") setDestinationOpen(false);
    if (except !== "date") setDateOpen(false);
    if (except !== "guest") setGuestOpen(false);
  }

  function handleDestinationSelect(region: HeroSearchRegionOption) {
    setDestination(region);
    setDestinationOpen(false);
    setGuestOpen(false);
    setDateOpen(true);
  }

  function handleDateComplete(start: string, end: string) {
    if (start && end && start !== end) {
      setDateOpen(false);
      setDestinationOpen(false);
      setGuestOpen(true);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setDestinationOpen(false);
    setDateOpen(false);
    setGuestOpen(false);

    const params = new URLSearchParams();
    if (destination?.slug) params.set("region", destination.slug);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    if (guests.babies) params.set("babies", String(guests.babies));
    if (guests.pets) params.set("pets", String(guests.pets));

    router.push(`/villalar?${params.toString()}`);
  }

  const guestTotal = totalGuests(guests);

  return (
    <form
      onSubmit={handleSearch}
      className="rounded-[1.75rem] border border-slate-200/80 bg-white p-2 shadow-[0_12px_40px_rgba(14,79,70,0.08)]"
    >
      <div className="flex min-w-0 flex-col gap-1.5 lg:h-[4.25rem] lg:flex-row lg:items-stretch">
        <div className="h-full min-w-0 flex-1">
          <HeroDestinationSearch
            regions={regions}
            value={destination}
            onChange={setDestination}
            onSelectComplete={handleDestinationSelect}
            open={destinationOpen}
            onOpenChange={(next) => {
              if (next) closeOthers("destination");
              setDestinationOpen(next);
            }}
          />
        </div>

        <HeroDateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(nextIn, nextOut) => {
            setCheckIn(nextIn);
            setCheckOut(nextOut);
          }}
          onComplete={handleDateComplete}
          open={dateOpen}
          onOpenChange={(next) => {
            if (next) closeOthers("date");
            setDateOpen(next);
          }}
        />

        <div
          ref={guestRef}
          className="relative h-full sm:w-[180px] sm:shrink-0 lg:w-[200px]"
        >
          <button
            ref={guestAnchorRef}
            type="button"
            onClick={() => {
              const next = !guestOpen;
              if (next) closeOthers("guest");
              setGuestOpen(next);
            }}
            className="flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-left outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#0E4F46]/20 lg:h-full"
          >
            <Users className="h-4 w-4 shrink-0 text-[#0E4F46]" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-normal leading-none text-gray-500">
                Kişiler
              </span>
              <p className="mt-1 truncate text-sm font-semibold leading-tight text-gray-900">
                {guestTotal} kişi
              </p>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition ${guestOpen ? "rotate-180" : ""}`}
            />
          </button>

          <FloatingPanel
            open={guestOpen}
            anchorRef={guestAnchorRef}
            panelRef={guestPanelRef}
            className="rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl"
          >
            <GuestPicker
              counts={guests}
              onChange={setGuests}
              onConfirm={() => setGuestOpen(false)}
              confirmLabel="KAPAT"
            />
          </FloatingPanel>
        </div>

        <button
          type="submit"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#0E4F46] px-6 text-sm font-semibold text-white transition hover:bg-[#0B3A2E] sm:min-w-[120px] sm:shrink-0 lg:h-full"
        >
          <Search className="h-4 w-4" />
          <span>Ara</span>
        </button>
      </div>
    </form>
  );
}
