import Image from "next/image";
import Link from "next/link";
import type { Campaign } from "@/lib/types";

interface CampaignBannerProps {
  campaigns: Campaign[];
}

const MAX_HOME_CAMPAIGNS = 4;

export default function CampaignBanner({ campaigns }: CampaignBannerProps) {
  const items = campaigns.slice(0, MAX_HOME_CAMPAIGNS);
  if (items.length === 0) return null;

  return (
    <section id="kampanyalar" className="cv-auto bg-gray-50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Kampanyalar</h2>
          <p className="mt-1 text-gray-600">
            Size özel fırsat ve kampanyaları kaçırmayın.
          </p>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {items.map((campaign) => (
            <article
              key={campaign.id}
              className="relative w-full min-w-full shrink-0 snap-center overflow-hidden rounded-2xl"
            >
              <div className="relative aspect-[21/9] min-h-[200px] sm:aspect-[21/7]">
                <Image
                  src={campaign.image}
                  alt={campaign.title}
                  width={1400}
                  height={467}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  quality={60}
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
