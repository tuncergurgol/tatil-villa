import type { CSSProperties } from "react";
import type { VillaDayOccupancy } from "@prisma/client";
import {
  findCloseRangeMinKey,
  offsetDateKey,
} from "@/lib/villa-period-selection";

export type VillaDayVisualKind =
  | "empty"
  | "check_in"
  | "full"
  | "check_out"
  | "turnover_booked"
  | "reserved_check_in"
  | "reserved_full"
  | "reserved_check_out"
  | "turnover_reserved"
  | "option_check_in"
  | "option_full"
  | "option_check_out"
  | "turnover_option"
  | "option_out_booked_in"
  | "booked_out_option_in"
  | "booked_out_reserved_in"
  | "reserved_out_booked_in"
  | "reserved_out_option_in"
  | "option_out_reserved_in";

const COLORS = {
  white: "#ffffff",
  red: "#dc2626",
  lilac: "#8b5cf6",
  yellow: "#facc15",
} as const;

/** Public villa detay takvimi — soft tonlar */
const SOFT_COLORS = {
  white: "#ffffff",
  booked: "#fecdd3", // rose-200
  bookedDeep: "#fda4af", // rose-300
  option: "#fde68a", // amber-200
  optionDeep: "#fcd34d", // amber-300
  available: "#ecfdf5", // emerald-50
} as const;

type NormalizedOccupancy = "EMPTY" | "BOOKED" | "RESERVED" | "OPTION";

function normalizeOccupancy(value?: VillaDayOccupancy): NormalizedOccupancy {
  if (!value || value === "EMPTY") return "EMPTY";
  return value;
}

function isBlockingOccupancy(value?: VillaDayOccupancy): boolean {
  const status = normalizeOccupancy(value);
  return status === "BOOKED" || status === "RESERVED" || status === "OPTION";
}

/** EMPTY günden hemen önceki bitişik dolu gece sayısı. */
export function countBookedNightsImmediatelyBefore(
  dateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>
): number {
  let count = 0;
  let cursor = offsetDateKey(dateKey, -1);
  while (isBlockingOccupancy(occupancyMap.get(cursor))) {
    count += 1;
    cursor = offsetDateKey(cursor, -1);
  }
  return count;
}

function resolveTurnoverVisualKind(
  prev?: VillaDayOccupancy,
  next?: VillaDayOccupancy
): VillaDayVisualKind {
  const prevStatus = normalizeOccupancy(prev);
  const nextStatus = normalizeOccupancy(next);

  if (prevStatus === "OPTION" && nextStatus === "OPTION") {
    return "turnover_option";
  }
  if (prevStatus === "BOOKED" && nextStatus === "BOOKED") {
    return "turnover_booked";
  }
  if (prevStatus === "RESERVED" && nextStatus === "RESERVED") {
    return "turnover_reserved";
  }
  if (prevStatus === "RESERVED" && nextStatus === "BOOKED") {
    return "reserved_out_booked_in";
  }
  if (prevStatus === "BOOKED" && nextStatus === "RESERVED") {
    return "booked_out_reserved_in";
  }
  if (prevStatus === "RESERVED" && nextStatus === "OPTION") {
    return "reserved_out_option_in";
  }
  if (prevStatus === "OPTION" && nextStatus === "RESERVED") {
    return "option_out_reserved_in";
  }
  if (prevStatus === "BOOKED" && nextStatus === "OPTION") {
    return "booked_out_option_in";
  }
  if (prevStatus === "OPTION" && nextStatus === "BOOKED") {
    return "option_out_booked_in";
  }

  return "turnover_booked";
}

/**
 * Aynı gün çıkış+giriş (giriscikis): EMPTY gün, önce/sonra dolu.
 * Bitişik ayrı bloklar (1–5 çıkış + ertesi gün 6–9 giriş) turnover değildir.
 */
