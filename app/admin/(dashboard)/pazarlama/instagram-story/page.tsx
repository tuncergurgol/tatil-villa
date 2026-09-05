import InstagramStoryStudio from "@/components/admin/instagram-story/InstagramStoryStudio";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function InstagramStoryPage() {
  await requireAdmin();
  return <InstagramStoryStudio />;
}
