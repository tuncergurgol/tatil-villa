import type { AppLocale } from "@/i18n/routing";

type SeoCopy = { title: string; description: string };

const HOME: Record<AppLocale, SeoCopy> = {
  tr: {
    title: "Türkiye'de Özel Havuzlu Villa Kiralama",
    description:
      "Kalkan, Fethiye, Kaş ve Antalya'da özel ve ısıtmalı havuzlu villa kiralama. Çiftler ve kalabalık aileler için müsaitliği görün, TÜRSAB güvencesiyle rezervasyon yapın.",
  },
  en: {
    title: "Turkey Villa Holidays with a Private or Heated Pool",
    description:
      "Villa rental in Kalkan, Fethiye, Kaş and Antalya for couples and large families. Private and heated pools, airport transfer notes and prices shown in GBP.",
  },
  de: {
    title: "Ferienhaus Türkei mit privatem oder beheiztem Pool",
    description:
      "Villa mieten in Kalkan, Fethiye, Kaş und Antalya. Für Paare und große Familien, mit beheiztem Pool, Transferhinweisen und Preisen in Euro.",
  },
  fr: {
    title: "Location de villa en Turquie avec piscine privée ou chauffée",
    description:
      "Villas à Kalkan, Fethiye, Kaş et Antalya pour couples et grandes familles. Piscine chauffée, infos transfert et tarifs affichés en euros.",
  },
  es: {
    title: "Alquiler de villas en Turquía con piscina privada o climatizada",
    description:
      "Villas en Kalkan, Fethiye, Kaş y Antalya para parejas y familias numerosas. Piscina climatizada, traslados y precios en euros.",
  },
  bg: {
    title: "Вили под наем в Турция с частен или отопляем басейн",
    description:
      "Вили в Калкан, Фетхие, Каш и Анталия за двойки и големи семейства. Отопляем басейн, трансфер и цени в евро.",
  },
  el: {
    title: "Ενοικίαση βίλας στην Τουρκία με ιδιωτική ή θερμαινόμενη πισίνα",
    description:
      "Βίλες σε Kalkan, Fethiye, Kaş και Αττάλεια για ζευγάρια και μεγάλες οικογένειες. Θερμαινόμενη πισίνα, μεταφορά και τιμές σε ευρώ.",
  },
  zh: {
    title: "土耳其别墅出租，私人泳池或恒温泳池",
    description:
      "卡勒坎、费特希耶、卡什和安塔利亚别墅，适合情侣与大家庭。恒温泳池、接送说明，价格以欧元显示。",
  },
  ru: {
    title: "Аренда виллы в Турции с частным или подогреваемым бассейном",
    description:
      "Виллы в Калкане, Фетхие, Каше и Анталье для пар и больших семей. Подогреваемый бассейн, трансфер и цены в евро.",
  },
};

const BLOG: Record<AppLocale, SeoCopy> = {
  tr: {
    title: "Bir sonraki seyahatiniz için ilham alın",
    description: "Villa kiralama rehberi, bölge önerileri ve tatil ipuçları.",
  },
  en: {
    title: "Turkey villa holiday guides",
    description:
      "Guides to Kalkan winter sun, heated-pool villas, transfers and family holidays in Turkey.",
  },
  de: {
    title: "Reiseführer für den Türkei-Urlaub in einer Villa",
    description:
      "Kalkan im Winter, Villen mit beheiztem Pool, Transfer und Familienurlaub an der türkischen Küste.",
  },
  fr: {
    title: "Guides pour des vacances en villa en Turquie",
    description:
      "Kalkan au soleil d'hiver, villas avec piscine chauffée, transferts et séjours en famille.",
  },
  es: {
    title: "Guías para unas vacaciones en villa en Turquía",
    description:
      "Kalkan en invierno, villas con piscina climatizada, traslados y vacaciones en familia.",
  },
  bg: {
    title: "Пътеводители за почивка във вила в Турция",
    description:
      "Калкан през зимата, вили с отопляем басейн, трансфер и семейна почивка.",
  },
  el: {
    title: "Οδηγοί για διακοπές σε βίλα στην Τουρκία",
    description:
      "Kalkan τον χειμώνα, βίλες με θερμαινόμενη πισίνα, μεταφορές και οικογενειακές διακοπές.",
  },
  zh: {
    title: "土耳其别墅度假指南",
    description: "卡勒坎冬季阳光、恒温泳池别墅、接送与家庭度假建议。",
  },
  ru: {
    title: "Гиды по отдыху на вилле в Турции",
    description:
      "Калкан зимой, виллы с подогреваемым бассейном, трансфер и семейный отдых.",
  },
};