export function isTurnoverOccupancyDay(
  current?: VillaDayOccupancy,
  prev?: VillaDayOccupancy,
  next?: VillaDayOccupancy,
  context?: {
    dateKey: string;
    occupancyMap: ReadonlyMap<string, VillaDayOccupancy>;
    checkInDateKeys?: ReadonlySet<string>;
  }
): boolean {
  if (normalizeOccupancy(current) !== "EMPTY") return false;
  if (!isBlockingOccupancy(prev)) return false;
  if (!isBlockingOccupancy(next)) return false;
  if (!context) return false;
  if (context.checkInDateKeys?.has(context.dateKey)) return true;

  if (
    normalizeOccupancy(prev) === "RESERVED" &&
    normalizeOccupancy(next) === "BOOKED"
  ) {
    return true;
  }

  const nextDayKey = offsetDateKey(context.dateKey, 1);
  if (!isBlockingOccupancy(context.occupancyMap.get(nextDayKey))) {
    return false;
  }

  // Bitişik ayrı bloklar (17 çıkış + 18 giriş): sonraki blok ertesi günden başlar → turnover değil.
  // Aynı gün çıkış+giriş: sonraki blok bu EMPTY günden başlar → turnover.
  return (
    context.dateKey ===
    findCloseRangeMinKey(nextDayKey, context.occupancyMap)
  );
}

/**
 * Referans takvimdeki "/" ayrım çizgisi (sol alt köşeden sağ üst köşeye).
 * Sol üst üçgen (topLeft) ile sağ alt üçgen (bottomRight) ayrılır.
 * Çıkış günü sol-üst dolu, giriş günü sağ-alt dolu görünür.
 */
function diagonal(bottomRight: string, topLeft: string) {
  return `linear-gradient(to top left, ${bottomRight} 50%, ${topLeft} 50%)`;
}

/** Aynı gün çıkış + giriş: iki alan arasında referanstaki beyaz "/" çapraz çizgi. */
function turnoverDiagonal(bottomRight: string, topLeft: string) {
  return [
    "linear-gradient(to top left, transparent 47.5%, #ffffff 47.5%, #ffffff 52.5%, transparent 52.5%)",
    diagonal(bottomRight, topLeft),
  ].join(", ");
}

