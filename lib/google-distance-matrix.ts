/**
 * Sürüş yolu mesafesi (km).
 * Google Routes API bu projede faturalandırma kapalı olduğu için 403 veriyor.
 * Mesafe, açık OSRM sürüş tablosundan alınır. Anahtar gerekmez.
 */

const OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving";
/** Koordinat sayısı URL'i şişirmesin diye dilimlenir (1 çıkış + hedefler). */
const MAX_DESTINATIONS_PER_REQUEST = 40;

export type LatLng = { latitude: number; longitude: number };

export type DistanceMatrixResult = {
  /** metre cinsinden yol mesafesi; null = rota yok / hata */
  distanceMeters: number | null;
  status: string;
};

type OsrmTableResponse = {
  code?: string;
  message?: string;
  distances?: Array<Array<number | null>>;
};

function formatCoord(point: LatLng) {
  return `${point.longitude},${point.latitude}`;
}

async function fetchMatrixChunk(
  origin: LatLng,
  destinations: LatLng[]
): Promise<DistanceMatrixResult[]> {
  const coords = [origin, ...destinations].map(formatCoord).join(";");
  const destinationIndexes = destinations.map((_, index) => index + 1).join(";");
  const url = `${OSRM_TABLE_URL}/${coords}?annotations=distance&sources=0&destinations=${destinationIndexes}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "tatildeyiz-distance/1.0",
    },
    signal: AbortSignal.timeout(25_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Yol mesafesi hesaplanamadı (HTTP ${response.status})`);
  }

  let data: OsrmTableResponse;
  try {
    data = JSON.parse(raw) as OsrmTableResponse;
  } catch {
    throw new Error("Yol mesafesi yanıtı okunamadı");
  }

  if (data.code !== "Ok") {
    throw new Error(data.message || "Yol mesafesi hesaplanamadı");
  }

  const row = data.distances?.[0] ?? [];
  return destinations.map((_, index) => {
    const meters = row[index];
    if (meters == null || !Number.isFinite(meters)) {
      return { distanceMeters: null, status: "NO_ROUTE" };
    }
    return { distanceMeters: meters, status: "OK" };
  });
}

/** Bir orijinden birden fazla hedefe sürüş mesafesi (metre). */
export async function computeDrivingDistancesMeters(
  origin: LatLng,
  destinations: LatLng[]
): Promise<DistanceMatrixResult[]> {
  if (destinations.length === 0) return [];

  const results: DistanceMatrixResult[] = [];
  for (let i = 0; i < destinations.length; i += MAX_DESTINATIONS_PER_REQUEST) {
    const chunk = destinations.slice(i, i + MAX_DESTINATIONS_PER_REQUEST);
    const chunkResults = await fetchMatrixChunk(origin, chunk);
    results.push(...chunkResults);
  }
  return results;
}

/** Metreyi 1 ondalık km'ye yuvarla (ör. 12.4). */
export function metersToKmRounded(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10;
}
