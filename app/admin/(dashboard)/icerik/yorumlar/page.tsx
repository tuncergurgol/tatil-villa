import { redirect } from "next/navigation";

export default function AdminReviewsRedirectPage() {
  redirect("/admin/icerik?tab=yorumlar");
}
