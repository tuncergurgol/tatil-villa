import type {

  CallbackPreferredDay,

  CallbackPreferredTime,

  CallbackRequestStatus,

} from "@prisma/client";



export const CALLBACK_DAY_LABELS: Record<CallbackPreferredDay, string> = {

  TODAY: "Bugün",

  TOMORROW: "Yarın",

  THIS_WEEK: "Bu Hafta",

  ANY: "Fark Etmez",

};



export const CALLBACK_TIME_LABELS: Record<CallbackPreferredTime, string> = {

  ASAP: "En Kısa Zamanda",

  MORNING: "Sabah",

  AFTERNOON: "Öğleden Sonra",

  EVENING: "Akşam",

};



export const CALLBACK_STATUS_LABELS: Record<CallbackRequestStatus, string> = {

  PENDING: "Beklemede",

  VERIFIED: "Doğrulandı",

  NEW: "Yeni",

  CONTACTED: "Arandı",

  CLOSED: "Kapatıldı",

  CANCELLED: "İptal",

};



export const CAMPAIGN_DISPLAY_TYPE_LABELS = {

  SLIDER: "Slider",

  BOX: "Kutu",

} as const;


