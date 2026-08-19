import { ArrowRight } from "lucide-react";

type VillaPriceRangeProps = {
  minNightlyPrice?: number | null;
  maxNightlyPrice?: number | null;
  pricePerNight?: number | null;
  showArrow?: boolean;
  compact?: boolean;
};

function formatRangeAmount(price: number) {
  return `${price.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}TL`;
}

export default function VillaPriceRange({
  minNightlyPrice,
  maxNightlyPrice,
  pricePerNight,
  showArrow = true,
  compact = false,
}: VillaPriceRangeProps) {
  const min = minNightlyPrice ?? pricePerNight ?? null;
  const max = maxNightlyPrice ?? pricePerNight ?? null;

  if (min == null || max == null) {
    return (
      <div className="flex w-full items-end justify-between gap-2">
        <p
          className={`font-semibold text-amber-700 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          Teklif Alınız
        </p>
        {showArrow ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm transition group-hover:bg-orange-600">
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    );
  }

  const same = min === max;
  const rangeText = same
    ? formatRangeAmount(min)
    : `${formatRangeAmount(min)} - ${formatRangeAmount(max)}`;

  return (
    <div className="flex w-full items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="leading-tight">
          <span
            className={`font-bold text-slate-800 ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {rangeText}
          </span>
          <span className="ml-1 align-top text-[11px] font-semibold text-orange-700">
            /Gecelik
          </span>
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {same ? "Gecelik fiyat" : "Fiyat Aralığında"}
        </p>
      </div>
      {showArrow ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm transition group-hover:bg-orange-600 group-hover:shadow-md">
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
      ) : null}
    </div>
  );
}
