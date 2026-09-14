"use client";

import dynamic from "next/dynamic";
import { useDeferredMount } from "@/hooks/use-deferred-mount";
import type { BlogInspirationCategory, BlogInspirationPost } from "@/components/blog/BlogInspirationSlider";

const BlogInspirationSlider = dynamic(
  () => import("@/components/blog/BlogInspirationSlider"),
  { ssr: false }
);

export default function DeferredBlogInspiration({
  posts,
  categories,
}: {
  posts: BlogInspirationPost[];
  categories: BlogInspirationCategory[];
}) {
  const ready = useDeferredMount(8000);

  if (!ready) {
    return (
      <div
        className="min-h-[22rem] rounded-[2.25rem] bg-sky-50/70"
        aria-hidden
      />
    );
  }

  return (
    <BlogInspirationSlider
      embedded
      showHeader={false}
      categories={categories}
      posts={posts}
    />
  );
}