export function resolveVillaDayVisual(
  current?: VillaDayOccupancy,
  prev?: VillaDayOccupancy,
  next?: VillaDayOccupancy,
  prevPrev?: VillaDayOccupancy,
  context?: {
    dateKey: string;
    occupancyMap: ReadonlyMap<string, VillaDayOccupancy>;
    checkInDateKeys?: ReadonlySet<string>;
  }
): VillaDayVisualKind {
  const currentStatus = normalizeOccupancy(current);
  const prevStatus = normalizeOccupancy(prev);
  const nextStatus = normalizeOccupancy(next);

  if (currentStatus === "EMPTY") {
    if (prevStatus === "RESERVED" && nextStatus === "BOOKED") {
      return "reserved_out_booked_in";
    }
    if (isTurnoverOccupancyDay(current, prev, next, context)) {
      return resolveTurnoverVisualKind(prev, next);
    }
    if (prevStatus === "BOOKED") return "check_out";
    if (prevStatus === "RESERVED") return "reserved_check_out";
    if (prevStatus === "OPTION") return "option_check_out";
    return "empty";
  }

  if (currentStatus === "BOOKED") {
    if (prevStatus === "RESERVED") return "reserved_out_booked_in";
    if (prevStatus === "OPTION") return "option_out_booked_in";
    // Tek gece kapama: önceki gece dolu + bu gün giriş işaretli → çıkış+giriş
    // (gece BOOKED kalır; aksi halde EMPTY yazılınca hiç dolu gece olmaz).
    if (
      prevStatus === "BOOKED" &&
      context?.checkInDateKeys?.has(context.dateKey)
    ) {
      return "turnover_booked";
    }
    if (prevStatus === "EMPTY") {
      if (isBlockingOccupancy(prevPrev) && context) {
        const prevDayKey = offsetDateKey(context.dateKey, -1);
        if (
          isTurnoverOccupancyDay(prev, prevPrev, current, {
            dateKey: prevDayKey,
            occupancyMap: context.occupancyMap,
            checkInDateKeys: context.checkInDateKeys,
          })
        ) {
          return "full";
        }
        return "check_in";
      }
      return "check_in";
    }
    return "full";
  }

  if (currentStatus === "RESERVED") {
    if (prevStatus === "BOOKED") return "booked_out_reserved_in";
    if (prevStatus === "OPTION") return "option_out_reserved_in";
    if (
      prevStatus === "RESERVED" &&
      context?.checkInDateKeys?.has(context.dateKey)
    ) {
      return "turnover_reserved";
    }
    if (prevStatus === "EMPTY") {
      if (isBlockingOccupancy(prevPrev) && context) {
        const prevDayKey = offsetDateKey(context.dateKey, -1);
        if (
          isTurnoverOccupancyDay(prev, prevPrev, current, {
            dateKey: prevDayKey,
            occupancyMap: context.occupancyMap,
            checkInDateKeys: context.checkInDateKeys,
          })
        ) {
          return "reserved_full";
        }
        return "reserved_check_in";
      }
      return "reserved_check_in";
    }
    return "reserved_full";
  }

  if (currentStatus === "OPTION") {
    if (prevStatus === "BOOKED") return "booked_out_option_in";
    if (prevStatus === "RESERVED") return "reserved_out_option_in";
    if (
      prevStatus === "OPTION" &&
      context?.checkInDateKeys?.has(context.dateKey)
    ) {
      return "turnover_option";
    }
    if (prevStatus === "EMPTY" && nextStatus === "EMPTY") return "option_full";
    if (prevStatus === "EMPTY") {
      if (isBlockingOccupancy(prevPrev) && context) {
        const prevDayKey = offsetDateKey(context.dateKey, -1);
        if (
          isTurnoverOccupancyDay(prev, prevPrev, current, {
            dateKey: prevDayKey,
            occupancyMap: context.occupancyMap,
            checkInDateKeys: context.checkInDateKeys,
          })
        ) {
          return "option_full";
        }
        return "option_check_in";
      }
      return "option_check_in";
    }
    return "option_full";
  }

  return "empty";
}

export function resolveVillaDayVisualFromMap(
  dateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>,
  checkInDateKeys?: ReadonlySet<string>
): VillaDayVisualKind {
  return resolveVillaDayVisual(
    occupancyMap.get(dateKey),
    occupancyMap.get(offsetDateKey(dateKey, -1)),
    occupancyMap.get(offsetDateKey(dateKey, 1)),
    occupancyMap.get(offsetDateKey(dateKey, -2)),
    { dateKey, occupancyMap, checkInDateKeys }
  );
}

/** Public sitede RESERVED dolu (BOOKED) gibi görünür; çapraz geçişler buna göre eşlenir. */
export function toPublicCalendarVisualKind(
  kind: VillaDayVisualKind
): VillaDayVisualKind {
  switch (kind) {
    case "reserved_check_in":
      return "check_in";
    case "reserved_full":
      return "full";
    case "reserved_check_out":
      return "check_out";
    case "turnover_reserved":
      return "turnover_booked";
    case "booked_out_reserved_in":
    case "reserved_out_booked_in":
      return "turnover_booked";
    case "reserved_out_option_in":
      return "booked_out_option_in";
    case "option_out_reserved_in":
      return "option_out_booked_in";
    default:
      return kind;
  }
}

