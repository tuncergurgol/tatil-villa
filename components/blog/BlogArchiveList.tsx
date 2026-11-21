import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";

export type BlogArchiveCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  categoryName: string | null;
  publishedLabel: string | null;
};

export default function BlogArchiveList({
  posts,
  emptyLabel,
}: {
  posts: BlogArchiveCard[];
  emptyLabel: string;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sky-200 bg-white/80 px-6 py-12 text-center text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <li key={post.id}>
          <Link
            href={`/blog/${post.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_10px_30px_rgba(14,165,233,0.08)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_16px_40px_rgba(14,165,233,0.14)]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-sky-50">
              {post.coverImage ? (
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  quality={65}
                  priority={index < 3}
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-sky-600">
                  Blog
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                {post.categoryName ? <span>{post.categoryName}</span> : null}
                {post.publishedLabel ? (
                  <span className="font-medium normal-case tracking-normal text-slate-400">
                    {post.publishedLabel}
                  </span>
                ) : null}
              </div>
              <h2 className="text-base font-bold leading-snug text-slate-900 group-hover:text-sky-800 sm:text-lg">
                {post.title}
              </h2>
              {post.excerpt ? (
                <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {post.excerpt}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
