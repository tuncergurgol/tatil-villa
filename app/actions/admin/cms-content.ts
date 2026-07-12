"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { slugifyTurkish } from "@/lib/tatildeyiz-next-data";

export type CmsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function revalidateCmsPaths() {
  const paths = [
    "/",
    "/blog",
    "/sik-sorulan-sorular",
    "/yorumlar",
    "/admin/icerik",
    "/admin/icerik/sss",
    "/admin/icerik/blog",
    "/admin/icerik/yorumlar",
    "/admin/icerik/kurumsal",
    "/admin/icerik/menuler",
    "/admin/kampanyalar",
  ];
  for (const path of paths) {
    revalidatePath(path);
  }
  revalidatePath("/kurumsal", "layout");
}

const faqSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(10),
  category: z.string().min(2),
  slug: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function saveFaqItemAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();

  const parsed = faqSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
    category: formData.get("category"),
    slug: formData.get("slug") || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    return { error: "Geçersiz SSS verisi" };
  }

  const slug =
    parsed.data.slug?.trim() ||
    slugifyTurkish(parsed.data.question).slice(0, 80);

  try {
    if (id) {
      await prisma.faqItem.update({
        where: { id },
        data: { ...parsed.data, slug },
      });
    } else {
      await prisma.faqItem.create({
        data: { ...parsed.data, slug },
      });
    }
    revalidateCmsPaths();
    return { success: true, message: "SSS kaydedildi" };
  } catch {
    return { error: "SSS kaydedilemedi (slug benzersiz olmalı)" };
  }
}

export async function deleteFaqItemAction(id: string): Promise<CmsActionState> {
  await requireAdmin();
  await prisma.faqItem.delete({ where: { id } });
  revalidateCmsPaths();
  return { success: true };
}

const pageSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  content: z.string(),
  excerpt: z.string().optional(),
  pageType: z.enum(["CORPORATE", "LEGAL", "LANDING"]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  published: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function saveCmsPageAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();

  const parsed = pageSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") ?? "",
    pageType: formData.get("pageType") ?? "CORPORATE",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    published: formData.get("published") === "on",
    showInFooter: formData.get("showInFooter") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });

  if (!parsed.success) {
    return { error: "Geçersiz sayfa verisi" };
  }

  try {
    if (id) {
      await prisma.cmsPage.update({ where: { id }, data: parsed.data });
    } else {
      await prisma.cmsPage.create({ data: parsed.data });
    }
    revalidateCmsPaths();
    revalidatePath(`/kurumsal/${parsed.data.slug}`);
    return { success: true, message: "Sayfa kaydedildi" };
  } catch {
    return { error: "Sayfa kaydedilemedi" };
  }
}

const blogCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
});

export async function saveBlogCategoryAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();
  const parsed = blogCategorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: "Geçersiz kategori" };

  if (id) {
    await prisma.blogCategory.update({ where: { id }, data: parsed.data });
  } else {
    await prisma.blogCategory.create({ data: parsed.data });
  }
  revalidateCmsPaths();
  return { success: true };
}

const blogPostSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  excerpt: z.string().optional(),
  content: z.string(),
  coverImage: z.string().optional(),
  authorName: z.string().optional(),
  categoryId: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  published: z.boolean().optional(),
  publishedAt: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function saveBlogPostAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  const parsed = blogPostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt") ?? "",
    content: formData.get("content"),
    coverImage: formData.get("coverImage") ?? "",
    authorName: formData.get("authorName") ?? "Tatildeyiz",
    categoryId: String(formData.get("categoryId") ?? "").trim() || undefined,
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    seoKeywords: formData.get("seoKeywords") ?? "",
    published: formData.get("published") === "on",
    publishedAt: publishedAtRaw || undefined,
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: "Geçersiz blog yazısı" };

  const publishedAtFromForm = publishedAtRaw
    ? new Date(publishedAtRaw)
    : null;
  const hasValidPublishedAt =
    publishedAtFromForm != null && !Number.isNaN(publishedAtFromForm.getTime());

  const published = Boolean(parsed.data.published) || hasValidPublishedAt;

  const data = {
    title: parsed.data.title,
    slug: parsed.data.slug,
    excerpt: parsed.data.excerpt ?? "",
    content: parsed.data.content,
    coverImage: parsed.data.coverImage ?? "",
    authorName: parsed.data.authorName ?? "Tatildeyiz",
    categoryId: parsed.data.categoryId || null,
    seoTitle: parsed.data.seoTitle ?? "",
    seoDescription: parsed.data.seoDescription ?? "",
    seoKeywords: parsed.data.seoKeywords ?? "",
    published,
    sortOrder: parsed.data.sortOrder ?? 0,
    publishedAt: published
      ? hasValidPublishedAt
        ? publishedAtFromForm
        : new Date()
      : null,
  };

  if (id) {
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        publishedAt: published
          ? hasValidPublishedAt
            ? publishedAtFromForm
            : existing?.publishedAt ?? new Date()
          : null,
      },
    });
  } else {
    await prisma.blogPost.create({ data });
  }
  revalidateCmsPaths();
  revalidatePath(`/blog/${parsed.data.slug}`);
  return { success: true };
}

export async function deleteBlogPostAction(id: string): Promise<CmsActionState> {
  await requireAdmin();
  await prisma.blogPost.delete({ where: { id } });
  revalidateCmsPaths();
  return { success: true };
}

