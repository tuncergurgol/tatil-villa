import GalleryImage from "@/components/GalleryImage";
import MemberFavoriteButton from "@/components/member/MemberFavoriteButton";
import Link from "next/link";
import type { Villa } from "@/lib/types";
import { villaPublicPath } from "@/lib/villa-public-path";

function formatNightlyPrice(villa: Villa) {
  const price = villa.minNightlyPrice ?? villa.pricePerNight;
  if (price == null || price <= 0) return null;
  return `${price.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} TL`;
}

function stayLine(villa: Villa) {
  const rooms =
    villa.bedrooms === 1
      ? "1 yatak odası"
      : `${villa.bedrooms} yatak odası`;
  return `${villa.guests} kişilik • ${rooms}`;
}

export default function Theme2VillaCard({ villa }: { villa: Villa }) {
  const price = formatNightlyPrice(villa);

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
          <p className="mt-1 text-[13px] text-slate-500">{stayLine(villa)}</p>
          <p className="mt-2 text-[15px] font-semibold text-slate-900">
            {price ? (
              <>
                {price}
                <span className="ml-1 text-[13px] font-normal text-slate-500">
                  /gece
                </span>
              </>
            ) : (
              <span className="text-sm font-medium text-[#0E4F46]">
                Teklif alınız
              </span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
