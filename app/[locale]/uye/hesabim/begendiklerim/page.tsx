import GalleryImage from "@/components/GalleryImage";
import Link from "next/link";
import { getMemberFavoriteVillasAction } from "@/app/actions/member-favorites";
import { villaPublicPath } from "@/lib/villa-public-path";

export default async function MemberFavoritesPage() {
  const favorites = await getMemberFavoriteVillasAction();

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h2 className="text-xl font-bold text-slate-900">Beğendiklerim</h2>
        <p className="mt-1 text-sm text-slate-600">
          Favori villalarınızı buradan hızlıca açabilirsiniz.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Henüz favori villa eklemediniz.
          </p>
          <Link
            href="/villalar"
            className="mt-4 inline-flex rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Villaları Keşfet
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {favorites.map((item) => {
            if (!item) return null;
            const villa = item.villa;
            return (
              <li
                key={villa.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <Link href={villaPublicPath(villa.slug)} className="block">
                  <div className="relative aspect-[16/10] bg-slate-100">
                    <GalleryImage
                      src={villa.image}
                      alt={villa.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 320px"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-slate-900">{villa.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {villa.regionName}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {villa.guests} kişi · {villa.bedrooms} oda ·{" "}
                      {villa.bathrooms} banyo
                    </p>
                    {villa.pricePerNight ? (
                      <p className="mt-2 text-sm font-bold text-teal-700">
                        {villa.pricePerNight.toLocaleString("tr-TR")} TL / gece
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
