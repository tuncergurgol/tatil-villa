import ReviewManagement from "@/components/admin/content/ReviewManagement";
import { getAllReviewsForAdmin } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export default async function MusteriYorumlariPage() {
  const reviews = await getAllReviewsForAdmin();

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <ReviewManagement reviews={reviews} />
      </div>
    </div>
  );
}
