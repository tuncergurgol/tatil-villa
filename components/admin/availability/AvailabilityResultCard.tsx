"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BedDouble,
  ChevronDown,
  Link2,
  MapPin,
  MessageCircle,
  Moon,
  Send,
  Users,
} from "lucide-react";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import {
  addDaysToDateKey,
  formatPlainPrice,
} from "@/lib/villa-period-calendar";
import type { AvailabilitySearchResultItem } from "@/lib/queries/availability-search";

interface AvailabilityResultCardProps {
  result: AvailabilitySearchResultItem;
}

export default function AvailabilityResultCard({
  result,
}: AvailabilityResultCardProps) {
  const [checkIn, setCheckIn] = useState(result.checkIn);
  const [checkOut, setCheckOut] = useState(result.checkOut);

  const highlightTags = useMemo(() => {
    const tags: string[] = [];
    for (const amenity of result.amenities) {
      if (!tags.includes(amenity)) tags.push(amenity);
      if (tags.length >= 6) break;
    }
    for (const categoryName of result.facilityCategories) {
      if (tags.includes(categoryName)) continue;
      tags.push(categoryName);
      if (tags.length >= 6) break;
    }
    return tags;
  }, [result.amenities, result.facilityCategories]);

  const dayDisplayByDate = useMemo(() => {
    const map = new Map<string, PeriodCalendarDayDisplay>();
    for (const day of result.calendarDays) {
      map.set(day.dateKey, day);
    }
    return map;
  }, [result.calendarDays]);

  const activeDateKeys = useMemo(
    () => new Set(dayDisplayByDate.keys()),
    [dayDisplayByDate]
  );

  const selectedRange = useMemo(
    () => ({ start: checkIn, end: checkOut }),
    [checkIn, checkOut]
  );

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    const nights = result.quote.nights;
    if (nights > 0 && value) {
      setCheckOut(addDaysToDateKey(value, nights));
    }
  }

  function handleSendInfo() {
    console.info("[availability-search] Bilgi Gönder", {
      villaId: result.id,
      checkIn,
      checkOut,
    });
    window.alert("Bilgi gönderme özelliği yakında eklenecek.");
  }

  function handleWhatsAppAction(action: string) {
    console.info("[availability-search] WhatsApp", { villaId: result.id, action });
    window.alert(`WhatsApp: ${action} (yakında)`);
  }

  function handleLinkAction(action: string) {
    console.info("[availability-search] Link gönder", { villaId: result.id, action });
    window.alert(`Link gönder: ${action} (yakında)`);
  }

  const firstMonth = result.calendarMonths[0];
  const secondMonth = result.calendarMonths[1];

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="border-b border-gray-100 p-4 xl:border-b-0 xl:border-r">
          <div className="flex gap-4">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100">
              {result.image ? (
                <Image
                  src={result.image}
                  alt={result.name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900">{result.name}</h3>
              {result.villaId != null ? (
                <p className="mt-0.5 text-xs text-gray-500">
                  VillaID {result.villaId}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  {result.regionName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  {result.guests}
                  {result.extraCapacity > 0 ? `+${result.extraCapacity}` : ""} kişi
                </span>
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5 text-gray-400" />
                  {result.bedrooms} yatak odası
                </span>
                {result.minStayNights != null && result.minStayNights > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5 text-gray-400" />
                    min {result.minStayNights} gece
                  </span>
                ) : null}
              </div>

              {result.startingPrice != null ? (
                <p className="mt-2 text-sm font-semibold text-violet-700">
                  {formatPlainPrice(result.startingPrice, result.quote.currency)}{" "}
                  <span className="font-normal text-gray-500">/ gece başlayan</span>
                </p>
              ) : null}
            </div>
          </div>

          {highlightTags.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Öne Çıkanlar
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {highlightTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-b border-gray-100 p-4 xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Giriş</span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => handleCheckInChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Çıkış</span>
              <input
                type="date"
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">K. Ücret</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(
                  result.quote.commissionTotal,
                  result.quote.currency
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Toplam</span>
              <span className="font-bold text-gray-900">
                {formatPlainPrice(result.quote.total, result.quote.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Ön Öd. %{result.quote.prepaymentRate}</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(
                  result.quote.prepaymentAmount,
                  result.quote.currency
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Giriş Öd.</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(
                  result.quote.checkInPayment,
                  result.quote.currency
                )}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  WhatsApp
                </span>
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {["Gruba Gönder", "Kişiye Gönder"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleWhatsAppAction(action)}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </details>

            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-sky-600" />
                  Link Gönder
                </span>
                <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {["Teklif Linki", "Ödeme Linki"].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleLinkAction(action)}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </details>
          </div>

          <button
            type="button"
            onClick={handleSendInfo}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
            Bilgi Gönder
          </button>
        </div>

        <div className="p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {firstMonth ? (
              <PeriodCalendarGrid
                year={firstMonth.year}
                month={firstMonth.month}
                activeDateKeys={activeDateKeys}
                dayDisplayByDate={dayDisplayByDate}
                selectedRange={selectedRange}
                compact
                showMonthHeader
                showAdjacentMonths
                showNextMonthWeekRow={false}
              />
            ) : null}
            {secondMonth ? (
              <PeriodCalendarGrid
                year={secondMonth.year}
                month={secondMonth.month}
                activeDateKeys={activeDateKeys}
                dayDisplayByDate={dayDisplayByDate}
                selectedRange={selectedRange}
                compact
                showMonthHeader
                showAdjacentMonths={false}
                showNextMonthWeekRow
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
