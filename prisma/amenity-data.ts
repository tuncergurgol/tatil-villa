export type AmenitySeedItem = {
  name: string;
  isDefault?: boolean;
};

export type AmenityCategorySeed = {
  slug: string;
  name: string;
  items: AmenitySeedItem[];
};

export const AMENITY_SEED_DATA: AmenityCategorySeed[] = [
  {
    slug: "banyo",
    name: "Banyo",
    items: [
      { name: "Banyo veya duş", isDefault: true },
      { name: "Havlular", isDefault: true },
      { name: "Saç kurutma makinesi", isDefault: true },
      { name: "Ücretsiz banyo malzemeleri" },
      { name: "Jakuzi" },
      { name: "Türk Hamamı" },
    ],
  },
  {
    slug: "yatak-odasi",
    name: "Yatak Odası",
    items: [
      { name: "Yatak", isDefault: true },
      { name: "Nevresim", isDefault: true },
      { name: "Gardırop" },
      { name: "Ütü" },
      { name: "Çamaşır Kurutma Askısı" },
      { name: "Ekstra yastık" },
    ],
  },
  {
    slug: "medya-teknoloji",
    name: "Medya & Teknoloji",
    items: [
      { name: "Wi-Fi", isDefault: true },
      { name: "Düz ekran TV", isDefault: true },
      { name: "Araç Şarj İstasyonu" },
      { name: "Kablo TV" },
      { name: "Uydu Yayını" },
      { name: "Bluetooth Hoparlör" },
      { name: "Netflix" },
      { name: "Akıllı TV" },
    ],
  },
  {
    slug: "mutfak",
    name: "Mutfak",
    items: [
      { name: "Buzdolabı", isDefault: true },
      { name: "Bulaşık makinesi", isDefault: true },
      { name: "Fırın", isDefault: true },
      { name: "Ocak" },
      { name: "Mikrodalga" },
      { name: "Kettle" },
      { name: "Tost Makinesi" },
      { name: "Kahve Makinesi" },
      { name: "Mutfak Gereçleri" },
      { name: "Yemek Masası" },
      { name: "Barbekü" },
      { name: "Buz Makinesi" },
      { name: "Mini Bar" },
      { name: "Filtre Kahve Makinesi" },
    ],
  },
  {
    slug: "guvenlik",
    name: "Güvenlik",
    items: [
      { name: "Duman dedektörü", isDefault: true },
      { name: "İlk yardım çantası" },
      { name: "Yangın söndürücü" },
    ],
  },
  {
    slug: "genel",
    name: "Genel",
    items: [
      { name: "Klima", isDefault: true },
      { name: "Bahçe", isDefault: true },
      { name: "Teras Alanı", isDefault: true },
      { name: "Otopark" },
      { name: "Site içerisinde" },
      { name: "Yerden Isıtma" },
      { name: "Şömine" },
      { name: "Çamaşır Makinesi" },
      { name: "Ütü Masası" },
      { name: "Asansör" },
      { name: "Balkon" },
      { name: "Manzara" },
      { name: "Güneşlenme Terası" },
      { name: "Ortak Havuz" },
    ],
  },
  {
    slug: "one-cikanlar",
    name: "Öne Çıkanlar",
    items: [
      { name: "Özel Havuzlu", isDefault: true },
      { name: "Doğa Manzarası", isDefault: true },
      { name: "Arkadaş Grubu Kabul Eden", isDefault: true },
      { name: "Deniz Manzarası" },
      { name: "Balayı" },
      { name: "Bungalov" },
      { name: "Çocuk Havuzu" },
      { name: "Engelliye Uygun" },
      { name: "Evcil Hayvan İzinli" },
      { name: "Jakuzi" },
      { name: "Saunalı" },
      { name: "Türk Hamamı" },
      { name: "Yerden Isıtma" },
      { name: "Denize Yakın" },
      { name: "Özel Plaj" },
      { name: "Panoramik Manzara" },
      { name: "Lüks Villa" },
      { name: "Butik Konsept" },
      { name: "Aile Dostu" },
      { name: "Romantik Kaçamak" },
      { name: "Doğa İçinde" },
      { name: "Merkeze Yakın" },
      { name: "Sessiz Bölge" },
      { name: "Gün Batımı Manzarası" },
      { name: "Infinity Havuz" },
      { name: "Kapalı Havuz" },
      { name: "Isıtmalı Havuz" },
    ],
  },
  {
    slug: "erisim-bilgileri",
    name: "Erişim Bilgileri",
    items: [
      {
        name: "Otoparktan villaya düz bir yoldan ve kolay erişim yapılabilmektedir.",
        isDefault: true,
      },
      {
        name: "Otoparktan villaya merdiven çıkılarak erişim yapılabilmektedir.",
      },
      {
        name: "Otoparktan villaya merdiven inilerek erişim yapılabilmektedir.",
      },
    ],
  },
  {
    slug: "oyun-gruplari",
    name: "Oyun Grupları",
    items: [
      { name: "Bilardo" },
      { name: "Langırt" },
      { name: "Masa Tenisi" },
      { name: "Dart" },
      { name: "Air Hokey" },
      { name: "Oyun Konsolu" },
    ],
  },
  {
    slug: "cocuk-oyun-gruplari",
    name: "Çocuk Oyun Grupları",
    items: [
      { name: "Salıncak" },
      { name: "Kaydırak" },
      { name: "Su Kaydırağı" },
    ],
  },
  {
    slug: "yemek-hizmeti",
    name: "Yemek Hizmeti",
    items: [
      {
        name: "Evimizde kahvaltı ve yemek hizmeti olmayıp, mutfakta yemek yapabileceğiniz tüm ekipmanlar yer almaktadır.",
        isDefault: true,
      },
      {
        name: "Evimizde kahvaltı ve yemek hizmeti bulunmamaktadır. Yakın restoranlarda indirimli hizmet sunulmaktadır.",
      },
      {
        name: "Evimizde 2 kişilik ücretsiz kahvaltı hizmeti sunulmaktadır.",
      },
      {
        name: "Evimizde tek seferlik ücretsiz kahvaltı hizmeti sunulmaktadır.",
      },
      {
        name: "Evimizde yarım pansiyon konsepti uygulanmaktadır.",
      },
    ],
  },
];
