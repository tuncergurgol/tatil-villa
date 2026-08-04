"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import HeaderVillaSearch from "@/components/HeaderVillaSearch";
import { siteConfig } from "@/lib/data";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

const defaultNavLinks = [
  { href: "/villalar", label: "Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsatlar" },
  { href: "/#bolgeler", label: "Bölgeler" },
  { href: "/#kampanyalar", label: "Kampanyalar" },
  { href: "/sadakat", label: "Sadakat Programı" },
];

type NavLink = { href: string; label: string };

function whatsappHref(phone: string) {
  const normalized =
    normalizeStoredTurkishPhone(phone) ||
    normalizePhoneToE164(phone) ||
    phone;
  const recipient = toWhatsAppRecipient(normalizePhoneToE164(normalized));
  return recipient ? `https://wa.me/${recipient}` : "#";
}

function displayPhoneLabel(phone: string) {
  const formatted = formatStoredTurkishPhoneDisplay(phone);
  return formatted === "-" ? phone : formatted;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const DEFAULT_LOGO = "/uploads/company/logo-1783080885848.svg";

export default function Header({
  navLinks = defaultNavLinks,
  phone = siteConfig.phone,
  brandName = siteConfig.name,
  logoUrl,
  useDefaultLogo = true,
  siteKey = "tatildeyiz",
  agencyName = siteConfig.agency,
  tursabNo = siteConfig.tursabNo,
}: {
  navLinks?: NavLink[];
  phone?: string;
  brandName?: string;
  logoUrl?: string;
  useDefaultLogo?: boolean;
  siteKey?: "tatildeyiz" | "balayi-villacisi" | "tatil-villacisi";
  whiteLogoUrl?: string;
  agencyName?: string;
  tursabNo?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const rawPhone = phone.trim() || siteConfig.phone;
  const displayPhone = displayPhoneLabel(rawPhone);
  const waHref = whatsappHref(rawPhone);
  const logoSrc = logoUrl?.trim() || (useDefaultLogo ? DEFAULT_LOGO : "");
  const agencyLine = `${agencyName?.trim() || siteConfig.agency} — TÜRSAB No: ${tursabNo?.trim() || siteConfig.tursabNo}`;
  const mobileLogoClass = {
    tatildeyiz: "h-14 max-w-[165px]",
    "balayi-villacisi": "h-12 max-w-[84px]",
    "tatil-villacisi": "h-12 max-w-[190px]",
  }[siteKey];

  return (
    <header className="relative z-50 border-b border-gray-200 bg-white text-gray-900 shadow-sm sticky top-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:gap-4 md:px-6 md:py-3.5 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 max-w-[calc(100%-3.25rem)] shrink-0 flex-col gap-0 leading-tight md:max-w-none md:gap-0.5"
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={brandName}
              width={504}
              height={130}
              className={`w-auto object-contain object-left md:h-[5.85rem] md:max-w-[504px] ${mobileLogoClass}`}
              priority
            />
          ) : (
            <span className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {brandName}
            </span>
          )}
          <span className="max-w-[245px] truncate text-[9px] leading-snug text-gray-500 md:max-w-none md:text-[11px]">
            {agencyLine}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-normal text-gray-800 transition hover:text-sky-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex lg:max-w-lg xl:max-w-md">
          <HeaderVillaSearch className="w-full max-w-[340px]" />
          <Link
            href="/uye"
            className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Üye Girişi
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20BD5A]"
            aria-label={`WhatsApp ile yazın: ${displayPhone}`}
          >
            <WhatsAppIcon className="h-4 w-4 text-white" />
            {displayPhone}
          </a>
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menü"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        id="header-villa-search-section"
        className="border-t border-gray-100 px-4 pb-3 pt-2 md:hidden"
      >
        <HeaderVillaSearch className="w-full" />
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-[15px] font-normal text-gray-800 hover:bg-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/uye"
              className="rounded-xl px-3 py-2.5 text-[15px] font-semibold text-teal-700 hover:bg-teal-50"
              onClick={() => setMobileOpen(false)}
            >
              Üye Girişi
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white"
              aria-label={`WhatsApp ile yazın: ${displayPhone}`}
            >
              <WhatsAppIcon className="h-4 w-4 text-white" />
              {displayPhone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
