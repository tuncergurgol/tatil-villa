import type {
  CarRentalDriverCriterionItem,
  CarRentalPageSettingsData,
} from "@/lib/queries/car-rental";

const SETTINGS_EN: Partial<Record<keyof CarRentalPageSettingsData, string>> = {
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
};

const AGE_EN: Record<string, string> = {
  "21-24 yaş": "21-24 years",
  "25-69 yaş": "25-69 years",
  "70+ yaş": "70+ years",
};

const CRITERIA_EN: Record<string, { title: string; description: string }> = {
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
    description:
      "A Turkish ID card or a valid passport must be presented.",
  },
  "Sürücü kaydı": {
    title: "Driver details",
    description:
      "The person collecting the car must match the driver named on the reservation.",
  },
};

export function localizeCarRentalSettings(
  settings: CarRentalPageSettingsData,
  locale: string
): CarRentalPageSettingsData {
  if (locale === "tr") return settings;
  const next = { ...settings };
  for (const [key, value] of Object.entries(SETTINGS_EN) as Array<
    [keyof CarRentalPageSettingsData, string]
  >) {
    if (typeof next[key] === "string" && next[key]) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  if (AGE_EN[next.defaultDriverAge]) {
    next.defaultDriverAge = AGE_EN[next.defaultDriverAge]!;
  }
  return next;
}

export function localizeCarRentalDriverAges(
  options: string[],
  locale: string
): string[] {
  if (locale === "tr") return options;
  return options.map((option) => AGE_EN[option] ?? option.replace(/ yaş$/i, " years"));
}

export function localizeCarRentalCriteria(
  items: CarRentalDriverCriterionItem[],
  locale: string
): CarRentalDriverCriterionItem[] {
  if (locale === "tr") return items;
  return items.map((item) => {
    const en = CRITERIA_EN[item.title];
    return en ? { ...item, title: en.title, description: en.description } : item;
  });
}
