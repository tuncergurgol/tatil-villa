import type { BlogAiPublishFrequency } from "@prisma/client";

export const BLOG_AI_FREQUENCY_OPTIONS: {
  value: BlogAiPublishFrequency;
  label: string;
  days: number;
}[] = [
  { value: "EVERY_1_DAY", label: "Her Gün (1 Gün Aralıklı)", days: 1 },
  { value: "EVERY_2_DAYS", label: "2 Günde Bir", days: 2 },
  { value: "EVERY_3_DAYS", label: "3 Günde Bir", days: 3 },
  { value: "WEEKLY", label: "Haftada 1", days: 7 },
  { value: "BIWEEKLY", label: "15 Günde Bir", days: 15 },
  { value: "MONTHLY", label: "Ayda 1", days: 30 },
];

export function getBlogAiFrequencyDays(
  frequency: BlogAiPublishFrequency
): number {
  return (
    BLOG_AI_FREQUENCY_OPTIONS.find((item) => item.value === frequency)?.days ??
    7
  );
}

export function getBlogAiFrequencyLabel(
  frequency: BlogAiPublishFrequency
): string {
  return (
    BLOG_AI_FREQUENCY_OPTIONS.find((item) => item.value === frequency)?.label ??
    "Haftada 1"
  );
}

export function computeNextBlogAiRunAt(
  frequency: BlogAiPublishFrequency,
  from: Date = new Date()
): Date {
  const days = getBlogAiFrequencyDays(frequency);
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}
