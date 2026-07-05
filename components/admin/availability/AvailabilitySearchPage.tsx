"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { searchAvailabilityAction } from "@/app/actions/admin/availability-search";
import { lookupCustomerByPhoneAction } from "@/app/actions/admin/customers";
import AvailabilityResultCard from "@/components/admin/availability/AvailabilityResultCard";
import AmenityMultiSelect from "@/components/admin/availability/AmenityMultiSelect";
import GuestCountMultiSelect from "@/components/admin/availability/GuestCountMultiSelect";
import RegionTreePanel from "@/components/admin/availability/RegionTreePanel";
import StayDateRangePicker from "@/components/admin/availability/StayDateRangePicker";
import type {
  AvailabilitySearchPageData,
  AvailabilitySearchResultItem,
  AvailabilitySearchSort,
} from "@/lib/queries/availability-search";
import {
  addDaysToDateKey,
  toDateKey,
  todayDate,
} from "@/lib/villa-period-calendar";
import { countNightsBetween } from "@/lib/villa-period-selection";
import { normalizeTurkishPhoneDigits } from "@/lib/phone-utils";

const NIGHT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 28] as const;

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

const compactInputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1.5 text-sm font-medium text-gray-900 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100";

const labelClass = "text-[11px] font-medium text-gray-500";

function defaultCheckIn(): string {
  const date = todayDate();
  date.setDate(date.getDate() + 7);
  return toDateKey(date);
}

function defaultCheckOut(checkIn: string): string {
  return addDaysToDateKey(checkIn, 7);
}

interface AvailabilitySearchPageProps {
  pageData: AvailabilitySearchPageData;
}

