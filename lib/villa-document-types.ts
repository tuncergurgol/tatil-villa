import type { TourismDocumentType } from "@prisma/client";

export const KONUT_BELGE_NO_PREFIXES = ["07-", "35-", "48-", "54-"] as const;

export const TOURISM_DOCUMENT_TYPES: {
  value: TourismDocumentType;
  label: string;
}[] = [
  { value: "KONUT_BELGESI", label: "Konut Belgesi (7464 S.K.)" },
  { value: "TURIZM_ISLETME_BELGESI", label: "Turizm İşletme Belgesi" },
  {
    value: "KISMI_TURIZM_ISLETME_BELGESI",
    label: "Kısmi Turizm İşletme Belgesi",
  },
  { value: "TURIZM_YATIRIMI_BELGESI", label: "Turizm Yatırımı Belgesi" },
  { value: "BASIT_KONAKLAMA", label: "Basit Konaklama" },
  { value: "PLAJ_ISLETMESI", label: "Plaj İşletmesi" },
];

export function getTourismDocumentLabel(type: TourismDocumentType | null) {
  if (!type) return "";
  return TOURISM_DOCUMENT_TYPES.find((item) => item.value === type)?.label ?? "";
}

export const NON_KONUT_BELGE_DOCUMENT_TYPES = [
  "TURIZM_ISLETME_BELGESI",
  "KISMI_TURIZM_ISLETME_BELGESI",
  "TURIZM_YATIRIMI_BELGESI",
  "BASIT_KONAKLAMA",
  "PLAJ_ISLETMESI",
] as const satisfies readonly TourismDocumentType[];

/** KTB vatandas.ktb.gov.tr/konut-belge linki yalnızca Konut Belgesi (7464 S.K.) için geçerlidir. */
export function isKonutBelgesiDocumentType(
  documentType: TourismDocumentType | null | undefined
) {
  return documentType === "KONUT_BELGESI";
}

export function inferKonutBelgesiType(
  documentNo: string
): TourismDocumentType | null {
  const normalized = documentNo.trim().toLowerCase();
  if (
    KONUT_BELGE_NO_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return "KONUT_BELGESI";
  }
  return null;
}

/** Belge no önekine göre türü çözümler; 07-/35-/48-/54- ile başlayanlar Konut Belgesi sayılır. */
export function resolveVillaDocumentType(
  documentNo: string,
  documentType: TourismDocumentType | null | undefined
): TourismDocumentType | null {
  const inferred = inferKonutBelgesiType(documentNo);
  if (inferred) return inferred;
  return documentType ?? null;
}

export function isKonutBelgeLinkable(villa: {
  documentType: TourismDocumentType | null | undefined;
  documentNo: string;
}) {
  const documentNo = villa.documentNo.trim();
  if (!documentNo) return false;

  return (
    resolveVillaDocumentType(documentNo, villa.documentType) === "KONUT_BELGESI"
  );
}

export function hasVillaTourismDocument(villa: {
  documentType: TourismDocumentType | null;
  documentNo: string;
}) {
  return Boolean(
    resolveVillaDocumentType(villa.documentNo, villa.documentType) ||
      villa.documentNo.trim()
  );
}

export function parseDocumentNoParts(documentNo: string) {
  const trimmed = documentNo.trim();
  const match = trimmed.match(/^(\d{2}-)(.+)$/);
  if (match) {
    return {
      prefix: match[1],
      number: match[2],
    };
  }

  return {
    prefix: "",
    number: trimmed,
  };
}

export function combineDocumentNo(prefix: string, number: string) {
  const normalizedPrefix = prefix.trim();
  const normalizedNumber = number.trim();

  if (!normalizedPrefix && !normalizedNumber) return "";
  if (!normalizedPrefix) return normalizedNumber;
  if (!normalizedNumber) return normalizedPrefix;

  return normalizedPrefix.endsWith("-")
    ? `${normalizedPrefix}${normalizedNumber}`
    : `${normalizedPrefix}-${normalizedNumber}`;
}
