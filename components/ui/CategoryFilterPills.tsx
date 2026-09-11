"use client";

export type FilterCategory = {
  id: string;
  label: string;
};

export default function CategoryFilterPills({
  categories,
  activeId,
  onChange,
  allLabel = "Tümü",
}: {
  categories: FilterCategory[];
  activeId: string | null;
  onChange: (id: string | null) => void;
  allLabel?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full items-center gap-2 sm:w-full sm:flex-wrap sm:justify-center">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition sm:px-4 ${
            activeId === null
              ? "border-sky-400 bg-white text-sky-600 shadow-sm"
              : "border-sky-200 bg-white text-sky-500 hover:border-sky-300"
          }`}
        >
          {allLabel}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition sm:px-4 ${
              activeId === category.id
                ? "border-sky-400 bg-white text-sky-600 shadow-sm"
                : "border-sky-200 bg-white text-sky-500 hover:border-sky-300"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
