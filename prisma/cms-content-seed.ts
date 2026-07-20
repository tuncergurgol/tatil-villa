import { prisma } from "@/lib/db";
import { villaRentalFaqSeedData } from "./cms-faq-seed-data";

export const corporatePageSeeds = [
  { slug: "iletisim", title: "İletişim", pageType: "CORPORATE" as const, sortOrder: 1 },
  { slug: "hakkimizda", title: "Hakkımızda", pageType: "CORPORATE" as const, sortOrder: 2 },
  { slug: "banka-bilgilerimiz", title: "Banka Bilgilerimiz", pageType: "CORPORATE" as const, sortOrder: 3 },
  {
    slug: "online-rezervasyon-sozlesmesi",
    title: "Online Rezervasyon Sözleşmesi",
    pageType: "LEGAL" as const,
    sortOrder: 4,
  },
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi",
    pageType: "LEGAL" as const,
    sortOrder: 5,
  },
  {
    slug: "kiralama-kosullari",
    title: "Kiralama Koşulları",
    pageType: "LEGAL" as const,
    sortOrder: 6,
  },
  {
    slug: "iptal-ve-iade-kosullari",
    title: "İptal ve İade Koşulları",
    pageType: "LEGAL" as const,
    sortOrder: 7,
  },
  {
    slug: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    pageType: "LEGAL" as const,
    sortOrder: 8,
  },
  {
    slug: "elektronik-ilet-ve-acik-riza-metni",
    title: "Elektronik İleti ve Açık Rıza Metni",
    pageType: "LEGAL" as const,
    sortOrder: 9,
  },
  { slug: "tatil-rehberi", title: "Tatil Rehberi", pageType: "LANDING" as const, sortOrder: 10 },
  { slug: "sizi-arayalim", title: "Sizi Arayalım", pageType: "CORPORATE" as const, sortOrder: 11 },
];

export const blogCategorySeeds = [
  {
    name: "Villa Kiralama Rehberi",
    slug: "villa-kiralama-rehberi",
    description: "Villa kiralama süreci, ipuçları ve rehber yazıları",
    sortOrder: 1,
  },
  {
    name: "Bölge Rehberleri",
    slug: "bolge-rehberleri",
    description: "Fethiye, Kalkan, Bodrum ve diğer popüler tatil bölgeleri",
    sortOrder: 2,
  },
  {
    name: "Tatil İpuçları",
    slug: "tatil-ipuclari",
    description: "Aile tatili, planlama ve konfor önerileri",
    sortOrder: 3,
  },
  {
    name: "Haberler",
    slug: "haberler",
    description: "Kampanya, duyuru ve sektör haberleri",
    sortOrder: 4,
  },
];

export const defaultMenuSeeds = {
  header: {
    key: "header",
    label: "Üst Menü",
    items: [
      { label: "Villalar", href: "/villalar", sortOrder: 1 },
      { label: "Fırsatlar", href: "/villalar?filter=deal", sortOrder: 2 },
      { label: "Bölgeler", href: "/#bolgeler", sortOrder: 3 },
      { label: "Kampanyalar", href: "/#kampanyalar", sortOrder: 4 },
      { label: "Blog", href: "/blog", sortOrder: 5 },
      { label: "SSS", href: "/sik-sorulan-sorular", sortOrder: 6 },
      { label: "Kurumsal", href: "/kurumsal/hakkimizda", sortOrder: 7 },
    ],
  },
  footerCorporate: {
    key: "footer-corporate",
    label: "Footer Kurumsal",
    items: corporatePageSeeds.map((page, index) => ({
      label: page.title,
      href: `/kurumsal/${page.slug}`,
      sortOrder: index + 1,
    })),
  },
  footerQuick: {
    key: "footer-quick",
    label: "Footer Hızlı Bağlantılar",
    items: [
      { label: "Tüm Villalar", href: "/villalar", sortOrder: 1 },
      { label: "Fırsat Villalar", href: "/villalar?filter=deal", sortOrder: 2 },
      { label: "Misafir Yorumları", href: "/yorumlar", sortOrder: 3 },
      { label: "Sık Sorulan Sorular", href: "/sik-sorulan-sorular", sortOrder: 4 },
      {
        label: "Rezervasyon Doğrulama",
        href: "/rezervasyon-dogrulama",
        sortOrder: 5,
      },
    ],
  },
};

