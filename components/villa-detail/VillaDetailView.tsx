import GalleryImage from "@/components/GalleryImage";
import { Link } from "@/lib/i18n/navigation";
import {
  Bath,
  BedDouble,
  Check,
  Droplets,
  Flame,
  MapPin,
  Shield,
  Star,
  Users,
  Waves,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import BookingForm from "@/components/BookingForm";
import PeriodPricesTrigger from "@/components/villa-detail/PeriodPricesTrigger";
import SimilarVillasCarousel from "@/components/villa-detail/SimilarVillasCarousel";
import TourismPermitBadge from "@/components/villa-detail/TourismPermitBadge";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import VillaAmenitiesSection from "@/components/villa-detail/VillaAmenitiesSection";
import VillaApproximateMap from "@/components/villa-detail/VillaApproximateMap";
import VillaAvailabilityCalendar from "@/components/villa-detail/VillaAvailabilityCalendar";
import VillaDetailGallery from "@/components/villa-detail/VillaDetailGallery";
import VillaDetailSectionNav, {
  type VillaDetailNavItem,
} from "@/components/villa-detail/VillaDetailSectionNav";
import VillaHtmlContent from "@/components/villa-detail/VillaHtmlContent";
import VillaKnowBeforeSection from "@/components/villa-detail/VillaKnowBeforeSection";
import { VillaStaySelectionProvider } from "@/components/villa-detail/VillaStaySelectionContext";
import { hasVillaTourismDocument } from "@/lib/villa-document-types";
import {
  isFeaturedAmenityCategory,
  sortAmenityNamesTr,
} from "@/lib/amenity-featured";
import {
  buildForeignCurrencyPaymentDisclaimer,
  resolveForeignPriceCurrencies,
  type PublicExchangeRates,
} from "@/lib/currency-conversion";
import {
  localizeCatalogLabel,
  localizeCatalogLabels,
  localizeDistanceLabel,
} from "@/lib/i18n/localize-catalog-label";
import { localizeStayMonth } from "@/lib/i18n/localize-stay-month";
import type { PublicSiteKey } from "@/lib/public-site-keys";
import type {
  SimilarVillaCard,
  VillaDetail,
} from "@/lib/queries/villa-detail";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type VillaDetailViewProps = {
  villa: VillaDetail;
  faqs: FaqItem[];
  siteKey: PublicSiteKey;
  similarVillas?: SimilarVillaCard[];
  companyPhone?: string;
  brandName?: string;
  exchangeRates: PublicExchangeRates;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  initialBabies?: number;
  initialPets?: number;
  resumeBookingRequest?: boolean;
  bookingAccessToken?: string;
  allowBookingAccess?: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-l-4 border-teal-700 pl-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
      {children}
    </h2>
  );
}

