"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  computeDrivingDistancesMeters,
  isGoogleDistanceConfigured,
  metersToKmRounded,
} from "@/lib/google-distance-matrix";
import { isValidLatLng } from "@/lib/surrounding-location-helpers";

const calcSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  /** Boşsa isDefault=true olanlar hesaplanır */
  locationIds: z.array(z.string()).optional(),
  onlyDefaults: z.boolean().optional().default(true),
});

export type CalculateSurroundingDistancesResult =
  | {
      success: true;
      distances: Record<string, number>;
      skipped: Array<{ id: string; name: string; reason: string }>;
    }
  | { success: false; error: string };

export async function calculateSurroundingDistances(input: {
  latitude: number;
  longitude: number;
  locationIds?: string[];
  onlyDefaults?: boolean;
}): Promise<CalculateSurroundingDistancesResult> {
  await requireAdmin();

  if (!isGoogleDistanceConfigured()) {
    return {
      success: false,
      error:
        "Google Maps API anahtarı tanımlı değil. GOOGLE_MAPS_SERVER_API_KEY ekleyin (Distance Matrix API açık olmalı).",
    };
  }

  const parsed = calcSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Geçersiz koordinat veya konum listesi" };
  }

  const { latitude, longitude, locationIds, onlyDefaults } = parsed.data;
  if (!isValidLatLng(latitude, longitude)) {
    return {
      success: false,
      error: "Villa enlem/boylam geçerli değil (0,0 kabul edilmez)",
    };
  }

  const locations = await prisma.surroundingLocation.findMany({
    where: {
      active: true,
      ...(locationIds && locationIds.length > 0
        ? { id: { in: locationIds } }
        : onlyDefaults
          ? { isDefault: true }
          : {}),
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      isDefault: true,
    },
  });

  if (locations.length === 0) {
    return {
      success: false,
      error: onlyDefaults
        ? "Hesaplanacak varsayılan çevre konum yok. Tanımlamalarda koordinat ve “Varsayılan” işaretleyin."
        : "Hesaplanacak çevre konum bulunamadı.",
    };
  }

  const withCoords: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }> = [];
  const skipped: Array<{ id: string; name: string; reason: string }> = [];

  for (const location of locations) {
    if (!isValidLatLng(location.latitude, location.longitude)) {
      skipped.push({
        id: location.id,
        name: location.name,
        reason: "Koordinat yok",
      });
      continue;
    }
    withCoords.push({
      id: location.id,
      name: location.name,
      latitude: location.latitude!,
      longitude: location.longitude!,
    });
  }

  if (withCoords.length === 0) {
    return {
      success: false,
      error:
        "Seçili konumların hiçbirinde geçerli koordinat yok. Çevre konum tanımlarına enlem/boylam ekleyin.",
    };
  }

  try {
    const matrix = await computeDrivingDistancesMeters(
      { latitude, longitude },
      withCoords.map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      }))
    );

    const distances: Record<string, number> = {};
    withCoords.forEach((item, index) => {
      const result = matrix[index];
      if (!result || result.distanceMeters == null) {
        skipped.push({
          id: item.id,
          name: item.name,
          reason: result?.status || "Rota bulunamadı",
        });
        return;
      }
      distances[item.id] = metersToKmRounded(result.distanceMeters);
    });

    if (Object.keys(distances).length === 0) {
      return {
        success: false,
        error: "Google rota mesafesi hesaplanamadı. Konumları kontrol edin.",
      };
    }

    return { success: true, distances, skipped };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Mesafe hesaplanamadı";
    return { success: false, error: message };
  }
}
