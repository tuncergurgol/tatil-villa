import { redirect } from "next/navigation";

export default function AdminMenusRedirectPage() {
  redirect("/admin/icerik?tab=menuler");
}
