import { PrismaClient, VillaCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const regions = [
  {
    slug: "kalkan",
    name: "Kalkan",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  },
  {
    slug: "fethiye",
    name: "Fethiye",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80",
  },
  {
    slug: "bodrum",
    name: "Bodrum",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
  },
  {
    slug: "cesme",
    name: "Alaçatı & Çeşme",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  },
  {
    slug: "kayakoy",
    name: "Kayaköy",
    image:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80",
  },
  {
    slug: "selimiye",
    name: "Selimiye",
    image:
      "https://images.unsplash.com/photo-1439066615861-d1af74c740f8?w=600&q=80",
  },
];

const campaigns = [
  {
    title: "Erken Rezervasyon Fırsatı",
    subtitle: "Yaz sezonuna %25'e varan indirim",
    image:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80",
    cta: "Fırsatları Keşfet",
    href: "/villalar?filter=deal",
    sortOrder: 0,
  },
  {
    title: "Hafta Sonu Kaçamağı",
    subtitle: "2 gece konaklamada 3. gece bizden",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
    cta: "Villaları İncele",
    href: "/villalar",
    sortOrder: 1,
  },
  {
    title: "Aile Paketleri",
    subtitle: "Çocuklu ailelere özel villalar",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
    cta: "Hemen Rezervasyon",
    href: "/villalar?filter=popular",
    sortOrder: 2,
  },
];

const villas = [
  {
    slug: "villa-waratah",
    name: "Villa Waratah",
    category: VillaCategory.villa,
    regionSlug: "kalkan",
    location: "Kalkan Merkez",
    guests: 3,
    bedrooms: 3,
    bathrooms: 5,
    pricePerNight: 40857,
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    ],
    description:
      "Kalkan'ın kalbinde, deniz manzaralı lüks villa. Özel havuz, geniş teras ve modern iç mekan ile unutulmaz bir tatil deneyimi sunar.",
    amenities: ["Özel Havuz", "Deniz Manzarası", "Wi-Fi", "Klima", "Otopark", "Barbekü"],
    featured: true,
    popular: true,
    deal: false,
    recommended: true,
  },
  {
    slug: "villa-disney",
    name: "Villa Disney",
    category: VillaCategory.villa,
    regionSlug: "fethiye",
    location: "İslamlar",
    guests: 10,
    bedrooms: 5,
    bathrooms: 5,
    pricePerNight: 25000,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    ],
    description:
      "Geniş aileler ve gruplar için ideal, 10 kişilik kapasiteli muhteşem villa. Doğa ile iç içe, huzurlu bir konaklama.",
    amenities: ["Özel Havuz", "Bahçe", "Wi-Fi", "Klima", "Mutfak", "Çamaşır Makinesi"],
    featured: true,
    popular: true,
    deal: false,
    recommended: false,
  },
  {
    slug: "villa-yaprak",
    name: "Villa Yaprak",
    category: VillaCategory.villa,
    regionSlug: "fethiye",
    location: "Fethiye Merkeze Yakın",
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    pricePerNight: 17500,
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
    ],
    description:
      "Fethiye merkeze yakın, şirin ve konforlu villa. Çiftler ve küçük aileler için mükemmel bir seçenek.",
    amenities: ["Havuz", "Wi-Fi", "Klima", "Teras", "Otopark"],
    featured: false,
    popular: true,
    deal: true,
    recommended: true,
  },
  {
    slug: "bungalov-masal",
    name: "Bungalov Masal",
    category: VillaCategory.bungalov,
    regionSlug: "fethiye",
    location: "Fethiye Merkeze Yakın",
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    pricePerNight: 9250,
    image:
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&q=80",
    ],
    description:
      "Romantik kaçamaklar için tasarlanmış, doğayla iç içe bungalov. Sakin ve huzurlu bir tatil arayan çiftler için ideal.",
    amenities: ["Teras", "Wi-Fi", "Klima", "Doğa Manzarası"],
    featured: false,
    popular: true,
    deal: true,
    recommended: false,
  },
  {
    slug: "villa-massi-evi",
    name: "Villa Massi Evi",
    category: VillaCategory.villa,
    regionSlug: "selimiye",
    location: "Selimiye",
    guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    pricePerNight: null,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    ],
    description:
      "Selimiye'nin berrak sularına yakın, özel havuzlu lüks villa. Teklif üzerine rezervasyon.",
    amenities: ["Özel Havuz", "Deniz Manzarası", "Wi-Fi", "Klima", "Barbekü"],
    featured: true,
    popular: true,
    deal: true,
    recommended: true,
  },
  {
    slug: "villa-royal-cesme",
    name: "Villa Royal Çeşme 1",
    category: VillaCategory.villa,
    regionSlug: "cesme",
    location: "Alaçatı",
    guests: 6,
    bedrooms: 3,
    bathrooms: 3,
    pricePerNight: 22355,
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
    ],
    description:
      "Alaçatı'nın rüzgarlı sokaklarına yakın, modern ve şık villa. Ege'nin incisinde lüks konaklama.",
    amenities: ["Havuz", "Wi-Fi", "Klima", "Bahçe", "Otopark"],
    featured: false,
    popular: true,
    deal: false,
    recommended: true,
  },
  {
    slug: "villa-cihan",
    name: "Villa Cihan",
    category: VillaCategory.villa,
    regionSlug: "kalkan",
    location: "Kalkan Merkez",
    guests: 4,
    bedrooms: 3,
    bathrooms: 4,
    pricePerNight: 24800,
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
    ],
    description:
      "Kalkan'ın en güzel noktalarından birinde, panoramik deniz manzaralı villa.",
    amenities: ["Özel Havuz", "Deniz Manzarası", "Wi-Fi", "Klima", "Jakuzi"],
    featured: false,
    popular: true,
    deal: true,
    recommended: false,
  },
  {
    slug: "villa-antik-bodrum",
    name: "Villa Antik Bodrum",
    category: VillaCategory.villa,
    regionSlug: "bodrum",
    location: "Bitez",
    guests: 6,
    bedrooms: 3,
    bathrooms: 3,
    pricePerNight: null,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
    ],
    description:
      "Bodrum Bitez'de, antik çağın izlerini taşıyan modern bir villa. Teklif alınız.",
    amenities: ["Havuz", "Denize Yakın", "Wi-Fi", "Klima", "Teras"],
    featured: true,
    popular: false,
    deal: true,
    recommended: true,
  },
  {
    slug: "villa-limon-kayakoy",
    name: "Villa Limon Kayaköy",
    category: VillaCategory.villa,
    regionSlug: "kayakoy",
    location: "Kayaköy",
    guests: 4,
    bedrooms: 2,
    bathrooms: 2,
    pricePerNight: 15500,
    image:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=80",
    ],
    description:
      "Kayaköy'ün tarihi dokusuna yakın, limon bahçeli şirin villa.",
    amenities: ["Bahçe", "Wi-Fi", "Klima", "Teras", "Barbekü"],
    featured: false,
    popular: false,
    deal: true,
    recommended: false,
  },
  {
    slug: "villa-story-house",
    name: "Villa Story House",
    category: VillaCategory.villa,
    regionSlug: "kalkan",
    location: "Akbel",
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    pricePerNight: 10800,
    image:
      "https://images.unsplash.com/photo-1605276374101-de8452a47903?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1605276374101-de8452a47903?w=1200&q=80",
    ],
    description: "Akbel'de çiftler için romantik ve huzurlu konaklama.",
    amenities: ["Teras", "Wi-Fi", "Klima", "Deniz Manzarası"],
    featured: false,
    popular: false,
    deal: false,
    recommended: true,
  },
  {
    slug: "villa-sefa",
    name: "Villa Sefa",
    category: VillaCategory.villa,
    regionSlug: "kayakoy",
    location: "Kayaköy",
    guests: 4,
    bedrooms: 2,
    bathrooms: 2,
    pricePerNight: 12500,
    image:
      "https://images.unsplash.com/photo-1439066615861-d1af74c740f8?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1439066615861-d1af74c740f8?w=1200&q=80",
    ],
    description: "Kayaköy'de doğayla iç içe, huzurlu bir villa deneyimi.",
    amenities: ["Bahçe", "Wi-Fi", "Klima", "Otopark", "Barbekü"],
    featured: false,
    popular: false,
    deal: false,
    recommended: true,
  },
  {
    slug: "bungalov-masal-2",
    name: "Bungalov Masal 2",
    category: VillaCategory.bungalov,
    regionSlug: "fethiye",
    location: "Fethiye Merkeze Yakın",
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    pricePerNight: 10000,
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
    ],
    description: "Aileler için genişletilmiş bungalov konsepti.",
    amenities: ["Teras", "Wi-Fi", "Klima", "Bahçe"],
    featured: false,
    popular: false,
    deal: true,
    recommended: false,
  },
];

