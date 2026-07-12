import ContentManagement from "@/components/admin/content/ContentManagement";
import {
  getAllBlogCategoriesForAdmin,
  getAllBlogPostsForAdmin,
  getAllCmsPagesForAdmin,
  getAllFaqsForAdmin,
  getAllReviewsForAdmin,
  getCmsContentTabsForAdmin,
} from "@/lib/queries/cms-content";
import { getAllSiteMenusForAdmin } from "@/lib/queries/site-menus";
import { getAllCampaigns } from "@/lib/queries/campaigns";

export const dynamic = "force-dynamic";

export default async function ContentHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const contentTabs = await getCmsContentTabsForAdmin();
  const sortedTabs = [...contentTabs].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr")
  );
  const activeKey =
    tab && sortedTabs.some((item) => item.key === tab)
      ? tab
      : (sortedTabs[0]?.key ?? "sss");
  const activeModule =
    sortedTabs.find((item) => item.key === activeKey)?.moduleKey ?? activeKey;

  const [
    faqs,
    blogCategories,
    blogPosts,
    reviews,
    pages,
    menus,
    campaigns,
  ] = await Promise.all([
    activeModule === "sss" ? getAllFaqsForAdmin() : Promise.resolve([]),
    activeModule === "blog"
      ? getAllBlogCategoriesForAdmin()
      : Promise.resolve([]),
    activeModule === "blog" ? getAllBlogPostsForAdmin() : Promise.resolve([]),
    activeModule === "yorumlar" ? getAllReviewsForAdmin() : Promise.resolve([]),
    activeModule === "kurumsal" ? getAllCmsPagesForAdmin() : Promise.resolve([]),
    activeModule === "menuler" ? getAllSiteMenusForAdmin() : Promise.resolve([]),
    activeModule === "kampanyalar" ? getAllCampaigns() : Promise.resolve([]),
  ]);

  return (
    <ContentManagement
      initialTab={activeKey}
      contentTabs={contentTabs}
      faqs={faqs}
      blogCategories={blogCategories}
      blogPosts={blogPosts}
      reviews={reviews}
      pages={pages}
      menus={menus}
      campaigns={campaigns}
    />
  );
}
