"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { VillaDayOccupancy } from "@prisma/client";
import { buildOccupancyMap, isNightBlocked, rangeHasBlockedNight } from "@/lib/booking-calendar-selection";
import type { GuestCounts } from "@/lib/types";
import { compareDates, parseDateKey, todayDate } from "@/lib/villa-period-calendar";
import {
  countNightsBetween,
  normalizeDateRange,
} from "@/lib/villa-period-selection";

type CalendarDayInput = {
  date: string;
  occupancyStatus: string;
};

type VillaStaySelectionContextValue = {
  checkIn: string;
  checkOut: string;
  pendingStart: string | null;
  hoverDate: string | null;
  guests: GuestCounts;
  datesOpen: boolean;
  guestsOpen: boolean;
  occupancyMap: Map<string, VillaDayOccupancy>;
  previewStart: string;
  previewEnd: string;
  previewNights: number;
  previewRangeBlocked: boolean;
  allowPets: boolean;
  setGuests: (guests: GuestCounts) => void;
  setDatesOpen: (open: boolean) => void;
  setGuestsOpen: (open: boolean) => void;
  setHoverDate: (dateKey: string | null) => void;
  selectDay: (dateKey: string) => void;
  openDatePicker: () => void;
};

const VillaStaySelectionContext =
  createContext<VillaStaySelectionContextValue | null>(null);

function resolveInitialStayRange(
  initialCheckIn: string | undefined,
  initialCheckOut: string | undefined,
  calendarDays: CalendarDayInput[]
): { checkIn: string; checkOut: string } {
  const start = (initialCheckIn ?? "").trim();
  const end = (initialCheckOut ?? "").trim();
  if (!start || !end) return { checkIn: "", checkOut: "" };
  if (compareDates(parseDateKey(start), parseDateKey(end)) >= 0) {
    return { checkIn: "", checkOut: "" };
  }
  if (compareDates(parseDateKey(start), todayDate()) < 0) {
    return { checkIn: "", checkOut: "" };
  }
  const occupancyMap = buildOccupancyMap(calendarDays);
  if (rangeHasBlockedNight(start, end, occupancyMap, undefined, { allowOption: true })) {
    return { checkIn: "", checkOut: "" };
  }
  return { checkIn: start, checkOut: end };
}

export function VillaStaySelectionProvider({
  calendarDays,
  allowPets,
  initialCheckIn = "",
  initialCheckOut = "",
  initialAdults = 2,
  initialChildren = 0,
  initialBabies = 0,
  initialPets = 0,
  children,
}: {
  calendarDays: CalendarDayInput[];
  allowPets: boolean;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialBabies?: number;
  initialPets?: number;
  children: ReactNode;
}) {
  const [checkIn, setCheckIn] = useState(
    () =>
      resolveInitialStayRange(initialCheckIn, initialCheckOut, calendarDays)
        .checkIn
  );
  const [checkOut, setCheckOut] = useState(
    () =>
      resolveInitialStayRange(initialCheckIn, initialCheckOut, calendarDays)
        .checkOut
  );
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guests, setGuests] = useState<GuestCounts>(() => ({
    adults: Math.max(1, Math.min(50, Math.floor(initialAdults) || 2)),
    children: Math.max(0, Math.min(50, Math.floor(initialChildren) || 0)),
    babies: Math.max(0, Math.min(50, Math.floor(initialBabies) || 0)),
    pets: Math.max(0, Math.min(50, Math.floor(initialPets) || 0)),
  }));

  const occupancyMap = useMemo(
    () => buildOccupancyMap(calendarDays),
    [calendarDays]
  );

  const today = useMemo(() => todayDate(), []);

  const completeRange = useCallback((start: string, end: string) => {
    setCheckIn(start);
    setCheckOut(end);
    setPendingStart(null);
    setHoverDate(null);
    setDatesOpen(false);
    setGuestsOpen(true);
    requestAnimationFrame(() => {
      document
        .getElementById("rezervasyon-yap")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const selectDay = useCallback(
    (dateKey: string) => {
      if (compareDates(parseDateKey(dateKey), today) < 0) return;

      if (!pendingStart) {
        if (isNightBlocked(occupancyMap, dateKey, undefined, { allowOption: true })) return;
        setPendingStart(dateKey);
        setHoverDate(dateKey);
        setCheckIn(dateKey);
        setCheckOut("");
        setGuestsOpen(false);
        return;
      }

      if (
        compareDates(parseDateKey(dateKey), parseDateKey(pendingStart)) <= 0
      ) {
        if (isNightBlocked(occupancyMap, dateKey, undefined, { allowOption: true })) return;
        setPendingStart(dateKey);
        setHoverDate(dateKey);
        setCheckIn(dateKey);
        setCheckOut("");
        return;
      }

      const { start, end } = normalizeDateRange(pendingStart, dateKey);
      if (start === end) return;
      if (rangeHasBlockedNight(start, end, occupancyMap, undefined, { allowOption: true })) return;
      completeRange(start, end);
    },
    [completeRange, occupancyMap, pendingStart, today]
  );

  const openDatePicker = useCallback(() => {
    setDatesOpen(true);
    setGuestsOpen(false);
  }, []);

  const previewEnd =
    pendingStart && hoverDate
      ? normalizeDateRange(pendingStart, hoverDate).end
      : checkOut;
  const previewStart = pendingStart ?? checkIn;
  const previewNights =
    previewStart && previewEnd && previewStart !== previewEnd
      ? countNightsBetween(previewStart, previewEnd)
      : 0;
  const previewRangeBlocked = Boolean(
    previewStart &&
      previewEnd &&
      previewStart !== previewEnd &&
      rangeHasBlockedNight(previewStart, previewEnd, occupancyMap, undefined, {
        allowOption: true,
      })
  );

  const value = useMemo<VillaStaySelectionContextValue>(
    () => ({
      checkIn,
      checkOut,
      pendingStart,
      hoverDate,
      guests,
      datesOpen,
      guestsOpen,
      occupancyMap,
      previewStart,
      previewEnd,
      previewNights,
      previewRangeBlocked,
      allowPets,
      setGuests,
      setDatesOpen,
      setGuestsOpen,
      setHoverDate,
      selectDay,
      openDatePicker,
    }),
    [
      allowPets,
      checkIn,
      checkOut,
      datesOpen,
      guests,
      guestsOpen,
      hoverDate,
      occupancyMap,
      openDatePicker,
      pendingStart,
      previewEnd,
      previewNights,
      previewRangeBlocked,
      previewStart,
      selectDay,
    ]
  );

  return (
    <VillaStaySelectionContext.Provider value={value}>
      {children}
    </VillaStaySelectionContext.Provider>
  );
}

export function useVillaStaySelection() {
  const ctx = useContext(VillaStaySelectionContext);
  if (!ctx) {
    throw new Error(
      "useVillaStaySelection must be used within VillaStaySelectionProvider"
    );
  }
  return ctx;
}
