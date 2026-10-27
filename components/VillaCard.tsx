"use client";

import { useTranslations } from "next-intl";
import GalleryImage from "@/components/GalleryImage";
import { Link } from "@/lib/i18n/navigation";
import VillaPriceRange from "@/components/VillaPriceRange";
import { usePublicListingCopy } from "@/components/PublicListingCopyProvider";
import type { Villa } from "@/lib/types";
import { villaPublicPath } from "@/lib/villa-public-path";

interface VillaCardProps {
  villa: Villa;
  /** fluid: grid hücresine sığar (benzer villalar) */
  layout?: "fixed" | "fluid";
}

export default function VillaCard({
  villa,
  layout = "fixed",
}: VillaCardProps) {
  const listingCopy = usePublicListingCopy();
  const tChrome = useTranslations("chrome");
  const isFluid = layout === "fluid";
  const badge = listingCopy?.usesTesis
    ? tChrome("rentalProperty")
    : tChrome("rentalVilla");

  return (
    <Link
      href={villaPublicPath(villa.slug)}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        isFluid
          ? "h-full w-full min-w-0"
          : "w-[280px] shrink-0 sm:w-[300px]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <GalleryImage
          src={villa.image}
          alt={villa.name}
          width={560}
          height={420}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          sizes={isFluid ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "280px"}
          quality={60}
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {badge}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-teal-700">
          {villa.name}
        </h3>
        <p className="mt-1 truncate text-sm text-gray-500">{villa.location}</p>

        <p className="mt-3 text-xs text-gray-600">
          {villa.guests} {tChrome("guestsUnit")} · {villa.bedrooms}{" "}
          {tChrome("bedroomsUnit")} · {villa.bathrooms} {tChrome("bathroomsUnit")}
        </p>

        <div className="mt-auto border-t border-gray-100 pt-3">
          <VillaPriceRange
            minNightlyPrice={villa.minNightlyPrice}
            maxNightlyPrice={villa.maxNightlyPrice}
            pricePerNight={villa.pricePerNight}
          />
        </div>
      </div>
    </Link>
  );
}
