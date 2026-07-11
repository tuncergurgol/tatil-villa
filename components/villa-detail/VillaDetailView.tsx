import Image from "next/image";
import Link from "next/link";
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
  X,
} from "lucide-react";
import BookingForm from "@/components/BookingForm";
import VillaCard from "@/components/VillaCard";
import PeriodPricesTrigger from "@/components/villa-detail/PeriodPricesTrigger";
import TourismPermitBadge from "@/components/villa-detail/TourismPermitBadge";
import VillaAvailabilityCalendar from "@/components/villa-detail/VillaAvailabilityCalendar";
import VillaDetailGallery from "@/components/villa-detail/VillaDetailGallery";
import VillaDetailSectionNav, {
  type VillaDetailNavItem,
} from "@/components/villa-detail/VillaDetailSectionNav";
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
  similarVillas?: SimilarVillaCard[];
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
      className={`scroll-mt-36 border-b border-slate-200 py-8 last:border-b-0 ${className}`}
    >
      {children}
    </section>
  );
}

function ruleLabel(allowed: boolean, yes: string, no: string) {
  return allowed ? yes : no;
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} yıldız`}>
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

export default function VillaDetailView({
  villa,
  faqs,
  similarVillas = [],
}: VillaDetailViewProps) {
  const navItems: VillaDetailNavItem[] = [
    { id: "genel-bakis", label: "Genel Bakış" },
    villa.rooms.length > 0
      ? { id: "oda-kapasite", label: "Oda & Kapasite" }
      : null,
    villa.reviewCount > 0 ? { id: "yorumlar", label: "Yorumlar" } : null,
    villa.amenities.length > 0
      ? { id: "olanaklar", label: "Olanaklar" }
      : null,
    villa.distances.length > 0 || villa.hasCoords
      ? { id: "lokasyon", label: "Lokasyon" }
      : null,
    villa.calendarDays.length > 0 || villa.periods.length > 0
      ? { id: "musaitlik", label: "Müsaitlik" }
      : null,
    faqs.length > 0 ? { id: "sss", label: "SSS" } : null,
  ].filter(Boolean) as VillaDetailNavItem[];

  const mapUrl = villa.hasCoords
    ? `https://www.google.com/maps?q=${villa.latitude},${villa.longitude}`
    : null;

  const hasHeatedPool = villa.pools.some((pool) => pool.heated);
  const hasConservativePool = villa.pools.some((pool) => pool.conservative);
  const purificationMethods = Array.from(
    new Set(
      villa.pools
        .map((pool) => pool.purificationMethod?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  return (
    <div className="bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-2.5 text-sm text-slate-500 sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-teal-700">
            Anasayfa
          </Link>
          <span aria-hidden>›</span>
          <Link href="/villalar" className="hover:text-teal-700">
            Villa
          </Link>
          <span aria-hidden>›</span>
          <span className="font-medium text-slate-800">{villa.name}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <VillaDetailGallery name={villa.name} images={villa.images} />

        <div className="mt-5">
          <VillaDetailSectionNav items={navItems} />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <DetailSection id="genel-bakis" className="pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {villa.name}
                </h1>
                {villa.averageRating != null ? (
                  <RatingStars rating={villa.averageRating} />
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
                <p className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {villa.regionLabel}
                </p>
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-700 underline-offset-2 hover:underline"
                  >
                    Haritada Göster
                  </a>
                ) : null}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                  <CapacityStat
                    icon={Users}
                    value={`${villa.guests} Kişi`}
                  />
                  <CapacityStat
                    icon={BedDouble}
                    value={`${villa.bedrooms} Yatak Odası`}
                  />
                  <CapacityStat
                    icon={Bath}
                    value={`${villa.bathrooms} Banyo`}
                  />
                  {hasHeatedPool ? (
                    <CapacityStat icon={Flame} value="Isıtmalı Havuz" />
                  ) : null}
                  {hasConservativePool ? (
                    <CapacityStat
                      icon={Shield}
                      value="Muhafazakar Havuz"
                    />
                  ) : null}
                </div>
                {villa.documentNo ? (
                  <TourismPermitBadge documentNo={villa.documentNo} />
                ) : null}
              </div>

              {(hasHeatedPool ||
                hasConservativePool ||
                purificationMethods.length > 0) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {hasHeatedPool ? (
                    <PoolFeatureChip
                      icon={Flame}
                      label="Isıtmalı Havuz"
                    />
                  ) : null}
                  {hasConservativePool ? (
                    <PoolFeatureChip
                      icon={Shield}
                      label="Muhafazakar (Korunaklı) Havuz"
                    />
                  ) : null}
                  {purificationMethods.map((method) => (
                    <PoolFeatureChip
                      key={method}
                      icon={Droplets}
                      label={`Dezenfekte: ${method}`}
                    />
                  ))}
                </div>
              )}

              {villa.facilityCategories.length > 0 ? (
                <div className="mt-10">
                  <h3 className="text-lg font-bold text-slate-900">
                    Öne Çıkan Özellikler
                  </h3>
                  <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {villa.facilityCategories.map((item) => (
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

              <div className="mt-10">
                <SectionTitle>Villa Detayı</SectionTitle>
                <div className="prose prose-slate mt-5 max-w-none whitespace-pre-line text-[15px] leading-relaxed text-slate-600">
                  {villa.description}
                </div>
              </div>

              {villa.pools.length > 0 ? (
                <div className="mt-10">
                  <SectionTitle>Havuz Bilgileri</SectionTitle>
                  <ul className="mt-5 space-y-4">
                    {villa.pools.map((pool, index) => {
                      const unit = pool.measureUnit === "CM" ? "cm" : "m";
                      const sizeLabel =
                        pool.width != null && pool.length != null
                          ? `${pool.width} × ${pool.length} ${unit}`
                          : null;
                      const depthLabel =
                        pool.depth != null
                          ? `${pool.depth} ${unit}`
                          : null;
                      const purification = pool.purificationMethod?.trim();

                      return (
                        <li
                          key={pool.id}
                          className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 sm:p-5"
                        >
                          <div className="flex items-start gap-3">
                            <Waves className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900">
                                {pool.poolType ||
                                  (villa.pools.length > 1
                                    ? `Havuz ${index + 1}`
                                    : "Havuz")}
                              </p>

                              <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                                {sizeLabel ? (
                                  <PoolInfoRow
                                    label="Ölçüler"
                                    value={sizeLabel}
                                  />
                                ) : null}
                                {depthLabel ? (
                                  <PoolInfoRow
                                    label="Derinlik"
                                    value={depthLabel}
                                  />
                                ) : null}
                                {pool.heated ? (
                                  <PoolInfoRow
                                    label="Isıtmalı Havuz"
                                    value="Evet"
                                  />
                                ) : null}
                                {pool.conservative ? (
                                  <PoolInfoRow
                                    label="Muhafazakar (Korunaklı) Havuz"
                                    value="Evet"
                                  />
                                ) : null}
                                {purification ? (
                                  <PoolInfoRow
                                    label="Havuz Dezenfekte Sistemi"
                                    value={purification}
                                  />
                                ) : null}
                              </dl>

                              {!sizeLabel &&
                              !depthLabel &&
                              !pool.heated &&
                              !pool.conservative &&
                              !purification ? (
                                <p className="mt-2 text-sm text-slate-500">
                                  Detaylı havuz ölçü bilgisi eklenmemiş.
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

            <DetailSection id="rezervasyon-bilgileri">
              <SectionTitle>Rezervasyon Bilgileri</SectionTitle>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Giriş saati" value={villa.checkInTime} />
                <InfoRow label="Çıkış saati" value={villa.checkOutTime} />
              </dl>
            </DetailSection>

            {villa.rooms.length > 0 ? (
              <DetailSection id="oda-kapasite">
                <SectionTitle>Oda Bilgileri</SectionTitle>
                <p className="mt-2 text-sm text-slate-600">
                  {villa.bedrooms} Yatak Odası ({villa.guests} kişi kapasiteli)
                </p>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                  {villa.rooms.map((room) => (
                    <li
                      key={room.id}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >
                      {room.imageUrl ? (
                        <div className="relative aspect-[16/10]">
                          <Image
                            src={room.imageUrl}
                            alt={room.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 40vw"
                          />
                        </div>
                      ) : null}
                      <div className="p-4">
                        <p className="font-semibold text-slate-900">
                          {room.name || room.roomTypeLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {room.bedSummary}
                        </p>
                        {room.features.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {room.features.map((feature) => (
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
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {villa.amenities.length > 0 ? (
              <DetailSection id="olanaklar">
                <SectionTitle>Villa Olanakları</SectionTitle>
                <div className="mt-5 space-y-6">
                  {villa.amenityGroups.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-sm font-semibold text-slate-800">
                        {group.category}
                      </h3>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {group.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            <DetailSection id="tesis-kurallari">
              <SectionTitle>Tesis Kuralları</SectionTitle>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                <RuleItem
                  label="Çocuklar"
                  value={ruleLabel(
                    villa.allowChildren,
                    "Çocuk kabul edilir",
                    "Çocuk kabul edilmez"
                  )}
                />
                <RuleItem
                  label="Bebek"
                  value={ruleLabel(
                    villa.allowBaby,
                    "Bebek kabul edilir",
                    "Bebek kabul edilmez"
                  )}
                />
                <RuleItem
                  label="Etkinlikler"
                  value={ruleLabel(
                    villa.allowEvents,
                    "Etkinlik yapılabilir",
                    "Etkinlik yapılamaz"
                  )}
                />
                <RuleItem
                  label="Evcil Hayvanlar"
                  value={ruleLabel(
                    villa.allowPets,
                    "Evcil hayvan kabul edilir",
                    "Evcil hayvan kabul edilmez"
                  )}
                />
                <RuleItem
                  label="Sigara"
                  value={ruleLabel(
                    villa.allowSmoking,
                    "Sigara içilebilir",
                    "Sigara içilemez"
                  )}
                />
              </ul>
              {villa.customRules.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {villa.customRules.map((rule) => (
                    <li
                      key={rule}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                      {rule}
                    </li>
                  ))}
                </ul>
              ) : null}
            </DetailSection>

            {villa.priceIncluded.length > 0 ||
            villa.priceExcluded.length > 0 ? (
              <DetailSection id="fiyat-dahil">
                <SectionTitle>Fiyata Dahil / Değil</SectionTitle>
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  {villa.priceIncluded.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-800">
                        Fiyata Dahil
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {villa.priceIncluded.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            {item.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {villa.priceExcluded.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold text-rose-800">
                        Fiyata Dahil Değil
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {villa.priceExcluded.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                            {item.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </DetailSection>
            ) : null}

            {villa.distances.length > 0 || villa.hasCoords ? (
              <DetailSection id="lokasyon">
                <SectionTitle>Çevre ve Konum</SectionTitle>
                {villa.distances.length > 0 ? (
                  <div className="mt-5 grid gap-6 sm:grid-cols-2">
                    {villa.distances.map((group) => (
                      <div key={group.category}>
                        <h3 className="text-sm font-semibold text-slate-800">
                          {group.category}
                        </h3>
                        <ul className="mt-2 space-y-2">
                          {group.items.map((item) => (
                            <li
                              key={`${item.name}-${item.distanceKm}`}
                              className="flex items-center justify-between gap-3 text-sm text-slate-700"
                            >
                              <span>{item.name}</span>
                              <span className="shrink-0 font-medium text-teal-800">
                                {item.distanceLabel}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Mesafe bilgisi henüz eklenmemiş.
                  </p>
                )}
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-sky-700 hover:underline"
                  >
                    Google Haritalar&apos;da aç →
                  </a>
                ) : null}
              </DetailSection>
            ) : null}

            {villa.calendarDays.length > 0 || villa.periods.length > 0 ? (
              <DetailSection id="musaitlik">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <SectionTitle>Müsaitlik Takvimi</SectionTitle>
                    <p className="mt-2 text-sm text-slate-600">
                      Müsait günlerde gecelik fiyatlar görünür.
                    </p>
                  </div>
                  <PeriodPricesTrigger periods={villa.periods} />
                </div>
                {villa.calendarDays.length > 0 ? (
                  <div className="mt-5">
                    <VillaAvailabilityCalendar days={villa.calendarDays} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    Takvim verisi henüz yüklenmemiş. Dönem fiyatlarına
                    bakabilirsiniz.
                  </p>
                )}
              </DetailSection>
            ) : null}

            {similarVillas.length > 0 ? (
              <DetailSection id="benzer-villalar">
                <SectionTitle>Benzer Villalar</SectionTitle>
                <div className="mt-5 -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                  {similarVillas.map((item) => (
                    <VillaCard key={item.id} villa={item} />
                  ))}
                </div>
              </DetailSection>
            ) : null}

            {villa.reviewCount > 0 ? (
              <DetailSection id="yorumlar">
                <SectionTitle>Misafir Yorumları</SectionTitle>
                {villa.averageRating != null ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    Ortalama {villa.averageRating} · {villa.reviewCount} yorum
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
                          Konaklama: {review.stayMonth}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {faqs.length > 0 ? (
              <DetailSection id="sss">
                <SectionTitle>Sık Sorulan Sorular</SectionTitle>
                <div className="mt-4 divide-y divide-slate-100">
                  {faqs.map((faq) => (
                    <details key={faq.id} className="group py-3">
                      <summary className="cursor-pointer list-none font-medium text-slate-900 marker:content-none">
                        <span className="flex items-start justify-between gap-3">
                          {faq.question}
                          <span className="text-slate-400 transition group-open:rotate-45">
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

          <aside className="lg:pt-1">
            <BookingForm
              villaId={villa.id}
              villaName={villa.name}
              maxGuests={villa.guests}
              pricePerNight={villa.pricePerNight}
            />
          </aside>
        </div>
      </div>
    </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl border border-slate-100 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </li>
  );
}
