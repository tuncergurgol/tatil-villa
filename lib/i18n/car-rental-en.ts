import type {
  CarRentalDriverCriterionItem,
  CarRentalPageSettingsData,
} from "@/lib/queries/car-rental";

type SettingsPack = Partial<Record<keyof CarRentalPageSettingsData, string>>;
type CriteriaPack = Record<string, { title: string; description: string }>;

const SETTINGS_BY_LOCALE: Record<string, SettingsPack> = {
  en: {
    heroTitle: "Renting a Car Has Never Been Easier!",
    heroSubtitle: "Search, compare and find the best car.",
    sameLocationLabel: "Return to the same location",
    pickupLabel: "Pick-up location",
    returnLabel: "Drop-off location",
    pickupDateLabel: "Pick-up date",
    returnDateLabel: "Drop-off date",
    driverAgeLabel: "Driver age",
    ctaText: "Search cars",
    categoriesTitle: "Car categories",
    locationsTitle: "Popular locations",
    criteriaTitle: "Driver requirements",
  },
  de: {
    heroTitle: "Autovermietung war noch nie so einfach!",
    heroSubtitle: "Suchen, vergleichen und das beste Auto finden.",
    sameLocationLabel: "Am gleichen Ort zurückgeben",
    pickupLabel: "Abholort",
    returnLabel: "Rückgabeort",
    pickupDateLabel: "Abholdatum",
    returnDateLabel: "Rückgabedatum",
    driverAgeLabel: "Alter des Fahrers",
    ctaText: "Autos suchen",
    categoriesTitle: "Fahrzeugkategorien",
    locationsTitle: "Beliebte Standorte",
    criteriaTitle: "Fahrer-Anforderungen",
  },
  fr: {
    heroTitle: "Louer une voiture n'a jamais été aussi simple !",
    heroSubtitle: "Recherchez, comparez et trouvez la meilleure voiture.",
    sameLocationLabel: "Retour au même endroit",
    pickupLabel: "Lieu de prise en charge",
    returnLabel: "Lieu de restitution",
    pickupDateLabel: "Date de prise en charge",
    returnDateLabel: "Date de restitution",
    driverAgeLabel: "Âge du conducteur",
    ctaText: "Rechercher des voitures",
    categoriesTitle: "Catégories de voitures",
    locationsTitle: "Lieux populaires",
    criteriaTitle: "Conditions pour le conducteur",
  },
  es: {
    heroTitle: "¡Alquilar un coche nunca fue tan fácil!",
    heroSubtitle: "Busque, compare y encuentre el mejor coche.",
    sameLocationLabel: "Devolver en el mismo lugar",
    pickupLabel: "Lugar de recogida",
    returnLabel: "Lugar de devolución",
    pickupDateLabel: "Fecha de recogida",
    returnDateLabel: "Fecha de devolución",
    driverAgeLabel: "Edad del conductor",
    ctaText: "Buscar coches",
    categoriesTitle: "Categorías de coche",
    locationsTitle: "Ubicaciones populares",
    criteriaTitle: "Requisitos del conductor",
  },
  bg: {
    heroTitle: "Наемането на кола никога не е било по-лесно!",
    heroSubtitle: "Търсете, сравнявайте и намерете най-добрия автомобил.",
    sameLocationLabel: "Връщане на същото място",
    pickupLabel: "Място на получаване",
    returnLabel: "Място на връщане",
    pickupDateLabel: "Дата на получаване",
    returnDateLabel: "Дата на връщане",
    driverAgeLabel: "Възраст на шофьора",
    ctaText: "Търси автомобили",
    categoriesTitle: "Категории автомобили",
    locationsTitle: "Популярни локации",
    criteriaTitle: "Изисквания към шофьора",
  },
  el: {
    heroTitle: "Η ενοικίαση αυτοκινήτου δεν ήταν ποτέ πιο εύκολη!",
    heroSubtitle: "Αναζητήστε, συγκρίνετε και βρείτε το καλύτερο αυτοκίνητο.",
    sameLocationLabel: "Επιστροφή στο ίδιο σημείο",
    pickupLabel: "Σημείο παραλαβής",
    returnLabel: "Σημείο επιστροφής",
    pickupDateLabel: "Ημερομηνία παραλαβής",
    returnDateLabel: "Ημερομηνία επιστροφής",
    driverAgeLabel: "Ηλικία οδηγού",
    ctaText: "Αναζήτηση αυτοκινήτων",
    categoriesTitle: "Κατηγορίες αυτοκινήτων",
    locationsTitle: "Δημοφιλείς τοποθεσίες",
    criteriaTitle: "Απαιτήσεις οδηγού",
  },
  zh: {
    heroTitle: "租车从未如此简单！",
    heroSubtitle: "搜索、比较并找到最合适的车。",
    sameLocationLabel: "同一地点还车",
    pickupLabel: "取车地点",
    returnLabel: "还车地点",
    pickupDateLabel: "取车日期",
    returnDateLabel: "还车日期",
    driverAgeLabel: "驾驶员年龄",
    ctaText: "搜索车辆",
    categoriesTitle: "车型分类",
    locationsTitle: "热门地点",
    criteriaTitle: "驾驶员要求",
  },
  ru: {
    heroTitle: "Арендовать машину ещё никогда не было так просто!",
    heroSubtitle: "Ищите, сравнивайте и выбирайте лучший автомобиль.",
    sameLocationLabel: "Вернуть в том же месте",
    pickupLabel: "Место получения",
    returnLabel: "Место возврата",
    pickupDateLabel: "Дата получения",
    returnDateLabel: "Дата возврата",
    driverAgeLabel: "Возраст водителя",
    ctaText: "Искать автомобили",
    categoriesTitle: "Категории автомобилей",
    locationsTitle: "Популярные локации",
    criteriaTitle: "Требования к водителю",
  },
};

