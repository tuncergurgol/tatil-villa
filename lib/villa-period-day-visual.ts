import type { CSSProperties } from "react";
import type { VillaDayOccupancy } from "@prisma/client";
import { offsetDateKey } from "@/lib/villa-period-selection";

export type VillaDayVisualKind =
  | "empty"
  | "check_in"
  | "full"
  | "check_out"
  | "turnover_booked"
  | "option_check_in"
  | "option_full"
  | "option_check_out"
  | "option_out_booked_in"
  | "booked_out_option_in";

const COLORS = {
  white: "#ffffff",
  red: "#dc2626",
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

function normalizeOccupancy(
  value?: VillaDayOccupancy
): "EMPTY" | "BOOKED" | "OPTION" {
  if (!value || value === "EMPTY") return "EMPTY";
  return value;
}

function isBlockingOccupancy(value?: VillaDayOccupancy): boolean {
  const status = normalizeOccupancy(value);
  return status === "BOOKED" || status === "OPTION";
}

/** İki dolu blok arasındaki boş gün (kaynak: yazlikvillaci giriscikis). */
export function isTurnoverOccupancyDay(
  current?: VillaDayOccupancy,
  prev?: VillaDayOccupancy,
  next?: VillaDayOccupancy
): boolean {
  if (normalizeOccupancy(current) !== "EMPTY") return false;
  return isBlockingOccupancy(prev) && isBlockingOccupancy(next);
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
  prevPrev?: VillaDayOccupancy
): VillaDayVisualKind {
  const currentStatus = normalizeOccupancy(current);
  const prevStatus = normalizeOccupancy(prev);
  const nextStatus = normalizeOccupancy(next);
  const prevPrevStatus = normalizeOccupancy(prevPrev);

  // Rezervasyon geceleri: check-in günü dahil, check-out sabahı hariç.
  // Çıkış görseli konaklanan son gecenin ertesindeki BOŞ günde gösterilir.
  // Aynı gün çıkış+giriş: iki dolu blok arasındaki BOŞ günde (giriscikis) gösterilir.
  if (currentStatus === "EMPTY") {
    if (isTurnoverOccupancyDay(current, prev, next)) {
      if (prevStatus === "OPTION" && nextStatus === "OPTION") {
        return "turnover_booked";
      }
      if (prevStatus === "BOOKED" && nextStatus === "OPTION") {
        return "booked_out_option_in";
      }
      if (prevStatus === "OPTION" && nextStatus === "BOOKED") {
        return "option_out_booked_in";
      }
      return "turnover_booked";
    }
    if (prevStatus === "BOOKED") return "check_out";
    if (prevStatus === "OPTION") return "option_check_out";
    return "empty";
  }

  if (currentStatus === "BOOKED") {
    if (prevStatus === "OPTION") return "option_out_booked_in";
    if (prevStatus === "EMPTY") {
      if (isBlockingOccupancy(prevPrev)) return "full";
      return "check_in";
    }
    return "full";
  }

  if (currentStatus === "OPTION") {
    if (prevStatus === "BOOKED") return "booked_out_option_in";
    if (prevStatus === "EMPTY" && nextStatus === "EMPTY") return "option_full";
    if (prevStatus === "EMPTY") {
      if (prevPrevStatus === "BOOKED" || prevPrevStatus === "OPTION") {
        return "option_full";
      }
      return "option_check_in";
    }
    return "option_full";
  }

  return "empty";
}

export function resolveVillaDayVisualFromMap(
  dateKey: string,
  occupancyMap: ReadonlyMap<string, VillaDayOccupancy>
): VillaDayVisualKind {
  return resolveVillaDayVisual(
    occupancyMap.get(dateKey),
    occupancyMap.get(offsetDateKey(dateKey, -1)),
    occupancyMap.get(offsetDateKey(dateKey, 1)),
    occupancyMap.get(offsetDateKey(dateKey, -2))
  );
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
        // Giriş: yeni konaklama sağ alt üçgende görünür.
        background: diagonal(COLORS.red, COLORS.white),
        useLightText: false,
      };
    case "full":
      return { background: COLORS.red, useLightText: true };
    case "check_out":
      return {
        // Çıkış: önceki konaklama sol üst üçgende görünür.
        background: diagonal(COLORS.white, COLORS.red),
        useLightText: false,
      };
    case "turnover_booked":
      return {
        background: turnoverDiagonal(COLORS.red, COLORS.red),
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
  switch (kind) {
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
    label: "Giriş",
    swatchStyle: { background: diagonal(COLORS.red, COLORS.white) },
  },
  { kind: "full", label: "Dolu", swatchStyle: { background: COLORS.red } },
  {
    kind: "check_out",
    label: "Çıkış",
    swatchStyle: { background: diagonal(COLORS.white, COLORS.red) },
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