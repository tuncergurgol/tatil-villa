"use client";

import GalleryImage from "@/components/GalleryImage";
import MemberFavoriteButton from "@/components/member/MemberFavoriteButton";
import { usePublicExchangeRates } from "@/components/PublicExchangeRatesProvider";
import { convertCurrencyAmount } from "@/lib/currency-conversion";
import {
  currencySymbol,
  preferredDisplayCurrency,
} from "@/lib/i18n/display-currency";
import { localeToBcp47 } from "@/lib/i18n/locale-display";
import { Link } from "@/lib/i18n/navigation";
import type { Villa } from "@/lib/types";
import { villaPublicPath } from "@/lib/villa-public-path";
import { useLocale, useTranslations } from "next-intl";

export default function Theme2VillaCard({ villa }: { villa: Villa }) {
  const locale = useLocale();
  const tChrome = useTranslations("chrome");
  const bcp47 = localeToBcp47(locale);
  const exchangeRates = usePublicExchangeRates();
  const displayCurrency = preferredDisplayCurrency(locale);
  const amount = villa.minNightlyPrice ?? villa.pricePerNight;

  function formatNightly(price: number) {
    if (!exchangeRates || displayCurrency === "TL") {
      return `${Math.round(price).toLocaleString(bcp47)} TL`;
    }
    const converted = convertCurrencyAmount(
      price,
      "TL",
      displayCurrency,
      exchangeRates
    );
    return `≈ ${currencySymbol(displayCurrency)}${converted.toLocaleString(bcp47, { maximumFractionDigits: 0 })}`;
  }

  const stayLine = `${villa.guests} ${tChrome("guestsUnit")} • ${villa.bedrooms} ${tChrome("bedroomsUnit")}`;

  return (
    <article className="group relative flex h-full min-w-0 flex-col">
      <div className="absolute right-3 top-3 z-10">
        <MemberFavoriteButton villaId={villa.id} />
      </div>
      <Link href={villaPublicPath(villa.slug)} className="flex h-full flex-col">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[1.35rem]">
          <GalleryImage
            src={villa.image}
            alt={villa.name}
            width={640}
            height={512}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            quality={65}
          />
        </div>
        <div className="flex flex-1 flex-col pt-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">
            {villa.name}
          </h3>
          <p className="mt-1 text-[13px] text-slate-500">{stayLine}</p>
          <p className="mt-2 text-[15px] font-semibold text-slate-900">
            {amount != null && amount > 0 ? (
              <>
                {formatNightly(amount)}
                <span className="ml-1 text-[13px] font-normal text-slate-500">
                  {tChrome("perNight")}
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-[#0E4F46]">
                {tChrome("requestQuote")}
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