const LISTING: Record<AppLocale, { region: string; all: string }> = {
  tr: {
    region:
      "{region} bölgesinde kiralık villa ve bungalovlar. Müsaitliği görün ve rezervasyon yapın.",
    all: "Türkiye'nin öne çıkan bölgelerinde kiralık villa ve bungalovlar. Filtreleyin, müsaitliği görün ve rezervasyon yapın.",
  },
  en: {
    region:
      "Villa rental in {region}, Turkey. Private pools, heated pools where listed, availability and booking in GBP.",
    all: "Villas and bungalows for rent across Turkey. Filter by region, check availability and compare prices in GBP.",
  },
  de: {
    region:
      "Villa mieten in {region}, Türkei. Privater Pool, beheizter Pool wo angegeben, Verfügbarkeit und Preise in Euro.",
    all: "Ferienhäuser und Bungalows in der Türkei. Nach Region filtern, Verfügbarkeit prüfen und Preise in Euro vergleichen.",
  },
  fr: {
    region:
      "Location de villa à {region}, Turquie. Piscine privée, piscine chauffée si indiquée, disponibilités et tarifs en euros.",
    all: "Villas et bungalows à louer en Turquie. Filtrez par région, vérifiez les disponibilités et comparez les prix en euros.",
  },
  es: {
    region:
      "Alquiler de villas en {region}, Turquía. Piscina privada o climatizada si consta, disponibilidad y precios en euros.",
    all: "Villas y bungalows de alquiler en Turquía. Filtre por región, consulte disponibilidad y compare precios en euros.",
  },
  bg: {
    region:
      "Вила под наем в {region}, Турция. Частен или отопляем басейн, наличност и цени в евро.",
    all: "Вили и бунгала под наем в Турция. Филтрирайте по регион, вижте наличност и цени в евро.",
  },
  el: {
    region:
      "Ενοικίαση βίλας στην περιοχή {region}, Τουρκία. Ιδιωτική ή θερμαινόμενη πισίνα, διαθεσιμότητα και τιμές σε ευρώ.",
    all: "Βίλες και μπανγκαλόου προς ενοικίαση στην Τουρκία. Φίλτρο περιοχής, διαθεσιμότητα και τιμές σε ευρώ.",
  },
  zh: {
    region: "{region}（土耳其）别墅出租。私人泳池或恒温泳池、空房与欧元价格。",
    all: "土耳其别墅与木屋出租。按地区筛选，查看空房并以欧元比较价格。",
  },
  ru: {
    region:
      "Аренда виллы в {region}, Турция. Частный или подогреваемый бассейн, наличие и цены в евро.",
    all: "Виллы и бунгало в Турции. Фильтр по региону, наличие и цены в евро.",
  },
};

const FAQ: Record<AppLocale, string> = {
  tr: "Villa kiralama, rezervasyon, ödeme, iptal ve konaklama hakkında sık sorulan sorular ve cevapları.",
  en: "Questions on Turkey villa rental, booking, payment, cancellation, transfers and heated pools.",
  de: "Fragen zu Villa mieten in der Türkei, Buchung, Zahlung, Storno, Transfer und beheiztem Pool.",
  fr: "Questions sur la location de villa en Turquie, la réservation, le paiement, l'annulation et le transfert.",
  es: "Preguntas sobre alquiler de villas en Turquía, reserva, pago, cancelación y traslado.",
  bg: "Въпроси за наем на вила в Турция, резервация, плащане, анулиране и трансфер.",
  el: "Ερωτήσεις για ενοικίαση βίλας στην Τουρκία, κράτηση, πληρωμή, ακύρωση και μεταφορά.",
  zh: "关于土耳其别墅出租、预订、付款、取消与接送的常见问题。",
  ru: "Вопросы об аренде виллы в Турции, бронировании, оплате, отмене и трансфере.",
};