export default function AvailabilitySearchPage({
  pageData,
}: AvailabilitySearchPageProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [phone, setPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [contactChannelId, setContactChannelId] = useState(
    pageData.contactChannels[0]?.id ?? ""
  );
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(() => defaultCheckOut(defaultCheckIn()));
  const [nightCount, setNightCount] = useState(7);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [babies, setBabies] = useState(0);
  const [regionSlugs, setRegionSlugs] = useState<string[]>([]);
  const [amenityNames, setAmenityNames] = useState<string[]>([]);
  const [guestCounts, setGuestCounts] = useState<number[]>([]);
  const [flexibleDate, setFlexibleDate] = useState(false);
  const [fillEmptyDates, setFillEmptyDates] = useState(false);
  const [sort, setSort] = useState<AvailabilitySearchSort>("recommended");
  const [results, setResults] = useState<AvailabilitySearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);

  useEffect(() => {
    const nights = countNightsBetween(checkIn, checkOut);
    if (nights > 0 && nights !== nightCount) {
      setNightCount(nights);
    }
  }, [checkIn, checkOut, nightCount]);

  useEffect(() => {
    if (!isPending) {
      setProgress(hasSearched ? 100 : 0);
      return;
    }

    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 8));
    }, 180);

    return () => window.clearInterval(timer);
  }, [hasSearched, isPending]);

  async function handlePhoneLookup(rawPhone: string) {
    const digits = normalizeTurkishPhoneDigits(rawPhone);
    if (digits.length < 10) return;

    setIsLookingUpPhone(true);
    try {
      const match = await lookupCustomerByPhoneAction(rawPhone);
      if (!match) return;
      setGuestName(match.fullName);
      if (match.email) setGuestEmail(match.email);
      if (match.contactChannelId) setContactChannelId(match.contactChannelId);
    } finally {
      setIsLookingUpPhone(false);
    }
  }

  function handleNightCountChange(value: number) {
    setNightCount(value);
    if (checkIn) setCheckOut(addDaysToDateKey(checkIn, value));
  }

  function handleDateRangeChange(nextCheckIn: string, nextCheckOut: string) {
    setCheckIn(nextCheckIn);
    setCheckOut(nextCheckOut);
    const nights = countNightsBetween(nextCheckIn, nextCheckOut);
    if (nights > 0) setNightCount(nights);
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    if (!normalizeTurkishPhoneDigits(phone)) {
      nextErrors.phone = "Telefon numarası zorunlu";
    }
    if (!guestName.trim()) {
      nextErrors.guestName = "Ad soyad zorunlu";
    }
    if (!contactChannelId) {
      nextErrors.contactChannelId = "Ulaşım kanalı zorunlu";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSearch() {
    setError(null);
    if (!validateForm()) return;

    setHasSearched(true);

    startTransition(async () => {
      const response = await searchAvailabilityAction({
        phone: `+90${normalizeTurkishPhoneDigits(phone)}`,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        contactChannelId,
        checkIn,
        checkOut,
        adults,
        children,
        babies,
        regionSlugs,
        amenityNames,
        guestCounts,
        flexibleDate,
        fillEmptyDates,
        sort,
      });

      if (response.error) {
        setError(response.error);
        setResults([]);
        return;
      }

      setResults(response.results ?? []);
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col gap-3">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-end border-b border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={() => setPanelOpen((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {panelOpen ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Daralt
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Genişlet
              </>
            )}
          </button>
        </div>

        {panelOpen ? (
          <div className="space-y-3 p-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className={labelClass}>
                  Telefon No <span className="text-red-500">*</span>
                </span>
                <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-100">
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-gray-700">
                    <span aria-hidden>🇹🇷</span>
                    <span>+90</span>
                  </span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    onBlur={(event) => handlePhoneLookup(event.target.value)}
                    placeholder="5xx xxx xx xx"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
                  />
                  {isLookingUpPhone ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                  ) : null}
                </div>
                {fieldErrors.phone ? (
                  <p className="mt-0.5 text-[11px] text-red-600">{fieldErrors.phone}</p>
                ) : null}
              </label>

              <label className="block">
                <span className={labelClass}>
                  Adı Soyadı <span className="text-red-500">*</span>
                </span>
                <input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className={inputClass}
                  placeholder="Misafir adı"
                />
                {fieldErrors.guestName ? (
                  <p className="mt-0.5 text-[11px] text-red-600">{fieldErrors.guestName}</p>
                ) : null}
              </label>

              <label className="block">
                <span className={labelClass}>E-posta</span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className={inputClass}
                  placeholder="ornek@mail.com"
                />
              </label>

              <label className="block">
                <span className={labelClass}>
                  Ulaşım Kanalı <span className="text-red-500">*</span>
                </span>
                <select
                  value={contactChannelId}
                  onChange={(event) => setContactChannelId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Seçin</option>
                  {pageData.contactChannels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.contactChannelId ? (
                  <p className="mt-0.5 text-[11px] text-red-600">
                    {fieldErrors.contactChannelId}
                  </p>
                ) : null}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
              <label className="col-span-2 block">
                <span className={labelClass}>Giriş – Çıkış</span>
                <StayDateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={handleDateRangeChange}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Gece</span>
                <select
                  value={nightCount}
                  onChange={(event) =>
                    handleNightCountChange(Number(event.target.value))
                  }
                  className={compactInputClass}
                >
                  {NIGHT_OPTIONS.map((nights) => (
                    <option key={nights} value={nights}>
                      {nights}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Yetişkin</span>
                <input
                  type="number"
                  min={0}
                  value={adults}
                  onChange={(event) => setAdults(Number(event.target.value) || 0)}
                  className={compactInputClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Çocuk</span>
                <input
                  type="number"
                  min={0}
                  value={children}
                  onChange={(event) =>
                    setChildren(Number(event.target.value) || 0)
                  }
                  className={compactInputClass}
                />
              </label>

              <label className="block">
                <span className={labelClass}>Bebek</span>
                <input
                  type="number"
                  min={0}
                  value={babies}
                  onChange={(event) => setBabies(Number(event.target.value) || 0)}
                  className={compactInputClass}
                />
              </label>
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <RegionTreePanel
                tree={pageData.regionTree}
                selectedSlugs={regionSlugs}
                onChange={setRegionSlugs}
              />
              <AmenityMultiSelect
                options={pageData.amenities}
                selectedNames={amenityNames}
                onChange={setAmenityNames}
              />
              <GuestCountMultiSelect
                selectedCounts={guestCounts}
                onChange={setGuestCounts}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={flexibleDate}
                  onChange={(event) => setFlexibleDate(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Esnek Tarih (±10 gün)
              </label>

              <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={fillEmptyDates}
                  onChange={(event) => setFillEmptyDates(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                Boş Tarih Doldur
              </label>

              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                {(
                  [
                    { value: "recommended", label: "Önerilen" },
                    { value: "price_asc", label: "Ucuzdan Pahalıya" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSort(item.value)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                      sort === item.value
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={isPending}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Ara
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            {hasSearched
              ? `${results.length} villa bulundu`
              : "Arama yapmak için formu doldurun ve Ara'ya tıklayın."}
          </p>
          {hasSearched ? (
            <div className="min-w-[160px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!hasSearched ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            Henüz arama yapılmadı.
          </div>
        ) : isPending ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-violet-600" />
            Uygun villalar aranıyor...
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
            Seçilen kriterlere uygun villa bulunamadı.
          </div>
        ) : (
          <div className="space-y-3 pb-3">
            {results.map((result) => (
              <AvailabilityResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
