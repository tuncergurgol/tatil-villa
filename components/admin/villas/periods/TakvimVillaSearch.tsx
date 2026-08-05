"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { includesSearchText } from "@/lib/search-text";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";

function matchesTakvimVillaSearch(villa: VillaTakvimSearchItem, query: string) {
  return [
    villa.name,
    villa.originalName,
    villa.documentNo,
    villa.villaId != null ? String(villa.villaId) : "",
  ].some((value) => includesSearchText(value, query));
}

type TakvimVillaSearchProps =
  | { villas: VillaTakvimSearchItem[]; remote?: false }
  | { villas?: undefined; remote: true };

export default function TakvimVillaSearch(props: TakvimVillaSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [remoteOptions, setRemoteOptions] = useState<VillaTakvimSearchItem[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    if (!props.remote) return;

    const query = search.trim();
    if (!query) {
      setRemoteOptions([]);
      setRemoteLoading(false);
      return;
    }

    const controller = new AbortController();
    setRemoteLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/konaklama/takvim-search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          setRemoteOptions([]);
          return;
        }
        const data = (await response.json()) as { villas?: VillaTakvimSearchItem[] };
        setRemoteOptions(data.villas ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRemoteOptions([]);
        }
      } finally {
        setRemoteLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [props.remote, search]);

  const localOptions = useMemo(() => {
    if (props.remote || !props.villas) return [];
    return props.villas
      .filter((villa) => villa.active)
      .filter((villa) => matchesTakvimVillaSearch(villa, search))
      .sort((left, right) =>
        left.name.localeCompare(right.name, "tr", { sensitivity: "base" })
      )
      .slice(0, 12);
  }, [props, search]);

  const options = props.remote ? remoteOptions : localOptions;

  function selectVilla(villa: VillaTakvimSearchItem) {
    router.push(villaTakvimPath(villa));
    setSearch("");
  }

  return (
    <div className="relative w-full min-w-[240px] sm:w-80">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Villa adı, orijinal adı, belge no veya Villa ID..."
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
      {search.trim() ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {remoteLoading ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Aranıyor…
            </p>
          ) : options.length > 0 ? (
            options.map((villa) => (
              <button
                key={villa.id}
                type="button"
                onClick={() => selectVilla(villa)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left text-sm transition last:border-b-0 hover:bg-indigo-50"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  {villa.image ? (
                    <Image
                      src={villa.image}
                      alt={villa.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                      IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-gray-900">
                    {villa.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-gray-500">
                    {[
                      villa.originalName,
                      villa.documentNo ? `Belge ${villa.documentNo}` : "",
                      villa.villaId != null ? `VillaID ${villa.villaId}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              Aktif villa bulunamadı.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
