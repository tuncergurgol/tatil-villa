"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import {
  resolveAvailabilityStayQuoteAction,
  sendAvailabilityOfferAction,
} from "@/app/actions/admin/availability-search";
import PeriodCalendarGrid, {
  type PeriodCalendarDayDisplay,
} from "@/components/admin/villas/periods/PeriodCalendarGrid";
import ReservationPriceSummary, {
  getReservationGrandTotal,
} from "@/components/ReservationPriceSummary";
import {
  addDaysToDateKey,
  formatPlainPrice,
} from "@/lib/villa-period-calendar";
import type { AvailabilitySearchResultItem } from "@/lib/queries/availability-search";
import type { StayQuote } from "@/lib/stay-quote";
import { villaPublicPath } from "@/lib/villa-public-path";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
} from "@/lib/public-site-keys";
import type {
  PoolHeatingSelections,
  StayFeeSelections,
} from "@/lib/stay-period-fees";

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
  siteKey: PublicSiteKey,
  slug: string,
  checkIn: string,
  checkOut: string,
  adults: number
): string {
  const params = new URLSearchParams();
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (adults > 0) params.set("adults", String(adults));
  const query = params.toString();
  return `https://${PUBLIC_SITE_META[siteKey].domain}${villaPublicPath(slug)}${
    query ? `?${query}` : ""
  }`;
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
  const [quote, setQuote] = useState<StayQuote | null>(result.quote);
  const [pricingContext, setPricingContext] = useState(
    result.pricingContext ?? null
  );
  const [feeSelections, setFeeSelections] = useState<StayFeeSelections>({});
  const [poolHeatingSelections, setPoolHeatingSelections] =
    useState<PoolHeatingSelections>({});
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<
    "WHATSAPP" | "EMAIL" | "SMS"
  >("WHATSAPP");
  const [siteKey, setSiteKey] = useState<PublicSiteKey>("tatildeyiz");
  const [linkType, setLinkType] = useState<"DETAILED" | "VILLA_ONLY">(
    "DETAILED"
  );
  const [isQuoting, startQuoteTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();
  const quoteRequestRef = useRef(0);

  useEffect(() => {
    // Yeni arama sonucu aynı villayı döndürse de tarih ve fiyatı yenile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckIn(result.checkIn);
    setCheckOut(result.checkOut);
    setQuote(result.quote);
    setPricingContext(result.pricingContext ?? null);
    setFeeSelections({});
    setPoolHeatingSelections({});
    setQuoteError(null);
  }, [result]);

  const pricingTotals = useMemo(() => {
    if (!quote?.valid) return null;
    return getReservationGrandTotal(
      quote,
      pricingContext?.periodFees,
      0,
      feeSelections,
      {
        adults,
        children: childGuests,
        baseCapacity: pricingContext?.baseCapacity ?? result.guests,
        heatedPools: pricingContext?.heatedPools ?? [],
        poolHeatingSelections,
        checkIn,
        checkOut,
      }
    );
  }, [
    adults,
    checkIn,
    checkOut,
    childGuests,
    feeSelections,
    poolHeatingSelections,
    pricingContext,
    quote,
    result.guests,
  ]);

  const highlightTags = useMemo(() => {
    return result.featuredAmenities.slice(0, 8);
  }, [result.featuredAmenities]);

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

    const requestId = ++quoteRequestRef.current;
    setQuote(null);
    setPricingContext(null);
    setFeeSelections({});
    setPoolHeatingSelections({});
    setQuoteError(null);

    startQuoteTransition(async () => {
      const response = await resolveAvailabilityStayQuoteAction({
        villaId: result.id,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
      });
      if (requestId !== quoteRequestRef.current) return;
      if (response.error || !response.quote) {
        setQuoteError(response.error ?? "Fiyat hesaplanamadı");
        setQuote(null);
        return;
      }
      setQuote(response.quote);
      setPricingContext(response.pricingContext ?? null);
      setQuoteError(null);
    });
  }

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    const nights =
      quote?.nights && quote.nights > 0 ? quote.nights : result.quote.nights;
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
    setSendNotice(null);
    if (linkType === "DETAILED" && (!quote?.valid || isQuoting)) {
      setSendNotice({
        type: "error",
        text: "Önce seçilen tarihler için fiyat hesabının tamamlanmasını bekleyin.",
      });
      return;
    }

    startSendTransition(async () => {
      const response = await sendAvailabilityOfferAction({
        villaId: result.id,
        channel: deliveryMethod,
        siteKey,
        guestName,
        guestPhone,
        guestEmail,
        checkIn,
        checkOut,
        adults,
        children: childGuests,
        babies,
        linkType,
        grandTotal: pricingTotals?.grandTotal ?? quote?.total,
      });
      setSendNotice({
        type: response.success ? "ok" : "error",
        text: response.message ?? response.error ?? "Gönderim başarısız",
      });
    });
  }

  function handlePublicPreview() {
    window.open(
      buildVillaPublicUrl(siteKey, result.slug, checkIn, checkOut, adults),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleCopyLink() {
    const url =
      linkType === "DETAILED"
        ? buildVillaPublicUrl(siteKey, result.slug, checkIn, checkOut, adults)
        : buildVillaPublicUrl(siteKey, result.slug, "", "", adults);
    void navigator.clipboard.writeText(url).then(
      () => window.alert("Villa bağlantısı panoya kopyalandı."),
      () => window.alert(url)
    );
  }

  const firstMonth = result.calendarMonths[0];
  const secondMonth = result.calendarMonths[1];
  const adminHref = `/admin/villalar/${result.id}/duzenle`;
  const publicHref = buildVillaPublicUrl(siteKey, result.slug, "", "", adults);

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
              <p className="mt-1 max-w-32 truncate text-center text-[10px] font-semibold text-gray-500">
                Belge No: {result.documentNo.trim() || "—"}
              </p>
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
                {quote?.minStayNights != null && quote.minStayNights > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Moon className="h-3.5 w-3.5 text-gray-400" />
                    min {quote.minStayNights} gece
                  </span>
                ) : null}
              </div>

              {result.startingPrice != null ? (
                <p className="mt-2 text-sm font-semibold text-violet-700">
                  {formatPlainPrice(
                    result.startingPrice,
                    quote?.currency ?? result.quote.currency
                  )}{" "}
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

          <div className="mt-4">
            {isQuoting ? (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Yeni tarihlere göre fiyat hesaplanıyor…
              </div>
            ) : null}
            {quoteError ? (
              <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {quoteError}
              </p>
            ) : null}
            <ReservationPriceSummary
              quote={quote}
              fees={pricingContext?.periodFees}
              adults={adults}
              childGuests={childGuests}
              baseCapacity={pricingContext?.baseCapacity ?? result.guests}
              checkIn={checkIn}
              checkOut={checkOut}
              heatedPools={pricingContext?.heatedPools ?? []}
              selections={feeSelections}
              poolHeatingSelections={poolHeatingSelections}
              onSelectionChange={(key, value) =>
                setFeeSelections((current) => ({
                  ...current,
                  [key]: value,
                }))
              }
              onPoolHeatingChange={(poolId, value) =>
                setPoolHeatingSelections((current) => ({
                  ...current,
                  [poolId]: value,
                }))
              }
            />
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
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-gray-500">
                Site Adı
              </span>
              <select
                value={siteKey}
                onChange={(event) =>
                  setSiteKey(event.target.value as PublicSiteKey)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-violet-300"
                aria-label="Gönderilecek site"
              >
                {PUBLIC_SITE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PUBLIC_SITE_META[key].label} ({PUBLIC_SITE_META[key].domain})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSendInfo}
            disabled={isSending || isQuoting}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? "Gönderiliyor…" : "Bilgi Gönder"}
          </button>
          {sendNotice ? (
            <p
              className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                sendNotice.type === "ok"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {sendNotice.text}
            </p>
          ) : null}
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

        <div className="min-w-0 p-3 sm:p-4">
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[880px] grid-cols-2 gap-3">
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
                  showAdjacentMonths
                  showNextMonthWeekRow={false}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
