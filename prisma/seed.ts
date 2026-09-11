import { PrismaClient, RegionLevel, VillaCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TURKEY_REGIONS } from "./regions-data";
import { getRegionContentFields } from "./region-content-data";
import { SURROUNDING_SEED_DATA } from "./surrounding-data";
import { AMENITY_SEED_DATA } from "./amenity-data";
import { syncAlphabeticalSiblingSortOrders } from "../lib/region-sort";
import { syncAllAmenitySortOrders } from "../lib/amenity-sort";
import { PRICE_INCLUSION_SEED_DATA } from "./price-inclusion-data";
import { syncAllPriceInclusionSortOrders } from "../lib/price-inclusion-sort";
import { FACILITY_CATEGORY_SEED_DATA } from "./facility-category-data";
import { syncAlphabeticalFacilityCategorySortOrders } from "../lib/facility-category-sort";

const prisma = new PrismaClient();

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
    regionSlug: "kalkan-merkez",
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
    regionSlug: "islamar",
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
    regionSlug: "fethiye-merkeze-yakin",
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
    category: VillaCategory.apart,
    regionSlug: "fethiye-merkeze-yakin",
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
    regionSlug: "alacati",
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
    regionSlug: "kalkan-merkez",
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
    regionSlug: "bitez",
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
    regionSlug: "akbel",
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
    category: VillaCategory.apart,
    regionSlug: "fethiye-merkeze-yakin",
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
  await prisma.villaOwner.deleteMany();
  await prisma.surroundingLocation.deleteMany();
  await prisma.surroundingCategory.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.amenityCategory.deleteMany();
  await prisma.priceInclusionItem.deleteMany();
  await prisma.facilityCategory.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.region.deleteMany();
  await prisma.user.deleteMany();

  const regionMap = new Map<string, string>();

  for (const region of TURKEY_REGIONS) {
    const { parentSlug, showOnHome, showInSearch, sortOrder, ...data } = region;
    const contentFields = getRegionContentFields(region.slug);

    const created = await prisma.region.create({
      data: {
        ...data,
        ...contentFields,
        parentId: parentSlug ? regionMap.get(parentSlug) : undefined,
        showOnHome: contentFields?.showOnHome ?? showOnHome ?? false,
        showInSearch: contentFields?.showInSearch ?? showInSearch ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });
    regionMap.set(region.slug, created.id);
  }

  const ilParents = await prisma.region.findMany({
    where: { level: RegionLevel.IL },
    select: { id: true },
  });
  for (const il of ilParents) {
    await syncAlphabeticalSiblingSortOrders(il.id, RegionLevel.ILCE);
  }

  const ilceParents = await prisma.region.findMany({
    where: { level: RegionLevel.ILCE },
    select: { id: true },
  });
  for (const ilce of ilceParents) {
    await syncAlphabeticalSiblingSortOrders(ilce.id, RegionLevel.MAHALLE);
  }

  for (const campaign of campaigns) {
    await prisma.campaign.create({ data: campaign });
  }

  for (const [categoryIndex, category] of SURROUNDING_SEED_DATA.entries()) {
    const createdCategory = await prisma.surroundingCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        sortOrder: categoryIndex + 1,
      },
    });

    for (const [locationIndex, locationName] of category.locations.entries()) {
      await prisma.surroundingLocation.create({
        data: {
          name: locationName,
          categoryId: createdCategory.id,
          sortOrder: locationIndex + 1,
        },
      });
    }
  }

  for (const [categoryIndex, category] of AMENITY_SEED_DATA.entries()) {
    const createdCategory = await prisma.amenityCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        sortOrder: categoryIndex + 1,
      },
    });

    for (const [itemIndex, item] of category.items.entries()) {
      await prisma.amenity.create({
        data: {
          name: item.name,
          categoryId: createdCategory.id,
          isDefault: item.isDefault ?? false,
          sortOrder: itemIndex + 1,
        },
      });
    }
  }

  await syncAllAmenitySortOrders();

  for (const [index, item] of PRICE_INCLUSION_SEED_DATA.entries()) {
    await prisma.priceInclusionItem.create({
      data: {
        description: item.description,
        type: item.type,
        isDefault: item.isDefault ?? false,
        sortOrder: index + 1,
      },
    });
  }

  await syncAllPriceInclusionSortOrders();

  for (const [index, category] of FACILITY_CATEGORY_SEED_DATA.entries()) {
    await prisma.facilityCategory.create({
      data: {
        name: category.name,
        slug: category.slug,
        tag: category.tag ?? "",
        image: category.image ?? "",
        description: category.description ?? "",
        longDescription: category.longDescription ?? "",
        seoTitle: category.seoTitle ?? "",
        seoDescription: category.seoDescription ?? "",
        seoKeywords: category.seoKeywords ?? "",
        published: category.published ?? false,
        showInSearch: category.showInSearch ?? false,
        showInOffer: category.showInOffer ?? false,
        sortOrder: index + 1,
      },
    });
  }

  await syncAlphabeticalFacilityCategorySortOrders();

  const sampleOwners = [
    {
      name: "MEHMET GÜLCÜ",
      firstName: "MEHMET",
      lastName: "GÜLCÜ",
      phone: "+905387948043",
      email: "mehmet.gulcu@example.com",
      tcKimlikNo: "12345678901",
      bankAccountHolder: "MEHMET GÜLCÜ",
      bankIban: "TR120006400000112345678901",
      accountingCode: "320.01",
      country: "Türkiye",
      mernisIlceCode: "2087",
      address: "Fethiye / Muğla",
    },
    {
      name: "AYNUR AKTAŞ",
      firstName: "AYNUR",
      lastName: "AKTAŞ",
      phone: "+905076050515",
      email: "aynur.aktas@example.com",
      tcKimlikNo: "23456789012",
      bankAccountHolder: "AYNUR AKTAŞ",
      bankIban: "TR330006100519786457841326",
      accountingCode: "320.02",
      country: "Türkiye",
      mernisIlceCode: "1121",
      address: "Kaş / Antalya",
    },
    {
      name: "Hamdi Arda Gürsoy",
      firstName: "Hamdi Arda",
      lastName: "Gürsoy",
      phone: "+905538534986",
      email: "hamdi.gursoy@example.com",
      tcKimlikNo: "34567890123",
      bankAccountHolder: "Hamdi Arda Gürsoy",
      bankIban: "TR760006200000100012345678",
      accountingCode: "320.03",
      country: "Türkiye",
      mernisIlceCode: "1704",
      address: "Bodrum / Muğla",
    },
  ];

  const ownerIds: string[] = [];
  for (const owner of sampleOwners) {
    const created = await prisma.villaOwner.create({ data: owner });
    ownerIds.push(created.id);
  }

  for (const [index, villa] of villas.entries()) {
    const { regionSlug, ...villaData } = villa;
    const regionId = regionMap.get(regionSlug);
    if (!regionId) continue;

    await prisma.villa.create({
      data: {
        ...villaData,
        regionId,
        ownerId: ownerIds[index % ownerIds.length],
        documentNo: index === 0 ? "" : `48-${13760 + index}`,
        active: true,
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
      accentColor: "#14b8a6",
      surfaceColor: "#f0fdfa",
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
