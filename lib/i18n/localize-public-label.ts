import type { ChromeMessages } from "@/lib/i18n/chrome-messages";

type NavMessages = {
  villas: string;
  deals: string;
  regions: string;
  campaigns: string;
  loyalty: string;
  allVillas: string;
  dealVillas: string;
  reservationVerify: string;
  services: string;
};

type MobileNavMessages = {
  weWillCallYou: string;
};

function pathOnly(href: string): string {
  const withoutHash = href.split("#")[0] ?? href;
  const path = withoutHash.split("?")[0] ?? withoutHash;
  return path.replace(/\/+$/, "") || "/";
}

function queryOf(href: string): URLSearchParams {
  const q = href.includes("?") ? href.slice(href.indexOf("?") + 1).split("#")[0] : "";
  return new URLSearchParams(q);
}

function normalizeNavLabel(label: string): string {
  return label.trim().toLocaleLowerCase("tr-TR");
}

export function localizeNavLabel(
  href: string,
  fallback: string,
  chrome: ChromeMessages,
  nav: NavMessages,
  weWillCallYou?: string
): string {
  const path = pathOnly(href);
  const query = queryOf(href);
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : "";
  const labelKey = normalizeNavLabel(fallback);

  // CMS etiketi href'ten daha güvenilir olabilir (örn. Bölgeler → /villalar yanlışlıkla)
  if (
    labelKey === "bölgeler" ||
    labelKey === "bolgeler" ||
    labelKey === "regions"
  ) {
    return nav.regions;
  }
  if (labelKey === "kampanyalar" || labelKey === "campaigns") {
    return nav.campaigns;
  }

  if (path === "/villalar") {
    if (query.get("filter") === "deal") return nav.dealVillas || nav.deals;
    if (query.get("facilities") === "Bungalov") return chrome.bungalow;
    if (query.get("facilities") === "Domes") return chrome.domes;
    return fallback === "Konaklamalar" || fallback === "Stays"
      ? chrome.accommodations
      : nav.villas;
  }
  if (path === "/bilet/ara" || path === "/bilet") return chrome.flightBus;
  if (path === "/arac-kiralama") return chrome.carRental;
  if (path === "/sadakat") return nav.loyalty;
  if (path === "/blog") return chrome.blog;
  if (path === "/sik-sorulan-sorular") {
    return fallback === "SSS" || fallback === "FAQ" ? chrome.faqShort : chrome.faqTitle;
  }
  if (path === "/yorumlar") return chrome.guestReviews;
  if (path === "/rezervasyon-dogrulama") return nav.reservationVerify;
  if (path === "/yeni-otel") return chrome.newHotel;
  if (path === "/sizi-arayalim") return weWillCallYou ?? chrome.freeCallback;

  if (hash === "bolgeler") return nav.regions;
  if (hash === "kampanyalar") return nav.campaigns;
  if (hash === "seyahat-macerasi") return nav.services;

  if (path.startsWith("/kurumsal/")) {
    const slug = path.slice("/kurumsal/".length);
    return localizeCorporateSlug(slug, fallback, chrome, weWillCallYou);
  }

  return fallback;
}

export function localizeCorporateSlug(
  slug: string,
  fallback: string,
  chrome: ChromeMessages,
  weWillCallYou?: string
): string {
  switch (slug) {
    case "iletisim":
      return chrome.contact;
    case "hakkimizda":
      return chrome.aboutUs;
    case "banka-bilgilerimiz":
      return chrome.bankDetails;
    case "online-rezervasyon-sozlesmesi":
      return chrome.reservationAgreement;
    case "iptal-ve-iade-kosullari":
      return chrome.cancelRefund;
    case "gizlilik-politikasi":
      return chrome.privacyPolicy;
    case "tatil-rehberi":
      return chrome.holidayGuide;
    case "uyelik-sozlesmesi":
      return chrome.membershipAgreement;
    case "sizi-arayalim":
      return weWillCallYou ?? chrome.freeCallback;
    default:
      return fallback;
  }
}

export function localizeCampaignByHref(
  href: string,
  chrome: ChromeMessages
): { title: string; subtitle: string; cta: string } | null {
  const path = pathOnly(href);
  if (path === "/kampanyalar/12-taksit") {
    return {
      title: chrome.campaignInstallmentTitle,
      subtitle: chrome.campaignInstallmentSubtitle,
      cta: chrome.seeDetails,
    };
  }
  if (path === "/sadakat") {
    return {
      title: chrome.campaignLoyaltyTitle,
      subtitle: chrome.campaignLoyaltySubtitle,
      cta: chrome.viewProgram,
    };
  }
  if (path === "/kampanyalar/tatil-danismani") {
    return {
      title: chrome.campaignAdvisorTitle,
      subtitle: chrome.campaignAdvisorSubtitle,
      cta: chrome.callAdvisor,
    };
  }
  if (path === "/kampanyalar/2027-erken-rezervasyon") {
    return {
      title: chrome.campaignEarlyTitle,
      subtitle: chrome.campaignEarlySubtitle,
      cta: chrome.seeVillas,
    };
  }
  return null;
}

