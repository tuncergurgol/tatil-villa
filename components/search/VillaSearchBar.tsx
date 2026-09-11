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

interface VillaSearchBarProps {
  regions: HeroSearchRegionOption[];
  initialRegion?: HeroSearchRegionOption | null;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: GuestCounts;
  preserveParams?: Record<string, string | undefined>;
}

export default function VillaSearchBar({
  regions,
  initialRegion = null,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests,
  preserveParams,
}: VillaSearchBarProps) {
  const router = useRouter();
  const guestRef = useRef<HTMLDivElement>(null);
  const guestAnchorRef = useRef<HTMLButtonElement>(null);
  const guestPanelRef = useRef<HTMLDivElement>(null);

  const [destination, setDestination] = useState<HeroSearchRegionOption | null>(
    initialRegion
  );
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guests, setGuests] = useState<GuestCounts>(
    initialGuests ?? { adults: 1, children: 0, babies: 0, pets: 0 }
  );

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
    if (preserveParams?.category) params.set("category", preserveParams.category);
    if (preserveParams?.facilities) params.set("facilities", preserveParams.facilities);
    if (preserveParams?.q) params.set("q", preserveParams.q);
    if (preserveParams?.minPrice) params.set("minPrice", preserveParams.minPrice);
    if (preserveParams?.maxPrice) params.set("maxPrice", preserveParams.maxPrice);
    if (preserveParams?.amenities) params.set("amenities", preserveParams.amenities);
    if (preserveParams?.sort) params.set("sort", preserveParams.sort);
    if (destination?.slug) params.set("region", destination.slug);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    if (guests.babies) params.set("babies", String(guests.babies));
    if (guests.pets) params.set("pets", String(guests.pets));

    const href = `/villalar?${params.toString()}`;
    router.push(href);

    window.setTimeout(() => {
      document
        .getElementById("villa-arama-sonuclari")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  const guestTotal = totalGuests(guests);

  return (
    <form
      onSubmit={handleSearch}
      className="rounded-2xl border border-gray-100 bg-white p-1.5 shadow-md"
    >
      <div className="flex min-w-0 flex-col gap-1.5 lg:h-14 lg:flex-row lg:items-stretch">
        <div className="h-full min-w-0 sm:min-w-[180px] sm:max-w-[240px] sm:flex-1 lg:max-w-[260px]">
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
            className="flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2 text-left outline-none transition hover:bg-white hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-200 lg:h-full"
          >
            <Users className="h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-normal leading-none text-gray-500">
                Misafirler
              </span>
              <p className="mt-1 truncate text-sm font-semibold leading-tight text-gray-900">
                <span className="rounded-md bg-sky-50 px-1">
                  {guestTotal} Misafir
                </span>
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
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white transition hover:bg-sky-800 sm:min-w-[100px] sm:shrink-0 lg:h-full"
          >
            <Search className="h-4 w-4" />
            <span>Ara</span>
          </button>
      </div>
    </form>
  );
}
