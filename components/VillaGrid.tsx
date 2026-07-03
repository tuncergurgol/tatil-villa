import Link from "next/link";
import Image from "next/image";
import { Bath, BedDouble, MapPin, Users } from "lucide-react";
import type { Villa } from "@/lib/types";
import { categoryLabel, formatPrice } from "@/lib/utils";

interface VillaGridProps {
  villas: Villa[];
}

export default function VillaGrid({ villas }: VillaGridProps) {
  if (villas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
        <p className="text-lg font-medium text-gray-600">Sonuç bulunamadı</p>
        <p className="mt-1 text-sm text-gray-500">
          Filtreleri değiştirerek tekrar deneyin.
        </p>
        <Link
          href="/villalar"
          className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:text-teal-900"
        >
          Tüm villaları göster
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {villas.map((villa) => (
        <Link
          key={villa.id}
          href={`/villalar/${villa.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src={villa.image}
              alt={villa.name}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-teal-800">
              {categoryLabel(villa.category)}
            </div>
          </div>

          <div className="flex flex-1 flex-col p-4">
            <h3 className="font-bold text-gray-900 group-hover:text-teal-700">
              {villa.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {villa.location}
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {villa.guests} Kişi
              </span>
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {villa.bedrooms} Oda
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {villa.bathrooms} Banyo
              </span>
            </div>

            <div className="mt-auto border-t border-gray-100 pt-3">
              {villa.pricePerNight ? (
                <p className="text-sm">
                  <span className="text-lg font-bold text-teal-700">
                    {formatPrice(villa.pricePerNight)}
                  </span>
                  <span className="text-gray-500"> / gece</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-amber-600">Teklif Alınız</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
