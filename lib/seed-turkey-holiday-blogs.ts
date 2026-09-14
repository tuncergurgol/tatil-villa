import { prisma } from "@/lib/db";
import {
  buildTurkeyHolidayBlogPosts,
  TURKEY_HOLIDAY_BLOG_CATEGORY,
} from "@/lib/turkey-public-holiday-blog-posts";

export async function seedTurkeyHolidayBlogs() {
  const category = await prisma.blogCategory.upsert({
    where: { slug: TURKEY_HOLIDAY_BLOG_CATEGORY.slug },
    create: { ...TURKEY_HOLIDAY_BLOG_CATEGORY, active: true },
    update: {
      name: TURKEY_HOLIDAY_BLOG_CATEGORY.name,
      description: TURKEY_HOLIDAY_BLOG_CATEGORY.description,
      sortOrder: TURKEY_HOLIDAY_BLOG_CATEGORY.sortOrder,
      active: true,
    },
  });

  const posts = buildTurkeyHolidayBlogPosts();
  for (const post of posts) {
    const data = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords,
      categoryId: category.id,
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

  return { categorySlug: category.slug, count: posts.length };
}