const reviewSchema = z.object({
  guestName: z.string().min(2),
  guestCity: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(10),
  villaId: z.string().optional(),
  stayMonth: z.string().optional(),
  approved: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function saveGuestReviewAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();
  const parsed = reviewSchema.safeParse({
    guestName: formData.get("guestName"),
    guestCity: formData.get("guestCity") ?? "",
    rating: formData.get("rating"),
    title: formData.get("title") ?? "",
    comment: formData.get("comment"),
    villaId: String(formData.get("villaId") ?? "").trim() || undefined,
    stayMonth: formData.get("stayMonth") ?? "",
    approved: formData.get("approved") === "on",
    featured: formData.get("featured") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { error: "Geçersiz yorum verisi" };

  const data = {
    ...parsed.data,
    villaId: parsed.data.villaId || null,
  };

  if (id) {
    await prisma.guestReview.update({ where: { id }, data });
  } else {
    await prisma.guestReview.create({ data });
  }
  revalidateCmsPaths();
  return { success: true };
}

export async function deleteGuestReviewAction(id: string): Promise<CmsActionState> {
  await requireAdmin();
  await prisma.guestReview.delete({ where: { id } });
  revalidateCmsPaths();
  return { success: true };
}

const menuItemSchema = z.object({
  menuId: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
  parentId: z.string().optional(),
});

export async function saveSiteMenuItemAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  try {
    await requireAdmin();
    const sortRaw = formData.get("sortOrder");
    const parsed = menuItemSchema.safeParse({
      menuId: formData.get("menuId"),
      label: formData.get("label"),
      href: formData.get("href"),
      sortOrder:
        sortRaw === null || sortRaw === ""
          ? 0
          : Number(sortRaw),
      active: formData.get("active") === "on",
      openInNewTab: formData.get("openInNewTab") === "on",
      parentId: String(formData.get("parentId") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return { error: "Geçersiz menü öğesi. Başlık ve link zorunludur." };
    }

    const data = {
      menuId: parsed.data.menuId,
      label: parsed.data.label.trim(),
      href: parsed.data.href.trim(),
      sortOrder: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
      openInNewTab: parsed.data.openInNewTab ?? false,
      parentId: parsed.data.parentId || null,
    };

    if (id) {
      await prisma.siteMenuItem.update({ where: { id }, data });
    } else {
      await prisma.siteMenuItem.create({ data });
    }
    revalidateCmsPaths();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("saveSiteMenuItemAction", error);
    return { error: "Menü öğesi kaydedilemedi." };
  }
}

export async function deleteSiteMenuItemAction(id: string): Promise<CmsActionState> {
  await requireAdmin();
  await prisma.siteMenuItem.delete({ where: { id } });
  revalidateCmsPaths();
  return { success: true };
}

const KNOWN_MODULE_KEYS = new Set([
  "sss",
  "blog",
  "yorumlar",
  "kurumsal",
  "menuler",
  "kampanyalar",
  "custom",
]);

const contentTabSchema = z.object({
  name: z.string().min(2, "Sekme adı gerekli"),
  sortOrder: z.coerce.number().int(),
  active: z.boolean(),
  moduleKey: z.string().optional(),
});

async function uniqueContentTabKey(base: string, excludeId?: string) {
  let key = slugifyTurkish(base) || `sekme-${Date.now()}`;
  let attempt = 0;
  while (attempt < 20) {
    const candidate = attempt === 0 ? key : `${key}-${attempt + 1}`;
    const existing = await prisma.cmsContentTab.findUnique({
      where: { key: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    attempt += 1;
  }
  return `${key}-${Date.now()}`;
}

export async function saveCmsContentTabAction(
  id: string | null,
  formData: FormData
): Promise<CmsActionState> {
  await requireAdmin();

  const parsed = contentTabSchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") ?? 0,
    active:
      formData.get("active") === "true" || formData.get("active") === "on",
    moduleKey: String(formData.get("moduleKey") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: "Geçersiz sekme bilgisi" };
  }

  const name = parsed.data.name.trim();
  const moduleKeyRaw = parsed.data.moduleKey ?? "custom";
  const moduleKey = KNOWN_MODULE_KEYS.has(moduleKeyRaw)
    ? moduleKeyRaw
    : "custom";

  try {
    if (id) {
      const existing = await prisma.cmsContentTab.findUnique({
        where: { id },
        select: { id: true, key: true },
      });
      if (!existing) return { error: "Sekme bulunamadı" };

      await prisma.cmsContentTab.update({
        where: { id },
        data: {
          name,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
          moduleKey,
        },
      });
    } else {
      const key = await uniqueContentTabKey(name);
      await prisma.cmsContentTab.create({
        data: {
          key,
          name,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
          moduleKey,
        },
      });
    }

    revalidateCmsPaths();
    return { success: true, message: "Sekme kaydedildi" };
  } catch (error) {
    console.error("saveCmsContentTabAction", error);
    return { error: "Sekme kaydedilemedi" };
  }
}

export async function deleteCmsContentTabAction(
  id: string
): Promise<CmsActionState> {
  await requireAdmin();

  try {
    const existing = await prisma.cmsContentTab.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return { error: "Sekme bulunamadı" };

    await prisma.cmsContentTab.delete({ where: { id } });
    revalidateCmsPaths();
    return { success: true, message: "Sekme silindi" };
  } catch (error) {
    console.error("deleteCmsContentTabAction", error);
    return { error: "Sekme silinemedi" };
  }
}