const AGE_BY_LOCALE: Record<string, Record<string, string>> = {
  en: {
    "21-24 yaş": "21-24 years",
    "25-69 yaş": "25-69 years",
    "70+ yaş": "70+ years",
  },
  de: {
    "21-24 yaş": "21-24 Jahre",
    "25-69 yaş": "25-69 Jahre",
    "70+ yaş": "70+ Jahre",
  },
  fr: {
    "21-24 yaş": "21-24 ans",
    "25-69 yaş": "25-69 ans",
    "70+ yaş": "70+ ans",
  },
  es: {
    "21-24 yaş": "21-24 años",
    "25-69 yaş": "25-69 años",
    "70+ yaş": "70+ años",
  },
  bg: {
    "21-24 yaş": "21-24 години",
    "25-69 yaş": "25-69 години",
    "70+ yaş": "70+ години",
  },
  el: {
    "21-24 yaş": "21-24 ετών",
    "25-69 yaş": "25-69 ετών",
    "70+ yaş": "70+ ετών",
  },
  zh: {
    "21-24 yaş": "21-24 岁",
    "25-69 yaş": "25-69 岁",
    "70+ yaş": "70+ 岁",
  },
  ru: {
    "21-24 yaş": "21-24 года",
    "25-69 yaş": "25-69 лет",
    "70+ yaş": "70+ лет",
  },
};

const AGE_SUFFIX: Record<string, string> = {
  en: " years",
  de: " Jahre",
  fr: " ans",
  es: " años",
  bg: " години",
  el: " ετών",
  zh: " 岁",
  ru: " лет",
};

