"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import AdminNavIconView from "./AdminNavIcon";
import AdminSignOut from "./AdminSignOut";
import {
  adminAgencyNav,
  adminNavSections,
  type AdminNavIcon,
  type NavItem,
  type NavLink,
} from "@/lib/admin-nav";

function NavIcon({
  name,
  className = "h-4 w-4",
}: {
  name?: AdminNavIcon;
  className?: string;
}) {
  return <AdminNavIconView name={name} className={className} />;
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemHasActiveChild(pathname: string, item: NavItem) {
  if (item.href) return isPathActive(pathname, item.href);
  return item.items?.some((sub) => isPathActive(pathname, sub.href)) ?? false;
}

function sectionHasActiveChild(
  pathname: string,
  items: NavItem[] | undefined
) {
  return items?.some((item) => itemHasActiveChild(pathname, item)) ?? false;
}

type AnchorRect = { top: number; left: number; width: number; height: number };

function rectFromEl(el: HTMLElement | null): AnchorRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Collapsed rail: label/flyout sidebar overflow’undan bağımsız (portal + fixed) */
function FloatingPortal({
  anchor,
  children,
  className,
  style,
}: {
  anchor: AnchorRect;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: "fixed",
        top: anchor.top + anchor.height / 2,
        left: anchor.left + anchor.width + 8,
        transform: "translateY(-50%)",
        zIndex: 9999,
        ...style,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

function IconTooltip({
  label,
  anchor,
}: {
  label: string;
  anchor: AnchorRect | null;
}) {
  if (!anchor) return null;

  return (
    <FloatingPortal
      anchor={anchor}
      className="pointer-events-none whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-md"
    >
      <span role="tooltip">{label}</span>
    </FloatingPortal>
  );
}

function useAnchorFollow(
  elRef: RefObject<HTMLElement | null>,
  active: boolean,
  anchor: AnchorRect | null,
  setAnchor: (next: AnchorRect | null) => void
) {
  useEffect(() => {
    if (!active || !anchor) return;
    const update = () => setAnchor(rectFromEl(elRef.current));
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, anchor, elRef, setAnchor]);
}

function CollapsedFlyout({
  label,
  icon,
  active,
  children,
}: {
  label: string;
  icon?: AdminNavIcon;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const clearClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearClose();
    setAnchor(rectFromEl(btnRef.current));
    setOpen(true);
  }, [clearClose]);

  const scheduleClose = useCallback(() => {
    clearClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setAnchor(null);
    }, 120);
  }, [clearClose]);

  useAnchorFollow(btnRef, open, anchor, setAnchor);

  useEffect(() => () => clearClose(), [clearClose]);

  return (
    <div className="relative" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            setAnchor(null);
          } else {
            openNow();
          }
        }}
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition ${
          active
            ? "bg-violet-100 text-violet-700"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        <NavIcon name={icon} className="h-[18px] w-[18px]" />
      </button>
      {open && anchor && (
        <FloatingPortal
          anchor={anchor}
          className="w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60"
          style={{
            top: Math.min(
              anchor.top,
              typeof window !== "undefined"
                ? window.innerHeight - 24
                : anchor.top
            ),
            transform: "none",
          }}
        >
          <div onMouseEnter={openNow} onMouseLeave={scheduleClose}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <div className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              {children}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

function CollapsedIconLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon?: AdminNavIcon;
  active: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const show = useCallback(() => {
    setAnchor(rectFromEl(ref.current));
  }, []);

  const hide = useCallback(() => {
    setAnchor(null);
  }, []);

  useAnchorFollow(ref, Boolean(anchor), anchor, setAnchor);

  return (
    <>
      <Link
        ref={ref}
        href={href}
        title={label}
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition ${
          active
            ? "bg-violet-100 text-violet-700"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        <NavIcon name={icon ?? "home"} className="h-[18px] w-[18px]" />
      </Link>
      <IconTooltip label={label} anchor={anchor} />
    </>
  );
}

function NavLinkItem({
  href,
  label,
  icon,
  collapsed,
  indent = "pl-9",
  dense = false,
}: {
  href: string;
  label: string;
  icon?: AdminNavIcon;
  collapsed?: boolean;
  indent?: string;
  dense?: boolean;
}) {
  const pathname = usePathname();
  const active = isPathActive(pathname, href);

  if (collapsed) {
    return (
      <CollapsedIconLink
        href={href}
        label={label}
        icon={icon}
        active={active}
      />
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg py-2 pr-3 text-sm transition ${indent} ${
        dense ? "pl-3" : ""
      } ${
        active
          ? "bg-violet-100/80 font-medium text-violet-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon && dense && (
        <NavIcon name={icon} className="h-4 w-4 shrink-0 opacity-70" />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavNestedGroup({
  label,
  icon,
  items,
}: {
  label: string;
  icon?: AdminNavIcon;
  items: NavLink[];
}) {
  const pathname = usePathname();
  const hasActiveChild = items.some((item) => isPathActive(pathname, item.href));
  // Default closed; only auto-open when a child route is active.
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg py-2 pl-9 pr-3 text-sm transition ${
          hasActiveChild
            ? "font-medium text-violet-800"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon && <NavIcon name={icon} className="h-3.5 w-3.5 shrink-0 opacity-70" />}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-slate-200 ml-6 pl-2">
          {items.map((item) => (
            <NavLinkItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
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
  icon,
  items,
  defaultOpen = false,
  collapsed,
}: {
  label: string;
  icon?: AdminNavIcon;
  items: NavItem[];
  /** When unset/false, groups start collapsed (defaultClosed). */
  defaultOpen?: boolean;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const hasActiveChild = sectionHasActiveChild(pathname, items);
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <CollapsedFlyout label={label} icon={icon} active={hasActiveChild}>
        {items.map((item) =>
          item.items ? (
            <div key={item.label} className="space-y-0.5">
              <p className="px-2 pt-1 text-[11px] font-medium text-slate-400">
                {item.label}
              </p>
              {item.items.map((sub) => (
                <NavLinkItem
                  key={sub.href}
                  href={sub.href}
                  label={sub.label}
                  icon={sub.icon}
                  indent="pl-3"
                  dense
                />
              ))}
            </div>
          ) : (
            <NavLinkItem
              key={item.href}
              href={item.href!}
              label={item.label}
              icon={item.icon}
              indent="pl-3"
              dense
            />
          )
        )}
      </CollapsedFlyout>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 ${
          hasActiveChild ? "text-violet-800" : "text-slate-800"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <NavIcon name={icon} className="h-4 w-4 shrink-0 text-violet-500/80" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) =>
            item.items ? (
              <NavNestedGroup
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.items}
              />
            ) : (
              <NavLinkItem
                key={item.href}
                href={item.href!}
                label={item.label}
                icon={item.icon}
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
  const toggleId = useId();
  // Menü her sayfa yüklemesinde kapalı başlar; kullanıcı istediğinde açar.
  // Tercih kalıcı olarak saklanmaz (localStorage yok) — yenilemede yine kapanır.
  const [collapsed, setCollapsed] = useState(true);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-slate-200/90 bg-[#f4f5f7] text-slate-700 transition-[width] duration-200 ease-out md:flex ${
        collapsed ? "w-[4.25rem]" : "w-64"
      }`}
      data-collapsed={collapsed ? "true" : "false"}
    >
      <div
        className={`border-b border-slate-200/90 ${
          collapsed ? "px-2 py-3" : "p-4"
        }`}
      >
        <div
          className={`flex items-center ${
            collapsed ? "flex-col gap-2" : "justify-between gap-2"
          }`}
        >
          <Link
            href="/admin"
            className={`flex items-center font-semibold text-slate-800 ${
              collapsed ? "justify-center" : "gap-2"
            }`}
            title="Admin Panel"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100/90 text-violet-600">
              <Building2 className="h-[18px] w-[18px]" />
            </span>
            {!collapsed && <span className="truncate">Admin Panel</span>}
          </Link>
          <button
            id={toggleId}
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-800"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
        {!collapsed && (
          <Link
            href="/"
            className="mt-2 block text-xs text-slate-500 transition hover:text-violet-600"
          >
            Siteye Dön →
          </Link>
        )}
      </div>

      <nav
        className={`flex-1 space-y-1 overflow-y-auto overflow-x-visible ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        {adminNavSections.map((section) =>
          section.items ? (
            <NavGroupSection
              key={section.label}
              label={section.label}
              icon={section.icon}
              items={section.items}
              defaultOpen={false}
              collapsed={collapsed}
            />
          ) : collapsed ? (
            <NavLinkItem
              key={section.label}
              href={section.href!}
              label={section.label}
              icon={section.icon}
              collapsed
            />
          ) : (
            <Link
              key={section.label}
              href={section.href!}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isPathActive(pathname, section.href!)
                  ? "bg-violet-100/80 text-violet-800"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <NavIcon
                name={section.icon}
                className="h-4 w-4 shrink-0 text-violet-500/80"
              />
              <span className="truncate">{section.label}</span>
            </Link>
          )
        )}

        <div
          className={`my-3 border-t border-slate-200/90 ${
            collapsed ? "mx-1" : ""
          }`}
        />

        <NavGroupSection
          label={adminAgencyNav.label}
          icon={adminAgencyNav.icon}
          items={adminAgencyNav.items}
          defaultOpen={false}
          collapsed={collapsed}
        />
      </nav>

      <div
        className={`border-t border-slate-200/90 ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        <AdminSignOut collapsed={collapsed} />
      </div>
    </aside>
  );
}
