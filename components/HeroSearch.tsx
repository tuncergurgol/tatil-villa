"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bus,
  Car,
  ChevronDown,
  Home,
  Map,
  Plane,
  Search,
  Users,
} from "lucide-react";
import GuestPicker from "./GuestPicker";
import HeroDateRangePicker from "./HeroDateRangePicker";
import HeroDestinationSearch from "./HeroDestinationSearch";
import FloatingPanel from "./FloatingPanel";
import { totalGuests } from "@/lib/utils";
import type { GuestCounts, HeroSearchRegionOption } from "@/lib/types";

const SEARCH_TABS = [
  { id: "villa", label: "Villa", icon: Home },
  { id: "tur", label: "Tur", icon: Map },
  { id: "ucak-otobus", label: "Uçak/Otobüs", icon: Plane },
  { id: "transfer", label: "Transfer", icon: Bus },
  { id: "arac", label: "Araç Kiralama", icon: Car },
] as const;

interface HeroSearchProps {
  regions: HeroSearchRegionOption[];
}

export default function HeroSearch({ regions = [] }: HeroSearchProps) {
  const router = useRouter();
  const guestRef = useRef<HTMLDivElement>(null);
  const guestAnchorRef = useRef<HTMLButtonElement>(null);
  const guestPanelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] =
    useState<(typeof SEARCH_TABS)[number]["id"]>("villa");
  const [destination, setDestination] =
    useState<HeroSearchRegionOption | null>(null);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 1,
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

  function handleDateChange(nextCheckIn: string, nextCheckOut: string) {
    setCheckIn(nextCheckIn);
    setCheckOut(nextCheckOut);
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
    const params = new URLSearchParams();
    if (destination?.slug) params.set("region", destination.slug);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    router.push(`/villalar?${params.toString()}`);
  }

  const guestTotal = totalGuests(guests);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-1.5 flex justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-0.5 rounded-2xl bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm sm:px-3">
          {SEARCH_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-sky-50 text-sky-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-sky-600" : "text-gray-500"}`}
                />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split("/")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-2xl bg-[#f5f0ea]/95 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-sm sm:rounded-2xl sm:p-1.5"
      >
        <div className="flex flex-col gap-1.5 lg:h-14 lg:flex-row lg:items-stretch">
          <div className="h-full sm:min-w-[180px] sm:max-w-[220px] sm:flex-1 lg:max-w-[240px]">
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
            onChange={handleDateChange}
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
              className="flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-left outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sky-200 lg:h-full"
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
              <GuestPicker counts={guests} onChange={setGuests} />
            </FloatingPanel>
          </div>

          <button
            type="submit"
            className="flex h-14 items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-600 sm:min-w-[100px] sm:shrink-0 lg:h-full"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Ara</span>
          </button>
        </div>
      </form>
    </div>
  );
}
