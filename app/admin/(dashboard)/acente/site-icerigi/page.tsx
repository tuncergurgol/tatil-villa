import Link from "next/link";
import { MapPin, Megaphone } from "lucide-react";

const links = [
  {
    href: "/admin/kampanyalar",
    label: "Kampanyalar",
    description: "Ana sayfa kampanya bannerları",
    icon: Megaphone,
  },
  {
    href: "/admin/bolgeler",
    label: "Bölgeler",
    description: "Popüler bölgeler ve tanımlamalar",
    icon: MapPin,
  },
];

export default function SiteIcerigiPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Site İçeriği</h1>
      <p className="mt-1 text-gray-500">Web sitesi içerik yönetimi</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
          >
            <div className="rounded-lg bg-teal-50 p-2">
              <link.icon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{link.label}</h2>
              <p className="mt-1 text-sm text-gray-500">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
