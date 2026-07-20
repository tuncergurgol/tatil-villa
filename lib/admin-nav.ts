export type AdminNavIcon =
  | "bed"
  | "search"
  | "calendar-check"
  | "home"
  | "calendar"
  | "list-tree"
  | "settings"
  | "users"
  | "user"
  | "bar-chart"
  | "file-check"
  | "compass"
  | "bus"
  | "car"
  | "ticket"
  | "building"
  | "import"
  | "message-circle"
  | "message-square"
  | "shield"
  | "newspaper"
  | "chart"
  | "megaphone"
  | "phone";

export interface NavLink {
  label: string;
  href: string;
  icon?: AdminNavIcon;
}

export interface NavItem {
  label: string;
  href?: string;
  icon?: AdminNavIcon;
  items?: NavLink[];
}

export interface NavGroup {
  label: string;
  icon?: AdminNavIcon;
  items: NavItem[];
}

export interface NavSection {
  label: string;
  href?: string;
  icon?: AdminNavIcon;
  items?: NavItem[];
}

export const tanimlamalarNav: NavLink[] = [
  { label: "Bölgeler", href: "/admin/bolgeler", icon: "home" },
  {
    label: "Villa Sahipleri",
    href: "/admin/tanimlamalar/villa-sahipleri",
    icon: "users",
  },
  {
    label: "Ev Kategorileri",
    href: "/admin/tanimlamalar/villa-kategorileri",
    icon: "list-tree",
  },
  {
    label: "Villa Olanakları",
    href: "/admin/tanimlamalar/villa-olanaklari",
    icon: "list-tree",
  },
  {
    label: "Fiyata Dahil / Değil",
    href: "/admin/tanimlamalar/fiyata-dahil",
    icon: "file-check",
  },
  {
    label: "Çevre ve Konum",
    href: "/admin/tanimlamalar/cevre-konum",
    icon: "compass",
  },
];

export const adminNavSections: NavSection[] = [
  {
    label: "Konaklama",
    icon: "bed",
    items: [
      { label: "Uygunluk Ara", href: "/admin/konaklama/uygunluk", icon: "search" },
      {
        label: "Rezervasyonlar",
        href: "/admin/rezervasyonlar",
        icon: "calendar-check",
      },
      { label: "Evler", href: "/admin/villalar", icon: "home" },
      { label: "Takvim", href: "/admin/konaklama/takvim", icon: "calendar" },
      { label: "Tanımlamalar", icon: "list-tree", items: tanimlamalarNav },
      {
        label: "Ayarlar",
        icon: "settings",
        items: [
          {
            label: "Özellikleri Aktar",
            href: "/admin/konaklama/ayarlar/ozellikleri-aktar",
            icon: "import",
          },
          {
            label: "Genel Ayarlar",
            href: "/admin/konaklama/ayarlar",
            icon: "settings",
          },
        ],
      },
    ],
  },
  { label: "Tur & Aktiviteler", href: "/admin/tur", icon: "compass" },
  {
    label: "Transfer",
    icon: "bus",
    items: [
      {
        label: "Araç Tipleri",
        href: "/admin/transfer/arac-tipleri",
        icon: "car",
      },
      {
        label: "Rotalar",
        href: "/admin/transfer/rotalar",
        icon: "compass",
      },
      {
        label: "Seferler",
        href: "/admin/transfer/seferler",
        icon: "bus",
      },
    ],
  },
  {
    label: "Araç Kiralama",
    icon: "car",
    items: [
      {
        label: "Arama Çubuğu",
        href: "/admin/arac-kiralama/arama-cubugu",
        icon: "search",
      },
      {
        label: "Araç Türleri",
        href: "/admin/arac-kiralama/kategoriler",
        icon: "car",
      },
      {
        label: "Teslim / İade Noktaları",
        href: "/admin/arac-kiralama/noktalar",
        icon: "compass",
      },
      {
        label: "Sürücü Kriterleri",
        href: "/admin/arac-kiralama/surucu-kriterleri",
        icon: "file-check",
      },
    ],
  },
  { label: "Obilet", href: "/admin/obilet", icon: "ticket" },
  {
    label: "Müşteri Yönetimi",
    icon: "users",
    items: [
      {
        label: "Müşteri Listesi",
        href: "/admin/musteri-yonetimi",
        icon: "user",
      },
    ],
  },
  {
    label: "Raporlar",
    icon: "bar-chart",
    items: [
      {
        label: "Aylık İlan Raporu",
        href: "/admin/raporlar/aylik-ilan",
        icon: "chart",
      },
      {
        label: "Belge Kontrol",
        href: "/admin/raporlar/belge-kontrol",
        icon: "file-check",
      },
      {
        label: "BTRANS Bildirimi (538)",
        href: "/admin/raporlar/btrans-bildirim",
        icon: "file-check",
      },
      {
        label: "Fatura Raporları",
        href: "/admin/raporlar/fatura-raporlari",
        icon: "file-check",
      },
      {
        label: "Ev Sahibi Ödemeleri",
        href: "/admin/raporlar/ev-sahibi-odemeleri",
        icon: "file-check",
      },
    ],
  },
];

export const adminAgencyNav: NavGroup = {
  label: "Acente Yönetimi",
  icon: "building",
  items: [
    { label: "Şirket", href: "/admin/acente/sirket", icon: "building" },
    {
      label: "Takvim Import",
      href: "/admin/acente/takvim-import",
      icon: "import",
    },
    {
      label: "Takvim/Fiyat Aktarım",
      href: "/admin/acente/takvim-fiyat-aktarim",
      icon: "calendar",
    },
    {
      label: "Takvim WhatsApp",
      href: "/admin/acente/evolution-whatsapp",
      icon: "message-circle",
    },
    {
      label: "Bildirim WhatsApp",
      href: "/admin/acente/bildirim-whatsapp",
      icon: "message-circle",
    },
    {
      label: "Mesaj İçeriği",
      href: "/admin/acente/mesaj-icerigi",
      icon: "message-square",
    },
    { label: "Kullanıcılar", href: "/admin/acente/kullanicilar", icon: "users" },
    { label: "İçerik Yönetimi", href: "/admin/icerik", icon: "newspaper" },
    {
      label: "Kampanyalar",
      href: "/admin/acente/kampanyalar",
      icon: "megaphone",
    },
    {
      label: "Sizi Arayalım",
      href: "/admin/acente/sizi-arayalim",
      icon: "phone",
    },
    {
      label: "Güvenlik & Log",
      href: "/admin/acente/guvenlik",
      icon: "shield",
    },
  ],
};
