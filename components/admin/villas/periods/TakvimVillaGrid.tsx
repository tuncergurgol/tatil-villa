"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
} from "lucide-react";
import { includesSearchText } from "@/lib/search-text";
import { villaTakvimPath } from "@/lib/villa-takvim-path";
import type { VillaTakvimSearchItem } from "@/lib/queries/villa-takvim";

export type TakvimStatusFilter = "all" | "active" | "passive";

const PAGE_SIZE = 18;

type TakvimVillaGridProps = {
  villas: VillaTakvimSearchItem[];
  title?: string;
  actionLabel?: string;
  actionIcon?: "calendar" | "price";
};

function matchesTakvimQuery(villa: VillaTakvimSearchItem, query: string) {
  return [
    villa.name,
    villa.originalName,
    villa.documentNo,
    villa.villaId != null ? String(villa.villaId) : "",
    villa.slug,
  ].some((value) => includesSearchText(value, query));
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${
        active
          ? "bg-emerald-500 text-white"
          : "bg-gray-500/90 text-white"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-white" : "bg-gray-200"
        }`}
      />
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

function formatTakvimPrice(
  value: number | null,
  currency: VillaTakvimSearchItem["displayPriceCurrency"]
) {
  if (value == null || value <= 0) return "—";
  return `${value.toLocaleString("tr-TR")}${
    currency === "TL" ? "₺" : ` ${currency}`
  }`;
}

function formatFuturePriceRange(villa: VillaTakvimSearchItem) {
  const { minFuturePrice, maxFuturePrice, displayPriceCurrency } = villa;
  if (minFuturePrice == null && maxFuturePrice == null) {
    return formatTakvimPrice(villa.displayPrice, displayPriceCurrency);
  }
  if (
    minFuturePrice != null &&
    maxFuturePrice != null &&
    minFuturePrice !== maxFuturePrice
  ) {
    return `${formatTakvimPrice(minFuturePrice, displayPriceCurrency)} – ${formatTakvimPrice(maxFuturePrice, displayPriceCurrency)}`;
  }
  return formatTakvimPrice(
    minFuturePrice ?? maxFuturePrice ?? villa.displayPrice,
    displayPriceCurrency
  );
}

function VillaCardMobile({
  villa,
  actionLabel,
  actionIcon,
}: {
  villa: VillaTakvimSearchItem;
  actionLabel: string;
  actionIcon: "calendar" | "price";
}) {
  const ActionIcon = actionIcon === "price" ? Zap : Calendar;
  const originalName = villa.originalName.trim();
  const documentNo = villa.documentNo.trim();

  return (
    <Link
      href={villaTakvimPath(villa)}
      className="flex gap-3 rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm transition active:bg-indigo-50/40"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {villa.image ? (
          <Image
            src={villa.image}
            alt={villa.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
            Görsel yok
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-indigo-600/95 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {villa.periodCount} periyot
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold leading-snug text-gray-900">
            {villa.name}
          </p>
          <StatusBadge active={villa.active} />
        </div>

        {originalName ? (
          <p className="text-xs leading-snug text-gray-600">{originalName}</p>
        ) : (
          <p className="text-xs italic text-gray-400">Orjinal ad yok</p>
        )}

        <div className="grid grid-cols-1 gap-0.5 text-[11px] text-gray-500">
          <p>
            <span className="font-semibold text-gray-600">Villa ID:</span>{" "}
            {villa.villaId != null ? villa.villaId : "—"}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Belge No:</span>{" "}
            {documentNo || "—"}
          </p>
          <p>
            <span className="font-semibold text-gray-600">Fiyat (bugünden):</span>{" "}
            <span className="font-bold text-indigo-600">
              {formatFuturePriceRange(villa)}
            </span>
          </p>
        </div>

        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
          <ActionIcon className="h-3.5 w-3.5" />
          {actionLabel}
        </p>
      </div>
    </Link>
  );
}

function VillaCard({
  villa,
  actionLabel,
  actionIcon,
}: {
  villa: VillaTakvimSearchItem;
  actionLabel: string;
  actionIcon: "calendar" | "price";
}) {
  const ActionIcon = actionIcon === "price" ? Zap : Calendar;
  const originalName = villa.originalName.trim();
  const documentNo = villa.documentNo.trim();
  const priceRange = formatFuturePriceRange(villa);

  return (
    <Link
      href={villaTakvimPath(villa)}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgba(99,102,241,0.18)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {villa.image ? (
          <Image
            src={villa.image}
            alt={villa.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            Görsel yok
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <span className="rounded-md bg-indigo-600/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            {villa.periodCount} periyot
          </span>
          <StatusBadge active={villa.active} />
        </div>

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg">
            <ActionIcon className="h-4 w-4 text-indigo-600" />
            {actionLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">
            {villa.name}
          </p>
          {originalName ? (
            <p className="line-clamp-1 text-xs text-gray-600" title={originalName}>
              {originalName}
            </p>
          ) : (
            <p className="text-xs italic text-gray-400">Orjinal ad yok</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
          <div className="min-w-0">
            <dt className="font-semibold text-gray-500">Villa ID</dt>
            <dd className="font-medium text-gray-800">
              {villa.villaId != null ? villa.villaId : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-semibold text-gray-500">Belge No</dt>
            <dd className="truncate font-medium text-gray-800" title={documentNo}>
              {documentNo || "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto rounded-lg bg-indigo-50 px-2.5 py-2">
          <p className="text-[10px] font-semibold tracking-wide text-indigo-500 uppercase">
            Fiyat (bugünden)
          </p>
          <p className="mt-0.5 text-xs font-bold leading-snug text-indigo-700">
            {priceRange}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) =>
      value === 1 ||
      value === totalPages ||
      Math.abs(value - page) <= 1
  );

  const items: Array<number | "ellipsis"> = [];
  for (let index = 0; index < pages.length; index += 1) {
    const current = pages[index];
    const previous = pages[index - 1];
    if (index > 0 && previous != null && current - previous > 1) {
      items.push("ellipsis");
    }
    items.push(current);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Önceki sayfa"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-gray-400"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
              page === item
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Sonraki sayfa"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TakvimVillaGrid({
  villas,
  title = "Villa Takvimi",
  actionLabel = "Takvim Aç",
  actionIcon = "calendar",
}: TakvimVillaGridProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TakvimStatusFilter>("all");
  const [page, setPage] = useState(1);

  const filteredVillas = useMemo(() => {
    return villas.filter((villa) => {
      const matchesQuery = matchesTakvimQuery(villa, search);
      const matchesStatus =
        status === "all" ||
        (status === "active" && villa.active) ||
        (status === "passive" && !villa.active);
      return matchesQuery && matchesStatus;
    });
  }, [search, status, villas]);

  const totalPages = Math.max(1, Math.ceil(filteredVillas.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visibleVillas = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredVillas.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredVillas]);

  function updateStatus(next: TakvimStatusFilter) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col bg-[#f4f6fb] md:min-h-[calc(100dvh-3rem)]">
      <div className="border-b border-gray-200/80 bg-white px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {filteredVillas.length} tesis
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
              {(
                [
                  ["all", "Tümü"],
                  ["active", "Aktif"],
                  ["passive", "Pasif"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateStatus(value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none sm:px-4 sm:text-sm ${
                    status === value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Tesis ara..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 md:px-6 md:py-6">
        {visibleVillas.length > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
              {visibleVillas.map((villa) => (
                <VillaCardMobile
                  key={villa.id}
                  villa={villa}
                  actionLabel={actionLabel}
                  actionIcon={actionIcon}
                />
              ))}
            </div>
            <div className="mx-auto hidden w-full max-w-[1680px] grid-cols-2 gap-4 md:grid lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleVillas.map((villa) => (
                <VillaCard
                  key={villa.id}
                  villa={villa}
                  actionLabel={actionLabel}
                  actionIcon={actionIcon}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
            Eşleşen tesis bulunamadı.
          </div>
        )}
      </div>

      <div className="border-t border-gray-200/80 bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
          />
          <p className="text-sm text-gray-500">
            Toplam {filteredVillas.length} tesis
          </p>
        </div>
      </div>
    </div>
  );
}