export function getVillaDayVisualStyle(kind: VillaDayVisualKind): {
  background: string;
  useLightText: boolean;
} {
  switch (kind) {
    case "empty":
      return { background: COLORS.white, useLightText: false };
    case "check_in":
      return {
        background: diagonal(COLORS.red, COLORS.white),
        useLightText: false,
      };
    case "full":
      return { background: COLORS.red, useLightText: true };
    case "check_out":
      return {
        background: diagonal(COLORS.white, COLORS.red),
        useLightText: false,
      };
    case "turnover_booked":
      return {
        background: turnoverDiagonal(COLORS.red, COLORS.red),
        useLightText: true,
      };
    case "reserved_check_in":
      return {
        background: diagonal(COLORS.lilac, COLORS.white),
        useLightText: false,
      };
    case "reserved_full":
      return { background: COLORS.lilac, useLightText: true };
    case "reserved_check_out":
      return {
        background: diagonal(COLORS.white, COLORS.lilac),
        useLightText: false,
      };
    case "turnover_reserved":
      return {
        background: turnoverDiagonal(COLORS.lilac, COLORS.lilac),
        useLightText: true,
      };
    case "option_check_in":
      return {
        background: diagonal(COLORS.yellow, COLORS.white),
        useLightText: false,
      };
    case "option_full":
      return { background: COLORS.yellow, useLightText: false };
    case "option_check_out":
      return {
        background: diagonal(COLORS.white, COLORS.yellow),
        useLightText: false,
      };
    case "turnover_option":
      return {
        background: turnoverDiagonal(COLORS.yellow, COLORS.yellow),
        useLightText: false,
      };
    case "option_out_booked_in":
      return {
        background: turnoverDiagonal(COLORS.red, COLORS.yellow),
        useLightText: false,
      };
    case "booked_out_option_in":
      return {
        background: turnoverDiagonal(COLORS.yellow, COLORS.red),
        useLightText: false,
      };
    case "booked_out_reserved_in":
      return {
        background: turnoverDiagonal(COLORS.lilac, COLORS.red),
        useLightText: false,
      };
    case "reserved_out_booked_in":
      return {
        background: turnoverDiagonal(COLORS.red, COLORS.lilac),
        useLightText: false,
      };
    case "reserved_out_option_in":
      return {
        background: turnoverDiagonal(COLORS.yellow, COLORS.lilac),
        useLightText: false,
      };
    case "option_out_reserved_in":
      return {
        background: turnoverDiagonal(COLORS.lilac, COLORS.yellow),
        useLightText: false,
      };
    default:
      return { background: COLORS.white, useLightText: false };
  }
}

/** Public detay sayfası takvimi — soft renk + giriş/çıkış diyagonalleri */
export function getPublicVillaDayVisualStyle(kind: VillaDayVisualKind): {
  background: string;
  useLightText: boolean;
  showPrice: boolean;
  statusLabel: string | null;
} {
  const publicKind = toPublicCalendarVisualKind(kind);

  switch (publicKind) {
    case "empty":
      return {
        background: SOFT_COLORS.available,
        useLightText: false,
        showPrice: true,
        statusLabel: null,
      };
    case "check_in":
      return {
        background: diagonal(SOFT_COLORS.bookedDeep, SOFT_COLORS.white),
        useLightText: false,
        showPrice: true,
        statusLabel: "Giriş",
      };
    case "full":
      return {
        background: SOFT_COLORS.booked,
        useLightText: false,
        showPrice: false,
        statusLabel: "Dolu",
      };
    case "check_out":
      return {
        background: diagonal(SOFT_COLORS.white, SOFT_COLORS.bookedDeep),
        useLightText: false,
        showPrice: true,
        statusLabel: "Çıkış",
      };
    case "turnover_booked":
      return {
        background: turnoverDiagonal(
          SOFT_COLORS.bookedDeep,
          SOFT_COLORS.bookedDeep
        ),
        useLightText: false,
        showPrice: false,
        statusLabel: "Giriş+Çıkış",
      };
    case "option_check_in":
      return {
        background: diagonal(SOFT_COLORS.optionDeep, SOFT_COLORS.white),
        useLightText: false,
        showPrice: true,
        statusLabel: "Ops. Giriş",
      };
    case "option_full":
      return {
        background: SOFT_COLORS.option,
        useLightText: false,
        showPrice: false,
        statusLabel: "Opsiyon",
      };
    case "option_check_out":
      return {
        background: diagonal(SOFT_COLORS.white, SOFT_COLORS.optionDeep),
        useLightText: false,
        showPrice: true,
        statusLabel: "Ops. Çıkış",
      };
    case "option_out_booked_in":
      return {
        background: turnoverDiagonal(
          SOFT_COLORS.bookedDeep,
          SOFT_COLORS.optionDeep
        ),
        useLightText: false,
        showPrice: false,
        statusLabel: "Giriş+Çıkış",
      };
    case "booked_out_option_in":
      return {
        background: turnoverDiagonal(
          SOFT_COLORS.optionDeep,
          SOFT_COLORS.bookedDeep
        ),
        useLightText: false,
        showPrice: false,
        statusLabel: "Giriş+Çıkış",
      };
    default:
      return {
        background: SOFT_COLORS.white,
        useLightText: false,
        showPrice: true,
        statusLabel: null,
      };
  }
}

