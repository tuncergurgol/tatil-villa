import type { AppLocale } from "@/i18n/routing";

export type Theme2Copy = {
  heroTitle: string;
  heroSubtitle: string;
  featuredTitle: string;
  featuredSubtitle: string;
  seeAll: string;
  empty: string;
  regionsTitle: string;
  regionsSubtitle: string;
  stayCount: string;
};

const COPY: Record<AppLocale, Theme2Copy> = {
  tr: {
    heroTitle: "Glamping, bungalov ve kubbe evleri keşfet",
    heroSubtitle:
      "Türkiye’nin doğasında bungalov ve kubbe konaklamalarını bulun.",
    featuredTitle: "Öne çıkan konaklamalar",
    featuredSubtitle: "Doğa içinde bungalov ve kubbe evleri",
    seeAll: "Tümünü gör",
    empty: "Şu anda listelenecek konaklama bulunamadı.",
    regionsTitle: "Popüler bölgeler",
    regionsSubtitle: "Glamping için en çok tercih edilen destinasyonlar",
    stayCount: "{count} konaklama",
  },
  en: {
    heroTitle: "Glamping, bungalows and dome stays in Turkey",
    heroSubtitle:
      "Bungalow and dome stays in Turkey’s countryside. Indicative nightly prices are shown in GBP.",
    featuredTitle: "Featured stays",
    featuredSubtitle: "Bungalows and dome houses in nature",
    seeAll: "See all",
    empty: "No stays to show right now.",
    regionsTitle: "Popular regions",
    regionsSubtitle: "Destinations guests choose most for glamping in Turkey",
    stayCount: "{count} stays",
  },
  de: {
    heroTitle: "Glamping, Bungalows und Kuppelhäuser in der Türkei",
    heroSubtitle:
      "Bungalow- und Kuppelunterkünfte in der türkischen Natur. Richtpreise pro Nacht in Euro.",
    featuredTitle: "Empfohlene Unterkünfte",
    featuredSubtitle: "Bungalows und Kuppelhäuser in der Natur",
    seeAll: "Alle ansehen",
    empty: "Derzeit sind keine Unterkünfte gelistet.",
    regionsTitle: "Beliebte Regionen",
    regionsSubtitle: "Die meistgebuchten Glamping-Ziele in der Türkei",
    stayCount: "{count} Unterkünfte",
  },
  fr: {
    heroTitle: "Glamping, bungalows et dômes en Turquie",
    heroSubtitle:
      "Bungalows et dômes dans la nature turque. Prix indicatifs à la nuit en euros.",
    featuredTitle: "Séjours à la une",
    featuredSubtitle: "Bungalows et maisons-dômes en pleine nature",
    seeAll: "Tout voir",
    empty: "Aucun hébergement à afficher pour le moment.",
    regionsTitle: "Régions populaires",
    regionsSubtitle: "Les destinations de glamping les plus choisies en Turquie",
    stayCount: "{count} hébergements",
  },
  es: {
    heroTitle: "Glamping, bungalows y cúpulas en Turquía",
    heroSubtitle:
      "Bungalows y cúpulas en la naturaleza de Turquía. Precios orientativos por noche en euros.",
    featuredTitle: "Alojamientos destacados",
    featuredSubtitle: "Bungalows y casas cúpula en la naturaleza",
    seeAll: "Ver todos",
    empty: "Ahora mismo no hay alojamientos para mostrar.",
    regionsTitle: "Regiones populares",
    regionsSubtitle: "Los destinos de glamping más elegidos en Turquía",
    stayCount: "{count} alojamientos",
  },
  bg: {
    heroTitle: "Глампинг, бунгала и куполни къщи в Турция",
    heroSubtitle:
      "Бунгала и куполни къщи сред природата на Турция. Ориентировъчни цени на нощ в евро.",
    featuredTitle: "Препоръчани места",
    featuredSubtitle: "Бунгала и куполни къщи сред природата",
    seeAll: "Виж всички",
    empty: "В момента няма обяви за настаняване.",
    regionsTitle: "Популярни региони",
    regionsSubtitle: "Най-избираните глампинг дестинации в Турция",
    stayCount: "{count} места",
  },
  el: {
    heroTitle: "Glamping, μπανγκαλόου και θόλοι στην Τουρκία",
    heroSubtitle:
      "Μπανγκαλόου και θόλοι στη φύση της Τουρκίας. Ενδεικτικές τιμές ανά διανυκτέρευση σε ευρώ.",
    featuredTitle: "Προτεινόμενες διαμονές",
    featuredSubtitle: "Μπανγκαλόου και θόλοι μέσα στη φύση",
    seeAll: "Δείτε όλα",
    empty: "Δεν υπάρχουν διαθέσιμες διαμονές αυτή τη στιγμή.",
    regionsTitle: "Δημοφιλείς περιοχές",
    regionsSubtitle: "Οι προορισμοί glamping που επιλέγονται περισσότερο στην Τουρκία",
    stayCount: "{count} διαμονές",
  },
  zh: {
    heroTitle: "土耳其野奢露营、平房与穹顶屋",
    heroSubtitle: "在土耳其自然中寻找平房和穹顶住宿。每晚参考价以欧元显示。",
    featuredTitle: "精选住宿",
    featuredSubtitle: "自然中的平房与穹顶屋",
    seeAll: "查看全部",
    empty: "目前没有可展示的住宿。",
    regionsTitle: "热门地区",
    regionsSubtitle: "土耳其最受欢迎的野奢露营目的地",
    stayCount: "{count} 处住宿",
  },
  ru: {
    heroTitle: "Глэмпинг, бунгало и купольные дома в Турции",
    heroSubtitle:
      "Бунгало и купольные дома на природе в Турции. Ориентировочные цены за ночь в евро.",
    featuredTitle: "Рекомендуемые варианты",
    featuredSubtitle: "Бунгало и купольные дома на природе",
    seeAll: "Смотреть все",
    empty: "Сейчас нет вариантов для показа.",
    regionsTitle: "Популярные регионы",
    regionsSubtitle: "Самые выбираемые направления для глэмпинга в Турции",
    stayCount: "{count} вариантов",
  },
};

export function theme2Copy(locale: string): Theme2Copy {
  if (locale in COPY) return COPY[locale as AppLocale];
  return COPY.en;
}

export function theme2StayCount(locale: string, count: number): string {
  return theme2Copy(locale).stayCount.replace("{count}", String(count));
}
