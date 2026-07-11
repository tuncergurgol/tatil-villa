import { writeFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  fetchTatildeyizBlogCategories,
  fetchTatildeyizBlogPosts,
  fetchTatildeyizCampaigns,
  htmlToExcerpt,
  mapTatildeyizCampaignHref,
} from "../lib/tatildeyiz-cms-api";
import { slugifyTurkish } from "../lib/tatildeyiz-next-data";
import { corporatePageSeeds } from "../prisma/cms-content-seed";
import { scrapeTatildeyizCorporatePages } from "../lib/tatildeyiz-page-scraper";

const prisma = new PrismaClient();
const REPORT_PATH = path.join(process.cwd(), "scripts", "import-cms-report.json");

type ImportOptions = {
  dryRun: boolean;
  blog: boolean;
  campaigns: boolean;
  pages: boolean;
};

type ImportStats = {
  blogCategories: { created: number; updated: number };
  blogPosts: { created: number; updated: number; skipped: number };
  campaigns: { created: number; updated: number };
  pages: { updated: number; failed: number };
};

function parseArgs(): ImportOptions {
  const argv = process.argv.slice(2);
  const only = argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];

  return {
    dryRun: argv.includes("--dry-run"),
    blog: !only || only === "blog",
    campaigns: !only || only === "campaigns",
    pages: argv.includes("--pages") || only === "pages",
  };
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function importBlogCategories(dryRun: boolean) {
  const categories = await fetchTatildeyizBlogCategories();
  const stats = { created: 0, updated: 0 };
  const categoryIdMap = new Map<number, string>();

  for (const [index, category] of categories.entries()) {
    const slug = category.value || slugifyTurkish(category.name);
    const existing = await prisma.blogCategory.findUnique({ where: { slug } });

    const data = {
      name: category.name,
      slug,
      description: `${category.name} kategorisindeki blog yazıları`,
      seoTitle: `${category.name} | Tatildeyiz Blog`,
      seoDescription: `${category.name} hakkında rehber ve bilgi yazıları.`,
      sortOrder: index + 1,
      active: true,
    };

    if (existing) {
      stats.updated += 1;
      categoryIdMap.set(category.id, existing.id);
      if (!dryRun) {
        await prisma.blogCategory.update({ where: { id: existing.id }, data });
      }
    } else {
      stats.created += 1;
      if (!dryRun) {
        const created = await prisma.blogCategory.create({ data });
        categoryIdMap.set(category.id, created.id);
      }
    }
  }

  return { stats, categoryIdMap };
}

async function importBlogPosts(categoryIdMap: Map<number, string>, dryRun: boolean) {
  const posts = await fetchTatildeyizBlogPosts();
  const stats = { created: 0, updated: 0, skipped: 0 };

  for (const post of posts) {
    const slug = (post.slug || post.sefUrl || slugifyTurkish(post.title)).trim();
    if (!slug) {
      stats.skipped += 1;
      continue;
    }

    const categoryId =
      post.postCategoryId != null ? categoryIdMap.get(post.postCategoryId) ?? null : null;

    const data = {
      slug,
      title: post.title,
      excerpt: htmlToExcerpt(post.explain),
      content: post.explain,
      coverImage: post.imgSrc || "",
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDesc || htmlToExcerpt(post.explain, 160),
      seoKeywords: post.seoKeywords || "",
      published: Boolean(post.published),
      publishedAt: parseDate(post.createdAt) ?? new Date(),
      sortOrder: post.priority ?? 0,
      categoryId,
    };

    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      stats.updated += 1;
      if (!dryRun) {
        await prisma.blogPost.update({ where: { id: existing.id }, data });
      }
    } else {
      stats.created += 1;
      if (!dryRun) {
        await prisma.blogPost.create({ data });
      }
    }
  }

  return stats;
}

async function importCampaigns(dryRun: boolean) {
  const payload = await fetchTatildeyizCampaigns();
  const campaigns = [...payload.sliderCampaigns, ...payload.boxCampaigns].sort(
    (a, b) => a.order - b.order
  );
  const stats = { created: 0, updated: 0 };

  for (const campaign of campaigns) {
    const href = mapTatildeyizCampaignHref(campaign.linkUrl);
    const existing = await prisma.campaign.findFirst({
      where: { title: campaign.title },
    });

    const data = {
      title: campaign.title,
      subtitle: campaign.subtitle,
      image: campaign.imageUrl,
      cta: "Detayları Gör",
      href,
      sortOrder: campaign.order,
      active: true,
    };

    if (existing) {
      stats.updated += 1;
      if (!dryRun) {
        await prisma.campaign.update({ where: { id: existing.id }, data });
      }
    } else {
      stats.created += 1;
      if (!dryRun) {
        await prisma.campaign.create({ data });
      }
    }
  }

  return stats;
}

async function importCorporatePages(dryRun: boolean) {
  const slugs = corporatePageSeeds.map((page) => page.slug);
  const seedBySlug = new Map(corporatePageSeeds.map((page) => [page.slug, page]));
  const { results, errors } = await scrapeTatildeyizCorporatePages(slugs);
  const stats = { updated: 0, failed: errors.length };

  for (const scraped of results) {
    const seed = seedBySlug.get(scraped.slug);
    if (!seed) continue;

    const data = {
      title: scraped.title || seed.title,
      content: scraped.content,
      excerpt: scraped.excerpt,
      seoTitle: `${scraped.title || seed.title} | Tatildeyiz`,
      seoDescription: scraped.excerpt,
      published: true,
      showInFooter: true,
      pageType: seed.pageType,
      sortOrder: seed.sortOrder,
    };

    const existing = await prisma.cmsPage.findUnique({ where: { slug: scraped.slug } });
    if (existing) {
      stats.updated += 1;
      if (!dryRun) {
        await prisma.cmsPage.update({ where: { id: existing.id }, data });
      }
    } else if (!dryRun) {
      stats.updated += 1;
      await prisma.cmsPage.create({
        data: {
          slug: scraped.slug,
          ...data,
        },
      });
    }
  }

  if (errors.length > 0) {
    console.warn("Kurumsal sayfa hataları:", errors);
  }

  return stats;
}

async function main() {
  const options = parseArgs();
  const startedAt = new Date().toISOString();
  const stats: ImportStats = {
    blogCategories: { created: 0, updated: 0 },
    blogPosts: { created: 0, updated: 0, skipped: 0 },
    campaigns: { created: 0, updated: 0 },
    pages: { updated: 0, failed: 0 },
  };

  console.log(
    `Tatildeyiz CMS import başlıyor (dryRun=${options.dryRun}, blog=${options.blog}, campaigns=${options.campaigns}, pages=${options.pages})`
  );

  if (options.blog) {
    const { stats: categoryStats, categoryIdMap } = await importBlogCategories(options.dryRun);
    stats.blogCategories = categoryStats;
    stats.blogPosts = await importBlogPosts(categoryIdMap, options.dryRun);
    console.log("Blog kategorileri:", categoryStats);
    console.log("Blog yazıları:", stats.blogPosts);
  }

  if (options.campaigns) {
    stats.campaigns = await importCampaigns(options.dryRun);
    console.log("Kampanyalar:", stats.campaigns);
  }

  if (options.pages) {
    stats.pages = await importCorporatePages(options.dryRun);
    console.log("Kurumsal sayfalar:", stats.pages);
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    options,
    stats,
    notes: [
      "Kurumsal sayfalar Playwright ile tatildeyiz.com.tr üzerinden çekilir.",
      "SSS verisi seed:cms ile yüklenir.",
    ],
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`Rapor yazıldı: ${REPORT_PATH}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
