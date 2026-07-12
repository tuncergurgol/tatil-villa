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

/** Kurumsal sayfalar arası hızlı geçiş menüsü */
export const CORPORATE_SIDEBAR_NAV: CorporateNavItem[] = [
  { slug: "hakkimizda", label: "Hakkımızda", icon: Building2 },
  { slug: "iletisim", label: "İletişim", icon: Mail },
  { slug: "banka-bilgilerimiz", label: "Banka Hesap Bilgilerimiz", icon: Landmark },
  {
    slug: "online-rezervasyon-sozlesmesi",
    label: "Online Rezervasyon Sözleşmesi",
    icon: FileText,
  },
  {
    slug: "iptal-ve-iade-kosullari",
    label: "İptal İade Koşulları",
    icon: RotateCcw,
  },
  { slug: "gizlilik-politikasi", label: "Gizlilik Politikası", icon: Shield },
];