const REVIEWS: Record<AppLocale, string> = {
  tr: "Villalarımızda konaklayan misafirlerimizin değerlendirmeleri.",
  en: "Reviews from guests who stayed in our Turkey villas.",
  de: "Bewertungen von Gästen, die in unseren Türkei-Villen übernachtet haben.",
  fr: "Avis des voyageurs ayant séjourné dans nos villas en Turquie.",
  es: "Opiniones de quienes se alojaron en nuestras villas en Turquía.",
  bg: "Отзиви от гости, отседнали в нашите вили в Турция.",
  el: "Κριτικές επισκεπτών που έμειναν στις βίλες μας στην Τουρκία.",
  zh: "入住我们土耳其别墅的客人评价。",
  ru: "Отзывы гостей, которые жили на наших виллах в Турции.",
};

function asLocale(locale: string): AppLocale {
  return (locale in HOME ? locale : "en") as AppLocale;
}

export function homeSeo(locale: string): SeoCopy {
  return HOME[asLocale(locale)];
}

export function blogIndexSeo(locale: string): SeoCopy {
  return BLOG[asLocale(locale)];
}

const BLOG_ARCHIVE: Record<AppLocale, SeoCopy> = {
  tr: {
    title: "Tüm Blog Yazıları",
    description:
      "Villa kiralama, bölge rehberleri, balayı ve havuz konforu yazılarının tamamı. Tatil planınız için güncel ipuçları.",
  },
  en: {
    title: "All Blog Posts",
    description:
      "All villa rental guides, region tips, honeymoon and pool comfort articles for planning your Turkey holiday.",
  },
  de: {
    title: "Alle Blogbeiträge",
    description:
      "Alle Villa-Ratgeber, Regions-Tipps sowie Beiträge zu Flitterwochen und Pool-Komfort für Ihren Türkei-Urlaub.",
  },
  fr: {
    title: "Tous les articles du blog",
    description:
      "Tous les guides villa, conseils régionaux et articles balnéaires pour préparer vos vacances en Turquie.",
  },
  es: {
    title: "Todas las entradas del blog",
    description:
      "Todas las guías de villas, consejos de destino y artículos de confort para planificar tus vacaciones en Turquía.",
  },
  bg: {
    title: "Всички публикации в блога",
    description:
      "Всички ръководства за вили, регионални съвети и статии за комфорт за вашата почивка в Турция.",
  },
  el: {
    title: "Όλα τα άρθρα του blog",
    description:
      "Όλοι οι οδηγοί βιλών, συμβουλές προορισμών και άρθρα άνεσης για τις διακοπές σας στην Τουρκία.",
  },
  zh: {
    title: "全部博客文章",
    description: "别墅出租指南、目的地建议与泳池舒适相关文章合集，助您规划土耳其假期。",
  },
  ru: {
    title: "Все статьи блога",
    description:
      "Все гиды по виллам, советы по регионам и статьи о комфорте для планирования отдыха в Турции.",
  },
};

export function blogArchiveSeo(locale: string): SeoCopy {
  return BLOG_ARCHIVE[asLocale(locale)];
}

export function villaListingDescription(
  locale: string,
  regionName = ""
): string {
  const copy = LISTING[asLocale(locale)];
  const region = regionName.trim();
  if (!region) return copy.all;
  return copy.region.split("{region}").join(region);
}

export function faqMetaDescription(locale: string): string {
  return FAQ[asLocale(locale)];
}

export function reviewsMetaDescription(locale: string): string {
  return REVIEWS[asLocale(locale)];
}