async function main() {
  console.log("Seeding database...");

  await prisma.booking.deleteMany();
  await prisma.villa.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.region.deleteMany();
  await prisma.user.deleteMany();

  const regionMap = new Map<string, string>();

  for (const region of regions) {
    const created = await prisma.region.create({ data: region });
    regionMap.set(region.slug, created.id);
  }

  for (const campaign of campaigns) {
    await prisma.campaign.create({ data: campaign });
  }

  for (const villa of villas) {
    const { regionSlug, ...villaData } = villa;
    const regionId = regionMap.get(regionSlug);
    if (!regionId) continue;

    await prisma.villa.create({
      data: {
        ...villaData,
        regionId,
      },
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@tatildeyiz.com.tr";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
      phone: "",
      active: true,
    },
  });

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      agencyName: "Glamping Turizm Seyahat Acentesi",
      brandName: "tatildeyiz.com.tr",
      companyTitle: "TATİLDEYİZ TURİZM VE EMLAK YATIRIMLARI LİMİTED ŞİRKETİ",
      domain: "www.tatildeyiz.com.tr",
      phone: "+90 252 618 01 08",
      phone2: "",
      officePhone: "",
      email: "info@tatildeyiz.com.tr",
      address: "Girmeler Mah. Nacaklar Sok. No:8/1 D:3 Seydikemer / Muğla",
      whatsapp: "+90 252 618 01 08",
      workingHours: "09:00 - 23:59",
      googleMapsEmbed:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3125.0!2d29.0!3d36.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zVGF0aWwgVmlsbGFjxLFzxLE!5e0!3m2!1str!2str!4v1",
      tursabNo: "12970",
      seoTitle: "Tatildeyiz - En İyi Fiyat Garantisi",
      seoDescription:
        "Türkiye'nin en güzel bölgelerinde villa ve bungalov kiralama. En iyi fiyat garantisi ile hızlı rezervasyon.",
      primaryColor: "#0d9488",
      secondaryColor: "#115e59",
      loadingText: "Yükleniyor...",
    },
    update: {},
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
