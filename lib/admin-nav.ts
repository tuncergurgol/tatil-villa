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
  items: NavItem[];
}

export interface NavSection {
  label: string;
  href?: string;
  items?: NavItem[];
}

export const tanimlamalarNav: NavLink[] = [
  { label: "Bölgeler", href: "/admin/bolgeler" },
  { label: "Villa Sahipleri", href: "/admin/tanimlamalar/villa-sahipleri" },
  { label: "Ev Kategorileri", href: "/admin/tanimlamalar/villa-kategorileri" },
  { label: "Villa Olanakları", href: "/admin/tanimlamalar/villa-olanaklari" },
  { label: "Fiyata Dahil / Değil", href: "/admin/tanimlamalar/fiyata-dahil" },
  { label: "Çevre ve Konum", href: "/admin/tanimlamalar/cevre-konum" },
];

export const adminNavSections: NavSection[] = [
  {
    label: "Konaklama",
    items: [
      { label: "Uygunluk Ara", href: "/admin/konaklama/uygunluk" },
      { label: "Rezervasyonlar", href: "/admin/rezervasyonlar" },
      { label: "Evler", href: "/admin/villalar" },
      { label: "Takvim", href: "/admin/konaklama/takvim" },
      { label: "Tanımlamalar", items: tanimlamalarNav },
      { label: "Ayarlar", href: "/admin/konaklama/ayarlar" },
    ],
  },
  {
    label: "Müşteri Yönetimi",
    items: [{ label: "Müşteri Listesi", href: "/admin/musteri-yonetimi" }],
  },
  {
    label: "Raporlar",
    items: [
      { label: "Aylık İlan Raporu", href: "/admin/raporlar/aylik-ilan" },
      { label: "Belge Kontrol", href: "/admin/raporlar/belge-kontrol" },
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
    { label: "Takvim Import", href: "/admin/acente/takvim-import" },
    { label: "Evolution WhatsApp", href: "/admin/acente/evolution-whatsapp" },
    { label: "Mesaj İçeriği", href: "/admin/acente/mesaj-icerigi" },
    { label: "Kullanıcılar", href: "/admin/acente/kullanicilar" },
    { label: "İçerik Yönetimi", href: "/admin/icerik" },
    { label: "Güvenlik & Log", href: "/admin/acente/guvenlik" },
  ],
};