const CRITERIA_BY_LOCALE: Record<string, CriteriaPack> = {
  en: {
    "Yaş şartı": {
      title: "Age requirement",
      description:
        "Drivers must be at least 21. Young/senior driver fees may apply for ages 21–24 and 70+.",
    },
    Ehliyet: {
      title: "Driving licence",
      description:
        "A valid category B licence held for at least 1 year is required. An international licence is recommended for foreign drivers.",
    },
    "Kredi kartı": {
      title: "Credit card",
      description:
        "A deposit hold on a credit card in the driver’s name is required at pick-up. Prepaid cards are not accepted.",
    },
    "Kimlik belgesi": {
      title: "ID document",
      description: "A Turkish ID card or a valid passport must be presented.",
    },
    "Sürücü kaydı": {
      title: "Driver details",
      description:
        "The person collecting the car must match the driver named on the reservation.",
    },
  },
  de: {
    "Yaş şartı": {
      title: "Altersvoraussetzung",
      description:
        "Fahrer müssen mindestens 21 Jahre alt sein. Für 21–24 und 70+ können Zuschläge anfallen.",
    },
    Ehliyet: {
      title: "Führerschein",
      description:
        "Ein gültiger Führerschein der Klasse B seit mindestens 1 Jahr ist erforderlich. Für ausländische Fahrer wird ein internationaler Führerschein empfohlen.",
    },
    "Kredi kartı": {
      title: "Kreditkarte",
      description:
        "Bei der Abholung ist eine Kaution auf einer Kreditkarte auf den Namen des Fahrers erforderlich. Prepaid-Karten werden nicht akzeptiert.",
    },
    "Kimlik belgesi": {
      title: "Ausweisdokument",
      description:
        "Ein türkischer Personalausweis oder ein gültiger Reisepass muss vorgelegt werden.",
    },
    "Sürücü kaydı": {
      title: "Fahrerdaten",
      description:
        "Die abholende Person muss mit dem auf der Reservierung genannten Fahrer übereinstimmen.",
    },
  },
  fr: {
    "Yaş şartı": {
      title: "Condition d'âge",
      description:
        "Les conducteurs doivent avoir au moins 21 ans. Des frais jeunes/seniors peuvent s'appliquer pour 21–24 et 70+.",
    },
    Ehliyet: {
      title: "Permis de conduire",
      description:
        "Un permis B valide depuis au moins 1 an est requis. Un permis international est recommandé pour les conducteurs étrangers.",
    },
    "Kredi kartı": {
      title: "Carte de crédit",
      description:
        "Une caution sur une carte de crédit au nom du conducteur est requise à la prise en charge. Les cartes prépayées ne sont pas acceptées.",
    },
    "Kimlik belgesi": {
      title: "Pièce d'identité",
      description:
        "Une carte d'identité turque ou un passeport valide doit être présenté.",
    },
    "Sürücü kaydı": {
      title: "Informations conducteur",
      description:
        "La personne qui récupère la voiture doit correspondre au conducteur nommé sur la réservation.",
    },
  },
  es: {
    "Yaş şartı": {
      title: "Requisito de edad",
      description:
        "Los conductores deben tener al menos 21 años. Pueden aplicarse tasas para 21–24 y 70+.",
    },
    Ehliyet: {
      title: "Permiso de conducir",
      description:
        "Se requiere permiso B válido con al menos 1 año de antigüedad. Se recomienda permiso internacional para conductores extranjeros.",
    },
    "Kredi kartı": {
      title: "Tarjeta de crédito",
      description:
        "En la recogida se requiere una retención de depósito en una tarjeta a nombre del conductor. No se aceptan prepago.",
    },
    "Kimlik belgesi": {
      title: "Documento de identidad",
      description:
        "Debe presentarse DNI turco o pasaporte válido.",
    },
    "Sürücü kaydı": {
      title: "Datos del conductor",
      description:
        "Quien recoge el coche debe coincidir con el conductor de la reserva.",
    },
  },
  bg: {
    "Yaş şartı": {
      title: "Възрастово изискване",
      description:
        "Шофьорите трябва да са навършили поне 21 години. За 21–24 и 70+ може да има допълнителни такси.",
    },
    Ehliyet: {
      title: "Шофьорска книжка",
      description:
        "Изисква се валидна книжка категория B от поне 1 година. За чужденци се препоръчва международна книжка.",
    },
    "Kredi kartı": {
      title: "Кредитна карта",
      description:
        "При получаване се изисква депозит върху кредитна карта на името на шофьора. Предплатени карти не се приемат.",
    },
    "Kimlik belgesi": {
      title: "Документ за самоличност",
      description:
        "Трябва да се представи турска лична карта или валиден паспорт.",
    },
    "Sürücü kaydı": {
      title: "Данни за шофьора",
      description:
        "Лицето, което взема колата, трябва да съвпада с шофьора в резервацията.",
    },
  },
  el: {
    "Yaş şartı": {
      title: "Απαίτηση ηλικίας",
      description:
        "Οι οδηγοί πρέπει να είναι τουλάχιστον 21 ετών. Ενδέχεται χρεώσεις για 21–24 και 70+.",
    },
    Ehliyet: {
      title: "Δίπλωμα οδήγησης",
      description:
        "Απαιτείται έγκυρο δίπλωμα κατηγορίας Β τουλάχιστον 1 έτους. Διεθνές συνιστάται για αλλοδαπούς.",
    },
    "Kredi kartı": {
      title: "Πιστωτική κάρτα",
      description:
        "Κατά την παραλαβή απαιτείται εγγύηση σε πιστωτική κάρτα στο όνομα του οδηγού. Προπληρωμένες κάρτες δεν γίνονται δεκτές.",
    },
    "Kimlik belgesi": {
      title: "Έγγραφο ταυτότητας",
      description:
        "Πρέπει να προσκομιστεί τουρκική ταυτότητα ή ισχύον διαβατήριο.",
    },
    "Sürücü kaydı": {
      title: "Στοιχεία οδηγού",
      description:
        "Το άτομο που παραλαμβάνει το αυτοκίνητο πρέπει να ταυτίζεται με τον οδηγό της κράτησης.",
    },
  },
  zh: {
    "Yaş şartı": {
      title: "年龄要求",
      description: "驾驶员须年满 21 岁。21–24 岁及 70 岁以上可能收取附加费。",
    },
    Ehliyet: {
      title: "驾驶执照",
      description:
        "需持有有效 B 类驾照至少 1 年。外籍驾驶员建议持有国际驾照。",
    },
    "Kredi kartı": {
      title: "信用卡",
      description:
        "取车时需以驾驶员名义的信用卡预授权押金。不接受预付卡。",
    },
    "Kimlik belgesi": {
      title: "身份证件",
      description: "须出示土耳其身份证或有效护照。",
    },
    "Sürücü kaydı": {
      title: "驾驶员信息",
      description: "取车人须与预订上的驾驶员一致。",
    },
  },
  ru: {
    "Yaş şartı": {
      title: "Возрастное требование",
      description:
        "Водителям должно быть не менее 21 года. Для 21–24 и 70+ возможны доплаты.",
    },
    Ehliyet: {
      title: "Водительские права",
      description:
        "Требуются действующие права категории B не менее 1 года. Иностранным водителям рекомендуется международное удостоверение.",
    },
    "Kredi kartı": {
      title: "Кредитная карта",
      description:
        "При получении требуется депозит на кредитной карте на имя водителя. Предоплаченные карты не принимаются.",
    },
    "Kimlik belgesi": {
      title: "Документ удостоверяющий личность",
      description:
        "Необходимо предъявить турецкое удостоверение личности или действующий паспорт.",
    },
    "Sürücü kaydı": {
      title: "Данные водителя",
      description:
        "Получающий автомобиль должен совпадать с водителем в бронировании.",
    },
  },
};

