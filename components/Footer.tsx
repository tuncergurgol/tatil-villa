import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="mt-auto bg-teal-950 text-teal-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="text-lg font-bold text-white">{siteConfig.name}</h3>
          <p className="mt-2 text-sm text-teal-200/80">{siteConfig.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-teal-200/70">
            {siteConfig.agency}
            <br />
            TÜRSAB No: {siteConfig.tursabNo}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-white">Hızlı Bağlantılar</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/villalar" className="hover:text-white">
                Tüm Villalar
              </Link>
            </li>
            <li>
              <Link href="/villalar?filter=deal" className="hover:text-white">
                Fırsat Villalar
              </Link>
            </li>
            <li>
              <Link href="/#bolgeler" className="hover:text-white">
                Popüler Bölgeler
              </Link>
            </li>
            <li>
              <Link href="/#neden-biz" className="hover:text-white">
                Neden Biz
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">Neden Biz</h4>
          <ul className="mt-4 space-y-2 text-sm text-teal-200/80">
            <li>En İyi Fiyat Garantisi</li>
            <li>Hızlı Rezervasyon</li>
            <li>7/24 Müşteri Desteği</li>
            <li>Güvenli Ödeme</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white">İletişim</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-teal-400" />
              <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {siteConfig.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-teal-400" />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
              <span>İstanbul, Türkiye</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-teal-300/60">
        © {new Date().getFullYear()} {siteConfig.name}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
