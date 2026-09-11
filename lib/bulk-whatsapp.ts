export const BULK_WHATSAPP_WEEKDAYS = [
  { id: "MON", label: "Pazartesi" },
  { id: "TUE", label: "Salı" },
  { id: "WED", label: "Çarşamba" },
  { id: "THU", label: "Perşembe" },
  { id: "FRI", label: "Cuma" },
  { id: "SAT", label: "Cumartesi" },
  { id: "SUN", label: "Pazar" },
] as const;

export type BulkWhatsappWeekdayId =
  (typeof BULK_WHATSAPP_WEEKDAYS)[number]["id"];

const WEEKDAY_BY_JS_DAY: BulkWhatsappWeekdayId[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

export function parseHmToMinutes(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  const hours = Number.parseInt(match[1]!, 10);
  const minutes = Number.parseInt(match[2]!, 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0;
  return hours * 60 + minutes;
}

export function formatBulkWhatsappTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function renderBulkWhatsappMessage(input: {
  body: string;
  customerName: string;
  salutation: "NONE" | "SAYIN";
  appendTimestamp: boolean;
  now?: Date;
}): string {
  const customerName = input.customerName.trim() || "Misafir";
  let text = input.body.replace(/##MÜŞTERİADI-SOYADI##/gi, customerName);

  if (input.salutation === "SAYIN") {
    text = `Sayın, ${customerName}\n\n${text}`;
  }

  if (input.appendTimestamp) {
    const now = input.now ?? new Date();
    text = `${text}\n\n${formatBulkWhatsappTimestamp(now)}`;
  }

  return text.trim();
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isBulkWhatsappScheduleWindowOpen(
  campaign: {
    scheduleEnabled: boolean;
    scheduleFirstDate: Date | null;
    scheduleFirstTime: string;
    scheduleDays: string[];
    scheduleStartTime: string;
    scheduleEndTime: string;
  },
  now = new Date()
): boolean {
  if (!campaign.scheduleEnabled) return true;

  if (campaign.scheduleFirstDate) {
    const firstDate = new Date(campaign.scheduleFirstDate);
    firstDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    if (today < firstDate) return false;
  }

  const weekday = WEEKDAY_BY_JS_DAY[now.getDay()]!;
  if (
    campaign.scheduleDays.length > 0 &&
    !campaign.scheduleDays.includes(weekday)
  ) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseHmToMinutes(campaign.scheduleStartTime);
  const endMinutes = parseHmToMinutes(campaign.scheduleEndTime);
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
    return false;
  }

  if (
    campaign.scheduleFirstDate &&
    isSameLocalDate(now, new Date(campaign.scheduleFirstDate))
  ) {
    const firstMinutes = parseHmToMinutes(campaign.scheduleFirstTime);
    if (currentMinutes < firstMinutes) return false;
  }

  return true;
}

export const BULK_WHATSAPP_MESSAGE_STATUS_LABELS = {
  PENDING: "Beklemede",
  SENDING: "Gönderiliyor",
  SENT: "Gönderildi",
  FAILED: "Hatalı",
  CANCELLED: "İptal",
} as const;

export const BULK_WHATSAPP_CAMPAIGN_STATUS_LABELS = {
  DRAFT: "Taslak",
  SCHEDULED: "Planlandı",
  RUNNING: "Gönderiliyor",
  PAUSED: "Duraklatıldı",
  STOPPED: "Durduruldu",
  COMPLETED: "Tamamlandı",
} as const;
