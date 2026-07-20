"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Search,
  Square,
  X,
} from "lucide-react";
import {
  createPublicVillaShareLinkAction,
  searchAvailabilityAction,
} from "@/app/actions/admin/availability-search";
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
import { isValidStoredPhoneE164 } from "@/lib/phone-utils";
import TurkishPhoneField from "@/components/admin/ui/TurkishPhoneField";
import {
  PUBLIC_SITE_KEYS,
  PUBLIC_SITE_META,
  type PublicSiteKey,
} from "@/lib/public-site-keys";

const NIGHT_OPTIONS = Array.from({ length: 30 }, (_, index) => index + 1);

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

function sortResults(
  items: AvailabilitySearchResultItem[],
  sort: AvailabilitySearchSort
) {
  const next = [...items];
  if (sort === "price_asc") {
    next.sort((left, right) => left.quote.total - right.quote.total);
  } else {
    next.sort((left, right) => {
      if (left.recommended !== right.recommended) {
        return left.recommended ? -1 : 1;
      }
      if (left.popular !== right.popular) {
        return left.popular ? -1 : 1;
      }
      return left.name.localeCompare(right.name, "tr");
    });
  }
  return next;
}

interface AvailabilitySearchPageProps {
  pageData: AvailabilitySearchPageData;
}

