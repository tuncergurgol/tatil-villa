"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import AdminNavIcon from "@/components/admin/AdminNavIcon";
import AdminSignOut from "@/components/admin/AdminSignOut";
import { useAdminMobileNav } from "@/components/admin/mobile/AdminMobileNavContext";
import {
  frameTitle,
  getMobileMenuRootItems,
  type MobileMenuFrame,
} from "@/lib/admin-mobile-menu";
import type { NavItem } from "@/lib/admin-nav";

function MenuButton({
  label,
  icon,
  onClick,
  href,
}: {
  label: string;
  icon?: Parameters<typeof AdminNavIcon>[0]["name"];
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.98] active:bg-violet-50";

  const content = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        <AdminNavIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="text-xs font-semibold leading-tight text-slate-800">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function SubmenuRow({
  label,
  icon,
  onClick,
  href,
}: {
  label: string;
  icon?: Parameters<typeof AdminNavIcon>[0]["name"];
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-sm transition active:bg-violet-50";

  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-violet-600">
        <AdminNavIcon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
        {label}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

function renderSectionItems(
  items: NavItem[],
  pushFrame: (frame: MobileMenuFrame) => void,
  router: ReturnType<typeof useRouter>
) {
  return items.map((item) => {
    if (item.items?.length) {
      return (
        <SubmenuRow
          key={item.label}
          label={item.label}
          icon={item.icon}
          onClick={() =>
            pushFrame({
              type: "nested",
              label: item.label,
              icon: item.icon,
              items: item.items!,
            })
          }
        />
      );
    }

    if (!item.href) return null;

    return (
      <SubmenuRow
        key={item.href}
        label={item.label}
        icon={item.icon}
        href={item.href}
        onClick={() => router.push(item.href!)}
      />
    );
  });
}

export default function AdminMobileMenu() {
  const router = useRouter();
  const { menuStack, pushSection } = useAdminMobileNav();
  const currentFrame = menuStack[menuStack.length - 1] ?? { type: "root" as const };
  const rootItems = getMobileMenuRootItems();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200/80 bg-white px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">
          Bont Admin
        </p>
        <h1
          data-no-page-refresh
          className="mt-0.5 text-xl font-bold text-slate-900"
        >
          {frameTitle(currentFrame)}
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {currentFrame.type === "root" ? (
          <div className="grid grid-cols-2 gap-3">
            {rootItems.map((section) => {
              const singleLink =
                section.items.length === 1 && section.items[0]?.href
                  ? section.items[0]
                  : null;

              if (singleLink && !section.items[0]?.items) {
                return (
                  <MenuButton
                    key={section.label}
                    label={section.label}
                    icon={section.icon ?? singleLink.icon}
                    href={singleLink.href}
                  />
                );
              }

              return (
                <MenuButton
                  key={section.label}
                  label={section.label}
                  icon={section.icon}
                  onClick={() =>
                    pushSection({ type: "section", section })
                  }
                />
              );
            })}
          </div>
        ) : currentFrame.type === "section" ? (
          <div className="space-y-2">
            {renderSectionItems(
              currentFrame.section.items,
              pushSection,
              router
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {currentFrame.items.map((item) => (
              <SubmenuRow
                key={item.href}
                label={item.label}
                icon={item.icon}
                href={item.href}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/80 bg-white px-4 py-3">
        <AdminSignOut collapsed={false} />
      </div>
    </div>
  );
}