export function localizeDreamTitle(
  facilitySlug: string,
  fallback: string,
  chrome: ChromeMessages
): string {
  switch (facilitySlug) {
    case "muhafazakar-villalar":
      return chrome.dreamSecludedPool;
    case "isitmali-havuzlu-villalar":
      return chrome.dreamHeatedPool;
    case "balayi-villalari":
      return chrome.dreamHoneymoon;
    case "genis-bahceli-villalar":
      return chrome.dreamLargeGarden;
    case "eglence-ve-aktivite-imkanli-villalar":
      return chrome.dreamEntertainment;
    case "deniz-manzarali-villalar":
      return chrome.dreamSeaView;
    case "kopek-kabul-eden-villalar":
      return chrome.dreamPetFriendly;
    default:
      return fallback;
  }
}

const BLOG_CATEGORY_BY_LOCALE: Record<string, Record<string, string>> = {
  en: {
    "villa-kiralama-rehberi": "Villa Rental Guide",
    plajlar: "Beaches",
    "tarihi-yerler": "Historical Places",
    "tatil-ipuclari": "Holiday Tips",
    "tatil-rehberi": "Holiday Guide",
    "resmi-tatiller": "Public Holidays",
    "bolge-rehberleri": "Region Guides",
    "havuz-ve-konfor": "Pool and Comfort",
    "aile-tatili": "Family Holiday",
    "balayi-ve-manzara": "Honeymoon and View",
  },
  de: {
    "villa-kiralama-rehberi": "Villa-Mietratgeber",
    plajlar: "Strände",
    "tarihi-yerler": "Historische Orte",
    "tatil-ipuclari": "Urlaubstipps",
    "tatil-rehberi": "Urlaubsratgeber",
    "resmi-tatiller": "Feiertage",
    "bolge-rehberleri": "Regionsführer",
    "havuz-ve-konfor": "Pool und Komfort",
    "aile-tatili": "Familienurlaub",
    "balayi-ve-manzara": "Flitterwochen und Aussicht",
  },
  fr: {
    "villa-kiralama-rehberi": "Guide de location de villa",
    plajlar: "Plages",
    "tarihi-yerler": "Lieux historiques",
    "tatil-ipuclari": "Conseils de vacances",
    "tatil-rehberi": "Guide de vacances",
    "resmi-tatiller": "Jours fériés",
    "bolge-rehberleri": "Guides régionaux",
    "havuz-ve-konfor": "Piscine et confort",
    "aile-tatili": "Vacances en famille",
    "balayi-ve-manzara": "Lune de miel et vue",
  },
  es: {
    "villa-kiralama-rehberi": "Guía de alquiler de villas",
    plajlar: "Playas",
    "tarihi-yerler": "Lugares históricos",
    "tatil-ipuclari": "Consejos de vacaciones",
    "tatil-rehberi": "Guía de vacaciones",
    "resmi-tatiller": "Festivos",
    "bolge-rehberleri": "Guías regionales",
    "havuz-ve-konfor": "Piscina y confort",
    "aile-tatili": "Vacaciones en familia",
    "balayi-ve-manzara": "Luna de miel y vistas",
  },
  bg: {
    "villa-kiralama-rehberi": "Ръководство за наем на вила",
    plajlar: "Плажове",
    "tarihi-yerler": "Исторически места",
    "tatil-ipuclari": "Съвети за почивка",
    "tatil-rehberi": "Туристически гид",
    "resmi-tatiller": "Официални празници",
    "bolge-rehberleri": "Регионални гидове",
    "havuz-ve-konfor": "Басейн и комфорт",
    "aile-tatili": "Семейна почивка",
    "balayi-ve-manzara": "Меден месец и гледка",
  },
  el: {
    "villa-kiralama-rehberi": "Οδηγός ενοικίασης βίλας",
    plajlar: "Παραλίες",
    "tarihi-yerler": "Ιστορικά μέρη",
    "tatil-ipuclari": "Συμβουλές διακοπών",
    "tatil-rehberi": "Οδηγός διακοπών",
    "resmi-tatiller": "Επίσημες αργίες",
    "bolge-rehberleri": "Οδηγοί περιοχών",
    "havuz-ve-konfor": "Πισίνα και άνεση",
    "aile-tatili": "Οικογενειακές διακοπές",
    "balayi-ve-manzara": "Μήνας του μέλιτος και θέα",
  },
  zh: {
    "villa-kiralama-rehberi": "别墅租赁指南",
    plajlar: "海滩",
    "tarihi-yerler": "历史景点",
    "tatil-ipuclari": "度假小贴士",
    "tatil-rehberi": "度假指南",
    "resmi-tatiller": "公共假日",
    "bolge-rehberleri": "地区指南",
    "havuz-ve-konfor": "泳池与舒适",
    "aile-tatili": "家庭假期",
    "balayi-ve-manzara": "蜜月与景观",
  },
  ru: {
    "villa-kiralama-rehberi": "Гид по аренде вилл",
    plajlar: "Пляжи",
    "tarihi-yerler": "Исторические места",
    "tatil-ipuclari": "Советы для отпуска",
    "tatil-rehberi": "Путеводитель",
    "resmi-tatiller": "Государственные праздники",
    "bolge-rehberleri": "Гиды по регионам",
    "havuz-ve-konfor": "Бассейн и комфорт",
    "aile-tatili": "Семейный отдых",
    "balayi-ve-manzara": "Медовый месяц и вид",
  },
};

export function localizeBlogCategory(
  slug: string,
  fallback: string,
  locale: string
): string {
  if (locale === "tr") return fallback;
  const map = BLOG_CATEGORY_BY_LOCALE[locale] ?? BLOG_CATEGORY_BY_LOCALE.en;
  return map?.[slug] ?? BLOG_CATEGORY_BY_LOCALE.en?.[slug] ?? fallback;
}

export type { MobileNavMessages };
