"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { siteConfig } from "@/lib/data";

const navLinks = [
  { href: "/villalar", label: "Villalar" },
  { href: "/villalar?filter=deal", label: "Fırsatlar" },
  { href: "/#bolgeler", label: "Bölgeler" },
  { href: "/#kampanyalar", label: "Kampanyalar" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-teal-950/95 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            {siteConfig.name}
          </span>
          <span className="text-xs text-teal-200/80">{siteConfig.tagline}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-teal-50/90 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold transition hover:bg-teal-500"
          >
            <Phone className="h-4 w-4" />
            {siteConfig.phone}
          </a>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menü"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
              className="mt-2 flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold"
            >
              <Phone className="h-4 w-4" />
              {siteConfig.phone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
