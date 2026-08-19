import Link from "next/link";
import { ArrowRight } from "lucide-react";
import VillaCard from "./VillaCard";
import type { Villa } from "@/lib/types";

interface VillaSectionProps {
  id?: string;
  title: string;
  subtitle: string;
  villas: Villa[];
  viewAllHref?: string;
}

function ViewAllButton({
  href,
  className = "",
}: {
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-800 hover:shadow-md ${className}`}
    >
      Tümünü Gör
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 transition group-hover:translate-x-0.5 group-hover:bg-white/30">
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    </Link>
  );
}

export default function VillaSection({
  id,
  title,
  subtitle,
  villas,
  viewAllHref = "/villalar",
}: VillaSectionProps) {
  if (villas.length === 0) return null;

  return (
    <section id={id} className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-gray-600">{subtitle}</p>
          </div>
          <ViewAllButton href={viewAllHref} className="hidden sm:inline-flex" />
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {villas.map((villa) => (
            <VillaCard key={villa.id} villa={villa} />
          ))}
        </div>

        <div className="mt-6 flex justify-center sm:hidden">
          <ViewAllButton href={viewAllHref} />
        </div>
      </div>
    </section>
  );
}
