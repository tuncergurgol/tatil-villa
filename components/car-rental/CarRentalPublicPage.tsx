"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Car,
  ClipboardCheck,
  CreditCard,
  IdCard,
  MapPin,
  User,
} from "lucide-react";
import TravelAdventureSection from "@/components/villa-detail/TravelAdventureSection";
import Yolcu360SearchWidget from "@/components/yolcu360/Yolcu360SearchWidget";
import type {
  CarRentalCategoryItem,
  CarRentalDriverCriterionItem,
  CarRentalLocationItem,
  CarRentalPageSettingsData,
} from "@/lib/queries/car-rental";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const iconMap = {
  user: User,
  "id-card": IdCard,
  "credit-card": CreditCard,
  "badge-check": BadgeCheck,
  "clipboard-check": ClipboardCheck,
} as const;

type Props = {
  settings: CarRentalPageSettingsData;
  categories: CarRentalCategoryItem[];
  locations: CarRentalLocationItem[];
  criteria: CarRentalDriverCriterionItem[];
  driverAgeOptions: string[];
  yolcu360Enabled?: boolean;
};

function formatPriceFrom(price: number, currency: string) {
  return `${price.toLocaleString("tr-TR")} ${currency}'den`;
}

export default function CarRentalPublicPage({
  settings,
  categories,
  locations,
  criteria,
  driverAgeOptions,
  yolcu360Enabled = false,
}: Props) {
  const [sameLocation, setSameLocation] = useState(
    settings.sameLocationDefault
  );
  const [pickupId, setPickupId] = useState(locations[0]?.id ?? "");
  const [returnId, setReturnId] = useState(locations[0]?.id ?? "");

  const popularLocations = useMemo(
    () => locations.filter((l) => l.isPopular).slice(0, 6),
    [locations]
  );

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.25),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-sm font-semibold tracking-wide text-teal-200">
            {settings.heroBadge}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
            {settings.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-teal-100/90 sm:text-lg">
            {settings.heroSubtitle}
          </p>

          {yolcu360Enabled ? (
            <Yolcu360SearchWidget
              settings={settings}
              driverAgeOptions={driverAgeOptions}
            />
          ) : (
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-900 shadow-xl sm:p-6">
            {settings.showSameLocationToggle ? (
              <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={sameLocation}
                  onChange={(e) => {
                    setSameLocation(e.target.checked);
                    if (e.target.checked) setReturnId(pickupId);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                {settings.sameLocationLabel}
              </label>
            ) : null}

            {settings.rentalDaysHint ? (
              <p className="mb-3 text-xs font-medium text-teal-700">
                {settings.rentalDaysHint}
              </p>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-6">
              <label className="block lg:col-span-2">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {settings.pickupLabel}
                </span>
                <select
                  value={pickupId}
                  onChange={(e) => {
                    setPickupId(e.target.value);
                    if (sameLocation) setReturnId(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.iataCode ? ` (${loc.iataCode})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {!sameLocation ? (
                <label className="block lg:col-span-2">
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {settings.returnLabel}
                  </span>
                  <select
                    value={returnId}
                    onChange={(e) => setReturnId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                        {loc.iataCode ? ` (${loc.iataCode})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {settings.pickupDateLabel}
                </span>
                <div className="flex gap-1">
                  <input
                    type="date"
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <select className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-2.5 text-sm outline-none focus:border-teal-400">
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {settings.returnDateLabel}
                </span>
                <div className="flex gap-1">
                  <input
                    type="date"
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                  <select className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-2.5 text-sm outline-none focus:border-teal-400">
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <User className="h-3.5 w-3.5" />
                  {settings.driverAgeLabel}
                </span>
                <select
                  defaultValue={settings.defaultDriverAge}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                >
                  {driverAgeOptions.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end lg:col-span-6 xl:col-span-1">
                <button
                  type="button"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  <Car className="h-4 w-4" />
                  {settings.ctaText}
                </button>
              </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {settings.categoriesTitle}
            </h2>
            {settings.categoriesSubtitle ? (
              <p className="mt-2 text-slate-600">{settings.categoriesSubtitle}</p>
            ) : null}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {cat.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-teal-700">
                  {formatPriceFrom(cat.priceFrom, cat.currency)}
                </p>
                {cat.description ? (
                  <p className="mt-2 text-sm text-slate-500">{cat.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {popularLocations.length > 0 || locations.length > 0 ? (
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {settings.locationsTitle}
              </h2>
              {settings.locationsSubtitle ? (
                <p className="mt-2 text-slate-600">
                  {settings.locationsSubtitle}
                </p>
              ) : null}
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(popularLocations.length > 0
                ? popularLocations
                : locations.slice(0, 6)
              ).map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                >
                  <h3 className="text-lg font-bold text-slate-900">
                    {loc.city || loc.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{loc.name}</p>
                  {loc.vehicleCountHint ? (
                    <p className="mt-2 text-xs font-semibold text-teal-700">
                      {loc.vehicleCountHint}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {criteria.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {settings.criteriaTitle}
            </h2>
            {settings.criteriaSubtitle ? (
              <p className="mt-2 text-slate-600">{settings.criteriaSubtitle}</p>
            ) : null}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {criteria.map((item) => {
              const Icon =
                iconMap[item.icon as keyof typeof iconMap] ?? ClipboardCheck;
              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        id="seyahat-macerasi"
        className="border-t border-slate-200 bg-white py-12 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TravelAdventureSection />
        </div>
      </section>
    </div>
  );
}