function packFor(locale: string) {
  if (locale === "tr") return null;
  return {
    settings: SETTINGS_BY_LOCALE[locale] ?? SETTINGS_BY_LOCALE.en!,
    ages: AGE_BY_LOCALE[locale] ?? AGE_BY_LOCALE.en!,
    ageSuffix: AGE_SUFFIX[locale] ?? AGE_SUFFIX.en!,
    criteria: CRITERIA_BY_LOCALE[locale] ?? CRITERIA_BY_LOCALE.en!,
  };
}

export function localizeCarRentalSettings(
  settings: CarRentalPageSettingsData,
  locale: string
): CarRentalPageSettingsData {
  const pack = packFor(locale);
  if (!pack) return settings;
  const next = { ...settings };
  for (const [key, value] of Object.entries(pack.settings) as Array<
    [keyof CarRentalPageSettingsData, string]
  >) {
    if (typeof next[key] === "string" && next[key]) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  if (pack.ages[next.defaultDriverAge]) {
    next.defaultDriverAge = pack.ages[next.defaultDriverAge]!;
  }
  return next;
}

export function localizeCarRentalDriverAges(
  options: string[],
  locale: string
): string[] {
  const pack = packFor(locale);
  if (!pack) return options;
  return options.map(
    (option) => pack.ages[option] ?? option.replace(/ yaş$/i, pack.ageSuffix)
  );
}

export function localizeCarRentalCriteria(
  items: CarRentalDriverCriterionItem[],
  locale: string
): CarRentalDriverCriterionItem[] {
  const pack = packFor(locale);
  if (!pack) return items;
  return items.map((item) => {
    const localized = pack.criteria[item.title];
    return localized
      ? { ...item, title: localized.title, description: localized.description }
      : item;
  });
}
