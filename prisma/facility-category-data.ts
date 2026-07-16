export interface FacilityCategorySeedItem {
  name: string;
  slug: string;
  tag?: string;
  image?: string;
  description?: string;
  longDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  published?: boolean;
  showInSearch?: boolean;
  showInOffer?: boolean;
}

export const FACILITY_CATEGORY_SEED_DATA: FacilityCategorySeedItem[] = [
  {
    name: "Sinema Odası Olanlar",
    slug: "sinema-odasi-olanlar",
    description:
      "Sinema salonu olan tatil evlerimizde konuklarımıza unutulmaz bir film deneyimi sunuyoruz. Geniş ekranlar ve konforlu oturma düzenleriyle donatılmış sinema salonları keyifli bir tatilin yanı sıra sinema keyfi yaşamanızı sağlar.",
    published: true,
    image:
      "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&q=80",
  },
  {
    name: "Ücretsiz Kahvaltı",
    slug: "ucretsiz-kahvalti",
    published: true,
    image:
      "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80",
  },
  {
    name: "Bungalov",
    slug: "bungalov",
    published: true,
    image:
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&q=80",
  },
  {
    name: "Infinity (Sonsuzluk) Havuzlu Villalar",
    slug: "infinity-havuzlu-villalar",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80",
  },
  {
    name: "Yıldızlı Villalar",
    slug: "yildizli-villalar",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80",
  },
  {
    name: "Spor Aletleri (GYM) olan villalar",
    slug: "spor-aletleri-gym-olan-villalar",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80",
  },
  {
    name: "Balayı Villaları",
    slug: "balayi-villalari",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
  },
  {
    name: "Çocuk Havuzlu Villalar",
    slug: "cocuk-havuzlu-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=400&q=80",
  },
  {
    name: "Deniz Manzaralı Villalar",
    slug: "deniz-manzarali-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=400&q=80",
  },
  {
    name: "Doğa İçinde Villalar",
    slug: "doga-icinde-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=400&q=80",
  },
  {
    name: "Ekonomik Villalar",
    slug: "ekonomik-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80",
  },
  {
    name: "Isıtmalı Havuzlu Villalar",
    slug: "isitmali-havuzlu-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80",
  },
  {
    name: "Jakuzili Villalar",
    slug: "jakuzili-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80",
  },
  {
    name: "Kapalı Havuzlu Villalar",
    slug: "kapali-havuzlu-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1605276374101-de8452a47903?w=400&q=80",
  },
  {
    name: "Köpek Kabul Eden Villalar",
    slug: "kopek-kabul-eden-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80",
  },
  {
    name: "Lüks Villalar",
    slug: "luks-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80",
  },
  {
    name: "Merkeze Yakın Villalar",
    slug: "merkeze-yakin-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&q=80",
  },
  {
    name: "Muhafazakar Villalar",
    slug: "muhafazakar-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cd2e?w=400&q=80",
  },
  {
    name: "Özel Havuzlu Villalar",
    slug: "ozel-havuzlu-villalar",
    published: true,
    showInSearch: true,
    showInOffer: true,
    image:
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=400&q=80",
  },
  {
    name: "Sauna ve Hamamlı Villalar",
    slug: "sauna-ve-hamamli-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80",
  },
  {
    name: "Şömineli Villalar",
    slug: "somineli-villalar",
    published: true,
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80",
  },
  {
    name: "Tenis Kortlu Villalar",
    slug: "tenis-kortlu-villalar",
    image:
      "https://images.unsplash.com/photo-1554068865-24cecd4e24b8?w=400&q=80",
  },
  {
    name: "Villa ve Apart",
    slug: "villa-ve-apart",
    published: true,
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80",
  },
  {
    name: "Yazlık Villalar",
    slug: "yazlik-villalar",
    published: true,
    showInSearch: true,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  },
  {
    name: "Geniş Bahçeli Villalar",
    slug: "genis-bahceli-villalar",
    published: true,
    showInSearch: true,
    showInOffer: true,
    description:
      "Geniş bahçeli tatil villaları; açık alan, çocuk oyun alanı ve doğayla iç içe bir tatil için idealdir.",
    image:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=400&q=80",
  },
  {
    name: "Eğlence ve Aktivite İmkanlı Villalar",
    slug: "eglence-ve-aktivite-imkanli-villalar",
    published: true,
    showInSearch: true,
    showInOffer: true,
    description:
      "Bilardo, oyun konsolu ve benzeri aktivitelerle dolu eğlence imkânlı tatil villaları.",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80",
  },
];
