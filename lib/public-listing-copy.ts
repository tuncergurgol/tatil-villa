import { getPublicHomeTheme } from "@/lib/public-home-theme";

export type PublicListingCopy = {
  usesTesis: boolean;
  singular: string;
  plural: string;
  rentalSingular: string;
  rentalPlural: string;
  all: string;
  allShow: string;
  deals: string;
  popular: string;
  recommended: string;
  listingTitle: string;
  rentalAndBungalows: string;
  similar: string;
  categories: string;
  typeFilter: string;
  search: string;
  detail: string;
  amenities: string;
  breadcrumb: string;
  travelAddon: string;
};

const VILLA_COPY: PublicListingCopy = {
  usesTesis: false,
  singular: "Villa",
  plural: "Villalar",
  rentalSingular: "Kiralık Villa",
  rentalPlural: "Kiralık Villalar",
  all: "Tüm Villalar",
  allShow: "Tüm villaları göster",
  deals: "Fırsat Villalar",
  popular: "Popüler Villalar",
  recommended: "Önerilen Villalar",
  listingTitle: "Kiralık Villa",
  rentalAndBungalows: "Kiralık Villa ve Bungalovlar",
  similar: "Benzer Villalar",
  categories: "Villa Kategorileri",
  typeFilter: "Ev Tipi",
  search: "Villa Ara",
  detail: "Villa Detayı",
  amenities: "Villa Olanakları",
  breadcrumb: "Villa",
  travelAddon:
    "Villa konaklamanıza ek olarak otel, transfer, araç kiralama ve ulaşım",
};

const VILLA_COPY_EN: PublicListingCopy = {
  usesTesis: false,
  singular: "Villa",
  plural: "Villas",
  rentalSingular: "Villa for Rent",
  rentalPlural: "Villas for Rent",
  all: "All Villas",
  allShow: "Show all villas",
  deals: "Deal Villas",
  popular: "Popular Villas",
  recommended: "Recommended Villas",
  listingTitle: "Villa for Rent",
  rentalAndBungalows: "Villas and Bungalows for Rent",
  similar: "Similar Villas",
  categories: "Villa Categories",
  typeFilter: "Home Type",
  search: "Search Villa",
  detail: "Villa Details",
  amenities: "Villa Amenities",
  breadcrumb: "Villa",
  travelAddon:
    "In addition to your villa stay: hotel, transfer, car rental and transport",
};

const TESIS_COPY: PublicListingCopy = {
  usesTesis: true,
  singular: "Tesis",
  plural: "Tesisler",
  rentalSingular: "Kiralık Tesis",
  rentalPlural: "Kiralık Tesisler",
  all: "Tüm Tesisler",
  allShow: "Tüm tesisleri göster",
  deals: "Fırsat Tesisler",
  popular: "Popüler Tesisler",
  recommended: "Önerilen Tesisler",
  listingTitle: "Kiralık Tesis",
  rentalAndBungalows: "Kiralık Tesis ve Bungalovlar",
  similar: "Benzer Tesisler",
  categories: "Tesis Kategorileri",
  typeFilter: "Tesis Tipi",
  search: "Tesis Ara",
  detail: "Tesis Detayı",
  amenities: "Tesis Olanakları",
  breadcrumb: "Tesis",
  travelAddon:
    "Tesis konaklamanıza ek olarak otel, transfer, araç kiralama ve ulaşım",
};

export function usesTesisListingCopy(siteKey?: string | null): boolean {
  return getPublicHomeTheme(siteKey) === "theme-2";
}

export function getPublicListingCopy(
  siteKey?: string | null,
  locale: string = "tr"
): PublicListingCopy {
  if (usesTesisListingCopy(siteKey)) {
    return locale === "tr" ? TESIS_COPY : { ...TESIS_COPY, ...{
      singular: "Property",
      plural: "Properties",
      rentalSingular: "Property for Rent",
      rentalPlural: "Properties for Rent",
      all: "All Properties",
      allShow: "Show all properties",
      deals: "Deal Properties",
      popular: "Popular Properties",
      recommended: "Recommended Properties",
      listingTitle: "Property for Rent",
      rentalAndBungalows: "Properties and Bungalows for Rent",
      similar: "Similar Properties",
      categories: "Property Categories",
      typeFilter: "Property Type",
      search: "Search Property",
      detail: "Property Details",
      amenities: "Property Amenities",
      breadcrumb: "Property",
      travelAddon:
        "In addition to your stay: hotel, transfer, car rental and transport",
    } };
  }
  return locale === "tr" ? VILLA_COPY : VILLA_COPY_EN;
}

