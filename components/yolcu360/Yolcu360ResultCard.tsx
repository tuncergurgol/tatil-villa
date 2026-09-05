"use client";

import {
  Car,
  Fuel,
  Gauge,
  MapPin,
  Shield,
  Users,
} from "lucide-react";
import type { Yolcu360CarResult } from "@/lib/yolcu360/types";
import { formatYolcu360Money } from "@/lib/yolcu360/format-money";
import { parseCarRules } from "@/lib/yolcu360/car-rules";

type Yolcu360ResultCardProps = {
  car: Yolcu360CarResult;
  onSelect: (car: Yolcu360CarResult) => void;
};

function FeatureItem({
  icon: Icon,
  label,
}: {
  icon: typeof Car;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </span>
  );
}

export default function Yolcu360ResultCard({ car, onSelect }: Yolcu360ResultCardProps) {
  const rules = parseCarRules(car);
  const total = car.pricing?.paymentTotal ?? car.pricing?.total;
  const duration = car.rentalDurationInDays ?? 1;
  const dailyAmount =
    total && duration > 0 ? Math.round(total.amount / duration) : null;

  const title = [car.brand?.name, car.model?.name].filter(Boolean).join(" ");
  const subtitle = [car.class?.name, "veya benzeri"].filter(Boolean).join(" ");

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row">
      {car.imageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={car.imageURL}
          alt={title || "Araç"}
          className="h-36 w-full rounded-xl object-cover lg:h-32 lg:w-52"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-400 lg:h-32 lg:w-52">
          <Car className="h-8 w-8" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title || "Araç"}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          <p className="mt-1 text-sm font-medium text-slate-600">
            {car.vendor?.displayName ?? car.vendor?.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {car.transmission?.name ? (
            <FeatureItem icon={Gauge} label={car.transmission.name} />
          ) : null}
          {car.fuel?.name ? <FeatureItem icon={Fuel} label={car.fuel.name} /> : null}
          {car.seatCount ? (
            <FeatureItem icon={Users} label={`${car.seatCount} koltuk`} />
          ) : null}
          {rules.pickupOfficeName ? (
            <FeatureItem icon={MapPin} label={rules.pickupOfficeName} />
          ) : rules.deliveryLabel !== "Belirtilmemiş" ? (
            <FeatureItem icon={MapPin} label={rules.deliveryLabel} />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {rules.depositLabel !== "Belirtilmemiş" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              <Shield className="h-3.5 w-3.5" />
              Depozito: {rules.depositLabel}
            </span>
          ) : null}
          {rules.kmLabel !== "Belirtilmemiş" ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              KM: {rules.kmLabel}
            </span>
          ) : null}
          {car.isFindeksRequired ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              Findeks gerekli
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-4 lg:min-w-[180px] lg:items-end lg:border-t-0 lg:pt-0">
        {total ? (
          <div className="text-left lg:text-right">
            <p className="text-2xl font-bold text-teal-700">
              {formatYolcu360Money(total.amount, total.currency)}
            </p>
            {dailyAmount != null ? (
              <p className="text-xs text-slate-500">
                Günlük {formatYolcu360Money(dailyAmount, total.currency)}
              </p>
            ) : null}
            {duration > 1 ? (
              <p className="text-xs text-slate-400">{duration} gün</p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect(car)}
          className="w-full rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 lg:w-auto"
        >
          Seç ve devam et
        </button>
      </div>
    </article>
  );
}
