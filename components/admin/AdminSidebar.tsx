"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import AdminSignOut from "./AdminSignOut";
import {
  adminAgencyNav,
  adminNavSections,
  type NavItem,
  type NavLink,
} from "@/lib/admin-nav";

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinkItem({
  href,
  label,
  indent = "pl-9",
}: {
  href: string;
  label: string;
  indent?: string;
}) {
  const pathname = usePathname();
  const active = isPathActive(pathname, href);

  return (
    <Link
      href={href}
      className={`block rounded-lg py-2 pr-3 text-sm transition ${indent} ${
        active
          ? "bg-white/15 font-medium text-white"
          : "text-teal-100/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function NavNestedGroup({ label, items }: { label: string; items: NavLink[] }) {
  const pathname = usePathname();
  const hasActiveChild = items.some((item) => isPathActive(pathname, item.href));
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-lg py-2 pl-9 pr-3 text-sm transition ${
          hasActiveChild
            ? "font-medium text-white"
            : "text-teal-100/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-white/10 ml-6 pl-2">
          {items.map((item) => (
            <NavLinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              indent="pl-6"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavGroupSection({
  label,
  items,
  defaultOpen = true,
}: {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const hasActiveChild = items.some((item) => {
    if (item.href) return isPathActive(pathname, item.href);
    return item.items?.some((sub) => isPathActive(pathname, sub.href));
  });
  const [open, setOpen] = useState(defaultOpen || hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) =>
            item.items ? (
              <NavNestedGroup
                key={item.label}
                label={item.label}
                items={item.items}
              />
            ) : (
              <NavLinkItem
                key={item.href}
                href={item.href!}
                label={item.label}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-teal-950 text-white">
      <div className="border-b border-white/10 p-5">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <Building2 className="h-5 w-5" />
          Admin Panel
        </Link>
        <Link href="/" className="mt-1 block text-xs text-teal-300 hover:text-white">
          Siteye Dön →
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNavSections.map((section) =>
          section.items ? (
            <NavGroupSection
              key={section.label}
              label={section.label}
              items={section.items}
            />
          ) : (
            <Link
              key={section.label}
              href={section.href!}
              className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isPathActive(pathname, section.href!)
                  ? "bg-white/15 text-white"
                  : "text-teal-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {section.label}
            </Link>
          )
        )}

        <div className="my-3 border-t border-white/15" />

        <NavGroupSection
          label={adminAgencyNav.label}
          items={adminAgencyNav.items}
        />
      </nav>

      <div className="border-t border-white/10 p-3">
        <AdminSignOut />
      </div>
    </aside>
  );
}
