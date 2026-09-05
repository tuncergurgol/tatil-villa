import Image from "next/image";
import Link from "next/link";
import type { HomeDreamCategoryCard } from "@/lib/home-dream-categories";

interface DreamVacationSectionProps {
  cards: HomeDreamCategoryCard[];
}

export default function DreamVacationSection({
  cards,
}: DreamVacationSectionProps) {
  if (cards.length === 0) return null;

  return (
    <section id="tatil-hayali" className="cv-auto bg-[#f7f9fc] py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Nasıl bir tatil hayal ediyorsunuz?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
            İhtiyacınıza uygun villa stilini seçin; filtreli arama listesine
            anında geçin.
          </p>
          <div className="mx-auto mt-4 h-1 w-12 rounded-full bg-sky-500" />
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:-mx-0 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-7">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex w-[42%] shrink-0 flex-col sm:w-auto"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)]">
                <Image
                  src={card.image}
                  alt={card.title}
                  width={384}
                  height={288}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 42vw, (max-width: 1024px) 33vw, 14vw"
                  quality={65}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-80" />
              </div>
              <h3 className="mt-3 text-center text-sm font-semibold leading-snug text-gray-800 transition group-hover:text-sky-700 sm:text-[0.9375rem]">
                {card.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
