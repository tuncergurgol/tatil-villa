"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { MapPin, Search } from "lucide-react";

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
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
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

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/villas/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal }
        );
        if (!response.ok) return;
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
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

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
    setQuery(villa.name);
    setOpen(false);
    router.push(`/villalar/${villa.slug}`);
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-sky-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Villa adı ara..."
          aria-label="Villa adı ile ara"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          autoComplete="off"
        />
      </form>

      {open && query.trim().length > 0 ? (
        <div
          id={listId}
          className="absolute right-0 top-[calc(100%+6px)] z-[220] w-[min(28rem,calc(100vw-1.5rem))] max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-1 shadow-2xl"
        >
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">Aranıyor...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              Eşleşen aktif villa bulunamadı
            </p>
          ) : (
            <ul>
              {results.map((villa) => (
                <li key={villa.id}>
                  <button
                    type="button"
                    onClick={() => selectVilla(villa)}
                    className="flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition hover:bg-sky-50"
                  >
                    <span className="relative mt-0.5 h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {villa.image ? (
                        <Image
                          src={villa.image}
                          alt={villa.name}
                          fill
                          className="object-cover"
                          sizes="64px"
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
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
