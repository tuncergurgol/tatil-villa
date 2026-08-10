"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import HeaderVillaSearch from "@/components/HeaderVillaSearch";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Link } from "@/lib/i18n/navigation";
import { siteConfig } from "@/lib/data";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

const defaultNavHrefs = [
  "/villalar",
  "/villalar?filter=deal",
  "/#bolgeler",
  "/#kampanyalar",
  "/sadakat",
] as const;

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

const memberLinkClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3";

function MemberLoginLink({
  className = "",
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <Link href="/uye" className={`${memberLinkClass} ${className}`}>
      <UserRound className="h-3.5 w-3.5 text-slate-600" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

export default function Header({
  navLinks,
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
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");
  const resolvedNavLinks = useMemo<NavLink[]>(
    () =>
      navLinks ?? [
        { href: defaultNavHrefs[0], label: t("villas") },
        { href: defaultNavHrefs[1], label: t("deals") },
        { href: defaultNavHrefs[2], label: t("regions") },
        { href: defaultNavHrefs[3], label: t("campaigns") },
        { href: defaultNavHrefs[4], label: t("loyalty") },
      ],
    [navLinks, t]
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const rawPhone = phone.trim() || siteConfig.phone;
  const displayPhone = displayPhoneLabel(rawPhone);
  const waHref = whatsappHref(rawPhone);
  const logoSrc = logoUrl?.trim() || (useDefaultLogo ? DEFAULT_LOGO : "");
  const agencyLine = `${agencyName?.trim() || siteConfig.agency} — TÜRSAB No: ${tursabNo?.trim() || siteConfig.tursabNo}`;
  const mobileLogoClass = {
    tatildeyiz: "h-11 max-w-[148px]",
    "balayi-villacisi": "h-10 max-w-[76px]",
    "tatil-villacisi": "h-10 max-w-[170px]",
  }[siteKey];

  const whatsAppButtonClass =
    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20BD5A] sm:text-sm";

  return (
    <header className="relative z-50 sticky top-0 border-b border-gray-200 bg-white text-gray-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-1.5 md:gap-3 md:px-6 md:py-2 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 max-w-[calc(100%-2.75rem)] shrink-0 flex-col gap-0 leading-tight md:max-w-none"
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={brandName}
              width={504}
              height={130}
              className={`w-auto object-contain object-left md:h-[4.25rem] md:max-w-[360px] lg:h-[4.75rem] lg:max-w-[420px] ${mobileLogoClass}`}
              priority
            />
          ) : (
            <span className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {brandName}
            </span>
          )}
          <span className="max-w-[220px] truncate text-[9px] leading-snug text-gray-500 md:max-w-none md:text-[10px]">
            {agencyLine}
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-4 xl:flex">
          {resolvedNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-normal text-gray-800 transition hover:text-sky-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 flex-col gap-1.5 md:flex md:w-[272px] lg:w-[320px] xl:w-[340px]">
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={whatsAppButtonClass}
              aria-label={`WhatsApp ile yazın: ${displayPhone}`}
            >
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-white" />
              <span className="truncate">{displayPhone}</span>
            </a>
            <MemberLoginLink label={tHeader("memberLogin")} />
            <LanguageSwitcher />
          </div>
          <HeaderVillaSearch className="w-full" compact />
        </div>

        <button
          type="button"
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={tHeader("menu")}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        id="header-villa-search-section"
        className="border-t border-gray-100 bg-slate-50/80 px-4 py-2 md:hidden"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={whatsAppButtonClass}
              aria-label={`WhatsApp ile yazın: ${displayPhone}`}
            >
              <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-white" />
              <span className="truncate">{displayPhone}</span>
            </a>
            <MemberLoginLink label={tHeader("memberLogin")} />
            <LanguageSwitcher />
          </div>
          <HeaderVillaSearch className="w-full" compact />
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {resolvedNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-normal text-gray-800 hover:bg-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
