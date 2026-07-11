import ContentManagement from "@/components/admin/content/ContentManagement";
import {
  getAllBlogCategoriesForAdmin,
  getAllBlogPostsForAdmin,
  getAllCmsPagesForAdmin,
  getAllFaqsForAdmin,
  getAllReviewsForAdmin,
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
  const [faqs, blogCategories, blogPosts, reviews, pages, menus, campaigns] =
    await Promise.all([
      getAllFaqsForAdmin(),
      getAllBlogCategoriesForAdmin(),
      getAllBlogPostsForAdmin(),
      getAllReviewsForAdmin(),
      getAllCmsPagesForAdmin(),
      getAllSiteMenusForAdmin(),
      getAllCampaigns(),
    ]);

  return (
    <ContentManagement
      initialTab={tab}
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
