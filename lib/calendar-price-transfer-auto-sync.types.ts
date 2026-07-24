export type CalendarPriceTransferAutoUpdatePeriod = "hour" | "day";

export type CalendarPriceTransferCriterionKey =
  | "whatsapp"
  | "ical"
  | "link1"
  | "link2"
  | "link3";

export const CALENDAR_PRICE_TRANSFER_CRITERIA: Array<{
  key: CalendarPriceTransferCriterionKey;
  label: string;
}> = [
  { key: "whatsapp", label: "Whatsapp" },
  { key: "ical", label: "İcal" },
  { key: "link1", label: "Link 1" },
  { key: "link2", label: "Link 2" },
  { key: "link3", label: "Link 3" },
];

export type CalendarPriceTransferAutoUpdateSettings = {
  enabled: boolean;
  period: CalendarPriceTransferAutoUpdatePeriod;
  interval: number;
  criteria: CalendarPriceTransferCriterionKey[];
  lastRunAt: Date | null;
};

export type CalendarPriceTransferSyncCriteria = {
  whatsapp: boolean;
  ical: boolean;
  link1: boolean;
  link2: boolean;
  link3: boolean;
};

export const ALL_CALENDAR_PRICE_TRANSFER_CRITERIA: CalendarPriceTransferSyncCriteria =
  {
    whatsapp: true,
    ical: true,
    link1: true,
    link2: true,
    link3: true,
  };

export function clampAutoUpdateInterval(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(24, Math.max(1, Math.round(value)));
}

export function getAutoUpdateIntervalMs(
  period: CalendarPriceTransferAutoUpdatePeriod,
  interval: number
) {
  const unit = clampAutoUpdateInterval(interval);
  if (period === "day") return unit * 24 * 60 * 60 * 1000;
  return unit * 60 * 60 * 1000;
}

const ALL_CRITERIA = CALENDAR_PRICE_TRANSFER_CRITERIA.map((item) => item.key);

export function parseCalendarPriceTransferCriteria(
  raw: string | null | undefined
): CalendarPriceTransferCriterionKey[] {
  if (!raw?.trim()) return ["ical", "link1", "link2", "link3"];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ["ical", "link1", "link2", "link3"];
    return parsed.filter((item): item is CalendarPriceTransferCriterionKey =>
      ALL_CRITERIA.includes(item as CalendarPriceTransferCriterionKey)
    );
  } catch {
    return ["ical", "link1", "link2", "link3"];
  }
}

export function serializeCalendarPriceTransferCriteria(
  criteria: CalendarPriceTransferCriterionKey[]
) {
  return JSON.stringify(
    criteria.filter((item) => ALL_CRITERIA.includes(item))
  );
}

export function criteriaToSyncFlags(
  criteria: CalendarPriceTransferCriterionKey[]
): CalendarPriceTransferSyncCriteria {
  const set = new Set(criteria);
  return {
    whatsapp: set.has("whatsapp"),
    ical: set.has("ical"),
    link1: set.has("link1"),
    link2: set.has("link2"),
    link3: set.has("link3"),
  };
}

function nonEmptyStringField(
  field:
    | "whatsappGroupId"
    | "externalSyncUrl1"
    | "externalSyncUrl2"
    | "externalSyncUrl3"
) {
  return {
    AND: [{ [field]: { not: null } }, { [field]: { not: "" } }],
  };
}

/** Otomatik güncellemede yalnızca seçilen kaynağı olan villalar. */
export function buildVillaWhereForAutoUpdateCriteria(
  criteria: CalendarPriceTransferSyncCriteria
) {
  const or: Record<string, unknown>[] = [];

  if (criteria.whatsapp) {
    or.push(nonEmptyStringField("whatsappGroupId"));
  }
  if (criteria.link1) {
    or.push(nonEmptyStringField("externalSyncUrl1"));
  }
  if (criteria.link2) {
    or.push(nonEmptyStringField("externalSyncUrl2"));
  }
  if (criteria.link3) {
    or.push(nonEmptyStringField("externalSyncUrl3"));
  }
  if (criteria.ical) {
    or.push({
      icalSources: {
        some: {
          NOT: {
            name: {
              in: [
                "Harici Sync 1",
                "Harici Sync 2",
                "Harici Sync 3",
                "Harici Sync 4",
              ],
            },
          },
        },
      },
    });
  }

  if (or.length === 0) {
    return {};
  }

  return { OR: or };
}
