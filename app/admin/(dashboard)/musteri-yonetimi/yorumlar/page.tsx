import ReviewManagement from "@/components/admin/content/ReviewManagement";
import { getAllReviewsForAdmin } from "@/lib/queries/cms-content";

export const dynamic = "force-dynamic";

export default async function MusteriYorumlariPage() {
  const reviews = await getAllReviewsForAdmin();

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Misafir Yorumları</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Misafir daveti ve manuel yorumları onaylayın, düzenleyin
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <ReviewManagement reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