function DetailSection({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-[var(--villa-detail-scroll-mt,12.5rem)] border-b border-slate-200 py-8 last:border-b-0 ${className}`}
    >
      {children}
    </section>
  );
}

function RatingStars({
  rating,
  ariaLabel,
}: {
  rating: number;
  ariaLabel: string;
}) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={ariaLabel}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < full ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

function roomTypeKey(roomType: string) {
  switch (roomType) {
    case "salon":
      return "roomLiving" as const;
    case "mutfak":
      return "roomKitchen" as const;
    case "banyo":
      return "roomBath" as const;
    default:
      return "roomBedroom" as const;
  }
}

export default async function VillaDetailView({
  villa,
  faqs,
  siteKey,
  similarVillas = [],
  companyPhone,
  brandName,
  exchangeRates,
  initialCheckIn = "",
  initialCheckOut = "",
  initialAdults = 2,
  initialChildren = 0,
  initialBabies = 0,
  initialPets = 0,
  resumeBookingRequest = false,
  bookingAccessToken = "",
  allowBookingAccess = false,
}: VillaDetailViewProps) {
  const [locale, t, tNav] = await Promise.all([
    getLocale(),
    getTranslations("villa"),
    getTranslations("nav"),
  ]);

  const featuredAmenityItems = localizeCatalogLabels(
    sortAmenityNamesTr(
      villa.amenityGroups.find((group) =>
        isFeaturedAmenityCategory(group.category)
      )?.items ?? []
    ),
    locale
  );
  const amenityGroups = villa.amenityGroups
    .filter((group) => !isFeaturedAmenityCategory(group.category))
    .map((group) => ({
      ...group,
      category: localizeCatalogLabel(group.category, locale),
      items: localizeCatalogLabels(group.items, locale),
    }));
  const highlightedFeatures = featuredAmenityItems;
  const canBookPublicly =
    hasVillaTourismDocument({
      documentNo: villa.documentNo,
      documentType: villa.documentType,
    }) || allowBookingAccess;

  const navItems: VillaDetailNavItem[] = [
    { id: "genel-bakis", label: t("overview") },
    villa.rooms.length > 0
      ? { id: "oda-kapasite", label: t("roomsAndCapacity") }
      : null,
    canBookPublicly &&
    (villa.calendarDays.length > 0 || villa.periods.length > 0)
      ? { id: "musaitlik", label: t("availability") }
      : null,
    villa.distances.length > 0 || villa.hasCoords
      ? { id: "lokasyon", label: t("location") }
      : null,
    amenityGroups.length > 0
      ? { id: "olanaklar", label: t("amenities") }
      : null,
    { id: "bilmeniz-gerekenler", label: t("knowBefore") },
    villa.reviewCount > 0 ? { id: "yorumlar", label: t("reviews") } : null,
    faqs.length > 0 ? { id: "sss", label: t("faq") } : null,
  ].filter(Boolean) as VillaDetailNavItem[];

  const foreignPriceCurrencies = resolveForeignPriceCurrencies([
    ...villa.periods.map((period) => period.currency),
    ...villa.calendarDays.map((day) => day.currency),
  ]);
  const foreignCurrencyDisclaimer = buildForeignCurrencyPaymentDisclaimer(
    foreignPriceCurrencies
  );

  const poolDefaultName = t("pool");

  return (
    <VillaStaySelectionProvider
      calendarDays={villa.calendarDays}
      allowPets={villa.allowPets}
      initialCheckIn={initialCheckIn}
      initialCheckOut={initialCheckOut}
      initialAdults={initialAdults}
      initialChildren={initialChildren}
      initialBabies={initialBabies}
      initialPets={initialPets}
    >
      <div className="bg-white" data-villa-detail-page>
        <div className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-2.5 text-sm text-slate-500 sm:px-6 lg:px-8">
            <Link href="/" className="hover:text-teal-700">
              {t("home")}
            </Link>
            <span aria-hidden>›</span>
            <Link href="/villalar" className="hover:text-teal-700">
              {tNav("villas")}
            </Link>
            <span aria-hidden>›</span>
            <span className="font-medium text-slate-800">{villa.name}</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
          <VillaDetailGallery
            villaId={villa.id}
            name={villa.name}
            images={villa.images}
            videoUrl={villa.videoUrl}
          />

          <VillaDetailSectionNav
            items={navItems}
            villaName={villa.name}
            siteKey={siteKey}
            className="mt-5"
          />

          <div
            className={`mt-6 grid gap-10 ${
              canBookPublicly
                ? "lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]"
                : ""
            }`}
          >
            <div className="min-w-0">
              <DetailSection id="genel-bakis" className="pt-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {villa.name}
                  </h1>
                  {villa.averageRating != null ? (
                    <RatingStars
                      rating={villa.averageRating}
                      ariaLabel={t("starsAria", { rating: villa.averageRating })}
                    />
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                  <p className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {villa.regionLabel}
                  </p>
                  {villa.hasCoords ? (
                    <a
                      href="#lokasyon"
                      className="font-semibold text-sky-700 underline-offset-2 hover:underline"
                    >
                      {t("showOnMap")}
                    </a>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                    <CapacityStat
                      icon={Users}
                      value={t("guestsCount", { count: villa.guests })}
                    />
                    <CapacityStat
                      icon={BedDouble}
                      value={t("bedroomsCount", { count: villa.bedrooms })}
                    />
                    <CapacityStat
                      icon={Bath}
                      value={t("bathroomsCount", { count: villa.bathrooms })}
                    />
                  </div>
                  {villa.documentNo ? (
                    <TourismPermitBadge
                      documentNo={villa.documentNo}
                      documentType={villa.documentType}
                    />
                  ) : null}
                </div>

                <div className="mt-10">
                  <SectionTitle>{t("detail")}</SectionTitle>
                  <div className="mt-5">
                    <VillaHtmlContent html={villa.description} />
                  </div>

                  {highlightedFeatures.length > 0 ? (
                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-slate-900">
                        {t("featuredFeatures")}
                      </h3>
                      <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                        {highlightedFeatures.map((item) => (
                          <li
                            key={item}
                            className="flex items-center gap-2.5 text-[15px] text-slate-700"
                          >
                            <Check className="h-4 w-4 shrink-0 text-sky-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {villa.pools.length > 0 ? (
                  <div className="mt-10">
                    <SectionTitle>{t("poolInfo")}</SectionTitle>
                    <ul className="mt-5 space-y-4">
                      {villa.pools.map((pool, index) => {
                        const unit = pool.measureUnit === "CM" ? "cm" : "m";
                        const purification = pool.purificationMethod?.trim();
                        const hasDimensions =
                          pool.width != null ||
                          pool.length != null ||
                          pool.depth != null;
                        const hasFeatureChips =
                          pool.heated ||
                          pool.conservative ||
                          Boolean(purification);
                        const poolName =
                          (pool.poolType
                            ? localizeCatalogLabel(pool.poolType, locale)
                            : null) ||
                          (villa.pools.length > 1
                            ? t("poolN", { n: index + 1 })
                            : t("pool"));

                        return (
                          <li
                            key={pool.id}
                            className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 sm:p-5"
                          >
                            <div className="flex items-start gap-3">
                              <Waves className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900">
                                  {poolName}
                                </p>

                                {hasDimensions ? (
                                  <dl className="mt-3 grid gap-2.5 sm:grid-cols-3">
                                    {pool.width != null ? (
                                      <PoolInfoRow
                                        label={t("width")}
                                        value={`${pool.width} ${unit}`}
                                      />
                                    ) : null}
                                    {pool.length != null ? (
                                      <PoolInfoRow
                                        label={t("length")}
                                        value={`${pool.length} ${unit}`}
                                      />
                                    ) : null}
                                    {pool.depth != null ? (
                                      <PoolInfoRow
                                        label={t("depth")}
                                        value={`${pool.depth} ${unit}`}
                                      />
                                    ) : null}
                                  </dl>
                                ) : null}

                                {hasFeatureChips ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {pool.heated ? (
                                      <PoolFeatureChip
                                        icon={Flame}
                                        label={t("heatedPool")}
                                      />
                                    ) : null}
                                    {pool.conservative ? (
                                      <PoolFeatureChip
                                        icon={Shield}
                                        label={t("conservativePool")}
                                      />
                                    ) : null}
                                    {purification ? (
                                      <PoolFeatureChip
                                        icon={Droplets}
                                        label={t("disinfected", {
                                          method: localizeCatalogLabel(
                                            purification,
                                            locale
                                          ),
                                        })}
                                      />
                                    ) : null}
                                  </div>
                                ) : null}

                                {!hasDimensions && !hasFeatureChips ? (
                                  <p className="mt-2 text-sm text-slate-500">
                                    {t("poolMeasureMissing")}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </DetailSection>

              {villa.rooms.length > 0 ? (
                <DetailSection id="oda-kapasite">
                  <SectionTitle>{t("roomInfo")}</SectionTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    {t("bedroomsCapacity", {
                      bedrooms: villa.bedrooms,
                      guests: villa.guests,
                    })}
                  </p>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                    {villa.rooms.map((room) => {
                      const bedParts: string[] = [];
                      if (room.doubleBeds > 0) {
                        bedParts.push(
                          t("doubleBed", { count: room.doubleBeds })
                        );
                      }
                      if (room.singleBeds > 0) {
                        bedParts.push(
                          t("singleBed", { count: room.singleBeds })
                        );
                      }
                      const bedSummary =
                        bedParts.length > 0 ? bedParts.join(", ") : t("noBeds");
                      const roomTitle =
                        room.name?.trim() ||
                        t(roomTypeKey(room.roomType));

                      return (
                        <li
                          key={room.id}
                          className="overflow-hidden rounded-xl border border-slate-200"
                        >
                          {room.imageUrl ? (
                            <div className="relative aspect-[16/10]">
                              <GalleryImage
                                src={room.imageUrl}
                                alt={roomTitle}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, 40vw"
                              />
                            </div>
                          ) : null}
                          <div className="p-4">
                            <p className="font-semibold text-slate-900">
                              {roomTitle}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {bedSummary}
                            </p>
                            {room.features.length > 0 ? (
                              <ul className="mt-3 flex flex-wrap gap-1.5">
                                {localizeCatalogLabels(
                                  room.features,
                                  locale
                                ).map((feature) => (
                                  <li
                                    key={feature}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                  >
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </DetailSection>
              ) : null}

              {canBookPublicly &&
              (villa.calendarDays.length > 0 || villa.periods.length > 0) ? (
                <DetailSection id="musaitlik">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <SectionTitle>{t("availabilityCalendar")}</SectionTitle>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                        {t("availabilityHint")}
                      </p>
                      {foreignCurrencyDisclaimer ? (
                        <p className="mt-2 text-[11px] font-medium leading-snug text-amber-800 sm:text-xs">
                          {foreignCurrencyDisclaimer}
                        </p>
                      ) : null}
                    </div>
                    <PeriodPricesTrigger
                      periods={villa.periods}
                      exchangeRates={exchangeRates}
                      className="shrink-0 self-start sm:mt-0.5 sm:self-center"
                    />
                  </div>
                  {villa.calendarDays.length > 0 ? (
                    <div className="mt-5">
                      <VillaAvailabilityCalendar
                        days={villa.calendarDays}
                        exchangeRates={exchangeRates}
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">
                      {t("calendarNotLoaded")}
                    </p>
                  )}
                </DetailSection>
              ) : null}

              {villa.distances.length > 0 || villa.hasCoords ? (
                <DetailSection id="lokasyon">
                  <SectionTitle>{t("surroundingsAndLocation")}</SectionTitle>
                  {villa.distances.length > 0 ? (
                    <div className="mt-5 grid gap-6 sm:grid-cols-2">
                      {villa.distances.map((group) => (
                        <div key={group.category}>
                          <h3 className="text-sm font-semibold text-slate-800">
                            {localizeCatalogLabel(group.category, locale)}
                          </h3>
                          <ul className="mt-2 space-y-2">
                            {group.items.map((item) => (
                              <li
                                key={`${item.name}-${item.distanceKm}`}
                                className="flex items-center justify-between gap-3 text-sm text-slate-700"
                              >
                                <span>
                                  {localizeCatalogLabel(item.name, locale)}
                                </span>
                                <span className="shrink-0 font-medium text-teal-800">
                                  {localizeDistanceLabel(
                                    item.distanceLabel,
                                    locale,
                                    t("meters"),
                                    t("km")
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      {t("distanceMissing")}
                    </p>
                  )}
                  {villa.hasCoords ? (
                    <VillaApproximateMap
                      latitude={villa.latitude}
                      longitude={villa.longitude}
                      regionLabel={villa.regionLabel}
                    />
                  ) : null}
                </DetailSection>
              ) : null}

              {amenityGroups.length > 0 ? (
                <DetailSection id="olanaklar">
                  <VillaAmenitiesSection groups={amenityGroups} />
                </DetailSection>
              ) : null}

              <DetailSection id="bilmeniz-gerekenler">
                <VillaKnowBeforeSection
                  checkInTime={villa.checkInTime}
                  checkOutTime={villa.checkOutTime}
                  allowBaby={villa.allowBaby}
                  allowChildren={villa.allowChildren}
                  allowPets={villa.allowPets}
                  allowSmoking={villa.allowSmoking}
                  allowEvents={villa.allowEvents}
                  showNaturePestNotice={villa.showNaturePestNotice}
                  customRules={villa.customRules}
                  priceIncluded={villa.priceIncluded}
                  priceExcluded={villa.priceExcluded}
                  damageDeposit={villa.currentDamageDeposit}
                />
              </DetailSection>

              {similarVillas.length > 0 ? (
                <DetailSection id="benzer-villalar">
                  <SimilarVillasCarousel villas={similarVillas} />
                </DetailSection>
              ) : null}

              {villa.reviewCount > 0 ? (
                <DetailSection id="yorumlar">
                  <SectionTitle>{t("reviews")}</SectionTitle>
                  {villa.averageRating != null ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {t("averageReviews", {
                        rating: villa.averageRating,
                        count: villa.reviewCount,
                      })}
                    </p>
                  ) : null}
                  <ul className="mt-5 space-y-4">
                    {villa.reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {review.guestName}
                          </p>
                          <p className="inline-flex items-center gap-1 text-sm text-slate-700">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {review.rating}/5
                          </p>
                        </div>
                        {review.title ? (
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {review.title}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {review.comment}
                        </p>
                        {review.stayMonth ? (
                          <p className="mt-2 text-xs text-slate-500">
                            {t("stayLabel", {
                              month: localizeStayMonth(
                                review.stayMonth,
                                locale
                              ),
                            })}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </DetailSection>
              ) : null}

              {faqs.length > 0 ? (
                <DetailSection id="sss">
                  <SectionTitle>{t("faq")}</SectionTitle>
                  <div className="mt-4 divide-y divide-slate-100">
                    {faqs.map((faq) => (
                      <details key={faq.id} className="group py-3">
                        <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">
                          <span className="flex items-start justify-between gap-3">
                            {faq.question}
                            <span className="text-slate-600 transition group-open:rotate-45">
                              +
                            </span>
                          </span>
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </DetailSection>
              ) : null}
            </div>

            {canBookPublicly ? (
              <aside className="lg:pt-1">
                <BookingForm
                  villaId={villa.id}
                  maxGuests={villa.guests + villa.extraCapacity}
                  baseCapacity={villa.guests}
                  pricePerNight={villa.pricePerNight}
                  companyPhone={companyPhone}
                  brandName={brandName}
                  exchangeRates={exchangeRates}
                  bookingAccessToken={bookingAccessToken || undefined}
                  resumeBookingRequest={resumeBookingRequest}
                  heatedPools={villa.pools
                    .filter((pool) => pool.heated)
                    .map((pool) => ({
                      id: pool.id,
                      name:
                        (pool.poolType
                          ? localizeCatalogLabel(pool.poolType, locale)
                          : null) || poolDefaultName,
                      periods: pool.periods ?? [],
                    }))}
                  villaSummary={{
                    name: villa.name,
                    slug: villa.slug,
                    code: villa.villaCode || villa.name,
                    image: villa.image,
                    guests: villa.guests,
                    bedrooms: villa.bedrooms,
                    bathrooms: villa.bathrooms,
                  }}
                  allowPrepaymentOption={villa.allowPrepaymentOption}
                  allowFullPaymentOption={villa.allowFullPaymentOption}
                  calendarDays={villa.calendarDays}
                />
              </aside>
            ) : null}
          </div>

          <div id="seyahat-macerasi" className="mt-12 scroll-mt-36">
            <TravelAdventureSection />
          </div>
        </div>
      </div>
    </VillaStaySelectionProvider>
  );
}

function CapacityStat({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Icon
        className="h-9 w-9 text-rose-600 sm:h-10 sm:w-10"
        strokeWidth={1.5}
      />
      <p className="text-sm font-semibold text-slate-800 sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

function PoolFeatureChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900">
      <Icon className="h-3.5 w-3.5 shrink-0 text-sky-600" />
      {label}
    </span>
  );
}

function PoolInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