export default function AvailabilitySearchPage({
  pageData,
}: AvailabilitySearchPageProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [autoCollapse, setAutoCollapse] = useState(true);
  const [phone, setPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [contactChannelId, setContactChannelId] = useState(
    pageData.contactChannels[0]?.id ?? ""
  );
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(() => defaultCheckOut(defaultCheckIn()));
  const [nightCount, setNightCount] = useState(7);
  const [siteKey, setSiteKey] = useState<PublicSiteKey>("tatildeyiz");
  const [regionSlugs, setRegionSlugs] = useState<string[]>([]);
  const [amenityNames, setAmenityNames] = useState<string[]>([]);
  const [guestCounts, setGuestCounts] = useState<number[]>([]);
  const [flexibleDate, setFlexibleDate] = useState(false);
  const [fillEmptyDates, setFillEmptyDates] = useState(false);
  const [sort, setSort] = useState<AvailabilitySearchSort>("recommended");
  const [results, setResults] = useState<AvailabilitySearchResultItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareLinkCache, setShareLinkCache] = useState<{
    key: string;
    url: string;
  } | null>(null);

  const selectedCount = selectedIds.length;
  const allSelected =
    results.length > 0 && selectedIds.length === results.length;

  const selectedGuestCount = guestCounts[0] ?? 2;
  const shareKey = useMemo(
    () =>
      JSON.stringify({
        villaIds: [...selectedIds].sort(),
        checkIn,
        checkOut,
        adults: selectedGuestCount,
      }),
    [selectedIds, checkIn, checkOut, selectedGuestCount]
  );

  useEffect(() => {
    if (!isPending) return;

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + 8));
    }, 180);

    return () => window.clearInterval(timer);
  }, [isPending]);

  async function handlePhoneLookup(rawPhone: string) {
    if (!isValidStoredPhoneE164(rawPhone) && rawPhone.replace(/\D/g, "").length < 10) {
      return;
    }

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
    if (!isValidStoredPhoneE164(phone)) {
      nextErrors.phone = "Telefon numarası zorunlu";
    }
    if (!guestName.trim()) {
      nextErrors.guestName = "Ad soyad zorunlu";
    }
    if (!contactChannelId) {
      nextErrors.contactChannelId = "Ulaşım kanalı zorunlu";
    }
    if (!checkIn || !checkOut) {
      nextErrors.dates = "Giriş ve çıkış tarihleri zorunludur";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSearch() {
    setError(null);
    if (!validateForm()) return;

    setHasSearched(true);
    setProgress(12);
    setSelectedIds([]);

    startTransition(async () => {
      const response = await searchAvailabilityAction({
        phone,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        contactChannelId,
        checkIn,
        checkOut,
        adults: selectedGuestCount,
        children: 0,
        babies: 0,
        budgetMin: null,
        budgetMax: null,
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
        setProgress(100);
        return;
      }

      setResults(sortResults(response.results ?? [], sort));
      setProgress(100);
      if (autoCollapse) setPanelOpen(false);
    });
  }

  function handleSortChange(nextSort: AvailabilitySearchSort) {
    setSort(nextSort);
    setResults((current) => sortResults(current, nextSort));
  }

  function toggleSelect(villaId: string, nextSelected: boolean) {
    setSelectedIds((prev) => {
      if (nextSelected) {
        return prev.includes(villaId) ? prev : [...prev, villaId];
      }
      return prev.filter((id) => id !== villaId);
    });
  }

  function selectAll() {
    setSelectedIds(results.map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function resolveShareUrl(): Promise<string | null> {
    if (selectedIds.length === 0) {
      window.alert("En az bir villa seçin.");
      return null;
    }
    if (shareLinkCache?.key === shareKey) {
      return shareLinkCache.url;
    }

    setIsCreatingShare(true);
    try {
      const response = await createPublicVillaShareLinkAction({
        villaIds: selectedIds,
        checkIn,
        checkOut,
        adults: selectedGuestCount,
      });
      if (!response.url) {
        window.alert(response.error ?? "Kısa teklif bağlantısı oluşturulamadı.");
        return null;
      }
      setShareLinkCache({ key: shareKey, url: response.url });
      return response.url;
    } finally {
      setIsCreatingShare(false);
    }
  }

  async function copyShareLink() {
    const url = await resolveShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.alert("Link kopyalanamadı.");
    }
  }

  async function openSharePreview() {
    const url = await resolveShareUrl();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col gap-3">
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 rounded-t-xl border-b border-gray-100 px-3 py-2">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Search className="h-4 w-4 text-gray-500" />
            Uygunluk Ara
          </div>
          <p className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-gray-500">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Tüm bilgileri doğru girdiğinizden emin olun. Aramalar yol ve
            istatistikler için loglanır.
          </p>
          <button
            type="button"
            onClick={() => setAutoCollapse((value) => !value)}
            title={
              autoCollapse
                ? "Arama sonrası otomatik daralt: Açık"
                : "Arama sonrası otomatik daralt: Kapalı"
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              autoCollapse
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                autoCollapse ? "bg-violet-500" : "bg-gray-300"
              }`}
            />
            Auto Daralt
          </button>
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
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-12">
              <div className="xl:col-span-3">
                <TurkishPhoneField
                  label="Telefon *"
                  value={phone}
                  onChange={setPhone}
                  onBlur={handlePhoneLookup}
                  focusPalette="violet"
                  compact
                  error={fieldErrors.phone}
                  suffix={
                    isLookingUpPhone ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                    ) : null
                  }
                />
              </div>

              <label className="block xl:col-span-3">
                <span className={labelClass}>
                  Ad Soyad <span className="text-red-500">*</span>
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

              <label className="block xl:col-span-4">
                <span className={labelClass}>E-posta</span>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  className={inputClass}
                  placeholder="ornek@mail.com"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className={labelClass}>
                  Kanal <span className="text-red-500">*</span>
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

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-12">
              <label className="col-span-2 block lg:col-span-7">
                <span className={`${labelClass} font-bold text-sky-600`}>
                  <span className="text-amber-500">*</span> TARİH
                </span>
                <StayDateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={handleDateRangeChange}
                />
                {fieldErrors.dates ? (
                  <p className="mt-0.5 text-[11px] text-red-600">{fieldErrors.dates}</p>
                ) : null}
              </label>

              <label className="block lg:col-span-2">
                <span className={labelClass}>Gece Sayısı</span>
                <select
                  value={nightCount}
                  onChange={(event) =>
                    handleNightCountChange(Number(event.target.value))
                  }
                  className={compactInputClass}
                >
                  {NIGHT_OPTIONS.map((nights) => (
                    <option key={nights} value={nights}>
                      {nights} Gece
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-3">
                <span className={labelClass}>Site Adı</span>
                <select
                  value={siteKey}
                  onChange={(event) =>
                    setSiteKey(event.target.value as PublicSiteKey)
                  }
                  className={compactInputClass}
                >
                  {PUBLIC_SITE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {PUBLIC_SITE_META[key].label} ({PUBLIC_SITE_META[key].domain})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-2 xl:grid-cols-3">
              <div>
                <div className={`${labelClass} mb-1`}>Bölge</div>
                <RegionTreePanel
                  tree={pageData.regionTree}
                  selectedSlugs={regionSlugs}
                  onChange={setRegionSlugs}
                />
              </div>
              <div>
                <div className={`${labelClass} mb-1`}>Özellik</div>
                <AmenityMultiSelect
                  options={pageData.amenities}
                  selectedNames={amenityNames}
                  onChange={setAmenityNames}
                />
              </div>
              <div>
                <div className={`${labelClass} mb-1`}>Kişi</div>
                <GuestCountMultiSelect
                  selectedCounts={guestCounts}
                  onChange={setGuestCounts}
                />
              </div>
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

              <label
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
                title="Tarihler arasındaki boş günleri tara"
              >
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
                    onClick={() => handleSortChange(item.value)}
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

      {hasSearched && results.length > 0 ? (
        <section className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? clearSelection : selectAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {allSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
            </button>

            {selectedCount > 0 ? (
              <>
                <span className="text-xs text-gray-500">
                  {selectedCount} villa seçildi
                </span>
                <button
                  type="button"
                  onClick={() => void copyShareLink()}
                  disabled={isCreatingShare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {isCreatingShare ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {shareCopied ? "Kopyalandı!" : "Linki Kopyala"}
                </button>
                <button
                  type="button"
                  onClick={() => void openSharePreview()}
                  disabled={isCreatingShare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Önizleme
                </button>
                {shareLinkCache?.key === shareKey ? (
                  <a
                    href={shareLinkCache.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[18rem] truncate text-xs font-medium text-violet-700 hover:underline"
                    title={shareLinkCache.url}
                  >
                    {shareLinkCache.url}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500">
                Listelemek istediğiniz villaları sol üst kutucuktan seçin.
              </span>
            )}
          </div>
        </section>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {hasSearched
                ? `Arama Sonuçları (${results.length} villa)`
                : "Uygunluk Sonuçları"}
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {hasSearched
                ? `${results.length} villa gösteriliyor`
                : "Arama yapmak için formu doldurun ve Ara'ya tıklayın."}
            </p>
          </div>
          {hasSearched ? (
            <div className="min-w-[180px]">
              <div className="mb-1 flex justify-between text-[10px] text-gray-400">
                <span>{results.length} sonuç</span>
                <span>%{progress}</span>
              </div>
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
              <AvailabilityResultCard
                key={result.id}
                result={result}
                selected={selectedIds.includes(result.id)}
                onToggleSelect={toggleSelect}
                guestPhone={phone}
                guestName={guestName.trim()}
                guestEmail={guestEmail.trim()}
                adults={selectedGuestCount}
                childGuests={0}
                babies={0}
                siteKey={siteKey}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