export const sampleReviewSeeds = [
  {
    guestName: "Ayşe K.",
    guestCity: "İstanbul",
    rating: 5,
    title: "Harika bir aile tatili",
    comment:
      "Villa tam ilandaki gibiydi. Havuz, bahçe ve manzara muhteşemdi. Rezervasyon süreci hızlı ve şeffaftı.",
    stayMonth: "Temmuz 2025",
    approved: true,
    featured: true,
  },
  {
    guestName: "Mehmet T.",
    guestCity: "Ankara",
    rating: 5,
    title: "Tekrar geleceğiz",
    comment:
      "Kalkan bölgesinde kiraladığımız villa tertemiz ve çok konforluydu. Check-in bilgilendirmesi zamanında geldi.",
    stayMonth: "Ağustos 2025",
    approved: true,
    featured: true,
  },
  {
    guestName: "Zeynep A.",
    guestCity: "İzmir",
    rating: 4,
    title: "Güzel konaklama deneyimi",
    comment:
      "Villa konumu çok iyiydi. Mutfak donanımı eksiksizdi, ailemizle rahat bir hafta geçirdik.",
    stayMonth: "Haziran 2025",
    approved: true,
    featured: false,
  },
];

export async function seedCmsContent() {
  for (const faq of villaRentalFaqSeedData) {
    await prisma.faqItem.upsert({
      where: { slug: faq.slug },
      create: { ...faq, active: true },
      update: { ...faq, active: true },
    });
  }

  for (const page of corporatePageSeeds) {
    const showInMenu = [
      "hakkimizda",
      "iletisim",
      "banka-bilgilerimiz",
      "online-rezervasyon-sozlesmesi",
      "iptal-ve-iade-kosullari",
      "gizlilik-politikasi",
    ].includes(page.slug);

    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      create: {
        ...page,
        content: `<p>${page.title} içeriği yönetim panelinden veya Tatildeyiz import ile güncellenebilir.</p>`,
        excerpt: `${page.title} sayfası`,
        seoTitle: `${page.title} | Tatildeyiz`,
        seoDescription: `${page.title} hakkında detaylı bilgi.`,
        published: true,
        showInFooter: true,
        showInMenu,
      },
      update: {
        title: page.title,
        pageType: page.pageType,
        sortOrder: page.sortOrder,
        showInFooter: true,
        showInMenu,
      },
    });
  }

  for (const category of blogCategorySeeds) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, active: true },
      update: { ...category, active: true },
    });
  }

  for (const menuSeed of Object.values(defaultMenuSeeds)) {
    const menu = await prisma.siteMenu.upsert({
      where: { key: menuSeed.key },
      create: { key: menuSeed.key, label: menuSeed.label },
      update: { label: menuSeed.label },
    });

    for (const item of menuSeed.items) {
      const existing = await prisma.siteMenuItem.findFirst({
        where: { menuId: menu.id, href: item.href },
      });
      if (existing) {
        await prisma.siteMenuItem.update({
          where: { id: existing.id },
          data: { label: item.label, sortOrder: item.sortOrder, active: true },
        });
      } else {
        await prisma.siteMenuItem.create({
          data: { menuId: menu.id, ...item, active: true },
        });
      }
    }
  }

  for (const review of sampleReviewSeeds) {
    const existing = await prisma.guestReview.findFirst({
      where: { guestName: review.guestName, comment: review.comment },
    });
    if (!existing) {
      await prisma.guestReview.create({ data: review });
    }
  }
}
