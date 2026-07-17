"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  ExternalLink,
  Loader2,
  MapPin,
  Moon,
  Send,
  Users,
} from "lucide-react";
import { resolveAvailabilityStayQuoteAction } from "@/app/actions/admin/availability-search";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import {
  addDaysToDateKey,
  formatPlainPrice,
} from "@/lib/villa-period-calendar";
import { countNightsBetween } from "@/lib/villa-period-selection";
import { buildWaMeUrl } from "@/lib/whatsapp-wa-me";
import type { AvailabilitySearchResultItem } from "@/lib/queries/availability-search";
import type { StayQuote } from "@/lib/stay-quote";
import { villaPublicPath } from "@/lib/villa-public-path";

interface AvailabilityResultCardProps {
  result: AvailabilitySearchResultItem;
  selected: boolean;
  onToggleSelect: (villaId: string, selected: boolean) => void;
  guestPhone: string;
  guestName: string;
  guestEmail: string;
  adults: number;
  childGuests: number;
  babies: number;
}

function buildVillaPublicUrl(
  slug: string,
  checkIn: string,
  checkOut: string
): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  const query = params.toString();
  return `${origin}${villaPublicPath(slug)}${query ? `?${query}` : ""}`;
}

function buildOfferMessage(options: {
  villaName: string;
  slug: string;
  checkIn: string;
  checkOut: string;
  quote: StayQuote;
  guestName: string;
}): string {
  const nights = countNightsBetween(options.checkIn, options.checkOut);
  const url = buildVillaPublicUrl(
    options.slug,
    options.checkIn,
    options.checkOut
  );
  const total = formatPlainPrice(options.quote.total, options.quote.currency);
  const lines = [
    options.guestName ? `Merhaba ${options.guestName},` : "Merhaba,",
    "",
    `${options.villaName} için uygunluk / teklif:`,
    `Giriş: ${options.checkIn}`,
    `Çıkış: ${options.checkOut}`,
    nights > 0 ? `Gece: ${nights}` : null,
    `Toplam: ${total}`,
    "",
    url,
  ];
  return lines.filter((line) => line != null).join("\n");
}

