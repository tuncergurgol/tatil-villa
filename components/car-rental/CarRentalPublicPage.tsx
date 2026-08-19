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

function LegacySearchForm({
  settings,
  locations,
  driverAgeOptions,
}: {
  settings: CarRentalPageSettingsData;
  locations: CarRentalLocationItem[];
  driverAgeOptions: string[];
}) {
  const [sameLocation, setSameLocation] = useState(settings.sameLocationDefault);
  const [pickupId, setPickupId] = useState(locations[0]?.id ?? "");
  const [returnId, setReturnId] = useState(locations[0]?.id ?? "");

  return (
    <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-2xl shadow-blue-900/10 ring-1 ring-slate-200/80 sm:p-6 lg:p-7">
      <div className="grid gap-3 lg:grid-cols-6">
        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            {settings.pickupLabel}
          </span>
          <select
            value={pickupId}
            onChange={(e) => {
              setPickupId(e.target.value);
              if (sameLocation) setReturnId(e.target.value);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              {settings.returnLabel}
            </span>
            <select
              value={returnId}
              onChange={(e) => setReturnId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
          <span className="mb-1.5 text-xs font-semibold text-slate-500">
            {settings.pickupDateLabel}
          </span>
          <div className="flex gap-1">
            <input
              type="date"
              className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <select className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-3 text-sm outline-none focus:border-sky-400">
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 text-xs font-semibold text-slate-500">
            {settings.returnDateLabel}
          </span>
          <div className="flex gap-1">
            <input
              type="date"
              className="w-full min-w-0 rounded-xl border border-slate-200 px-2 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <select className="w-[5.5rem] shrink-0 rounded-xl border border-slate-200 px-1 py-3 text-sm outline-none focus:border-sky-400">
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="flex items-end lg:col-span-6 xl:col-span-1">
          <button
            type="button"
            className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 text-sm font-bold tracking-wide text-white shadow-md shadow-orange-700/25 transition hover:bg-orange-800"
          >
            <Car className="h-4 w-4" />
            {settings.ctaText.toUpperCase()}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        {settings.showSameLocationToggle ? (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => {
                setSameLocation(e.target.checked);
                if (e.target.checked) setReturnId(pickupId);
              }}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            {settings.sameLocationLabel}
          </label>
        ) : (
          <span />
        )}

        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <User className="h-4 w-4 text-slate-400" />
          <span className="font-medium">{settings.driverAgeLabel}:</span>
          <select
            defaultValue={settings.defaultDriverAge}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            {driverAgeOptions.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export default function CarRentalPublicPage({
  settings,
  categories,
  locations,
  criteria,
  driverAgeOptions,
  yolcu360Enabled = false,
}: Props) {
  const popularLocations = useMemo(
    () => locations.filter((l) => l.isPopular).slice(0, 6),
    [locations]
  );

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 text-white">
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-12 sm:px-6 sm:pb-32 sm:pt-16 lg:px-8">
          {settings.heroBadge ? (
            <p className="text-sm font-medium text-sky-100/90">{settings.heroBadge}</p>
          ) : null}
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {settings.heroTitle}
          </h1>
          {settings.heroSubtitle ? (
            <p className="mt-3 max-w-xl text-base text-sky-100/90 sm:text-lg">
              {settings.heroSubtitle}
            </p>
          ) : null}
        </div>
      </section>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-20 sm:-mt-24">
          {yolcu360Enabled ? (
            <Yolcu360SearchWidget
              settings={settings}
              driverAgeOptions={driverAgeOptions}
            />
          ) : (
            <LegacySearchForm
              settings={settings}
              locations={locations}
              driverAgeOptions={driverAgeOptions}
            />
          )}
        </div>
      </div>

      {categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {settings.categoriesTitle}
          </h2>
          {settings.categoriesSubtitle ? (
            <p className="mt-2 text-slate-600">{settings.categoriesSubtitle}</p>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{cat.name}</h3>
                <p className="mt-1 text-sm font-semibold text-sky-700">
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {settings.locationsTitle}
            </h2>
            {settings.locationsSubtitle ? (
              <p className="mt-2 text-slate-600">{settings.locationsSubtitle}</p>
            ) : null}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(popularLocations.length > 0
                ? popularLocations
                : locations.slice(0, 6)
              ).map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {loc.city || loc.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-600">{loc.name}</p>
                      {loc.vehicleCountHint ? (
                        <p className="mt-2 text-xs font-semibold text-sky-700">
                          {loc.vehicleCountHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {criteria.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {settings.criteriaTitle}
          </h2>
          {settings.criteriaSubtitle ? (
            <p className="mt-2 text-slate-600">{settings.criteriaSubtitle}</p>
          ) : null}
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
