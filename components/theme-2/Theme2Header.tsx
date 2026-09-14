"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Menu, Search, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Link } from "@/lib/i18n/navigation";
import { siteConfig } from "@/lib/data";
import {
  formatStoredTurkishPhoneDisplay,
  normalizeStoredTurkishPhone,
} from "@/lib/phone-utils";
import { normalizePhoneToE164, toWhatsAppRecipient } from "@/lib/phone";

type NavLink = { href: string; label: string };

function whatsappHref(phone: string) {
  const normalized =
    normalizeStoredTurkishPhone(phone) ||
    normalizePhoneToE164(phone) ||
    phone;
  const recipient = toWhatsAppRecipient(normalizePhoneToE164(normalized));
  return recipient ? `https://wa.me/${recipient}` : "#";
}

export default function Theme2Header({
  navLinks,
  phone = siteConfig.phone,
  brandName = siteConfig.name,
  logoUrl,
  agencyName = siteConfig.agency,
  tursabNo = siteConfig.tursabNo,
}: {
  navLinks?: NavLink[];
  phone?: string;
  brandName?: string;
  logoUrl?: string;
  agencyName?: string;
  tursabNo?: string;
}) {
  const t = useTranslations("nav");
  const tHeader = useTranslations("header");
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = useMemo<NavLink[]>(
    () =>
      navLinks ?? [
        { href: "/villalar", label: t("villas") },
        { href: "/#bolgeler", label: t("regions") },
      ],
    [navLinks, t]
  );

  const rawPhone = phone.trim() || siteConfig.phone;
  const displayPhone =
    formatStoredTurkishPhoneDisplay(rawPhone) === "-"
      ? rawPhone
      : formatStoredTurkishPhoneDisplay(rawPhone);
  const waHref = whatsappHref(rawPhone);
  const logoSrc = logoUrl?.trim() || "";

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="bg-[#0E4F46] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 md:px-6 lg:px-8">
          <p className="truncate text-[11px] font-medium tracking-wide text-white/85">
            Türkiye&apos;de glamping, bungalov ve kubbe evleri
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium tracking-wide hover:underline"
          >
            {displayPhone}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={brandName}
              width={280}
              height={60}
              className="h-10 w-auto max-w-[220px] object-contain object-left md:h-12 md:max-w-[280px]"
              loading="eager"
            />
          ) : (
            <span className="text-lg font-bold tracking-tight text-[#0E4F46]">
              {brandName}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-700 transition hover:text-[#0E4F46]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/villalar"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#0E4F46] hover:text-[#0E4F46]"
          >
            <Search className="h-4 w-4" />
            Ara
          </Link>
          <LanguageSwitcher className="shrink-0" />
          <Link
            href="/uye"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0E4F46] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0B3A2E]"
          >
            <UserRound className="h-4 w-4" />
            {tHeader("memberLogin")}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={tHeader("menu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-100 px-4 py-3 md:hidden">
          <div className="mb-3 flex flex-col gap-2">
            <Link
              href="/uye"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0E4F46] px-3 py-2.5 text-sm font-semibold text-white"
              onClick={() => setMobileOpen(false)}
            >
              <UserRound className="h-4 w-4" />
              {tHeader("memberLogin")}
            </Link>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">
                {tHeader("language")}
              </span>
              <LanguageSwitcher />
            </div>
          </div>
          <nav className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 text-[10px] text-slate-500">
            {agencyName} — TÜRSAB No: {tursabNo}
          </p>
        </div>
      ) : null}
    </header>
  );
}
