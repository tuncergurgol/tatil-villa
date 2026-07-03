import { prisma } from "@/lib/db";

export const DEFAULT_COMPANY_SETTINGS = {
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
  bankName: "",
  iban: "",
  accountHolder: "",
  primaryColor: "#0d9488",
  secondaryColor: "#115e59",
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  whiteLogoUrl: "",
  tursabNo: "12970",
  tursabEnvironment: "production",
  tursabWhiteLabelUrl:
    "https://whitelabel.tursabrota.com/glamping-turizm-seyahat-acentasi",
  tursabVerificationLogoUrl: "",
  taxNumber: "6231137867",
  taxOffice: "SEYDİKEMER",
  mersisNo: "11611",
  tradeRegistryNo: "FETHİYE",
  chamberOfCommerce: "",
  kepAddress: "tatildeyizturizm@hs01.kep.tr",
  legalText: "",
  instagram: "",
  facebook: "",
  twitter: "",
  youtube: "",
  seoTitle: "Tatildeyiz - En İyi Fiyat Garantisi",
  seoDescription:
    "Türkiye'nin en güzel bölgelerinde villa ve bungalov kiralama. En iyi fiyat garantisi ile hızlı rezervasyon.",
  googleAnalyticsId: "G-5PDN00BR9S",
  googleAdsId: "",
  microsoftClarityId: "",
  googleTagManagerId: "",
  facebookPixelId: "",
  googleSearchConsoleCode: "",
  headScripts: "",
  bodyScripts: "",
  customScripts: "",
  loadingEnabled: false,
  loadingText: "Yükleniyor...",
};

export async function getCompanySettings() {
  let settings = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.companySettings.create({
      data: { id: "default", ...DEFAULT_COMPANY_SETTINGS },
    });
  }

  return settings;
}

export async function updateCompanySettings(
  data: Omit<
    Awaited<ReturnType<typeof getCompanySettings>>,
    "id" | "updatedAt"
  >
) {
  return prisma.companySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });
}
