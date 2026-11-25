"use client";

import { Link } from "@/lib/i18n/navigation";

export type FilterCategory = {
  id: string;
  label: string;
};

export default function CategoryFilterPills({
  categories,
  activeId,
  onChange,
  allLabel = "Tümü",
  hrefForAll,
  hrefForCategory,
}: {
  categories: FilterCategory[];
  activeId: string | null;
  onChange: (id: string | null) => void;
  allLabel?: string;
  /** Verilirse butonlar filtre yerine bu URL’lere gider (SEO + boş slider sorunu). */
  hrefForAll?: string;
  hrefForCategory?: (id: string) => string;
}) {
  if (categories.length === 0) return null;

  const pillClass = (active: boolean) =>
    `shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition sm:px-4 ${
      active
        ? "border-sky-700 bg-sky-50 text-sky-800 shadow-sm"
        : "border-sky-300 bg-white text-sky-700 hover:border-sky-500"
    }`;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full items-center gap-2 sm:w-full sm:flex-wrap sm:justify-center">
        {hrefForAll ? (
          <Link href={hrefForAll} className={pillClass(activeId === null)}>
            {allLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={pillClass(activeId === null)}
          >
            {allLabel}
          </button>
        )}
        {categories.map((category) => {
          const active = activeId === category.id;
          const href = hrefForCategory?.(category.id);
          if (href) {
            return (
              <Link
                key={category.id}
                href={href}
                className={pillClass(active)}
              >
                {category.label}
              </Link>
            );
          }
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              className={pillClass(active)}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
