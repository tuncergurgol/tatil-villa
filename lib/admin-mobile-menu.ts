import {
  adminAgencyNav,
  adminNavSections,
  type AdminNavIcon,
  type NavItem,
  type NavLink,
  type NavSection,
} from "@/lib/admin-nav";

export type MobileMenuRootItem = {
  kind: "section";
  label: string;
  icon?: AdminNavIcon;
  items: NavItem[];
};

export type MobileMenuFrame =
  | { type: "root" }
  | { type: "section"; section: MobileMenuRootItem }
  | { type: "nested"; label: string; icon?: AdminNavIcon; items: NavLink[] };

export function getMobileMenuRootItems(): MobileMenuRootItem[] {
  const sectionItems: MobileMenuRootItem[] = adminNavSections.map((section) => {
    if (section.items) {
      return {
        kind: "section",
        label: section.label,
        icon: section.icon,
        items: section.items,
      };
    }
    return {
      kind: "section",
      label: section.label,
      icon: section.icon,
      items: [{ label: section.label, href: section.href!, icon: section.icon }],
    };
  });

  return [
    ...sectionItems,
    {
      kind: "section",
      label: adminAgencyNav.label,
      icon: adminAgencyNav.icon,
      items: adminAgencyNav.items,
    },
  ];
}

export function frameTitle(frame: MobileMenuFrame): string {
  if (frame.type === "root") return "Menü";
  if (frame.type === "section") return frame.section.label;
  return frame.label;
}

export function isDirectLinkSection(section: NavSection): boolean {
  return Boolean(section.href && !section.items?.length);
}
