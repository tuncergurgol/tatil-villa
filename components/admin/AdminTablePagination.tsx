"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

export function TablePagination({
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
        onClick={() => onChange(1)}
        disabled={page <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="İlk sayfa"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Önceki sayfa"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Sonraki sayfa"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(totalPages)}
        disabled={page >= totalPages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Son sayfa"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminTablePaginationBar({
  page,
  totalItems,
  visibleCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalItems: number;
  visibleCount: number;
  pageSize: AdminPageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: AdminPageSize) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="shrink-0 border-t border-gray-100 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <p>
          Sayfa {currentPage} - Toplam : {totalItems} kayıt; Gösterilen :{" "}
          {visibleCount} kayıt
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            onChange={onPageChange}
          />

          <label className="flex items-center gap-2">
            <span className="text-gray-500">Sayfa başına</span>
            <select
              value={pageSize}
              onChange={(event) => {
                onPageSizeChange(
                  Number(event.target.value) as AdminPageSize
                );
                onPageChange(1);
              }}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            >
              {ADMIN_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
