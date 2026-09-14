import InstagramStoryStudio from "@/components/admin/instagram-story/InstagramStoryStudio";
import { requireAdmin } from "@/lib/auth-helpers";
import { listInstagramStorySites } from "@/lib/instagram-story/sites";

export const dynamic = "force-dynamic";

export default async function InstagramStoryPage() {
  await requireAdmin();
  const sites = await listInstagramStorySites();
  return <InstagramStoryStudio sites={sites} />;
}
