import Image from "next/image";
import type { ReactNode } from "react";

export default function CampaignLandingHero({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[280px] sm:min-h-[360px]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={70}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="relative mx-auto flex min-h-[280px] max-w-5xl flex-col justify-end px-4 py-10 sm:min-h-[360px] sm:px-6 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">
            {eyebrow}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold text-white drop-shadow sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-lg">
            {subtitle}
          </p>
          {actions ? (
            <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
