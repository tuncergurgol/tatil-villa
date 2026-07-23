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
  paymentType: "",
  primaryColor: "#0d9488",
  secondaryColor: "#115e59",
  accentColor: "#14b8a6",
  surfaceColor: "#f0fdfa",
  logoUrl: "/uploads/company/logo-1783080885848.svg",
  faviconUrl: "/uploads/company/favicon-1783081016867.png",
  ogImageUrl: "/uploads/company/ogImage-1783080931394.png",
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
  seoTitle: "Tatildeyiz - Tatilin Keyfini Çıkarın",
  seoDescription:
    "Doğanın kalbinde, jakuzili ve havuzlu bungalov evlerinde tatilin keyfini çıkarın. Unutulmaz bir kaçamak için en popüler rotalar Tatildeyiz'de sizi bekliyor.",
  googleAnalyticsId: "G-3QYZX0CQ1D",
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
  smtpProvider: "google",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpSecure: "starttls",
  smtpUser: "rezervasyon@tatildeyiz.com.tr",
  smtpPassword: "Rez@1311@",
  smtpFromEmail: "rezervasyon@tatildeyiz.com.tr",
  smtpFromName: "tatildeyiz.com.tr",
  smtpEnabled: true,
  whatsappApiEnabled: false,
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  whatsappBusinessAccountId: "",
  whatsappApiVersion: "v22.0",
  whatsappWebhookVerifyToken: "",
  whatsappTestPhone: "",
  whatsappCalendarEnabled: false,
  whatsappCalendarWebhookSecret: "",
  wahaBaseUrl: "http://localhost:3001",
  wahaApiKey: "",
  wahaSessionName: "default",
  evolutionBaseUrl: "http://localhost:8080",
  evolutionApiKey: "",
  evolutionInstanceName: "tatil-villa",
  smsOtpEnabled: false,
  biletallEnabled: true,
  biletallPortalSlug: "tatildeyizcomtr",
  biletallUsername: "",
  biletallPassword: "",
  biletallRoutesJson: "",
  homePopularTitle: "Popüler Villalar",
  homePopularActive: true,
  homePopularSortMode: "showcase",
  homeDealTitle: "Fırsat Villalar",
  homeDealActive: true,
  homeDealSortMode: "showcase",
  homeRecommendedTitle: "Önerilen Villalar",
  homeRecommendedActive: true,
  homeRecommendedSortMode: "showcase",
};

export async function getCompanySettings() {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: { id: "default", ...DEFAULT_COMPANY_SETTINGS },
      });
    }

    return settings;
  } catch (error) {
    // Schema/migration gecikmesinde public villa + bilet sayfalarını ayakta tut.
    console.error("[getCompanySettings] fallback to defaults:", error);
    return {
      id: "default",
      ...DEFAULT_COMPANY_SETTINGS,
      updatedAt: new Date(),
    };
  }
}

export async function updateCompanySettings(
  data: Partial<
    Omit<
      Awaited<ReturnType<typeof getCompanySettings>>,
      "id" | "updatedAt" | "bankName" | "iban" | "accountHolder" | "paymentType"
    >
  >
) {
  return prisma.companySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULT_COMPANY_SETTINGS, ...data },
    update: data,
  });
}
