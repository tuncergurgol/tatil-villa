import { prisma } from "@/lib/db";

export async function getPublishedCmsPage(slug: string) {
  return prisma.cmsPage.findFirst({
    where: { slug, published: true },
  });
}

export async function getAllCmsPagesForAdmin() {
  return prisma.cmsPage.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

export async function getActiveFaqsForPublic(category?: string) {
  return prisma.faqItem.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getFaqCategoriesForPublic() {
  const rows = await prisma.faqItem.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((row) => row.category);
}

export async function getAllFaqsForAdmin() {
  return prisma.faqItem.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getBlogCategoriesForPublic() {
  return prisma.blogCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { posts: { where: { published: true } } } },
    },
  });
}

export async function getPublishedBlogPosts(options?: {
  categorySlug?: string;
  limit?: number;
}) {
  return prisma.blogPost.findMany({
    where: {
      published: true,
      ...(options?.categorySlug
        ? { category: { slug: options.categorySlug } }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: options?.limit,
    include: { category: true },
  });
}

export async function getPublishedBlogPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, published: true },
    include: { category: true },
  });
}

export async function getAllBlogCategoriesForAdmin() {
  return prisma.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { posts: true } } },
  });
}

export async function getAllBlogPostsForAdmin() {
  return prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { category: true },
  });
}

export async function getApprovedReviewsForPublic(limit = 12) {
  return prisma.guestReview.findMany({
    where: { approved: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      villa: { select: { id: true, name: true, slug: true, villaId: true } },
    },
  });
}

export async function getAllReviewsForAdmin() {
  return prisma.guestReview.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      villa: { select: { id: true, name: true, villaId: true } },
    },
  });
}

export async function getFooterCorporatePages() {
  return prisma.cmsPage.findMany({
    where: { published: true, showInFooter: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, title: true },
  });
}
