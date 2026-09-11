"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Campaign } from "@/lib/types";

interface CampaignBannerProps {
  campaigns: Campaign[];
}

export default function CampaignBanner({ campaigns }: CampaignBannerProps) {
  const [active, setActive] = useState(0);

  const prev = () => setActive((i) => (i === 0 ? campaigns.length - 1 : i - 1));
  const next = () => setActive((i) => (i === campaigns.length - 1 ? 0 : i + 1));

  const campaign = campaigns[active];

  return (
    <section id="kampanyalar" className="bg-gray-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Kampanyalar</h2>
          <p className="mt-1 text-gray-600">
            Size özel fırsat ve kampanyaları kaçırmayın.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl">
          <div className="relative aspect-[21/9] min-h-[200px] sm:aspect-[21/7]">
            <Image
              src={campaign.image}
              alt={campaign.title}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 lg:px-16">
              <h3 className="max-w-md text-2xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] sm:text-3xl lg:text-4xl">
                {campaign.title}
              </h3>
              <p className="mt-2 max-w-sm text-sm text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-base">
                {campaign.subtitle}
              </p>
              <Link
                href={campaign.href}
                className="mt-6 inline-flex w-fit rounded-full bg-white px-6 py-2.5 text-sm font-bold text-teal-800 shadow-md transition hover:bg-teal-50"
              >
                {campaign.cta}
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-teal-900 shadow transition hover:bg-white"
            aria-label="Önceki kampanya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-teal-900 shadow transition hover:bg-white"
            aria-label="Sonraki kampanya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {campaigns.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
                aria-label={`Kampanya ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
