import { prisma } from "@/lib/db";

const blogListSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  authorName: true,
  categoryId: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  published: true,
  publishedAt: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

const cmsPageListSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  pageType: true,
  seoTitle: true,
  seoDescription: true,
  seoKeywords: true,
  published: true,
  showInFooter: true,
  showInMenu: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getPublishedCmsPage(slug: string) {
  return prisma.cmsPage.findFirst({
    where: { slug, published: true },
  });
}

export async function getAllCmsPagesForAdmin() {
  return prisma.cmsPage.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: cmsPageListSelect,
  });
}

export async function getCmsPageByIdForAdmin(id: string) {
  return prisma.cmsPage.findUnique({ where: { id } });
}

export async function getActiveFaqsForPublic(options?: {
  category?: string;
  limit?: number;
}) {
  return prisma.faqItem.findMany({
    where: {
      active: true,
      ...(options?.category ? { category: options.category } : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    ...(options?.limit ? { take: options.limit } : {}),
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      sortOrder: true,
    },
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
    select: blogListSelect,
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
    select: blogListSelect,
  });
}

export async function getBlogPostByIdForAdmin(id: string) {
  return prisma.blogPost.findUnique({
    where: { id },
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

export async function getCorporateMenuPages() {
  return prisma.cmsPage.findMany({
    where: { published: true, showInMenu: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { slug: true, title: true, sortOrder: true },
  });
}

const DEFAULT_CONTENT_TABS = [
  { key: "sss", name: "Sık Sorulan Sorular", moduleKey: "sss", sortOrder: 1 },
  { key: "blog", name: "Blog", moduleKey: "blog", sortOrder: 2 },
  { key: "yorumlar", name: "Misafir Yorumları", moduleKey: "yorumlar", sortOrder: 3 },
  { key: "kurumsal", name: "Kurumsal", moduleKey: "kurumsal", sortOrder: 4 },
  { key: "menuler", name: "Menüler", moduleKey: "menuler", sortOrder: 5 },
  { key: "kampanyalar", name: "Kampanyalar", moduleKey: "kampanyalar", sortOrder: 6 },
] as const;

export async function ensureDefaultCmsContentTabs() {
  const count = await prisma.cmsContentTab.count();
  if (count > 0) return;

  await prisma.cmsContentTab.createMany({
    data: DEFAULT_CONTENT_TABS.map((tab) => ({
      ...tab,
      active: true,
    })),
    skipDuplicates: true,
  });
}

export async function getCmsContentTabsForAdmin() {
  await ensureDefaultCmsContentTabs();
  return prisma.cmsContentTab.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
