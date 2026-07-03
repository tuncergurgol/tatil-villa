export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href?: string;
  items?: NavLink[];
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export interface NavSection {
  label: string;
  href?: string;
  items?: NavItem[];
}

export const tanimlamalarNav: NavLink[] = [
  { label: "Bölgeler", href: "/admin/bolgeler" },
  { label: "Villa Sahipleri", href: "/admin/tanimlamalar/villa-sahipleri" },
  { label: "Villa Kategorileri", href: "/admin/tanimlamalar/villa-kategorileri" },
  { label: "Villa Olanakları", href: "/admin/tanimlamalar/villa-olanaklari" },
  { label: "Çevre Konum", href: "/admin/tanimlamalar/cevre-konum" },
];

export const adminNavSections: NavSection[] = [
  {
    label: "Konaklama",
    items: [
      { label: "Uygunluk Ara", href: "/admin/konaklama/uygunluk" },
      { label: "Rezervasyonlar", href: "/admin/rezervasyonlar" },
      { label: "Tesisler", href: "/admin/villalar" },
      { label: "Takvim", href: "/admin/konaklama/takvim" },
      { label: "Tanımlamalar", items: tanimlamalarNav },
      { label: "Ayarlar", href: "/admin/konaklama/ayarlar" },
    ],
  },
  { label: "Tur & Aktiviteler", href: "/admin/tur-aktiviteler" },
  { label: "Transfer", href: "/admin/transfer" },
  { label: "Araç Kiralama", href: "/admin/arac-kiralama" },
  { label: "Obilet", href: "/admin/obilet" },
];

export const adminAgencyNav: NavGroup = {
  label: "Acente Yönetimi",
  items: [
    { label: "Şirket", href: "/admin/acente/sirket" },
    { label: "Kullanıcılar", href: "/admin/acente/kullanicilar" },
    { label: "Site İçeriği", href: "/admin/acente/site-icerigi" },
    { label: "Güvenlik & Log", href: "/admin/acente/guvenlik" },
  ],
};
