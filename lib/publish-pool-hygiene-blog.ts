import { prisma } from "@/lib/db";
import {
  POOL_HYGIENE_BLOG_POST,
  buildPoolHygieneBlogHtml,
} from "@/lib/pool-hygiene-blog-post";

export async function publishPoolHygieneBlogPost() {
  const category = await prisma.blogCategory.upsert({
    where: { slug: POOL_HYGIENE_BLOG_POST.categorySlug },
    create: {
      name: "Tatil İpuçları",
      slug: POOL_HYGIENE_BLOG_POST.categorySlug,
      description: "Aile tatili, planlama ve konfor önerileri",
      sortOrder: 3,
      active: true,
    },
    update: { active: true },
  });

  const existing = await prisma.blogPost.findUnique({
    where: { slug: POOL_HYGIENE_BLOG_POST.slug },
    select: { publishedAt: true },
  });

  const data = {
    title: POOL_HYGIENE_BLOG_POST.title,
    excerpt: POOL_HYGIENE_BLOG_POST.excerpt,
    content: buildPoolHygieneBlogHtml(),
    seoTitle: POOL_HYGIENE_BLOG_POST.seoTitle,
    seoDescription: POOL_HYGIENE_BLOG_POST.seoDescription,
    seoKeywords: POOL_HYGIENE_BLOG_POST.seoKeywords,
    categoryId: category.id,
    published: true,
    publishedAt: existing?.publishedAt ?? new Date(),
    authorName: "Tatildeyiz",
  };

  return prisma.blogPost.upsert({
    where: { slug: POOL_HYGIENE_BLOG_POST.slug },
    create: { slug: POOL_HYGIENE_BLOG_POST.slug, ...data },
    update: data,
    select: { id: true, slug: true, published: true, publishedAt: true },
  });
}
