import { Link } from "@/lib/i18n/navigation";

export type ListingBreadcrumbItem = {
  label: string;
  href?: string;
};

export default function ListingBreadcrumbs({
  items,
}: {
  items: ListingBreadcrumbItem[];
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-sky-700 transition hover:text-sky-900 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-gray-800" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
