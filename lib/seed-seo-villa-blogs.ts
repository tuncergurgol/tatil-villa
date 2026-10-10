import { prisma } from "@/lib/db";
import {
  buildSeoVillaBlogPosts,
  SEO_VILLA_BLOG_CATEGORIES,
} from "@/lib/seo-villa-blog-posts";

export async function seedSeoVillaBlogs() {
  const categories = new Map<string, string>();

  for (const category of SEO_VILLA_BLOG_CATEGORIES) {
    const row = await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, active: true },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        active: true,
      },
    });
    categories.set(category.slug, row.id);
  }

  const posts = buildSeoVillaBlogPosts();
  for (const post of posts) {
    const categoryId = categories.get(post.categorySlug);
    if (!categoryId) {
      throw new Error(`Blog kategorisi bulunamadı: ${post.categorySlug}`);
    }
    const data = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords,
      categoryId,
      published: true,
      publishedAt: post.publishedAt,
      authorName: "Tatildeyiz",
    };
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: { slug: post.slug, ...data },
      update: data,
    });
  }

  return { count: posts.length, slugs: posts.map((post) => post.slug) };
}
