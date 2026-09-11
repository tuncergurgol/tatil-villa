import type { AgencyMessageTemplate } from "@prisma/client";
import {
  AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
  AGENCY_MESSAGE_TEMPLATE_ROW_11_3,
  AGENCY_MESSAGE_TEMPLATE_ROW_11_4,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_2,
  AGENCY_MESSAGE_TEMPLATE_ROW_40_3,
} from "@/lib/agency-message-row-no";

export type ScheduleAnchor = "check_in" | "check_out";

export type ScheduledTemplatePreset = {
  rowNo: number;
  scheduleTiming: string;
  scheduleEnabled: boolean;
  scheduleAnchor: ScheduleAnchor;
  scheduleOffsetDays: number;
  scheduleHour: number;
  scheduleMinute: number;
};

export const SCHEDULED_TEMPLATE_PRESETS: ScheduledTemplatePreset[] = [
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_1,
    scheduleTiming: "Girişten 2 Gün Önce Saat: 10:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_in",
    scheduleOffsetDays: -2,
    scheduleHour: 10,
    scheduleMinute: 0,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_3,
    scheduleTiming: "Çıkıştan 1 Gün Önce Saat: 15:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_out",
    scheduleOffsetDays: -1,
    scheduleHour: 15,
    scheduleMinute: 0,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_11_4,
    scheduleTiming: "Çıkıştan 1 Gün Sonra Saat: 11:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_out",
    scheduleOffsetDays: 1,
    scheduleHour: 11,
    scheduleMinute: 0,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_1,
    scheduleTiming: "Girişten 2 Gün Önce Saat: 10:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_in",
    scheduleOffsetDays: -2,
    scheduleHour: 10,
    scheduleMinute: 0,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_2,
    scheduleTiming: "Girişten 3 Gün Önce Saat: 14:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_in",
    scheduleOffsetDays: -3,
    scheduleHour: 14,
    scheduleMinute: 0,
  },
  {
    rowNo: AGENCY_MESSAGE_TEMPLATE_ROW_40_3,
    scheduleTiming: "Çıkıştan 1 Gün Önce Saat: 15:00",
    scheduleEnabled: true,
    scheduleAnchor: "check_out",
    scheduleOffsetDays: -1,
    scheduleHour: 15,
    scheduleMinute: 0,
  },
];

export function formatScheduleTiming(template: Pick<
  AgencyMessageTemplate,
  | "scheduleTiming"
  | "scheduleEnabled"
  | "scheduleAnchor"
  | "scheduleOffsetDays"
  | "scheduleHour"
  | "scheduleMinute"
>): string {
  if (template.scheduleTiming.trim()) return template.scheduleTiming.trim();
  if (!template.scheduleEnabled) return "—";

  const anchor =
    template.scheduleAnchor === "check_out" ? "Çıkıştan" : "Girişten";
  const days = Math.abs(template.scheduleOffsetDays);
  const when =
    template.scheduleOffsetDays < 0
      ? `${days} Gün Önce`
      : template.scheduleOffsetDays > 0
        ? `${days} Gün Sonra`
        : "Aynı Gün";
  const hour = String(template.scheduleHour).padStart(2, "0");
  const minute = String(template.scheduleMinute).padStart(2, "0");
  return `${anchor} ${when} Saat: ${hour}:${minute}`;
}

export function resolveTargetAnchorDateKey(
  template: Pick<AgencyMessageTemplate, "scheduleOffsetDays">,
  todayKey: string,
  addDaysToDateKey: (key: string, days: number) => string
): string {
  return addDaysToDateKey(todayKey, -template.scheduleOffsetDays);
}

export function isTemplateDueNow(
  template: Pick<
    AgencyMessageTemplate,
    "scheduleEnabled" | "scheduleHour" | "scheduleMinute"
  >,
  now: Date
): boolean {
  if (!template.scheduleEnabled) return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? -1);
  return hour === template.scheduleHour && minute === template.scheduleMinute;
}

export function resolveAudienceForTemplateRowNo(rowNo: number): "guest" | "owner" {
  if (
    rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_40_1 ||
    rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_40_2 ||
    rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_40_3
  ) {
    return "owner";
  }
  return "guest";
}

export function requiresPoolHeating(rowNo: number): boolean {
  return rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_40_2;
}

export function isGuestReviewTemplate(rowNo: number): boolean {
  return rowNo === AGENCY_MESSAGE_TEMPLATE_ROW_11_4;
}