export const VILLA_DAY_VISUAL_LEGEND: {
  kind: VillaDayVisualKind;
  label: string;
  swatchStyle: CSSProperties;
}[] = [
  { kind: "empty", label: "Boş", swatchStyle: { background: COLORS.white } },
  {
    kind: "check_in",
    label: "Kapama Giriş",
    swatchStyle: { background: diagonal(COLORS.red, COLORS.white) },
  },
  { kind: "full", label: "Kapama (Dolu)", swatchStyle: { background: COLORS.red } },
  {
    kind: "check_out",
    label: "Kapama Çıkış",
    swatchStyle: { background: diagonal(COLORS.white, COLORS.red) },
  },
  {
    kind: "turnover_booked",
    label: "Kapama Giriş+Çıkış",
    swatchStyle: { background: turnoverDiagonal(COLORS.red, COLORS.red) },
  },
  {
    kind: "reserved_check_in",
    label: "Rezervasyon Giriş",
    swatchStyle: { background: diagonal(COLORS.lilac, COLORS.white) },
  },
  {
    kind: "reserved_full",
    label: "Bizim Rezervasyon",
    swatchStyle: { background: COLORS.lilac },
  },
  {
    kind: "reserved_check_out",
    label: "Rezervasyon Çıkış",
    swatchStyle: { background: diagonal(COLORS.white, COLORS.lilac) },
  },
  {
    kind: "option_check_in",
    label: "Opsiyon Giriş",
    swatchStyle: { background: diagonal(COLORS.yellow, COLORS.white) },
  },
  {
    kind: "option_full",
    label: "Opsiyon",
    swatchStyle: { background: COLORS.yellow },
  },
  {
    kind: "option_check_out",
    label: "Opsiyon Çıkış",
    swatchStyle: {
      background: diagonal(COLORS.white, COLORS.yellow),
    },
  },
];

export const PUBLIC_VILLA_DAY_VISUAL_LEGEND: {
  label: string;
  swatchStyle: CSSProperties;
}[] = [
  {
    label: "Dolu",
    swatchStyle: { background: SOFT_COLORS.booked },
  },
  {
    label: "Opsiyon",
    swatchStyle: { background: SOFT_COLORS.option },
  },
  {
    label: "Giriş / Çıkış",
    swatchStyle: {
      background: diagonal(SOFT_COLORS.bookedDeep, SOFT_COLORS.white),
    },
  },
  {
    label: "Giriş + Çıkış",
    swatchStyle: {
      background: turnoverDiagonal(
        SOFT_COLORS.bookedDeep,
        SOFT_COLORS.bookedDeep
      ),
    },
  },
  {
    label: "Müsait",
    swatchStyle: {
      background: SOFT_COLORS.available,
      border: "1px solid #a7f3d0",
    },
  },
];
