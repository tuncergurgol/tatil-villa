"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import HeaderVillaSearch from "@/components/HeaderVillaSearch";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Link } from "@/lib/i18n/navigation";
import { siteConfig } from "@/lib/data";
import {
  HEADER_VILLA_SEARCH_INPUT_ID,
  HEADER_VILLA_SEARCH_SECTION_ID,
  MOBILE_VILLA_SEARCH_OPEN_EVENT,
} from "@/lib/mobile-villa-search";

const defaultNavHrefs = [
  "/villalar",
  "/villalar?filter=deal",
  "/#bolgeler",
  "/#kampanyalar",
  "/sadakat",
] as const;

type NavLink = { href: string; label: string };

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
  brandName = siteConfig.name,
  logoUrl,
  useDefaultLogo = true,
  siteKey = "tatildeyiz",
  agencyName = siteConfig.agency,
  tursabNo = siteConfig.tursabNo,
}: {
  navLinks?: NavLink[];
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
  const focusSearchAfterOpenRef = useRef(false);
  const logoSrc = logoUrl?.trim() || (useDefaultLogo ? DEFAULT_LOGO : "");
  const agencyLine = `${agencyName?.trim() || siteConfig.agency} — TÜRSAB No: ${tursabNo?.trim() || siteConfig.tursabNo}`;
  const mobileLogoClass = {
    tatildeyiz: "h-11 max-w-[148px]",
    "balayi-villacisi": "h-10 max-w-[76px]",
    "tatil-villacisi": "h-10 max-w-[170px]",
  }[siteKey];

  useEffect(() => {
    function handleOpenSearch() {
      focusSearchAfterOpenRef.current = true;
      setMobileOpen(true);
    }
    window.addEventListener(MOBILE_VILLA_SEARCH_OPEN_EVENT, handleOpenSearch);
    return () =>
      window.removeEventListener(
        MOBILE_VILLA_SEARCH_OPEN_EVENT,
        handleOpenSearch
      );
  }, []);

  useEffect(() => {
    if (!mobileOpen || !focusSearchAfterOpenRef.current) return;
    focusSearchAfterOpenRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const input = document.getElementById(
        HEADER_VILLA_SEARCH_INPUT_ID
      ) as HTMLInputElement | null;
      input?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileOpen]);

  return (
    <header
      className={`relative z-50 sticky top-0 border-b border-gray-200 bg-white text-gray-900 shadow-sm md:h-[6.75rem] md:overflow-visible ${
        mobileOpen
          ? "h-auto overflow-visible"
          : "h-[4.75rem] overflow-hidden md:h-[6.75rem]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-1.5 md:gap-3 md:px-6 md:py-2 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 max-w-[calc(100%-2.75rem)] shrink-0 flex-col gap-0 leading-tight md:max-w-none"
        >
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={brandName}
              width={560}
              height={144}
              className={`w-auto object-contain object-left md:h-[4.25rem] md:max-w-[360px] lg:h-[4.75rem] lg:max-w-[420px] ${mobileLogoClass}`}
              unoptimized={logoSrc.endsWith(".svg")}
              loading="eager"
              fetchPriority="low"
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
          <div className="flex justify-end">
            <MemberLoginLink label={tHeader("memberLogin")} />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <HeaderVillaSearch
              className="min-w-0 flex-1"
              compact
              inputId="header-villa-search-input-desktop"
            />
            <LanguageSwitcher className="shrink-0" />
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={tHeader("menu")}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 px-4 py-3 md:hidden">
          <div
            id={HEADER_VILLA_SEARCH_SECTION_ID}
            className="mb-3"
          >
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {tHeader("searchVilla")}
            </p>
            <HeaderVillaSearch
              className="min-w-0 w-full"
              compact
              onAfterNavigate={() => setMobileOpen(false)}
            />
          </div>
          <div className="mb-2 flex flex-col gap-2 border-b border-gray-100 pb-3">
            <MemberLoginLink
              className="w-full justify-center"
              label={tHeader("memberLogin")}
            />
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">
                {tHeader("language")}
              </span>
              <LanguageSwitcher className="shrink-0" />
            </div>
          </div>
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
