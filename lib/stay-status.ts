export const StayStatus = {
  BEKLENIYOR: "BEKLENIYOR",
  YAPILDI: "YAPILDI",
  YAPILMADI: "YAPILMADI",
} as const;

export type StayStatus = (typeof StayStatus)[keyof typeof StayStatus];

export const STAY_STATUS_ORDER: StayStatus[] = [
  StayStatus.BEKLENIYOR,
  StayStatus.YAPILDI,
  StayStatus.YAPILMADI,
];

export const STAY_STATUS_META: Record<StayStatus, { label: string }> = {
  [StayStatus.BEKLENIYOR]: { label: "Bekleniyor" },
  [StayStatus.YAPILDI]: { label: "Yapıldı" },
  [StayStatus.YAPILMADI]: { label: "Yapılmadı" },
};

export const STAY_STATUS_OPTIONS = STAY_STATUS_ORDER.map((value) => ({
  value,
  label: STAY_STATUS_META[value].label,
}));

export function getStayStatusLabel(status: StayStatus): string {
  return STAY_STATUS_META[status].label;
}
