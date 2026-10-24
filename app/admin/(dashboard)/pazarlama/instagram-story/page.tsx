import InstagramStoryStudio from "@/components/admin/instagram-story/InstagramStoryStudio";
import { requireAdmin } from "@/lib/auth-helpers";
import { listInstagramStorySites } from "@/lib/instagram-story/sites";
import { listInstagramStoryRegionPickerOptions } from "@/lib/queries/instagram-story";

export const dynamic = "force-dynamic";

export default async function InstagramStoryPage() {
  await requireAdmin();
  const [sites, regions] = await Promise.all([
    listInstagramStorySites(),
    listInstagramStoryRegionPickerOptions(),
  ]);
  return <InstagramStoryStudio sites={sites} regions={regions} />;
}
