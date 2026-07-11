import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, MapPin, Users } from "lucide-react";
import VillaPriceRange from "@/components/VillaPriceRange";
import type { Villa } from "@/lib/types";
import { categoryLabel } from "@/lib/utils";

interface VillaCardProps {
  villa: Villa;
  /** fluid: grid hücresine sığar (benzer villalar) */
  layout?: "fixed" | "fluid";
}

export default function VillaCard({
  villa,
  layout = "fixed",
}: VillaCardProps) {
  const isFluid = layout === "fluid";

  return (
    <Link
      href={`/villalar/${villa.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        isFluid
          ? "h-full w-full min-w-0"
          : "w-[280px] shrink-0 sm:w-[300px]"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={villa.image}
          alt={villa.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes={isFluid ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "300px"}
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {categoryLabel(villa.category)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-teal-700">
          {villa.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{villa.location}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {villa.guests} Kişi
          </span>
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {villa.bedrooms} Yatak Odası
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {villa.bathrooms} Banyo
          </span>
        </div>

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
