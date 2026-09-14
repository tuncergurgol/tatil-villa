"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { approximateMapsDirectionsUrl } from "@/lib/villa-approximate-location";

/**
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — Google Cloud Console'da Maps JavaScript API
 * etkinleştirilmeli. Yoksa key'siz embed iframe ile yaklaşık konum gösterilir.
 */

const MAP_ZOOM = 12;
const MAP_MIN_ZOOM = 10;
const MAP_MAX_ZOOM = 13;
/** Soft privacy circle; center is already offset ~800–1500 m from the villa. */
const CIRCLE_RADIUS_M = 1200;

/**
 * Hide commercial / non-official POIs and transit labels.
 * Roads stay; business names/icons and most POI labels off.
 */
const PRIVACY_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit.station",
    stylers: [{ visibility: "off" }],
  },
];

let mapsLoader: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window yok"));
  }
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-villa-google-maps="1"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps yüklenemedi"))
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.villaGoogleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error("Google Maps yüklenemedi"));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

/** Keyless embed: coords only (no place name), Turkish UI, approximate zoom. */
function embedMapUrl(latitude: number, longitude: number): string {
  const q = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=tr&z=${MAP_ZOOM}&output=embed`;
}

type VillaApproximateMapProps = {
  /** Approximate (already offset) center — never the exact villa coordinate. */
  latitude: number;
  longitude: number;
  regionLabel?: string;
};

export default function VillaApproximateMap({
  latitude,
  longitude,
  regionLabel,
}: VillaApproximateMapProps) {
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const useJsApi = Boolean(apiKey);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() =>
    useJsApi ? "loading" : "ready"
  );

  const directionsUrl = approximateMapsDirectionsUrl(latitude, longitude);

  useEffect(() => {
    if (!useJsApi) return;

    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const center = { lat: latitude, lng: longitude };

        if (!mapRef.current) {
          mapRef.current = new window.google.maps.Map(containerRef.current, {
            center,
            zoom: MAP_ZOOM,
            minZoom: MAP_MIN_ZOOM,
            maxZoom: MAP_MAX_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
            zoomControl: true,
            styles: PRIVACY_MAP_STYLES,
          });
        } else {
          mapRef.current.setOptions({ center, zoom: MAP_ZOOM });
        }

        if (circleRef.current) {
          circleRef.current.setMap(null);
        }

        // No marker — privacy circle only.
        circleRef.current = new window.google.maps.Circle({
          map: mapRef.current,
          center,
          radius: CIRCLE_RADIUS_M,
          fillColor: "#0f766e",
          fillOpacity: 0.18,
          strokeColor: "#0f766e",
          strokeOpacity: 0.55,
          strokeWeight: 2,
          clickable: false,
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, latitude, longitude, useJsApi]);

  const ariaLabel = regionLabel
    ? `${regionLabel} yaklaşık konum haritası`
    : "Yaklaşık konum haritası";

  const directionsButton = (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noreferrer"
      className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-teal-800 shadow-md ring-1 ring-slate-200/80 transition hover:bg-teal-50 hover:text-teal-900"
    >
      Yol tarifi
    </a>
  );

  const mapShell = (children: ReactNode) => (
    <div
      className="relative h-56 w-full bg-slate-100 sm:h-64 md:h-72"
      role="img"
      aria-label={ariaLabel}
    >
      {children}
      {directionsButton}
    </div>
  );

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {useJsApi && status !== "error" ? (
        mapShell(
          <>
            <div ref={containerRef} className="absolute inset-0" />
            {status === "loading" ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-slate-500">
                Harita yükleniyor…
              </div>
            ) : null}
          </>
        )
      ) : (
        mapShell(
          <iframe
            title={ariaLabel}
            src={embedMapUrl(latitude, longitude)}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        )
      )}
      <p className="border-t border-slate-100 bg-white px-4 py-2.5 text-xs text-slate-500">
        Yaklaşık konum gösterilir; kesin adres rezervasyon sonrası paylaşılır.
        {regionLabel ? ` (${regionLabel})` : null}
      </p>
    </div>
  );
}
