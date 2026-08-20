"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import FloatingPanel from "@/components/FloatingPanel";
import {
  HEADER_VILLA_SEARCH_INPUT_ID,
  MOBILE_VILLA_SEARCH_OPEN_EVENT,
} from "@/lib/mobile-villa-search";
import { villaPublicPath } from "@/lib/villa-public-path";

type SearchResult = {
  id: string;
  slug: string;
  name: string;
  image: string;
  regionLabel: string;
};

export default function HeaderVillaSearch({
  initialQuery = "",
  className = "",
  inputId = HEADER_VILLA_SEARCH_INPUT_ID,
  compact = false,
}: {
  initialQuery?: string;
  className?: string;
  inputId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextOpenRef = useRef(false);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    if (skipNextOpenRef.current) {
      skipNextOpenRef.current = false;
      return;
    }

    setOpen(true);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/villas/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = (await response.json()) as { results?: SearchResult[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleMobileOpen() {
      inputRef.current?.focus({ preventScroll: true });
      if (query.trim().length > 0) {
        setOpen(true);
      }
    }

    window.addEventListener(MOBILE_VILLA_SEARCH_OPEN_EVENT, handleMobileOpen);
    return () =>
      window.removeEventListener(MOBILE_VILLA_SEARCH_OPEN_EVENT, handleMobileOpen);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        (target as HTMLElement).closest?.("[data-mobile-bottom-nav]")
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  function goToResults(value: string) {
    const trimmed = value.trim();
    setOpen(false);
    if (!trimmed) {
      router.push("/villalar");
      return;
    }
    router.push(`/villalar?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToResults(query);
  }

  function selectVilla(villa: SearchResult) {
    skipNextOpenRef.current = true;
    setResults([]);
    setOpen(false);
    setQuery(villa.name);
    router.push(villaPublicPath(villa.slug));
  }

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <div ref={anchorRef}>
        <form onSubmit={handleSubmit} role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-sky-500" />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length > 0) setOpen(true);
            }}
            placeholder="Villa adı ara..."
            aria-label="Villa adı ile ara"
            className={`w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-3 text-gray-800 outline-none transition placeholder:text-gray-600 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100 ${
              compact
                ? "py-1.5 text-sm"
                : "py-[7px] text-base sm:py-2.5 sm:text-sm"
            }`}
            autoComplete="off"
          />
        </form>
      </div>

      <FloatingPanel
        open={showPanel}
        anchorRef={anchorRef}
        panelRef={panelRef}
        className="max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-1 shadow-2xl"
      >
        <div>
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-600" role="status">
              Aranıyor...
            </p>
          ) : results.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-sm text-gray-600">
                Eşleşen aktif villa bulunamadı
              </p>
              <button
                type="button"
                onClick={() => goToResults(query)}
                className="mt-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
              >
                Tüm sonuçlarda ara
              </button>
            </div>
          ) : (
            <ul>
              {results.map((villa) => (
                <li key={villa.id}>
                  <button
                    type="button"
                    onClick={() => selectVilla(villa)}
                    className="flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition hover:bg-sky-50 active:bg-sky-100"
                  >
                    <span className="relative mt-0.5 h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {villa.image ? (
                        <Image
                          src={villa.image}
                          alt={villa.name}
                          width={64}
                          height={48}
                          className="h-full w-full object-cover"
                          sizes="64px"
                          quality={60}
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-gray-900">
                        {villa.name}
                      </span>
                      {villa.regionLabel ? (
                        <span className="mt-1 flex items-start gap-1 text-xs leading-snug text-gray-500">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-sky-500" />
                          <span>{villa.regionLabel}</span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t border-gray-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => goToResults(query)}
                  className="w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-sky-700 hover:bg-sky-50 active:bg-sky-100"
                >
                  &quot;{query.trim()}&quot; için tüm sonuçları gör
                </button>
              </li>
            </ul>
          )}
        </div>
      </FloatingPanel>
    </div>
  );
}
