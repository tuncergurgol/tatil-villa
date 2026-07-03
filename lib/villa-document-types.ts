import type { TourismDocumentType } from "@prisma/client";

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

export function hasVillaTourismDocument(villa: {
  documentType: TourismDocumentType | null;
  documentNo: string;
}) {
  return Boolean(villa.documentType || villa.documentNo.trim());
}