export default function AvailabilityResultCard({
  result,
  selected,
  onToggleSelect,
  guestPhone,
  guestName,
  guestEmail,
  adults,
  childGuests,
  babies,
}: AvailabilityResultCardProps) {
  const [checkIn, setCheckIn] = useState(result.checkIn);
  const [checkOut, setCheckOut] = useState(result.checkOut);
  const [quote, setQuote] = useState(result.quote);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<
    "WHATSAPP" | "EMAIL" | "SMS"
  >("WHATSAPP");
  const [linkType, setLinkType] = useState<"DETAILED" | "VILLA_ONLY">(
    "DETAILED"
  );
  const [isQuoting, startQuoteTransition] = useTransition();

  useEffect(() => {
    // Yeni arama sonucu aynı villayı döndürse de tarih ve fiyatı yenile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckIn(result.checkIn);
    setCheckOut(result.checkOut);
    setQuote(result.quote);
    setQuoteError(null);
  }, [result]);

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

  function refreshQuote(nextCheckIn: string, nextCheckOut: string) {
    if (!nextCheckIn || !nextCheckOut || nextCheckIn >= nextCheckOut) {
      setQuoteError("Geçerli giriş-çıkış seçin");
      return;
    }

    startQuoteTransition(async () => {
      const response = await resolveAvailabilityStayQuoteAction({
        villaId: result.id,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
      });
      if (response.error || !response.quote) {
        setQuoteError(response.error ?? "Fiyat hesaplanamadı");
        return;
      }
      setQuote(response.quote);
      setQuoteError(null);
    });
  }

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    const nights = quote.nights > 0 ? quote.nights : result.quote.nights;
    if (nights > 0 && value) {
      const nextOut = addDaysToDateKey(value, nights);
      setCheckOut(nextOut);
      refreshQuote(value, nextOut);
      return;
    }
    if (checkOut) refreshQuote(value, checkOut);
  }

  function handleCheckOutChange(value: string) {
    setCheckOut(value);
    if (checkIn) refreshQuote(checkIn, value);
  }

  function handleSendInfo() {
    const message =
      linkType === "DETAILED"
        ? buildOfferMessage({
            villaName: result.name,
            slug: result.slug,
            checkIn,
            checkOut,
            quote,
            guestName,
          })
        : [
            guestName ? `Merhaba ${guestName},` : "Merhaba,",
            "",
            `${result.name} villa bağlantısı:`,
            buildVillaPublicUrl(result.slug, "", ""),
          ].join("\n");

    if (deliveryMethod === "WHATSAPP") {
      if (!guestPhone) {
        window.alert("Müşteri telefonu gerekli.");
        return;
      }
      const wa = buildWaMeUrl(
        guestPhone.startsWith("+") ? guestPhone : `+90${guestPhone}`,
        message
      );
      if (wa.ok) {
        window.open(wa.url, "_blank", "noopener,noreferrer");
        return;
      }
      window.alert(wa.error);
      return;
    }

    if (deliveryMethod === "EMAIL") {
      if (!guestEmail) {
        window.alert("Müşteri e-posta adresi gerekli.");
        return;
      }
      window.location.href = `mailto:${encodeURIComponent(
        guestEmail
      )}?subject=${encodeURIComponent(
        `${result.name} uygunluk teklifi`
      )}&body=${encodeURIComponent(message)}`;
      return;
    }

    if (!guestPhone) {
      window.alert("Müşteri telefonu gerekli.");
      return;
    }
    window.location.href = `sms:${guestPhone}?body=${encodeURIComponent(
      message
    )}`;
  }

  function handlePublicPreview() {
    window.open(
      buildVillaPublicUrl(result.slug, checkIn, checkOut),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleCopyLink() {
    const url =
      linkType === "DETAILED"
        ? buildVillaPublicUrl(result.slug, checkIn, checkOut)
        : buildVillaPublicUrl(result.slug, "", "");
    void navigator.clipboard.writeText(url).then(
      () => window.alert("Villa bağlantısı panoya kopyalandı."),
      () => window.alert(url)
    );
  }

  const firstMonth = result.calendarMonths[0];
  const secondMonth = result.calendarMonths[1];
  const adminHref = `/admin/villalar/${result.id}/duzenle`;
  const publicHref = villaPublicPath(result.slug);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[minmax(15rem,0.72fr)_minmax(14rem,0.65fr)_minmax(34rem,2fr)]">
        <div className="border-b border-gray-100 p-4 xl:border-b-0 xl:border-r">
          <div className="flex gap-4">
            <div className="relative">
              <label className="absolute left-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded border border-white/80 bg-white/95 shadow-sm">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) =>
                    onToggleSelect(result.id, event.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  aria-label={`${result.name} seç`}
                />
              </label>
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
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                <Link
                  href={adminHref}
                  className="text-base font-bold text-gray-900 hover:text-violet-700 hover:underline"
                >
                  {result.name}
                </Link>
                <Link
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 transition hover:bg-gray-50"
                  title="Public villa sayfası"
                >
                  <ExternalLink className="h-3 w-3" />
                  Önizleme
                </Link>
              </div>
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
                  {(adults > 0 || childGuests > 0 || babies > 0) && (
                    <span className="text-gray-400">
                      (arama: {adults}+{childGuests}+{babies})
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5 text-gray-400" />
                  {result.bedrooms} yatak odası
                </span>
                {quote.minStayNights != null && quote.minStayNights > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5 text-gray-400" />
                    min {quote.minStayNights} gece
                  </span>
                ) : null}
              </div>

              {result.startingPrice != null ? (
                <p className="mt-2 text-sm font-semibold text-violet-700">
                  {formatPlainPrice(result.startingPrice, quote.currency)}{" "}
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
                onChange={(event) => handleCheckOutChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-sm">
            {isQuoting ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fiyat güncelleniyor…
              </div>
            ) : null}
            {quoteError ? (
              <p className="text-xs text-red-600">{quoteError}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">K. Ücret</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(quote.commissionTotal, quote.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Toplam</span>
              <span className="font-bold text-gray-900">
                {formatPlainPrice(quote.total, quote.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Ön Öd. %{quote.prepaymentRate}</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(quote.prepaymentAmount, quote.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Giriş Öd.</span>
              <span className="font-semibold text-gray-900">
                {formatPlainPrice(quote.checkInPayment, quote.currency)}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <select
              value={deliveryMethod}
              onChange={(event) =>
                setDeliveryMethod(
                  event.target.value as "WHATSAPP" | "EMAIL" | "SMS"
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-violet-300"
              aria-label="Gönderim kanalı"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">E-posta</option>
              <option value="SMS">SMS</option>
            </select>
            <select
              value={linkType}
              onChange={(event) =>
                setLinkType(event.target.value as "DETAILED" | "VILLA_ONLY")
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-violet-300"
              aria-label="Gönderilecek bağlantı türü"
            >
              <option value="DETAILED">
                Tarih ve fiyat detaylı link gönder
              </option>
              <option value="VILLA_ONLY">Sadece villa linki gönder</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSendInfo}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
            Bilgi Gönder
          </button>
          <div className="mt-2 flex justify-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={handleCopyLink}
              className="font-medium text-gray-500 hover:text-violet-700"
            >
              Linki kopyala
            </button>
            <button
              type="button"
              onClick={handlePublicPreview}
              className="font-medium text-gray-500 hover:text-violet-700"
            >
              Önizle
            </button>
          </div>
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
