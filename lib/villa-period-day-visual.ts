import type { CSSProperties } from "react";
import type { VillaDayOccupancy } from "@prisma/client";

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

function normalizeOccupancy(
  value?: VillaDayOccupancy
): "EMPTY" | "BOOKED" | "OPTION" {
  if (!value || value === "EMPTY") return "EMPTY";
  return value;
}

/** Sol alttan sağ üste çapraz */
function diagonal(bottomLeft: string, topRight: string) {
  return `linear-gradient(to top right, ${bottomLeft} 50%, ${topRight} 50%)`;
}

/** Dikey aynalama: sol üstten sağ alta çapraz */
function diagonalMirrorVertical(topLeft: string, bottomRight: string) {
  return `linear-gradient(to bottom right, ${topLeft} 50%, ${bottomRight} 50%)`;
}

export function resolveVillaDayVisual(
  current?: VillaDayOccupancy,
  prev?: VillaDayOccupancy,
  next?: VillaDayOccupancy
): VillaDayVisualKind {
  const currentStatus = normalizeOccupancy(current);
  const prevStatus = normalizeOccupancy(prev);
  const nextStatus = normalizeOccupancy(next);

  // Rezervasyon geceleri: check-in günü dahil, check-out sabahı hariç.
  // Çıkış görseli konaklanan son gecenin ertesinde (boş gün) gösterilir.
  if (currentStatus === "EMPTY") {
    if (prevStatus === "BOOKED" && nextStatus === "BOOKED") {
      return "turnover_booked";
    }
    if (prevStatus === "BOOKED" && nextStatus === "OPTION") {
      return "booked_out_option_in";
    }
    if (prevStatus === "OPTION" && nextStatus === "BOOKED") {
      return "option_out_booked_in";
    }
    if (prevStatus === "BOOKED") return "check_out";
    if (prevStatus === "OPTION") return "option_check_out";
    return "empty";
  }

  if (currentStatus === "BOOKED") {
    if (prevStatus === "OPTION") return "option_out_booked_in";
    if (prevStatus === "EMPTY" && nextStatus === "EMPTY") return "turnover_booked";
    if (prevStatus === "EMPTY") return "check_in";
    return "full";
  }

  if (currentStatus === "OPTION") {
    if (prevStatus === "BOOKED") return "booked_out_option_in";
    if (prevStatus === "EMPTY" && nextStatus === "EMPTY") return "option_full";
    if (prevStatus === "EMPTY") return "option_check_in";
    return "option_full";
  }

  return "empty";
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
        background: diagonalMirrorVertical(COLORS.white, COLORS.red),
        useLightText: false,
      };
    case "full":
      return { background: COLORS.red, useLightText: true };
    case "check_out":
      return {
        background: diagonalMirrorVertical(COLORS.red, COLORS.white),
        useLightText: false,
      };
    case "turnover_booked":
      return { background: COLORS.red, useLightText: true };
    case "option_check_in":
      return {
        background: diagonal(COLORS.white, COLORS.yellow),
        useLightText: false,
      };
    case "option_full":
      return { background: COLORS.yellow, useLightText: false };
    case "option_check_out":
      return {
        background: diagonalMirrorVertical(COLORS.yellow, COLORS.white),
        useLightText: false,
      };
    case "option_out_booked_in":
      return {
        background: diagonal(COLORS.yellow, COLORS.red),
        useLightText: false,
      };
    case "booked_out_option_in":
      return {
        background: diagonal(COLORS.red, COLORS.yellow),
        useLightText: false,
      };
    default:
      return { background: COLORS.white, useLightText: false };
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
    swatchStyle: { background: diagonalMirrorVertical(COLORS.white, COLORS.red) },
  },
  { kind: "full", label: "Dolu", swatchStyle: { background: COLORS.red } },
  {
    kind: "check_out",
    label: "Çıkış",
    swatchStyle: { background: diagonalMirrorVertical(COLORS.red, COLORS.white) },
  },
  {
    kind: "option_check_in",
    label: "Opsiyon Giriş",
    swatchStyle: { background: diagonal(COLORS.white, COLORS.yellow) },
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
      background: diagonalMirrorVertical(COLORS.yellow, COLORS.white),
    },
  },
];
