import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  MapPin,
  Users,
} from "lucide-react";
import BookingForm from "@/components/BookingForm";
import { categoryLabel } from "@/lib/utils";
import { getVillaBySlug } from "@/lib/queries/villas";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const villa = await getVillaBySlug(slug);
  if (!villa) return { title: "Villa Bulunamadı" };
  return {
    title: villa.name,
    description: villa.description,
  };
}

export default async function VillaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const villa = await getVillaBySlug(slug);

  if (!villa) notFound();

  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/villalar"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Villalara Dön
        </Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative aspect-[16/10] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[400px]">
            <Image
              src={villa.images[0] ?? villa.image}
              alt={villa.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {villa.images.slice(1, 3).map((img, i) => (
            <div key={i} className="relative hidden aspect-[4/3] sm:block">
              <Image
                src={img}
                alt={`${villa.name} ${i + 2}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8 lg:py-12">
        <div className="lg:col-span-2">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
            {categoryLabel(villa.category)}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            {villa.name}
          </h1>
          <p className="mt-2 flex items-center gap-1 text-gray-600">
            <MapPin className="h-4 w-4" />
            {villa.location}
          </p>

          <div className="mt-6 flex flex-wrap gap-6 rounded-xl border border-gray-100 bg-white p-5">
            <Stat icon={Users} label="Kapasite" value={`${villa.guests} Kişi`} />
            <Stat icon={BedDouble} label="Yatak Odası" value={`${villa.bedrooms}`} />
            <Stat icon={Bath} label="Banyo" value={`${villa.bathrooms}`} />
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Açıklama</h2>
            <p className="mt-3 leading-relaxed text-gray-600">{villa.description}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900">Olanaklar</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {villa.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-2 text-gray-700">
                  <Check className="h-4 w-4 shrink-0 text-teal-600" />
                  {amenity}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <BookingForm
            villaId={villa.id}
            villaName={villa.name}
            maxGuests={villa.guests}
            pricePerNight={villa.pricePerNight}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50">
        <Icon className="h-5 w-5 text-teal-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
