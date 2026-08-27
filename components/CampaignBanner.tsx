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

        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
          {items.map((campaign) => (
            <article
              key={campaign.id}
              className="relative w-[88%] min-w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-auto sm:min-w-0"
            >
              <Link href={campaign.href} className="block">
                <div className="relative aspect-[16/9] min-h-[180px]">
                  <Image
                    src={campaign.image}
                    alt={campaign.title}
                    width={800}
                    height={450}
                    className="h-full w-full object-cover"
                    sizes="(max-width: 640px) 88vw, (max-width: 1280px) 50vw, 640px"
                    quality={70}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6">
                    <h3 className="max-w-md text-xl font-bold text-white drop-shadow sm:text-2xl">
                      {campaign.title}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-sm text-white/90 drop-shadow">
                      {campaign.subtitle}
                    </p>
                    <span className="mt-4 inline-flex w-fit rounded-full bg-white px-5 py-2 text-sm font-bold text-teal-800 shadow-md">
                      {campaign.cta}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
