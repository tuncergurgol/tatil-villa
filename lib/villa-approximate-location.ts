/** ~111.32 km per degree latitude */
const METERS_PER_DEG_LAT = 111_320;

/**
 * Deterministic 32-bit hash so the same villa always gets the same offset
 * (no flash of a different approx. location on refresh).
 */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type ApproximateCoords = {
  latitude: number;
  longitude: number;
  /** Offset distance from the true villa point, in meters */
  offsetMeters: number;
};

/**
 * Shifts coordinates by ~800–1500 m in a stable direction derived from `seed`
 * so the public map never reveals the exact villa pin.
 */
export function approximateVillaCoords(
  latitude: number,
  longitude: number,
  seed: string
): ApproximateCoords {
  const h = hashSeed(seed);
  const angleRad = ((h % 360) * Math.PI) / 180;
  const offsetMeters = 800 + (h % 701);

  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.max(Math.cos(latRad), 0.2);

  const dLat = (offsetMeters * Math.cos(angleRad)) / METERS_PER_DEG_LAT;
  const dLng = (offsetMeters * Math.sin(angleRad)) / metersPerDegLng;

  return {
    latitude: latitude + dLat,
    longitude: longitude + dLng,
    offsetMeters,
  };
}

/**
 * Google Maps driving directions from the user's current location
 * to approximate (already offset) coordinates — never the exact villa pin.
 */
export function approximateMapsDirectionsUrl(
  latitude: number,
  longitude: number
): string {
  const destination = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}
