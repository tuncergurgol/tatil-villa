import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/data";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";

type FooterLink = { href: string; label: string };

export type FooterContact = {
  phone?: string;
  email?: string;
  address?: string;
  workingHours?: string;
  agencyName?: string;
  tursabNo?: string;
  brandName?: string;
  companyTitle?: string;
  logoUrl?: string;
  useDefaultLogo?: boolean;
  tursabVerificationLogoUrl?: string;
};

export type FooterRegionLink = {
  slug: string;
  name: string;
  label: string;
};

const defaultQuickLinks: FooterLink[] = [
  { href: "/villalar", label: "Tüm Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsat Villalar" },
  { href: "/#bolgeler", label: "Popüler Bölgeler" },
  { href: "/#seyahat-macerasi", label: "Hizmetler" },
  { href: "/rezervasyon-dogrulama", label: "Rezervasyon Doğrulama" },
];

const DEFAULT_LOGO = "/uploads/company/logo-1783080885848.svg";
const DEFAULT_TURSAB_DDS_LOGO = "/uploads/company/tursab-dds-12970.png";
const TURSAB_DDS_VERIFY_URL = "https://www.tursab.org.tr/tr/ddsv";

function telHref(phone: string) {
  const normalized = normalizeStoredTurkishPhone(phone);
  return `tel:${normalized || phone.replace(/[^\d+]/g, "")}`;
}

function displayPhone(phone: string) {
  const formatted = formatStoredTurkishPhoneDisplay(phone);
  return formatted === "-" ? phone : formatted;
}

export default function Footer({
  quickLinks = defaultQuickLinks,
  corporateLinks = [],
  popularRegions = [],
  mahalleRegions = [],
  contact,
}: {
  quickLinks?: FooterLink[];
  corporateLinks?: FooterLink[];
  popularRegions?: FooterRegionLink[];
  mahalleRegions?: FooterRegionLink[];
  contact?: FooterContact;
}) {
  const phone = contact?.phone?.trim() || siteConfig.phone;
  const email = contact?.email?.trim() || siteConfig.email;
  const address = contact?.address?.trim() || "";
  const workingHours = contact?.workingHours?.trim() || "";
  const brandName = contact?.brandName?.trim() || siteConfig.name;
  const agencyName = contact?.agencyName?.trim() || siteConfig.agency;
  const tursabNo = contact?.tursabNo?.trim() || siteConfig.tursabNo;
  const companyTitle = contact?.companyTitle?.trim() || "";
  const logoSrc =
    contact?.logoUrl?.trim() ||
    (contact?.useDefaultLogo === false ? "" : DEFAULT_LOGO);
  const tursabDdsLogo =
    contact?.tursabVerificationLogoUrl?.trim() || DEFAULT_TURSAB_DDS_LOGO;

  return (
    <footer className="mt-auto border-t border-gray-100 bg-white text-gray-600">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Link href="/" className="inline-block">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={brandName}
                width={280}
                height={72}
                className="h-12 w-auto object-contain sm:h-14"
                unoptimized={logoSrc.endsWith(".svg")}
              />
            ) : (
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {brandName}
              </span>
            )}
          </Link>
          {companyTitle ? (
            <p className="mt-3 text-sm font-medium leading-snug text-gray-800">
              {companyTitle}
            </p>
          ) : null}
          <ul className="mt-5 space-y-3 text-sm">
            {phone ? (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-sky-500" />
                <a href={telHref(phone)} className="hover:text-gray-900">
                  {displayPhone(phone)}
                </a>
              </li>
            ) : null}
            {email ? (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-sky-500" />
                <a href={`mailto:${email}`} className="hover:text-gray-900">
                  {email}
                </a>
              </li>
            ) : null}
            {workingHours ? (
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-sky-500" />
                <span>{workingHours}</span>
              </li>
            ) : null}
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                <span>{address}</span>
              </li>
            ) : null}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-gray-400">
            {agencyName}
            <br />
            TÜRSAB No: {tursabNo}
          </p>
          {/*
            TÜRSAB DDS: target=_blank, rel=noreferrer OLMAMALI.
            Doğrulama yalnızca bu logoya tıklanınca referrer ile çalışır.
          */}
          <a
            href={TURSAB_DDS_VERIFY_URL}
            target="_blank"
            className="mt-5 inline-block"
            title="TÜRSAB Dijital Doğrulama Sistemi"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tursabDdsLogo}
              alt={`TÜRSAB Dijital Doğrulama Sistemi — Belge No ${tursabNo}`}
              width={280}
              height={90}
              className="h-auto w-full max-w-[240px] rounded-lg border border-gray-200 bg-white shadow-sm"
            />
          </a>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900">Kurumsal</h4>
          {corporateLinks.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {corporateLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-gray-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-400">Henüz sayfa eklenmedi.</p>
          )}
          <div className="mt-6 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/company/guvenli-odeme-rozetleri.png"
              alt="SSL güvenli bağlantı, %100 güvenli alışveriş, iyzico, Mastercard, Visa, American Express, Troy, Param"
              width={320}
              height={160}
              className="h-auto w-full max-w-[260px] bg-white"
            />
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900">Hızlı Bağlantılar</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-gray-900">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900">Popüler Bölgeler</h4>
          {popularRegions.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {popularRegions.map((region) => (
                <li key={region.slug}>
                  <Link
                    href={`/villalar?region=${encodeURIComponent(region.slug)}&sort=random`}
                    className="hover:text-gray-900"
                  >
                    {region.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-400">Henüz bölge eklenmedi.</p>
          )}
        </div>
      </div>

      {mahalleRegions.length > 0 ? (
        <nav className="sr-only" aria-label="Mahalle kiralık villalar">
          <ul>
            {mahalleRegions.map((region) => (
              <li key={region.slug}>
                <Link
                  href={`/villalar?region=${encodeURIComponent(region.slug)}&sort=random`}
                >
                  {region.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {companyTitle || brandName}. Tüm hakları
        saklıdır.
      </div>
    </footer>
  );
}
