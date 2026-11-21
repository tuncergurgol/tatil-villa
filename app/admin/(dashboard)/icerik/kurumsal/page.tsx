import { redirect } from "next/navigation";

export default function AdminCorporateRedirectPage() {
  redirect("/admin/icerik?tab=kurumsal");
}
