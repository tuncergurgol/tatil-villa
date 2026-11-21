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

const VILLA_COPY_BY_LOCALE: Record<string, PublicListingCopy> = {
  en: {
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
  },
  de: {
    usesTesis: false,
    singular: "Villa",
    plural: "Villen",
    rentalSingular: "Villa zur Miete",
    rentalPlural: "Villen zur Miete",
    all: "Alle Villen",
    allShow: "Alle Villen anzeigen",
    deals: "Angebotsvillen",
    popular: "Beliebte Villen",
    recommended: "Empfohlene Villen",
    listingTitle: "Villa zur Miete",
    rentalAndBungalows: "Villen und Bungalows zur Miete",
    similar: "Ähnliche Villen",
    categories: "Villa-Kategorien",
    typeFilter: "Haustyp",
    search: "Villa suchen",
    detail: "Villa-Details",
    amenities: "Villa-Ausstattung",
    breadcrumb: "Villa",
    travelAddon:
      "Zusätzlich zu Ihrem Villa-Aufenthalt: Hotel, Transfer, Mietwagen und Transport",
  },
  fr: {
    usesTesis: false,
    singular: "Villa",
    plural: "Villas",
    rentalSingular: "Villa à louer",
    rentalPlural: "Villas à louer",
    all: "Toutes les villas",
    allShow: "Voir toutes les villas",
    deals: "Villas en promotion",
    popular: "Villas populaires",
    recommended: "Villas recommandées",
    listingTitle: "Villa à louer",
    rentalAndBungalows: "Villas et bungalows à louer",
    similar: "Villas similaires",
    categories: "Catégories de villas",
    typeFilter: "Type de logement",
    search: "Rechercher une villa",
    detail: "Détails de la villa",
    amenities: "Équipements de la villa",
    breadcrumb: "Villa",
    travelAddon:
      "En plus de votre séjour en villa : hôtel, transfert, location de voiture et transport",
  },
  es: {
    usesTesis: false,
    singular: "Villa",
    plural: "Villas",
    rentalSingular: "Villa en alquiler",
    rentalPlural: "Villas en alquiler",
    all: "Todas las villas",
    allShow: "Ver todas las villas",
    deals: "Villas en oferta",
    popular: "Villas populares",
    recommended: "Villas recomendadas",
    listingTitle: "Villa en alquiler",
    rentalAndBungalows: "Villas y bungalós en alquiler",
    similar: "Villas similares",
    categories: "Categorías de villas",
    typeFilter: "Tipo de vivienda",
    search: "Buscar villa",
    detail: "Detalles de la villa",
    amenities: "Comodidades de la villa",
    breadcrumb: "Villa",
    travelAddon:
      "Además de tu estancia en villa: hotel, traslado, alquiler de coche y transporte",
  },
  bg: {
    usesTesis: false,
    singular: "Вила",
    plural: "Вили",
    rentalSingular: "Вила под наем",
    rentalPlural: "Вили под наем",
    all: "Всички вили",
    allShow: "Покажи всички вили",
    deals: "Вили на промоция",
    popular: "Популярни вили",
    recommended: "Препоръчани вили",
    listingTitle: "Вила под наем",
    rentalAndBungalows: "Вили и бунгала под наем",
    similar: "Подобни вили",
    categories: "Категории вили",
    typeFilter: "Тип жилище",
    search: "Търси вила",
    detail: "Детайли за вилата",
    amenities: "Удобства на вилата",
    breadcrumb: "Вила",
    travelAddon:
      "В допълнение към престоя във вилата: хотел, трансфер, кола под наем и транспорт",
  },
  el: {
    usesTesis: false,
    singular: "Βίλα",
    plural: "Βίλες",
    rentalSingular: "Βίλα προς ενοικίαση",
    rentalPlural: "Βίλες προς ενοικίαση",
    all: "Όλες οι βίλες",
    allShow: "Εμφάνιση όλων των βιλών",
    deals: "Βίλες προσφοράς",
    popular: "Δημοφιλείς βίλες",
    recommended: "Προτεινόμενες βίλες",
    listingTitle: "Βίλα προς ενοικίαση",
    rentalAndBungalows: "Βίλες και μπανγκαλόου προς ενοικίαση",
    similar: "Παρόμοιες βίλες",
    categories: "Κατηγορίες βιλών",
    typeFilter: "Τύπος κατοικίας",
    search: "Αναζήτηση βίλας",
    detail: "Λεπτομέρειες βίλας",
    amenities: "Παροχές βίλας",
    breadcrumb: "Βίλα",
    travelAddon:
      "Εκτός από τη διαμονή στη βίλα: ξενοδοχείο, μεταφορά, ενοικίαση αυτοκινήτου και συγκοινωνία",
  },
  zh: {
    usesTesis: false,
    singular: "别墅",
    plural: "别墅",
    rentalSingular: "可租别墅",
    rentalPlural: "可租别墅",
    all: "全部别墅",
    allShow: "查看全部别墅",
    deals: "优惠别墅",
    popular: "热门别墅",
    recommended: "推荐别墅",
    listingTitle: "可租别墅",
    rentalAndBungalows: "可租别墅与小屋",
    similar: "相似别墅",
    categories: "别墅分类",
    typeFilter: "房屋类型",
    search: "搜索别墅",
    detail: "别墅详情",
    amenities: "别墅设施",
    breadcrumb: "别墅",
    travelAddon: "除别墅住宿外，还可安排酒店、接送、租车与交通",
  },
  ru: {
    usesTesis: false,
    singular: "Вилла",
    plural: "Виллы",
    rentalSingular: "Вилла в аренду",
    rentalPlural: "Виллы в аренду",
    all: "Все виллы",
    allShow: "Показать все виллы",
    deals: "Виллы со скидкой",
    popular: "Популярные виллы",
    recommended: "Рекомендуемые виллы",
    listingTitle: "Вилла в аренду",
    rentalAndBungalows: "Виллы и бунгало в аренду",
    similar: "Похожие виллы",
    categories: "Категории вилл",
    typeFilter: "Тип жилья",
    search: "Поиск виллы",
    detail: "О вилле",
    amenities: "Удобства виллы",
    breadcrumb: "Вилла",
    travelAddon:
      "В дополнение к проживанию на вилле: отель, трансфер, аренда авто и транспорт",
  },
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

const TESIS_COPY_BY_LOCALE: Record<string, PublicListingCopy> = {
  en: {
    usesTesis: true,
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
  },
  de: {
    usesTesis: true,
    singular: "Unterkunft",
    plural: "Unterkünfte",
    rentalSingular: "Unterkunft zur Miete",
    rentalPlural: "Unterkünfte zur Miete",
    all: "Alle Unterkünfte",
    allShow: "Alle Unterkünfte anzeigen",
    deals: "Angebotsunterkünfte",
    popular: "Beliebte Unterkünfte",
    recommended: "Empfohlene Unterkünfte",
    listingTitle: "Unterkunft zur Miete",
    rentalAndBungalows: "Unterkünfte und Bungalows zur Miete",
    similar: "Ähnliche Unterkünfte",
    categories: "Unterkunftskategorien",
    typeFilter: "Unterkunftstyp",
    search: "Unterkunft suchen",
    detail: "Unterkunftsdetails",
    amenities: "Unterkunftsausstattung",
    breadcrumb: "Unterkunft",
    travelAddon:
      "Zusätzlich zu Ihrem Aufenthalt: Hotel, Transfer, Mietwagen und Transport",
  },
  fr: {
    usesTesis: true,
    singular: "Hébergement",
    plural: "Hébergements",
    rentalSingular: "Hébergement à louer",
    rentalPlural: "Hébergements à louer",
    all: "Tous les hébergements",
    allShow: "Voir tous les hébergements",
    deals: "Hébergements en promotion",
    popular: "Hébergements populaires",
    recommended: "Hébergements recommandés",
    listingTitle: "Hébergement à louer",
    rentalAndBungalows: "Hébergements et bungalows à louer",
    similar: "Hébergements similaires",
    categories: "Catégories d'hébergement",
    typeFilter: "Type d'hébergement",
    search: "Rechercher un hébergement",
    detail: "Détails de l'hébergement",
    amenities: "Équipements",
    breadcrumb: "Hébergement",
    travelAddon:
      "En plus de votre séjour : hôtel, transfert, location de voiture et transport",
  },
  es: {
    usesTesis: true,
    singular: "Alojamiento",
    plural: "Alojamientos",
    rentalSingular: "Alojamiento en alquiler",
    rentalPlural: "Alojamientos en alquiler",
    all: "Todos los alojamientos",
    allShow: "Ver todos los alojamientos",
    deals: "Alojamientos en oferta",
    popular: "Alojamientos populares",
    recommended: "Alojamientos recomendados",
    listingTitle: "Alojamiento en alquiler",
    rentalAndBungalows: "Alojamientos y bungalós en alquiler",
    similar: "Alojamientos similares",
    categories: "Categorías de alojamiento",
    typeFilter: "Tipo de alojamiento",
    search: "Buscar alojamiento",
    detail: "Detalles del alojamiento",
    amenities: "Comodidades",
    breadcrumb: "Alojamiento",
    travelAddon:
      "Además de tu estancia: hotel, traslado, alquiler de coche y transporte",
  },
  bg: {
    usesTesis: true,
    singular: "Обект",
    plural: "Обекти",
    rentalSingular: "Обект под наем",
    rentalPlural: "Обекти под наем",
    all: "Всички обекти",
    allShow: "Покажи всички обекти",
    deals: "Обекти на промоция",
    popular: "Популярни обекти",
    recommended: "Препоръчани обекти",
    listingTitle: "Обект под наем",
    rentalAndBungalows: "Обекти и бунгала под наем",
    similar: "Подобни обекти",
    categories: "Категории обекти",
    typeFilter: "Тип обект",
    search: "Търси обект",
    detail: "Детайли за обекта",
    amenities: "Удобства",
    breadcrumb: "Обект",
    travelAddon:
      "В допълнение към престоя: хотел, трансфер, кола под наем и транспорт",
  },
  el: {
    usesTesis: true,
    singular: "Κατάλυμα",
    plural: "Καταλύματα",
    rentalSingular: "Κατάλυμα προς ενοικίαση",
    rentalPlural: "Καταλύματα προς ενοικίαση",
    all: "Όλα τα καταλύματα",
    allShow: "Εμφάνιση όλων των καταλυμάτων",
    deals: "Καταλύματα προσφοράς",
    popular: "Δημοφιλή καταλύματα",
    recommended: "Προτεινόμενα καταλύματα",
    listingTitle: "Κατάλυμα προς ενοικίαση",
    rentalAndBungalows: "Καταλύματα και μπανγκαλόου προς ενοικίαση",
    similar: "Παρόμοια καταλύματα",
    categories: "Κατηγορίες καταλυμάτων",
    typeFilter: "Τύπος καταλύματος",
    search: "Αναζήτηση καταλύματος",
    detail: "Λεπτομέρειες καταλύματος",
    amenities: "Παροχές",
    breadcrumb: "Κατάλυμα",
    travelAddon:
      "Εκτός από τη διαμονή σας: ξενοδοχείο, μεταφορά, ενοικίαση αυτοκινήτου και συγκοινωνία",
  },
  zh: {
    usesTesis: true,
    singular: "住宿",
    plural: "住宿",
    rentalSingular: "可租住宿",
    rentalPlural: "可租住宿",
    all: "全部住宿",
    allShow: "查看全部住宿",
    deals: "优惠住宿",
    popular: "热门住宿",
    recommended: "推荐住宿",
    listingTitle: "可租住宿",
    rentalAndBungalows: "可租住宿与小屋",
    similar: "相似住宿",
    categories: "住宿分类",
    typeFilter: "住宿类型",
    search: "搜索住宿",
    detail: "住宿详情",
    amenities: "住宿设施",
    breadcrumb: "住宿",
    travelAddon: "除住宿外，还可安排酒店、接送、租车与交通",
  },
  ru: {
    usesTesis: true,
    singular: "Объект",
    plural: "Объекты",
    rentalSingular: "Объект в аренду",
    rentalPlural: "Объекты в аренду",
    all: "Все объекты",
    allShow: "Показать все объекты",
    deals: "Объекты со скидкой",
    popular: "Популярные объекты",
    recommended: "Рекомендуемые объекты",
    listingTitle: "Объект в аренду",
    rentalAndBungalows: "Объекты и бунгало в аренду",
    similar: "Похожие объекты",
    categories: "Категории объектов",
    typeFilter: "Тип объекта",
    search: "Поиск объекта",
    detail: "Об объекте",
    amenities: "Удобства",
    breadcrumb: "Объект",
    travelAddon:
      "В дополнение к проживанию: отель, трансфер, аренда авто и транспорт",
  },
};

export function usesTesisListingCopy(siteKey?: string | null): boolean {
  return getPublicHomeTheme(siteKey) === "theme-2";
}

export function getPublicListingCopy(
  siteKey?: string | null,
  locale: string = "tr"
): PublicListingCopy {
  if (usesTesisListingCopy(siteKey)) {
    if (locale === "tr") return TESIS_COPY;
    return TESIS_COPY_BY_LOCALE[locale] ?? TESIS_COPY_BY_LOCALE.en!;
  }
  if (locale === "tr") return VILLA_COPY;
  return VILLA_COPY_BY_LOCALE[locale] ?? VILLA_COPY_BY_LOCALE.en!;
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
  if (locale === "tr") {
    return usesTesisListingCopy(siteKey)
      ? `${year} Erken Rezervasyon Tesisleri`
      : `${year} Erken Rezervasyon Villaları`;
  }
  const copy = getPublicListingCopy(siteKey, locale);
  const earlyByLocale: Record<string, string> = {
    en: usesTesisListingCopy(siteKey)
      ? `${year} Early Booking Properties`
      : `${year} Early Booking Villas`,
    de: `${year} Frühbucher-${copy.plural}`,
    fr: `${copy.plural} réservation anticipée ${year}`,
    es: `${copy.plural} de reserva anticipada ${year}`,
    bg: `${copy.plural} с ранна резервация ${year}`,
    el: `${copy.plural} πρόωρης κράτησης ${year}`,
    zh: `${year} 早鸟预订${copy.plural}`,
    ru: `${copy.plural} раннего бронирования ${year}`,
  };
  return earlyByLocale[locale] ?? earlyByLocale.en!;
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
