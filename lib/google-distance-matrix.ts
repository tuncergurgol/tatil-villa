/**
 * Google Distance Matrix API — sürüş yolu mesafesi (km).
 * Anahtar sunucuda tutulur; istemciye verilmez.
 *
 * Env: GOOGLE_MAPS_SERVER_API_KEY (tercih) veya NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * Cloud Console'da "Distance Matrix API" etkin olmalı.
 */

const MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";
const MAX_DESTINATIONS_PER_REQUEST = 25;

export type LatLng = { latitude: number; longitude: number };

export type DistanceMatrixResult = {
  /** metre cinsinden yol mesafesi; null = rota yok / hata */
  distanceMeters: number | null;
  status: string;
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

function formatPoint(point: LatLng): string {
  return `${point.latitude},${point.longitude}`;
}

async function fetchMatrixChunk(
  apiKey: string,
  origin: LatLng,
  destinations: LatLng[]
): Promise<DistanceMatrixResult[]> {
  const params = new URLSearchParams({
    origins: formatPoint(origin),
    destinations: destinations.map(formatPoint).join("|"),
    mode: "driving",
    language: "tr",
    units: "metric",
    key: apiKey,
  });

  const response = await fetch(`${MATRIX_URL}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Distance Matrix HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    error_message?: string;
    rows?: Array<{
      elements?: Array<{
        status: string;
        distance?: { value: number };
      }>;
    }>;
  };

  if (data.status !== "OK") {
    throw new Error(
      data.error_message ||
        `Distance Matrix durumu: ${data.status || "UNKNOWN"}`
    );
  }

  const elements = data.rows?.[0]?.elements ?? [];
  return destinations.map((_, index) => {
    const element = elements[index];
    if (!element || element.status !== "OK" || !element.distance) {
      return {
        distanceMeters: null,
        status: element?.status ?? "MISSING",
      };
    }
    return {
      distanceMeters: element.distance.value,
      status: element.status,
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
