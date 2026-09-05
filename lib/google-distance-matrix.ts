/**
 * Google Routes API (computeRouteMatrix) — sürüş yolu mesafesi (km).
 * Eski Distance Matrix yerine yeni Routes API kullanılır.
 * Anahtar sunucuda tutulur; istemciye verilmez.
 *
 * Env: GOOGLE_MAPS_SERVER_API_KEY (tercih) veya NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * Cloud Console'da "Routes API" etkin olmalı.
 */

const ROUTE_MATRIX_URL =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";
/** Origins×destinations üst sınırı (TRAFFIC_UNAWARE / DRIVE için güvenli dilim). */
const MAX_DESTINATIONS_PER_REQUEST = 50;

export type LatLng = { latitude: number; longitude: number };

export type DistanceMatrixResult = {
  /** metre cinsinden yol mesafesi; null = rota yok / hata */
  distanceMeters: number | null;
  status: string;
};

type RouteMatrixElement = {
  originIndex?: number;
  destinationIndex?: number;
  distanceMeters?: number;
  condition?: string;
  status?: { code?: number; message?: string };
};

function getApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    "";
  return key || null;
}

export function isGoogleDistanceConfigured(): boolean {
  return Boolean(getApiKey());
}

function toWaypoint(point: LatLng) {
  return {
    waypoint: {
      location: {
        latLng: {
          latitude: point.latitude,
          longitude: point.longitude,
        },
      },
    },
  };
}

function parseRouteMatrixBody(raw: string): RouteMatrixElement[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as
      | RouteMatrixElement[]
      | RouteMatrixElement
      | { error?: { message?: string; status?: string } };

    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && "error" in parsed && parsed.error) {
      throw new Error(
        parsed.error.message ||
          parsed.error.status ||
          "Routes API hatası"
      );
    }
    if (parsed && typeof parsed === "object" && "destinationIndex" in parsed) {
      return [parsed as RouteMatrixElement];
    }
  } catch (error) {
    if (error instanceof Error && !error.message.includes("JSON")) {
      throw error;
    }
  }

  // Streaming / NDJSON yanıt
  const elements: RouteMatrixElement[] = [];
  for (const line of trimmed.split("\n")) {
    const row = line.trim();
    if (!row) continue;
    const item = JSON.parse(row) as
      | RouteMatrixElement
      | { error?: { message?: string; status?: string } };
    if ("error" in item && item.error) {
      throw new Error(item.error.message || item.error.status || "Routes API hatası");
    }
    elements.push(item as RouteMatrixElement);
  }
  return elements;
}

async function fetchMatrixChunk(
  apiKey: string,
  origin: LatLng,
  destinations: LatLng[]
): Promise<DistanceMatrixResult[]> {
  const response = await fetch(ROUTE_MATRIX_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,distanceMeters,status,condition",
    },
    body: JSON.stringify({
      origins: [toWaypoint(origin)],
      destinations: destinations.map(toWaypoint),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      languageCode: "tr",
      units: "METRIC",
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    let message = `Routes API HTTP ${response.status}`;
    try {
      const err = JSON.parse(raw) as {
        error?: { message?: string; status?: string };
      };
      if (err.error?.message) {
        message = err.error.message;
        if (
          /not been used|disabled|PERMISSION_DENIED|API_KEY|enable/i.test(
            message
          )
        ) {
          message +=
            " Cloud Console’da Routes API’yi etkinleştirin.";
        }
      }
    } catch {
      /* raw parse optional */
    }
    throw new Error(message);
  }

  const elements = parseRouteMatrixBody(raw);
  const byDestination = new Map<number, RouteMatrixElement>();
  for (const element of elements) {
    const index = element.destinationIndex ?? 0;
    byDestination.set(index, element);
  }

  return destinations.map((_, index) => {
    const element = byDestination.get(index);
    if (!element) {
      return { distanceMeters: null, status: "MISSING" };
    }
    if (element.condition && element.condition !== "ROUTE_EXISTS") {
      return {
        distanceMeters: null,
        status: element.condition,
      };
    }
    if (element.status?.code && element.status.code !== 0) {
      return {
        distanceMeters: null,
        status: element.status.message || `CODE_${element.status.code}`,
      };
    }
    if (element.distanceMeters == null) {
      return { distanceMeters: null, status: "NO_DISTANCE" };
    }
    return {
      distanceMeters: element.distanceMeters,
      status: "OK",
    };
  });
}

/** Bir orijinden birden fazla hedefe sürüş mesafesi (metre). */
export async function computeDrivingDistancesMeters(
  origin: LatLng,
  destinations: LatLng[]
): Promise<DistanceMatrixResult[]> {
  if (destinations.length === 0) return [];

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "Google Maps API anahtarı yok. GOOGLE_MAPS_SERVER_API_KEY tanımlayın."
    );
  }

  const results: DistanceMatrixResult[] = [];
  for (let i = 0; i < destinations.length; i += MAX_DESTINATIONS_PER_REQUEST) {
    const chunk = destinations.slice(i, i + MAX_DESTINATIONS_PER_REQUEST);
    const chunkResults = await fetchMatrixChunk(apiKey, origin, chunk);
    results.push(...chunkResults);
  }
  return results;
}

/** Metreyi 1 ondalık km'ye yuvarla (ör. 12.4). */
export function metersToKmRounded(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10;
}
