import { redirect } from "next/navigation";

export default function AdminCampaignsRedirectPage() {
  redirect("/admin/icerik?tab=kampanyalar");
}
