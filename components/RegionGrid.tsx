import Image from "next/image";
import Link from "next/link";
import type { Region } from "@/lib/types";

interface RegionGridProps {
  regions: Region[];
}

export default function RegionGrid({ regions }: RegionGridProps) {
  return (
    <section id="bolgeler" className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Popüler Bölgeler
          </h2>
          <p className="mt-1 text-gray-600">
            Birbirinden güzel bölgelerde tatilin keyfini çıkarın.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {regions.map((region) => (
            <Link
              key={region.id}
              href={`/villalar?region=${region.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl"
            >
              <Image
                src={region.image}
                alt={region.name}
                fill
                className="object-cover transition duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, 200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <h3 className="font-bold">{region.name}</h3>
                <p className="text-xs text-white/80">{region.villaCount} villa</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
