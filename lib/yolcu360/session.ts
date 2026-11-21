export const YOLCU360_SESSION_KEY = "yolcu360.booking";

export type Yolcu360BookingSession = {
  searchID: string;
  code: string;
  car: unknown;
  extras?: Array<{ code: string; quantity: number }>;
  integrationCode?: string;
  isFindeksRequired?: boolean;
  findeksVerified?: boolean;
  searchParams?: Record<string, string>;
};

export function saveYolcu360BookingSession(data: Yolcu360BookingSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(YOLCU360_SESSION_KEY, JSON.stringify(data));
}

export function loadYolcu360BookingSession(): Yolcu360BookingSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(YOLCU360_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Yolcu360BookingSession;
  } catch {
    return null;
  }
}

export function clearYolcu360BookingSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(YOLCU360_SESSION_KEY);
}

export function buildYolcu360SearchQuery(input: {
  pickupPlaceId: string;
  returnPlaceId: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  age: string;
  sameLocation: string;
}) {
  const params = new URLSearchParams(input);
  return params.toString();
}