export function listingRegionRentalLabel(
  regionName: string,
  siteKey?: string | null,
  plural = false,
  locale: string = "tr"
): string {
  const copy = getPublicListingCopy(siteKey, locale);
  return `${regionName} ${plural ? copy.rentalPlural : copy.rentalSingular}`;
}

export function listingEarlyBookingTitle(
  year: number,
  siteKey?: string | null,
  locale: string = "tr"
): string {
  if (locale !== "tr") {
    return usesTesisListingCopy(siteKey)
      ? `${year} Early Booking Properties`
      : `${year} Early Booking Villas`;
  }
  return usesTesisListingCopy(siteKey)
    ? `${year} Erken Rezervasyon Tesisleri`
    : `${year} Erken Rezervasyon Villaları`;
}

/** Görünen metindeki Villa/villa kalıplarını Tesis/tesis yapar. Marka ve URL korunur. */
export function rewriteVillaWordingToTesis(text: string): string {
  if (!text || !/[Vv]illa/.test(text)) return text;

  const saved: string[] = [];
  const keep = (match: string) => {
    saved.push(match);
    return `\u0000${saved.length - 1}\u0000`;
  };

  let out = text
    .replace(/Tatil Villacısı/gi, keep)
    .replace(/Balayı Villacısı/gi, keep)
    .replace(/\/villalar/gi, keep);

  const replacements: Array<[RegExp, string]> = [
    [/Villalarınızı/g, "Tesislerinizi"],
    [/villalarınızı/g, "tesislerinizi"],
    [/Villalarımızda/g, "Tesislerimizde"],
    [/villalarımızda/g, "tesislerimizde"],
    [/Villalarımız/g, "Tesislerimiz"],
    [/villalarımız/g, "tesislerimiz"],
    [/Villaları/g, "Tesisleri"],
    [/villaları/g, "tesisleri"],
    [/Villaların/g, "Tesislerin"],
    [/villaların/g, "tesislerin"],
    [/Villalarda/g, "Tesislerde"],
    [/villalarda/g, "tesislerde"],
    [/Villalara/g, "Tesislere"],
    [/villalara/g, "tesislere"],
    [/Villalar/g, "Tesisler"],
    [/villalar/g, "tesisler"],
    [/Villadan/g, "Tesisten"],
    [/villadan/g, "tesisten"],
    [/Villanızı/g, "Tesisinizi"],
    [/villanızı/g, "tesisinizi"],
    [/Villanın/g, "Tesisin"],
    [/villanın/g, "tesisin"],
    [/Villaya/g, "Tesise"],
    [/villaya/g, "tesise"],
    [/Villada/g, "Tesiste"],
    [/villada/g, "tesiste"],
    [/Villayı/g, "Tesisi"],
    [/villayı/g, "tesisi"],
    [/Kiralık Villa/g, "Kiralık Tesis"],
    [/kiralık villa/g, "kiralık tesis"],
    [/\bVilla\b/g, "Tesis"],
    [/\bvilla\b/g, "tesis"],
  ];

  for (const [pattern, value] of replacements) {
    out = out.replace(pattern, value);
  }

  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => saved[Number(index)] ?? "");
}

export function maybeRewriteVillaWording(
  text: string,
  siteKey?: string | null
): string {
  return usesTesisListingCopy(siteKey)
    ? rewriteVillaWordingToTesis(text)
    : text;
}

export function overlayTesisClientMessages<
  T extends {
    nav?: Record<string, unknown>;
    header?: Record<string, unknown>;
    mobileNav?: Record<string, unknown>;
    search?: Record<string, unknown>;
  },
>(messages: T, siteKey?: string | null): T {
  if (!usesTesisListingCopy(siteKey)) return messages;
  const copy = getPublicListingCopy(siteKey);
  return {
    ...messages,
    nav: messages.nav
      ? {
          ...messages.nav,
          villas: copy.plural,
          allVillas: copy.all,
          dealVillas: copy.deals,
        }
      : messages.nav,
    header: messages.header
      ? { ...messages.header, searchVilla: copy.search }
      : messages.header,
    mobileNav: messages.mobileNav
      ? { ...messages.mobileNav, search: copy.search }
      : messages.mobileNav,
    search: messages.search
      ? { ...messages.search, tabVilla: copy.singular }
      : messages.search,
  };
}
