import {
  Building2,
  FileText,
  Landmark,
  Mail,
  RotateCcw,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type CorporateNavItem = {
  slug: string;
  label: string;
  icon: LucideIcon;
};

const CORPORATE_MENU_ICONS: Record<string, LucideIcon> = {
  hakkimizda: Building2,
  iletisim: Mail,
  "banka-bilgilerimiz": Landmark,
  "online-rezervasyon-sozlesmesi": FileText,
  "iptal-ve-iade-kosullari": RotateCcw,
  "gizlilik-politikasi": Shield,
};

export function getCorporateMenuIcon(slug: string): LucideIcon {
  return CORPORATE_MENU_ICONS[slug] ?? FileText;
}
