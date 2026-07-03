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
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
            <p className="mt-1 text-gray-600">{subtitle}</p>
          </div>
          <Link
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-teal-700 transition hover:text-teal-900 sm:flex"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {villas.map((villa) => (
            <VillaCard key={villa.id} villa={villa} />
          ))}
        </div>

        <Link
          href={viewAllHref}
          className="mt-6 flex items-center justify-center gap-1 text-sm font-semibold text-teal-700 sm:hidden"
        >
          Tümünü Gör
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
